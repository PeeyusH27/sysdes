// Free spots grouped by type
export class Floor {
  constructor(level, spots) {
    this.level = level;
    this.free = new Map();                                   // spotType -> Set<Spot>
    for (const s of spots) {
      if (!this.free.has(s.type)) this.free.set(s.type, new Set());
      this.free.get(s.type).add(s);
    }
  }
  take(types, accept = () => true) {                         // accept() filters on features (e.g. EV chargers)
    for (const t of types) {
      for (const spot of this.free.get(t) ?? []) {
        if (!accept(spot)) continue;
        this.free.get(t).delete(spot);
        return spot;
      }
    }
    return null;
  }
  release(spot) { this.free.get(spot.type).add(spot); }
  available(type) { return this.free.get(type)?.size ?? 0; }
}
