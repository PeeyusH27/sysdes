import java.util.*;

// The folder compiles with one javac call (default package), so these small value types
// share a file. In a real codebase each would be public, in its own file, in a package.

enum SpotType { BIKE, COMPACT, LARGE }

enum Feature { EV, ACCESSIBLE }

enum VehicleType {
    BIKE(SpotType.BIKE, SpotType.COMPACT, SpotType.LARGE),
    CAR(SpotType.COMPACT, SpotType.LARGE),
    TRUCK(SpotType.LARGE);

    private final List<SpotType> fits;

    VehicleType(SpotType... fits) { this.fits = List.of(fits); }

    // Which spot types this vehicle may use, smallest first, so big vehicles never take small spots
    List<SpotType> fits() { return fits; }
}

record Vehicle(VehicleType type, String plate, boolean needsCharger) {
    Vehicle(VehicleType type, String plate) { this(type, plate, false); }
}

record Spot(String id, SpotType type, int floor, Set<Feature> features) {  // features: EV, accessible…
    Spot {
        features = Set.copyOf(features);  // immutable, so a Spot is a safe key in the free sets
    }

    Spot(String id, SpotType type, int floor) { this(id, type, floor, Set.of()); }

    boolean has(Feature f) { return features.contains(f); }
}
