import java.util.*;

// Strategy: pick(call, cars) returns a car, or empty to leave the call waiting.
interface DispatchStrategy {
    Optional<ElevatorCar> pick(HallCall call, List<ElevatorCar> cars);

    // Floors the car travels along its LOOK sweep before it can open at `floor` heading `dir`.
    static int routeDistance(ElevatorCar car, int floor, Dir dir) {
        int here = car.floor();
        Optional<Dir> sweep = car.direction();
        if (sweep.isEmpty()) return Math.abs(here - floor);  // idle
        Dir d = sweep.get();
        int top = here;
        int bottom = here;
        for (int s : car.allStops()) {
            top = Math.max(top, s);
            bottom = Math.min(bottom, s);
        }
        boolean onTheWay = (floor - here) * d.sign() > 0 || (floor == here && !car.moving());
        if (dir == d && onTheWay) return Math.abs(floor - here);  // ahead, same direction
        if (d == Dir.UP) {
            if (dir == Dir.DOWN) {
                int turn = Math.max(top, floor);
                return turn - here + (turn - floor);
            }
            int low = Math.min(bottom, floor);
            return top - here + (top - low) + (floor - low);  // up, all the way down, back up
        }
        if (dir == Dir.UP) {
            int turn = Math.min(bottom, floor);
            return here - turn + (floor - turn);
        }
        int high = Math.max(top, floor);
        return here - bottom + (high - bottom) + (high - floor);
    }
}

// Nearest car, direction-aware: route distance plus a penalty for every stop made first.
final class NearestCar implements DispatchStrategy {
    private final int stopCost;

    NearestCar() { this(2); }  // a stop costs about 2 floors of travel

    NearestCar(int stopCost) { this.stopCost = stopCost; }

    int cost(ElevatorCar car, HallCall call) {
        int dist = DispatchStrategy.routeDistance(car, call.floor(), call.dir());
        long before = 0;
        for (Dir d : Dir.values()) {
            before += car.stops(d).stream()
                    .filter(f -> DispatchStrategy.routeDistance(car, f, d) < dist).count();
        }
        return dist + stopCost * (int) before;
    }

    @Override
    public Optional<ElevatorCar> pick(HallCall call, List<ElevatorCar> cars) {
        ElevatorCar best = null;
        int bestCost = Integer.MAX_VALUE;
        for (ElevatorCar car : cars) {
            int c = cost(car, call);
            if (c < bestCost) {  // ties go to the first car
                best = car;
                bestCost = c;
            }
        }
        return Optional.ofNullable(best);
    }
}

// Collective: only an idle car, or one already sweeping past the floor in the call's
// direction, takes the call. Otherwise it waits and the system retries every tick.
final class Collective implements DispatchStrategy {
    @Override
    public Optional<ElevatorCar> pick(HallCall call, List<ElevatorCar> cars) {
        return cars.stream()
                .filter(car -> car.idle() || passing(car, call))
                .min(Comparator.comparingInt(car -> Math.abs(car.floor() - call.floor())));  // ties: first car
    }

    private static boolean passing(ElevatorCar car, HallCall call) {
        return car.direction().orElse(null) == call.dir()
                && (call.floor() - car.floor()) * call.dir().sign() > 0;
    }
}
