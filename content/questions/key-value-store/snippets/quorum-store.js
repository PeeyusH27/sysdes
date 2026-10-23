// A tiny Dynamo-style cluster in one process: N replicas per key, a write needs W acks, a read asks R replicas.
// If R + W > N, every read set overlaps every write set, so a read sees the latest acknowledged write.
// Also here: read repair (a read fixes stale replicas) and hinted handoff (a stand-in holds writes for a down replica).
import { Ring } from './ring.js';
import { compare, increment, merge, siblings } from './vector-clock.js';

export class Cluster {
  constructor(names, { n = 3, w = 2, r = 2, sloppy = false } = {}) {
    Object.assign(this, { n, w, r, sloppy });
    this.ring = new Ring(names, 64);
    this.node = new Map(names.map((x) => [x, { down: false, data: new Map(), hints: [] }]));
  }

  down(name) { this.node.get(name).down = true; }

  // Bring a node back and let stand-ins hand over what they held for it.
  up(name) {
    this.node.get(name).down = false;
    for (const holder of this.node.values()) {
      const mine = holder.hints.filter((h) => h.for === name);
      holder.hints = holder.hints.filter((h) => h.for !== name);
      for (const h of mine) this.#store(name, h.key, h.version);
    }
  }

  #store(name, key, version) {
    const rep = this.node.get(name);
    rep.data.set(key, siblings([...(rep.data.get(key) ?? []), version]));   // keep only versions nobody supersedes
  }

  // context: the clock returned by an earlier get(), so the write replaces what the client saw.
  // coordinator: the node that stamps the clock (a partition can have two); reach: which replicas actually receive the write (to simulate a slow or partitioned network).
  put(key, value, context = {}, { reach, coordinator } = {}) {
    const pref = this.ring.preferenceList(key, this.n);
    const version = { value, clock: increment(context, coordinator ?? pref[0]) };
    let acks = 0;
    const standIns = this.ring.preferenceList(key, this.node.size).filter((x) => !pref.includes(x));
    for (const name of reach ?? pref) {
      if (!pref.includes(name)) continue;
      if (!this.node.get(name).down) { this.#store(name, key, version); acks++; continue; }
      const stand = this.sloppy ? standIns.find((s) => !this.node.get(s).down) : undefined;
      if (stand) { this.node.get(stand).hints.push({ for: name, key, version }); acks++; standIns.splice(standIns.indexOf(stand), 1); }
    }
    return acks >= this.w ? { ok: true, acks } : { ok: false, acks };
  }

  get(key, { from } = {}) {
    const pref = this.ring.preferenceList(key, this.n);
    const asked = (from ?? pref.filter((x) => !this.node.get(x).down)).slice(0, from ? undefined : this.r)
      .filter((x) => !this.node.get(x).down);
    if (asked.length < (from ? 1 : this.r)) return { ok: false };
    const found = siblings(asked.flatMap((x) => this.node.get(x).data.get(key) ?? []));
    // Read repair: send the winners to any asked replica that is missing one.
    for (const x of asked) {
      const have = this.node.get(x).data.get(key) ?? [];
      for (const v of found) if (!have.some((h) => compare(h.clock, v.clock) === 'equal')) this.#store(x, key, v);
    }
    const context = found.reduce((c, v) => merge(c, v.clock), {});
    return { ok: true, versions: found.map((v) => v.value), context };
  }
}
