import java.time.*;
import java.util.*;
import java.util.concurrent.*;

// Run from this folder:  javac -d /tmp/lot *.java && java -cp /tmp/lot ParkingLotTest
// Plain Java, no JUnit: each test is a method; main exits 1 if any check fails.
final class ParkingLotTest {
    public static void main(String[] args) {
        test("trucks only take large spots; fees round up per started hour", ParkingLotTest::trucks);
        test("grace period and daily cap", ParkingLotTest::graceAndCap);
        test("display boards hear about every change", ParkingLotTest::boards);
        test("exact hour boundaries: 60 minutes is one hour, 1 ms more is two", ParkingLotTest::boundaries);
        test("unknown tickets, short payments and double exits are rejected", ParkingLotTest::rejections);
        test("smallest fitting type first, then the next floor; EV filter", ParkingLotTest::selector);
        test("80 cars at 8 gates, 50 spots: never two cars in one spot", ParkingLotTest::concurrentGates);
        System.out.println(failed == 0 ? "All tests passed." : failed + " test(s) failed.");
        System.exit(failed == 0 ? 0 : 1);
    }

    record Lot(ParkingLot lot, List<Floor> floors) {}

    static Lot makeLot(Clock clock) {
        List<Floor> floors = List.of(
                new Floor(0, List.of(new Spot("0-C1", SpotType.COMPACT, 0), new Spot("0-L1", SpotType.LARGE, 0))),
                new Floor(1, List.of(new Spot("1-B1", SpotType.BIKE, 1))));
        return new Lot(new ParkingLot(floors, new LowestFloorFirst(), new HourlyPricing(), clock), floors);
    }

    static Vehicle car(String plate) { return new Vehicle(VehicleType.CAR, plate); }

    static void trucks() {
        TestClock clock = new TestClock();
        Lot l = makeLot(clock);
        Ticket t = l.lot().park(new Vehicle(VehicleType.TRUCK, "KA01AB1234"));
        eq(t.spot().id(), "0-L1");
        throwsWith("Lot full", () -> l.lot().park(new Vehicle(VehicleType.TRUCK, "KA02")));
        clock.set(Duration.ofMinutes(61));  // 61 minutes = 2 started hours × 40
        eq(l.lot().exit(t.id(), 100), new Receipt(80, 20));
        eq(l.floors().get(0).available(SpotType.LARGE), 1);
    }

    static void graceAndCap() {
        PricingStrategy pricing = new DailyCap(new HourlyPricing(), 150);
        eq(pricing.fee(Duration.ofMinutes(5), car("A")), 0);
        eq(pricing.fee(Duration.ofHours(23), car("A")), 150);
        eq(pricing.fee(Duration.ofHours(26), car("A")), 190);  // 1 day capped + 2 hours
    }

    static void boards() {
        Lot l = makeLot(new TestClock());
        List<Integer> changed = new ArrayList<>();
        l.lot().onChange(changed::add);
        l.lot().exit(l.lot().park(car("KA03")).id(), 0);
        eq(changed, List.of(0, 0));
    }

    static void boundaries() {
        PricingStrategy pricing = new HourlyPricing();
        Duration ms = Duration.ofMillis(1);
        eq(pricing.fee(Duration.ofMinutes(10), car("A")), 0);  // the grace period is inclusive
        eq(pricing.fee(Duration.ofMinutes(10).plus(ms), car("A")), 20);
        eq(pricing.fee(Duration.ofMinutes(60), car("A")), 20);
        eq(pricing.fee(Duration.ofMinutes(60).plus(ms), car("A")), 40);
    }

    static void rejections() {
        TestClock clock = new TestClock();
        Lot l = makeLot(clock);
        ParkingLot lot = l.lot();
        throwsWith("Unknown ticket", () -> lot.quote("nope"));
        Ticket t = lot.park(car("KA03"));
        clock.set(Duration.ofHours(2));  // 2 hours × 20
        eq(lot.quote(t.id()), 40);
        throwsWith("Payment of 40 required", () -> lot.exit(t.id(), 30));
        eq(l.floors().get(0).available(SpotType.COMPACT), 0);  // a failed payment keeps the spot taken
        eq(lot.exit(t.id(), 40), new Receipt(40, 0));
        throwsWith("Unknown ticket", () -> lot.exit(t.id(), 40));
    }

    static void selector() {
        Spot ev = new Spot("1-C1", SpotType.COMPACT, 1, Set.of(Feature.EV));
        List<Floor> floors = List.of(
                new Floor(0, List.of(new Spot("0-C1", SpotType.COMPACT, 0), new Spot("0-L1", SpotType.LARGE, 0))),
                new Floor(1, List.of(ev, new Spot("1-B1", SpotType.BIKE, 1))));
        SpotSelector s = new LowestFloorFirst();
        eq(id(s.choose(floors, new Vehicle(VehicleType.CAR, "EV", true))), "1-C1"); // skips floor 0: no charger
        eq(id(s.choose(floors, new Vehicle(VehicleType.BIKE, "B"))), "0-C1");  // no bike spot on 0: compact fits
        eq(id(s.choose(floors, car("C"))), "0-L1");  // compact gone: a car may use a large spot
        eq(s.choose(floors, car("D")), Optional.empty());  // floor 1 has no compact or large left
    }

    static void concurrentGates() throws Exception {
        List<Spot> spots = new ArrayList<>();
        for (int i = 0; i < 50; i++) spots.add(new Spot("0-C" + i, SpotType.COMPACT, 0));
        ParkingLot lot = new ParkingLot(List.of(new Floor(0, spots)), new LowestFloorFirst(),
                new HourlyPricing(), new TestClock());
        ExecutorService gates = Executors.newFixedThreadPool(8);
        CountDownLatch go = new CountDownLatch(1);
        List<Future<Optional<Ticket>>> results = new ArrayList<>();
        for (int i = 0; i < 80; i++) {
            Vehicle v = car("CAR" + i);
            results.add(gates.submit(() -> {
                go.await();  // all gates press at once
                try {
                    return Optional.of(lot.park(v));
                } catch (IllegalStateException full) {
                    return Optional.<Ticket>empty();
                }
            }));
        }
        go.countDown();
        Set<String> taken = new HashSet<>();
        int parked = 0;
        for (Future<Optional<Ticket>> r : results) {
            Optional<Ticket> t = r.get();
            if (t.isPresent()) {
                parked++;
                taken.add(t.get().spot().id());
            }
        }
        gates.shutdown();
        eq(parked, 50);
        eq(taken.size(), 50);
    }

    static String id(Optional<Spot> spot) { return spot.map(Spot::id).orElse(null); }

    // A clock the test moves by hand
    static final class TestClock extends Clock {
        private volatile Instant now = Instant.EPOCH;

        void set(Duration sinceStart) { now = Instant.EPOCH.plus(sinceStart); }

        @Override public Instant instant() { return now; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
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
