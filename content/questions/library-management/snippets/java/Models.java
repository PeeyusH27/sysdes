import java.util.*;

// A copy moves through a small state machine. Anything not listed here is a bug, and fails loudly.
enum ItemState {
    AVAILABLE, LOANED, HELD, LOST;

    boolean canGoTo(ItemState next) {
        return switch (this) {
            case AVAILABLE -> next == LOANED;
            case LOANED -> next == AVAILABLE || next == HELD || next == LOST;
            case HELD -> next == LOANED || next == AVAILABLE || next == HELD;  // HELD -> HELD: the hold lapsed, next in line
            case LOST -> false;
        };
    }
}

final class BookItem {  // one physical copy
    final String id;
    final String isbn;
    private ItemState state = ItemState.AVAILABLE;
    String heldFor;     // member id while HELD
    int holdUntil;

    BookItem(String id, String isbn) {
        this.id = id;
        this.isbn = isbn;
    }

    ItemState state() { return state; }

    void moveTo(ItemState next) {
        if (!state.canGoTo(next)) throw new IllegalStateException(state + " -> " + next + " is not allowed");
        state = next;
    }
}

final class Book {  // the title: one record, many copies
    final String isbn;
    final String title;
    final String author;
    final List<BookItem> items = new ArrayList<>();
    final Deque<String> queue = new ArrayDeque<>();  // member ids waiting, oldest first

    Book(String isbn, String title, String author) {
        this.isbn = isbn;
        this.title = title;
        this.author = author;
    }
}

// What differs by kind of member is data, not a subclass.
enum MemberType {
    STANDARD(3, 14), PREMIUM(5, 21);

    final int maxLoans;
    final int loanDays;

    MemberType(int maxLoans, int loanDays) {
        this.maxLoans = maxLoans;
        this.loanDays = loanDays;
    }
}

record Member(String id, MemberType type) {}

final class Loan {
    final String id;
    final String itemId;
    final String memberId;
    final String isbn;
    int due;
    int renewals;
    boolean open = true;
    boolean notified;

    Loan(String id, String itemId, String memberId, String isbn, int due) {
        this.id = id;
        this.itemId = itemId;
        this.memberId = memberId;
        this.isbn = isbn;
        this.due = due;
    }
}
