export const VehicleType = Object.freeze({ BIKE: 'bike', CAR: 'car', TRUCK: 'truck' });
export const SpotType = Object.freeze({ BIKE: 'bike', COMPACT: 'compact', LARGE: 'large' });

// Which spot types each vehicle may use, smallest first, so big vehicles never take small spots
export const FITS = {
  [VehicleType.BIKE]: [SpotType.BIKE, SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.CAR]: [SpotType.COMPACT, SpotType.LARGE],
  [VehicleType.TRUCK]: [SpotType.LARGE],
};

export class Spot {
  constructor(id, type, floor) { Object.assign(this, { id, type, floor, features: new Set() }); }   // features: 'ev', 'accessible'…
}
