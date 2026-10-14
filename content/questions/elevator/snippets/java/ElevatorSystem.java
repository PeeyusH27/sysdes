import java.util.*;
import java.util.concurrent.*;

// Observer: displays, hall lanterns and tests listen for the events they care about.
interface ElevatorListener {
    default void assigned(HallCall call, String carId) {}
    default void cleared(HallCall call, String carId) {}  // the hall lamp goes dark
    default void arrived(Stop stop) {}
    default void queued(HallCall call) {}
}

// The controller. In Node, panels and the clock post to one event loop and each press runs to
// completion. Here every panel and the clock may be its own thread, so each public method is
// synchronized: one monitor gives the same guarantee, and two panels can never hand the same
// hall call to two cars. Listeners run inside the lock, so they must be quick.
final class ElevatorSystem {
    private final int floors;
    private final DispatchStrategy strategy;
    private final List<ElevatorCar> cars = new ArrayList<>();
    private final Map<HallCall, String> assigned = new LinkedHashMap<>();  // call -> car: exactly one owner
    private final Deque<HallCall> waiting = new ArrayDeque<>();  // no car can take these yet, oldest first
    private final List<ElevatorListener> listeners = new CopyOnWriteArrayList<>();

    ElevatorSystem(int floors, int cars, DispatchStrategy strategy, int doorTicks) {
        this.floors = floors;
        this.strategy = strategy;
        for (int i = 0; i < cars; i++) {
            this.cars.add(new ElevatorCar(String.valueOf((char) ('A' + i)), floors, 0, doorTicks));
        }
    }

    ElevatorSystem(int floors, int cars, DispatchStrategy strategy) { this(floors, cars, strategy, 2); }

    void addListener(ElevatorListener l) { listeners.add(l); }
    void removeListener(ElevatorListener l) { listeners.remove(l); }

    List<ElevatorCar> cars() { return List.copyOf(cars); }
    synchronized Optional<String> owner(HallCall call) { return Optional.ofNullable(assigned.get(call)); }
    synchronized int assignedCount() { return assigned.size(); }
    synchronized List<HallCall> waiting() { return List.copyOf(waiting); }

    ElevatorCar car(String id) {
        return cars.stream().filter(c -> c.id().equals(id)).findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown car " + id));
    }

    synchronized Optional<String> hallCall(int floor, Dir dir) {
        int top = floors - 1;
        boolean noButton = (dir == Dir.UP && floor == top) || (dir == Dir.DOWN && floor == 0);
        if (floor < 0 || floor > top || noButton) {
            throw new IllegalArgumentException("No " + dir + " button at floor " + floor);
        }
        HallCall call = new HallCall(floor, dir);
        if (assigned.containsKey(call) || waiting.contains(call)) {
            return owner(call);  // pressing ▲ twice is still one call
        }
        Optional<String> carId = assign(call);
        if (carId.isEmpty()) {
            waiting.add(call);
            listeners.forEach(l -> l.queued(call));
        }
        return carId;
    }

    synchronized void carCall(String carId, int floor) { car(carId).addStop(floor); }

    synchronized void tick() {
        for (ElevatorCar car : cars) {
            Optional<Stop> stop = car.step();
            if (stop.isEmpty()) continue;
            HallCall call = new HallCall(stop.get().floor(), stop.get().dir());
            if (car.id().equals(assigned.get(call))) {
                assigned.remove(call);
                listeners.forEach(l -> l.cleared(call, car.id()));
            }
            listeners.forEach(l -> l.arrived(stop.get()));
        }
        List<HallCall> retry = new ArrayList<>(waiting);
        waiting.clear();
        for (HallCall call : retry) if (assign(call).isEmpty()) waiting.add(call);
    }

    synchronized void takeOutOfService(String carId) {
        car(carId).takeOutOfService();
        List<HallCall> orphans = new ArrayList<>();
        assigned.forEach((call, owner) -> { if (owner.equals(carId)) orphans.add(call); });
        orphans.forEach(assigned::remove);
        List<HallCall> stranded = new ArrayList<>();  // no car can take these right now
        for (HallCall call : orphans) if (assign(call).isEmpty()) stranded.add(call);
        for (int i = stranded.size() - 1; i >= 0; i--) {
            waiting.addFirst(stranded.get(i));  // they were pressed first
        }
    }

    synchronized void returnToService(String carId) { car(carId).returnToService(); }

    private Optional<String> assign(HallCall call) {
        List<ElevatorCar> inService = cars.stream().filter(ElevatorCar::inService).toList();
        Optional<ElevatorCar> picked = strategy.pick(call, inService);
        if (picked.isEmpty()) return Optional.empty();
        ElevatorCar car = picked.get();
        car.addStop(call.floor(), call.dir());
        listeners.forEach(l -> l.assigned(call, car.id()));
        if (car.stops(call.dir()).contains(call.floor())) assigned.put(call, car.id());
        else listeners.forEach(l -> l.cleared(call, car.id()));  // it was already here and opened at once
        return Optional.of(car.id());
    }
}
