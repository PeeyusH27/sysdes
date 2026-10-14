import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.*;

record Ticket(String id, Vehicle vehicle, Spot spot, Instant entry) {}

record Receipt(int fee, int change) {}

final class ParkingLot {
    private final List<Floor> floors;
    private final SpotSelector selector;
    private final PricingStrategy pricing;
    private final Clock clock;  // injected, so tests control time
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();  // quote() reads it unlocked
    private final List<IntConsumer> boards = new CopyOnWriteArrayList<>();  // display boards (Observer)

    ParkingLot(List<Floor> floors, SpotSelector selector, PricingStrategy pricing, Clock clock) {
        this.floors = List.copyOf(floors);
        this.selector = selector;
        this.pricing = pricing;
        this.clock = clock;
    }

    void onChange(IntConsumer board) { boards.add(board); }

    Ticket park(Vehicle vehicle) {
        Ticket ticket;
        // Every gate is its own thread. Node gets "choose, then take" atomically from its single
        // event loop; here one lock gives the same guarantee: two gates never get the same spot.
        synchronized (this) {
            Spot spot = selector.choose(floors, vehicle)
                    .orElseThrow(() -> new IllegalStateException("Lot full for " + vehicle.type()));
            ticket = new Ticket(UUID.randomUUID().toString(), vehicle, spot, clock.instant());
            tickets.put(ticket.id(), ticket);
        }
        notifyBoards(ticket.spot().floor());  // outside the lock: a slow board never blocks a gate
        return ticket;
    }

    int quote(String ticketId) {
        Ticket t = ticket(ticketId);
        return pricing.fee(Duration.between(t.entry(), clock.instant()), t.vehicle());
    }

    Receipt exit(String ticketId, int paid) {
        Ticket t;
        int fee;
        synchronized (this) {  // two exits with one ticket: only one wins
            t = ticket(ticketId);
            fee = quote(ticketId);
            if (paid < fee) throw new IllegalArgumentException("Payment of " + fee + " required");
            tickets.remove(ticketId);  // a ticket can only exit once
            floors.get(t.spot().floor()).release(t.spot());
        }
        notifyBoards(t.spot().floor());
        return new Receipt(fee, paid - fee);
    }

    private Ticket ticket(String id) {
        Ticket t = tickets.get(id);
        if (t == null) throw new NoSuchElementException("Unknown ticket");
        return t;
    }

    private void notifyBoards(int floor) {
        for (IntConsumer board : boards) board.accept(floor);
    }
}
