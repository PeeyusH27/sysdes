import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

// Run from this folder:  javac -encoding UTF-8 -d /tmp/lift *.java && java -cp /tmp/lift ElevatorTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class ElevatorTest {
    public static void main(String[] args) {
        test("LOOK serves stops in travel order and reverses only when nothing is ahead", ElevatorTest::look);
        test("hall calls are served in their own direction", ElevatorTest::ownDirection);
        test("pressing ▲ twice is one call, owned by exactly one car", ElevatorTest::pressTwice);
        test("nearest car is direction-aware", ElevatorTest::nearestCar);
        test("collective: a call waits until a car is idle or sweeping past it", ElevatorTest::collective);
        test("a failed car hands its hall calls to the others", ElevatorTest::failover);
        test("doors only open when stopped, and the car never moves with them open", ElevatorTest::doors);
        test("floors outside the building are rejected and cars stay inside it", ElevatorTest::staysInside);
        test("8 panels pressing at once still make one call per button", ElevatorTest::concurrentPanels);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    // Tick until `count` stops happen (or `ticks` ticks), returning "A5▲" for each stop.
    static List<String> run(ElevatorSystem sys, int count, int ticks) {
        List<String> stops = new ArrayList<>();
        ElevatorListener onStop = new ElevatorListener() {
            @Override public void arrived(Stop s) { stops.add(s.carId() + s.floor() + s.dir().arrow()); }
        };
        sys.addListener(onStop);
        for (int i = 0; i < ticks && stops.size() < count; i++) sys.tick();
        sys.removeListener(onStop);
        return stops;
    }

    static List<String> run(ElevatorSystem sys) { return run(sys, Integer.MAX_VALUE, 200); }

    static ElevatorSystem oneCar() { return new ElevatorSystem(10, 1, new NearestCar()); }

    static void look() {
        ElevatorSystem sys = oneCar();
        for (int f : new int[] {5, 2, 7}) sys.carCall("A", f);
        eq(run(sys, 1, 200), List.of("A2▲"));
        sys.carCall("A", 1);  // behind the car: waits for the way back
        sys.carCall("A", 6);  // ahead: joins this sweep
        eq(run(sys), List.of("A5▲", "A6▲", "A7▲", "A1▼"));
    }

    static void ownDirection() {
        ElevatorSystem sys = oneCar();
        sys.carCall("A", 6);
        sys.hallCall(3, Dir.UP);
        sys.hallCall(4, Dir.DOWN);  // passed on the way up, served on the way down
        eq(run(sys), List.of("A3▲", "A6▲", "A4▼"));
    }

    static void pressTwice() {
        ElevatorSystem sys = new ElevatorSystem(10, 3, new NearestCar());
        List<String> assigned = new ArrayList<>();
        sys.addListener(new ElevatorListener() {
            @Override public void assigned(HallCall call, String car) { assigned.add(call.key() + ":" + car); }
        });
        eq(sys.hallCall(4, Dir.UP), Optional.of("A"));
        eq(sys.hallCall(4, Dir.UP), Optional.of("A"));
        eq(assigned, List.of("4▲:A"));
        eq(sys.cars().stream().filter(c -> c.stops(Dir.UP).contains(4)).map(ElevatorCar::id).toList(), List.of("A"));
    }

    static void nearestCar() {
        ElevatorCar up = new ElevatorCar("A", 10, 1, 2);
        up.addStop(5);
        up.step();  // now at 2, sweeping up to 5
        eq(up.floor(), 2);
        eq(up.direction(), Optional.of(Dir.UP));
        ElevatorCar idle = new ElevatorCar("B", 10, 6, 2);
        NearestCar nc = new NearestCar();
        eq(DispatchStrategy.routeDistance(up, 4, Dir.UP), 2);
        eq(nc.cost(up, new HallCall(4, Dir.DOWN)), 4 + 2);  // up to 5, back to 4, one stop first
        eq(nc.cost(up, new HallCall(1, Dir.UP)), 7 + 2);  // a whole round trip
        eq(nc.pick(new HallCall(4, Dir.DOWN), List.of(up, idle)).map(ElevatorCar::id), Optional.of("B"));
        // it passes 3 anyway
        eq(nc.pick(new HallCall(3, Dir.UP), List.of(up, idle)).map(ElevatorCar::id), Optional.of("A"));
    }

    static void collective() {
        ElevatorSystem sys = new ElevatorSystem(10, 1, new Collective());
        sys.carCall("A", 8);
        sys.tick();  // A is now moving up
        eq(sys.hallCall(5, Dir.UP), Optional.of("A"));  // on its way
        eq(sys.hallCall(2, Dir.DOWN), Optional.empty());  // behind it, wrong direction: queued
        eq(sys.waiting().stream().map(HallCall::key).toList(), List.of("2▼"));
        eq(run(sys), List.of("A5▲", "A8▲", "A2▼"));  // picked up once A went idle at 8
        eq(sys.waiting(), List.of());
    }

    static void failover() {
        ElevatorSystem sys = new ElevatorSystem(10, 3, new NearestCar());
        sys.carCall("B", 4);  // park B at 4 and C at 8
        sys.carCall("C", 8);
        run(sys);
        eq(sys.hallCall(5, Dir.DOWN), Optional.of("B"));
        sys.takeOutOfService("B");
        eq(sys.owner(new HallCall(5, Dir.DOWN)), Optional.of("C"));
        check(!sys.hallCall(4, Dir.UP).equals(Optional.of("B")), "never assigned to a car out of service");
        List<String> cleared = new ArrayList<>();
        sys.addListener(new ElevatorListener() {
            @Override public void cleared(HallCall call, String car) { cleared.add(call.key() + ":" + car); }
        });
        run(sys);
        check(cleared.contains("5▼:C"), "C served 5▼");
        eq(sys.car("B").state(), CarState.OUT_OF_SERVICE);
        eq(sys.car("B").floor(), 4);
        sys.returnToService("B");
        sys.carCall("B", 7);
        eq(run(sys), List.of("B7▲"));  // back in service and moving again
    }

    static void doors() {
        ElevatorCar car = new ElevatorCar("A", 10);
        car.addStop(3);
        car.step();
        eq(car.state(), CarState.MOVING_UP);
        throwsWith("moving", car::openDoors);
        Set<Integer> opened = new LinkedHashSet<>();
        for (int i = 0; i < 20; i++) {
            boolean wasOpen = car.state() == CarState.DOORS_OPEN;
            int before = car.floor();
            Optional<Stop> stop = car.step();
            if (wasOpen) eq(car.floor(), before);  // no tick moves a car whose doors were open
            if (car.state() == CarState.DOORS_OPEN) opened.add(car.floor());
            stop.ifPresent(s -> eq(s, new Stop("A", 3, Dir.UP)));
        }
        eq(List.copyOf(opened), List.of(3));
        eq(car.state(), CarState.IDLE);
    }

    static void staysInside() {
        ElevatorSystem sys = new ElevatorSystem(10, 3, new NearestCar());
        throwsWith("No floor 10", () -> sys.carCall("A", 10));
        throwsWith("No UP button at floor 9", () -> sys.hallCall(9, Dir.UP));
        throwsWith("No DOWN button at floor 0", () -> sys.hallCall(0, Dir.DOWN));
        Lcg rand = new Lcg(42);
        for (int i = 0; i < 2000; i++) {
            if (i % 3 == 0) {
                int floor = rand.next(10);
                sys.hallCall(floor, floor == 9 || (floor > 0 && rand.next(2) == 1) ? Dir.DOWN : Dir.UP);
            }
            if (i % 7 == 0) sys.carCall(String.valueOf("ABC".charAt(rand.next(3))), rand.next(10));
            sys.tick();
            for (ElevatorCar car : sys.cars()) check(car.floor() >= 0 && car.floor() <= 9, "car inside the shaft");
        }
        run(sys, Integer.MAX_VALUE, 500);  // drain: no presses, every stop gets served
        eq(sys.assignedCount(), 0);
        check(sys.cars().stream().allMatch(ElevatorCar::idle), "every car idle");
    }

    static void concurrentPanels() throws Exception {
        ElevatorSystem sys = new ElevatorSystem(10, 3, new NearestCar());
        AtomicInteger assignments = new AtomicInteger();
        sys.addListener(new ElevatorListener() {
            @Override public void assigned(HallCall call, String car) { assignments.incrementAndGet(); }
        });
        CountDownLatch go = new CountDownLatch(1);
        List<Thread> panels = new ArrayList<>();
        for (int p = 0; p < 8; p++) {
            Thread t = new Thread(() -> {
                try {
                    go.await();
                } catch (InterruptedException e) {
                    return;
                }
                for (int i = 0; i < 100; i++) {
                    sys.hallCall(4, Dir.UP);
                    sys.hallCall(6, Dir.DOWN);
                }
            });
            panels.add(t);
            t.start();
        }
        go.countDown();
        for (Thread t : panels) t.join();
        eq(assignments.get(), 2);
        eq(sys.cars().stream().filter(c -> c.stops(Dir.UP).contains(4)).count(), 1L);
        eq(sys.cars().stream().filter(c -> c.stops(Dir.DOWN).contains(6)).count(), 1L);
    }

    // A tiny deterministic LCG, as in the JS test
    static final class Lcg {
        private long seed;

        Lcg(long seed) { this.seed = seed; }

        int next(int n) {
            seed = (seed * 1103515245L + 12345L) % (1L << 31);
            return (int) (seed % n);
        }
    }

    // ---- a tiny test harness
    interface Body { void run() throws Exception; }

    private static int failed = 0;

    static void test(String name, Body body) {
        try {
            body.run();
            System.out.println("PASS  " + name);
        } catch (Throwable e) {
            failed++;
            System.out.println("FAIL  " + name + "\n      " + e);
        }
    }

    static void check(boolean ok, String what) {
        if (!ok) throw new AssertionError(what);
    }

    static void eq(Object actual, Object expected) {
        if (!Objects.equals(actual, expected)) throw new AssertionError("expected " + expected + ", got " + actual);
    }

    static void throwsWith(String message, Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            if (String.valueOf(e.getMessage()).contains(message)) return;
            throw new AssertionError("expected \"" + message + "\", got " + e);
        }
        throw new AssertionError("expected \"" + message + "\", but nothing was thrown");
    }
}
