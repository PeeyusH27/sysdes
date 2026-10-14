import java.util.*;

// One car is a small state machine. Time is an injected tick: one tick moves one floor,
// or counts down the open doors, so tests are deterministic.
// Not thread-safe on its own: ElevatorSystem's lock guards every car.
final class ElevatorCar {
    private final String id;
    private final int floors;
    private final int doorTicks;
    private int floor;
    private CarState state = CarState.IDLE;
    private Dir dir;  // the sweep LOOK is committed to; null when idle
    private final Set<Integer> upStops = new LinkedHashSet<>();  // stop here while going up
    private final Set<Integer> downStops = new LinkedHashSet<>(); // stop here while going down
    private int doorTimer;

    ElevatorCar(String id, int floors, int floor, int doorTicks) {
        this.id = id;
        this.floors = floors;
        this.floor = floor;
        this.doorTicks = doorTicks;
    }

    ElevatorCar(String id, int floors) { this(id, floors, 0, 2); }

    String id() { return id; }
    int floor() { return floor; }
    CarState state() { return state; }
    Optional<Dir> direction() { return Optional.ofNullable(dir); }
    Set<Integer> stops(Dir d) { return Collections.unmodifiableSet(d == Dir.UP ? upStops : downStops); }
    boolean inService() { return state != CarState.OUT_OF_SERVICE; }
    boolean moving() { return state == CarState.MOVING_UP || state == CarState.MOVING_DOWN; }
    boolean idle() { return state == CarState.IDLE && upStops.isEmpty() && downStops.isEmpty(); }

    List<Integer> allStops() {
        List<Integer> all = new ArrayList<>(upStops);
        all.addAll(downStops);
        return all;
    }

    void addStop(int floor) { add(floor, null); }  // a car call: a button inside

    void addStop(int floor, Dir hallDir) { add(floor, Objects.requireNonNull(hallDir)); }  // a hall call

    private void add(int floor, Dir hallDir) {
        if (floor < 0 || floor >= floors) throw new IllegalArgumentException("No floor " + floor);
        if (!inService()) throw new IllegalStateException("Car " + id + " is out of service");
        if (floor == this.floor && !moving() && (hallDir == null || dir == null || hallDir == dir)) {
            openDoors();
            return;
        }
        Dir d = hallDir != null ? hallDir
                : floor > this.floor ? Dir.UP
                : floor < this.floor ? Dir.DOWN
                : dir.opposite();  // passing this floor: catch it on the way back
        (d == Dir.UP ? upStops : downStops).add(floor);
    }

    void openDoors() {
        if (moving()) throw new IllegalStateException("Doors stay shut while the car is moving");
        if (!inService()) throw new IllegalStateException("Car " + id + " is out of service");
        state = CarState.DOORS_OPEN;
        doorTimer = doorTicks;  // a door sensor would reset this while the beam is blocked
    }

    // Advance one tick. Returns the stop when the car stops and opens.
    Optional<Stop> step() {
        if (!inService()) return Optional.empty();
        if (state == CarState.DOORS_OPEN) {
            if (--doorTimer > 0) return Optional.empty();
            state = CarState.IDLE;  // doors closed: stopped at this floor
        }
        if (state == CarState.IDLE) {
            Plan plan = plan();
            if (plan instanceof Serve s) return Optional.of(stop(s.dir()));
            if (!(plan instanceof Move m)) {
                dir = null;  // nothing to do: stay idle
                return Optional.empty();
            }
            dir = m.dir();
            state = m.dir() == Dir.UP ? CarState.MOVING_UP : CarState.MOVING_DOWN;
        }
        floor += state == CarState.MOVING_UP ? 1 : -1;
        if (floor < 0 || floor >= floors) throw new IllegalStateException("Ran off the end of the shaft");
        Plan plan = plan();  // reached a new floor: stop here, keep going, or halt
        if (plan instanceof Serve s) return Optional.of(stop(s.dir()));
        Dir next = plan instanceof Move m ? m.dir() : null;
        if (next != dir) {  // its target was taken away: halt, never reverse in motion
            state = CarState.IDLE;
            dir = next;
        }
        return Optional.empty();
    }

    void takeOutOfService() {  // a real car first levels at the nearest floor and opens
        upStops.clear();
        downStops.clear();
        state = CarState.OUT_OF_SERVICE;
        dir = null;
    }

    void returnToService() { state = CarState.IDLE; }

    // LOOK: keep the sweep while any stop lies ahead and serve stops in that direction;
    // turn around only when nothing is ahead.
    private Plan plan() {
        Dir d = dir;
        if (d == null) {  // idle: serve this floor, else head for the nearest stop
            if (upStops.contains(floor)) return new Serve(Dir.UP);
            if (downStops.contains(floor)) return new Serve(Dir.DOWN);
            Integer nearest = null;
            for (int f : allStops()) {
                if (nearest == null || Math.abs(f - floor) < Math.abs(nearest - floor)) nearest = f;  // ties: first
            }
            if (nearest == null) return new Rest();
            d = nearest > floor ? Dir.UP : Dir.DOWN;
        }
        if (ahead(d)) return wants(d) ? new Serve(d) : new Move(d);
        if (wants(d)) return new Serve(d);  // last stop of this sweep
        if (wants(d.opposite())) return new Serve(d.opposite());  // turn around here
        return ahead(d.opposite()) ? new Move(d.opposite()) : new Rest();
    }

    private boolean ahead(Dir d) { return allStops().stream().anyMatch(f -> (f - floor) * d.sign() > 0); }

    private boolean wants(Dir d) { return (d == Dir.UP ? upStops : downStops).contains(floor); }

    private Stop stop(Dir d) {
        state = CarState.IDLE;  // stopped exactly at this floor, so opening is legal
        (d == Dir.UP ? upStops : downStops).remove(floor);
        dir = d;
        openDoors();
        return new Stop(id, floor, d);
    }

    // What plan() decides: serve this floor, move one way, or rest
    private sealed interface Plan permits Serve, Move, Rest {}
    private record Serve(Dir dir) implements Plan {}
    private record Move(Dir dir) implements Plan {}
    private record Rest() implements Plan {}
}
