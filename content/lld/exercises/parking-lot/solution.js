const SIZE = { bike: 0, compact: 1, large: 2 };
const FITS = { bike: ["bike", "compact", "large"], car: ["compact", "large"], truck: ["large"] };

// Seam 1, spot choice: a policy is a sort key. The free spot with the smallest key wins, so a new policy is one new entry.
const SPOT_POLICIES = {
  "smallest-first": (s) => [SIZE[s.type], s.floor, s.index],
  "lowest-floor-first": (s) => [s.floor, SIZE[s.type], s.index],
};

// Seam 2, pricing: a policy turns (vehicle, minutes) into cents. ParkingLot never sees a rate.
const HOURLY = { bike: 100, car: 200, truck: 500 };
const FLAT = { bike: 300, car: 500, truck: 1200 };
const PRICING = {
  hourly: (vehicle, minutes) => (minutes <= 10 ? 0 : Math.ceil(minutes / 60) * HOURLY[vehicle]),
  flat: (vehicle) => FLAT[vehicle],
};

const before = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

class ParkingLot {
  constructor(floors) {
    // Each spot remembers where it is and whether someone is in it.
    this.spots = floors.flatMap((types, floor) => types.map((type, index) => ({ floor, index, type, taken: false })));
    this.tickets = new Map(); // ticket id -> { vehicle, plate, spot } while the car is inside
    this.plates = new Set();
    this.nextId = 1;
    this.spotKey = SPOT_POLICIES["smallest-first"];
    this.price = PRICING.hourly;
  }

  useSpotPolicy(name) {
    if (!Object.prototype.hasOwnProperty.call(SPOT_POLICIES, name)) return false;
    this.spotKey = SPOT_POLICIES[name];
    return true;
  }

  usePricing(name) {
    if (!Object.prototype.hasOwnProperty.call(PRICING, name)) return false;
    this.price = PRICING[name];
    return true;
  }

  park(plate, vehicle) {
    if (!Object.prototype.hasOwnProperty.call(FITS, vehicle) || this.plates.has(plate)) return -1;
    let best = null;
    for (const s of this.spots) {
      if (s.taken || !FITS[vehicle].includes(s.type)) continue;
      if (best === null || before(this.spotKey(s), this.spotKey(best))) best = s;
    }
    if (best === null) return -1;
    best.taken = true;
    this.plates.add(plate);
    const id = this.nextId++;
    this.tickets.set(id, { plate, vehicle, spot: best });
    return id;
  }

  leave(ticketId, minutes) {
    const t = this.tickets.get(ticketId);
    if (!t) return -1; // unknown, or already used
    this.tickets.delete(ticketId);
    this.plates.delete(t.plate);
    t.spot.taken = false;
    return this.price(t.vehicle, minutes);
  }

  available(floor, spotType) {
    return this.spots.filter((s) => s.floor === floor && s.type === spotType && !s.taken).length;
  }

  spotOf(ticketId) {
    const t = this.tickets.get(ticketId);
    return t ? `${t.spot.floor}-${t.spot.index}` : "";
  }
}
