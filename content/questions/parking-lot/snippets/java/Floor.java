import java.util.*;
import java.util.function.*;

// Free spots grouped by type. Not thread-safe on its own: ParkingLot holds its lock while it calls in.
final class Floor {
    private final int level;
    private final Map<SpotType, Set<Spot>> free = new EnumMap<>(SpotType.class);

    Floor(int level, List<Spot> spots) {
        this.level = level;
        for (Spot s : spots) bucket(s.type()).add(s);
    }

    int level() { return level; }

    // accept() filters on features (e.g. EV chargers)
    Optional<Spot> take(List<SpotType> types, Predicate<Spot> accept) {
        for (SpotType t : types) {
            Iterator<Spot> it = bucket(t).iterator();
            while (it.hasNext()) {
                Spot spot = it.next();
                if (!accept.test(spot)) continue;
                it.remove();
                return Optional.of(spot);
            }
        }
        return Optional.empty();
    }

    void release(Spot spot) { bucket(spot.type()).add(spot); }

    int available(SpotType type) { return bucket(type).size(); }

    // LinkedHashSet keeps insertion order, so spots are handed out in a predictable order
    private Set<Spot> bucket(SpotType type) {
        return free.computeIfAbsent(type, t -> new LinkedHashSet<>());
    }
}
