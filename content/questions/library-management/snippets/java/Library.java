import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Consumer;
import java.util.function.Function;

record Result<T>(T value, String reason) {
    static <T> Result<T> success(T value) { return new Result<>(value, null); }
    static <T> Result<T> failure(String reason) { return new Result<>(null, reason); }
    boolean ok() { return reason == null; }
}

record Event(String type, String memberId, String isbn, int day) {}

// Time is always passed in as a day number, so nothing here reads a clock.
final class Library {
    private static final int HOLD_DAYS = 3;

    private final Map<String, Book> books = new LinkedHashMap<>();  // isbn -> Book
    private final Map<String, Member> members = new HashMap<>();
    private final Map<String, Loan> loans = new LinkedHashMap<>();
    private final Map<MemberType, FinePolicy> fines;                 // one policy per member type
    private final List<Consumer<Event>> listeners = new CopyOnWriteArrayList<>();
    // One lock guards every write. Two members racing for the last copy are serialized, so the
    // check "is it AVAILABLE?" and the move to LOANED are one step. A database does the same with
    // UPDATE ... SET state = 'LOANED' WHERE id = ? AND state = 'AVAILABLE'.
    private final ReentrantLock lock = new ReentrantLock();
    private int nextLoan = 1;

    Library(Map<MemberType, FinePolicy> fines) { this.fines = fines; }

    Library() {
        this(Map.of(
            MemberType.STANDARD, new CappedFine(new PerDayFine(25), 1000),
            MemberType.PREMIUM, new CappedFine(new PerDayFine(10), 500)));
    }

    void onEvent(Consumer<Event> listener) { listeners.add(listener); }  // observer: email, SMS, the front desk screen

    // Run a change under the lock, then tell the listeners after releasing it.
    private <T> Result<T> atomically(Function<List<Event>, Result<T>> body) {
        List<Event> events = new ArrayList<>();
        Result<T> result;
        lock.lock();
        try {
            result = body.apply(events);
        } finally {
            lock.unlock();
        }
        for (Event e : events) for (Consumer<Event> l : listeners) l.accept(e);
        return result;
    }

    void addBook(String isbn, String title, String author, int copies) {
        atomically(ev -> {
            Book book = books.computeIfAbsent(isbn, k -> new Book(isbn, title, author));
            for (int i = 0; i < copies; i++) book.items.add(new BookItem(isbn + "#" + (book.items.size() + 1), isbn));
            return Result.success(null);
        });
    }

    void join(String memberId, MemberType type) {
        atomically(ev -> {
            members.put(memberId, new Member(memberId, type));
            return Result.success(null);
        });
    }

    List<String> search(String text) {
        String q = text.toLowerCase();
        return atomically(ev -> {
            List<String> found = new ArrayList<>();
            for (Book b : books.values()) {
                if (b.isbn.equals(text) || b.title.toLowerCase().contains(q) || b.author.toLowerCase().contains(q)) found.add(b.isbn);
            }
            return Result.success(found);
        }).value();
    }

    Result<Loan> borrow(String memberId, String isbn, int day) {
        return atomically(ev -> {
            Member member = members.get(memberId);
            Book book = books.get(isbn);
            if (member == null || book == null) return Result.failure("UNKNOWN");
            if (openLoans(memberId) >= member.type().maxLoans) return Result.failure("LIMIT_REACHED");
            // A copy held for this member comes first. A free copy exists only when nobody is waiting,
            // because every return hands the copy to the queue before it can become AVAILABLE.
            BookItem item = null;
            for (BookItem i : book.items) if (i.state() == ItemState.HELD && memberId.equals(i.heldFor)) item = i;
            if (item == null) for (BookItem i : book.items) if (item == null && i.state() == ItemState.AVAILABLE) item = i;
            if (item == null) return Result.failure("NO_COPY");
            item.moveTo(ItemState.LOANED);
            item.heldFor = null;
            Loan loan = new Loan("L" + nextLoan++, item.id, memberId, isbn, day + member.type().loanDays);
            loans.put(loan.id, loan);
            ev.add(new Event("borrowed", memberId, isbn, day));
            return Result.success(loan);
        });
    }

    Result<Integer> returnItem(String loanId, int day) {
        return atomically(ev -> {
            Loan loan = loans.get(loanId);
            if (loan == null || !loan.open) return Result.failure("UNKNOWN_LOAN");
            loan.open = false;
            int fine = fines.get(members.get(loan.memberId).type()).fine(day - loan.due);
            release(itemOf(loan), day, ev);
            ev.add(new Event("returned", loan.memberId, loan.isbn, day));
            return Result.success(fine);
        });
    }

    Result<Integer> reserve(String memberId, String isbn) {
        return atomically(ev -> {
            Book book = books.get(isbn);
            if (!members.containsKey(memberId) || book == null) return Result.failure("UNKNOWN");
            for (BookItem i : book.items) if (i.state() == ItemState.AVAILABLE) return Result.failure("COPY_AVAILABLE");  // just borrow it
            if (book.queue.contains(memberId)) return Result.failure("ALREADY_WAITING");
            book.queue.add(memberId);
            return Result.success(book.queue.size());  // 1 means next in line
        });
    }

    Result<Integer> renew(String loanId, int day) {
        return atomically(ev -> {
            Loan loan = loans.get(loanId);
            if (loan == null || !loan.open) return Result.failure("UNKNOWN_LOAN");
            if (day > loan.due) return Result.failure("OVERDUE");
            if (loan.renewals >= 2) return Result.failure("RENEWAL_LIMIT");
            if (!books.get(loan.isbn).queue.isEmpty()) return Result.failure("RESERVED_BY_OTHERS");
            loan.renewals++;
            loan.due += members.get(loan.memberId).type().loanDays;
            return Result.success(loan.due);
        });
    }

    // Call once a day. Overdue notices go out once per loan; unclaimed holds pass to the next in line.
    void sweep(int day) {
        atomically(ev -> {
            for (Loan loan : loans.values()) {
                if (loan.open && day > loan.due && !loan.notified) {
                    loan.notified = true;
                    ev.add(new Event("overdue", loan.memberId, loan.isbn, day));
                }
            }
            for (Book book : books.values()) {
                for (BookItem item : book.items) {
                    if (item.state() == ItemState.HELD && day > item.holdUntil) {
                        ev.add(new Event("holdExpired", item.heldFor, item.isbn, day));
                        release(item, day, ev);
                    }
                }
            }
            return Result.success(null);
        });
    }

    // A copy that comes back goes to the first member waiting, or becomes available.
    private void release(BookItem item, int day, List<Event> ev) {
        String next = books.get(item.isbn).queue.poll();
        if (next == null) {
            item.moveTo(ItemState.AVAILABLE);
            item.heldFor = null;
            return;
        }
        item.moveTo(ItemState.HELD);
        item.heldFor = next;
        item.holdUntil = day + HOLD_DAYS;
        ev.add(new Event("ready", next, item.isbn, day));
    }

    private long openLoans(String memberId) {
        return loans.values().stream().filter(l -> l.open && l.memberId.equals(memberId)).count();
    }

    private BookItem itemOf(Loan loan) {
        return books.get(loan.isbn).items.stream().filter(i -> i.id.equals(loan.itemId)).findFirst().orElseThrow();
    }
}
