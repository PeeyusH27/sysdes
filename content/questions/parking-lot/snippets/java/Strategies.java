import java.time.*;
import java.util.*;

// Strategy: the lot asks "which spot?" and "how much?" without knowing the policy.
interface SpotSelector {
    Optional<Spot> choose(List<Floor> floors, Vehicle vehicle);
}

interface PricingStrategy {
    int fee(Duration parked, Vehicle vehicle);
}

final class LowestFloorFirst implements SpotSelector {
    @Override
    public Optional<Spot> choose(List<Floor> floors, Vehicle vehicle) {
        for (Floor floor : floors) {
            Optional<Spot> spot = floor.take(vehicle.type().fits(),
                    s -> !vehicle.needsCharger() || s.has(Feature.EV));
            if (spot.isPresent()) return spot;
        }
        return Optional.empty();
    }
}

final class HourlyPricing implements PricingStrategy {
    private final Map<VehicleType, Integer> rates;
    private final Duration grace;

    HourlyPricing() {
        this(Map.of(VehicleType.BIKE, 10, VehicleType.CAR, 20, VehicleType.TRUCK, 40), Duration.ofMinutes(10));
    }

    HourlyPricing(Map<VehicleType, Integer> rates, Duration grace) {
        this.rates = Map.copyOf(rates);
        this.grace = grace;
    }

    @Override
    public int fee(Duration parked, Vehicle vehicle) {
        if (parked.compareTo(grace) <= 0) return 0;
        long hours = parked.toHours();
        if (parked.compareTo(Duration.ofHours(hours)) > 0) hours++;  // every started hour counts
        return Math.toIntExact(hours * rates.get(vehicle.type()));
    }
}

// Decorator: same interface, one extra rule
final class DailyCap implements PricingStrategy {
    private final PricingStrategy inner;
    private final int cap;

    DailyCap(PricingStrategy inner, int cap) {
        this.inner = inner;
        this.cap = cap;
    }

    @Override
    public int fee(Duration parked, Vehicle vehicle) {
        long days = parked.toDays();
        int rest = inner.fee(parked.minusDays(days), vehicle);
        return Math.toIntExact(days * cap + Math.min(rest, cap));
    }
}
