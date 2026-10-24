import type { Basics } from "./types";

export const basics: Record<string, Basics> = {
  "parking-lot": {
    what: "Design the classes for a car park: floors, spots, tickets, fees. The interviewer is testing clean objects, rules that can change, and what happens when two gates try to give out the same spot.",
    why: "Scanning every spot works for 1,000 spots, but the real trap is two gates picking the same free spot at once. Prices and vehicle types also keep changing, so hard-coded rules turn into edits everywhere.",
    example: "A multi-storey car park. The building is the lot, each level is a floor, each bay is a spot, and the paper slip at the barrier is the ticket. The exit machine works out the fee.",
    when: "Start with Lot, Floor, Spot and Ticket. Put spot choice and pricing behind small strategy interfaces. Keep a free list per spot type, and make taking a spot one atomic step.",
  },
  elevator: {
    what: "Design the software that runs several lifts in a building. Two questions hide inside: which lift answers a button press (dispatch), and in what order one lift visits its floors (scheduling).",
    why: "Serving presses in arrival order makes a lift zig-zag. Serving the nearest stop can starve a far floor. And if two lifts both answer one press, one rides empty during the Monday 9 am rush.",
    example: "An office lobby at 9 am. Each lift is a car with its own list of stops, the lobby panel is the controller that picks one lift per press, and a lift sweeps up, then down.",
    when: "Draw one car as a state machine, with LOOK ordering for its stops. Add one controller that gives each call to exactly one car, with the dispatch rule as a swappable strategy.",
  },
  "vending-machine": {
    what: "Design the software inside a snack machine. It looks simple, but it is a state machine: in each state, every coin, button press or cancel must have exactly one outcome.",
    why: "A few loose flags allow impossible combinations, and one missed check hands out a free cola or swallows a dollar. Float maths adds errors too, since 0.1 + 0.2 is not 0.3.",
    example: "Your coins land in a tray, not in the till. Only when the item is seen falling do the coins move to the till. If it jams, the tray gives them back.",
    when: "When an interviewer says machine, kiosk or workflow, think state pattern and a table of states against events. Keep money in integer cents and hold payment in escrow until the sale is confirmed.",
  },
  "library-management": {
    what: "Design the software for a library: books, members, loans, reservations and fines. The nouns are easy. The interviewer is testing whether you get the rules and the last-copy race right.",
    why: "Two members can borrow the last copy in the same instant, since check then set is two steps. Waiting queues must stay fair, and fines and limits differ by member type, so rules must be swappable.",
    example: "A book title is the catalogue card, and each physical copy on the shelf is its own item that is out, on hold behind the desk, or lost. The librarian gives a returned copy to the first person waiting.",
    when: "Split the title (Book) from the copy (BookItem). Give each copy a state machine, fines a strategy, and notices an observer. Make the check and the loan one atomic step.",
  },
  splitwise: {
    what: "Design an app that shares group bills and tracks who owes whom. The classes are easy. The interviewer is testing exact money, the stray cent, and settling debts safely.",
    why: "Floats drift, and 10.01 split three ways will not divide evenly. Shares must still add up to the bill to the cent. Two people settling the same debt at once must not both pay.",
    example: "Four friends share a dinner. One pays the bill, and everyone else owes that person a share. The group's notebook of debts nets them: if Ana owes Ben 10 and Ben owes Cam 10, Ana can pay Cam 10.",
    when: "Use integer cents, a split strategy per split type, and a ledger that nets each pair. Hand out the leftover cents by a fixed rule. Simplify debts greedily and lock each group.",
  },
  "snake-and-ladder": {
    what: "Design the board game in code: a board, players, dice and turns. It looks like a toy. The interviewer is looking at how you model the rules people argue about, and how you test random dice.",
    why: "Real dice make tests unrepeatable. Rules vary: what if a roll overshoots the last square, or a ladder ends on a snake? A bad board can even create an endless loop of jumps.",
    example: "A paper board with numbered squares. A snake from 17 to 7 and a ladder from 7 to 17 are the same thing, a jump from one square to another. Swap the real dice for a fixed list of rolls to replay a game.",
    when: "Keep one map of jumps on the Board. Make the dice and the ending rule strategies, inject the dice in tests, and refuse bad layouts when the board is built.",
  },
  "tic-tac-toe": {
    what: "Design the noughts and crosses game in code. It looks trivial, so the interviewer is checking who owns what, how fast you check for a win, and how you handle follow-ups like undo.",
    why: "Scanning a row, a column and two diagonals after every move costs O(n), which hurts on big boards. With two clients, both may act on the same board and one move is silently lost.",
    example: "Keep a score tally on the margin for every row, column and diagonal. X adds one, O subtracts one. The moment a tally reaches 3 or minus 3, that line is won and nobody rescans the grid.",
    when: "Give the Board its lines and the Game the turn and the result. Use running totals for an O(1) check. Add Command for undo or Strategy for a bot only when asked.",
  },
  atm: {
    what: "Design the software of a cash machine: card in, PIN, balance, withdraw. The interviewer is testing the state machine, making change from limited notes, and keeping account money and cash consistent.",
    why: "Greedy note picking can strand money: with one 50 and three 20s, a greedy 60 takes the 50 and fails. Debit without cash, or cash without debit, loses money. Two machines can overspend one account.",
    example: "A bank counter with one rule: no teller goes to the safe until a plan for the notes exists. First work out which notes make the amount, then debit the account, then hand over the cash.",
    when: "Draw three states and a table of events. Use a chain of note handlers, or a simple loop with backtracking. Plan the notes first, debit in one locked step, then dispense and undo on a jam.",
  },
  logger: {
    what: "Design a logging library like the ones apps use. The patterns are easy to name. The interviewer is testing judgement: what is worth building, what to skip, and how it behaves under many threads.",
    why: "Logging runs on almost every line, so a switched-off call must cost almost nothing. A slow disk must not slow requests, and one broken destination must not silence the others.",
    example: "A company mailroom. Each department is a named logger that inherits the building's default level, the mail slip is a record, and each copy goes to its own tray (appender) in its own format.",
    when: "Use a logger tree with inherited levels, a list of appenders and a formatter strategy. Check the level first, put slow output behind a bounded queue, and skip factories and singletons.",
  },
  "lru-cache-lld": {
    what: "Design a fixed-size cache that throws out the least recently used entry when full. It is mostly a data-structure question: find an entry and update its recency, both in constant time.",
    why: "A map alone cannot tell which key is oldest, and a list alone makes lookup O(n). Even a read changes the order, so many threads can corrupt the list without a lock.",
    example: "A small desk where you keep the papers you use. Every time you touch one it goes on top. When the desk is full, the paper at the bottom goes back to the cabinet.",
    when: "Combine a hash map with a doubly linked list so get and put are O(1). Add one lock. Put the eviction rule behind a policy only if a second rule is likely.",
  },
  "rate-limiter": {
    what: "Design a gate that stops one user or key from sending too many requests, for example 100 a minute. It must give the same answer on every one of many app servers.",
    why: "If 50 servers each count alone, a user capped at 100 a minute can send 5,000. A fixed window lets 200 requests through in two seconds across the reset. And a limiter outage must not take the API down.",
    example: "A bucket of tokens that refills at a steady rate. Each request spends one token, and a burst can use the saved tokens. With none left, the gateway answers 429 and tells the caller when to retry.",
    when: "Reach for a token bucket per user in Redis, updated by one Lua script so the check is atomic. Say whether you fail open or closed, and choose closed for login.",
  },
  "movie-booking": {
    what: "Design seat booking for a cinema site. The real test is concurrency: two people must never buy the same seat. Seats move from available to held to booked.",
    why: "Two people click seat A5 in the same millisecond. With a read then an update, both see available and both pay. The average is only about 4 bookings a second, but a launch spike brings 500K people.",
    example: "A theatre box office where you get a numbered ticket stub that holds your seat for 5 minutes. Pay in time and the seat is yours. Run out of time and it goes back on sale.",
    when: "Make each seat a small state machine in a database. Hold all requested seats with one conditional UPDATE, let row locks pick the winner, and refund a late payment. Add a waiting room for launches.",
  },
  leaderboard: {
    what: "Design a ranking for millions of players: the top 100, and what is my rank. The interviewer wants to hear that rank is the hard question, and then ties, time windows and sharding.",
    why: "A SQL count of everyone above you walks millions of rows. At 50M players and 12K rank reads a second at peak, that cannot keep up. Cached ranks go stale because one score shifts everyone behind it.",
    example: "A race scoreboard where runners hold numbered boards. A sorted set keeps them in order with counts along the way, so your place is found in a few hops, not by counting every runner ahead.",
    when: "Use a Redis sorted set per board. Send scores through Kafka and skip replayed events. Keep the database as the source of truth and Redis as a rebuildable index.",
  },
  "payment-system": {
    what: "Design the backend that charges a customer through a payment provider (PSP) such as Stripe. The question is about things going wrong, not scale. Every cent must move once and be recorded once.",
    why: "A timeout means the card may or may not be charged. Mark it failed and a retry can charge twice. At 10M payments a day, even a 0.01% error rate is 1,000 wrong payments daily.",
    example: "A shop till with a numbered receipt for each checkout. If the card machine hangs, the clerk reuses that same receipt number to ask again, and the bank charges only once. Each night the till total is checked.",
    when: "Reach for an idempotency key, a payment state machine with an unknown state, and a ledger of entries. Let the PSP webhook settle unknowns, then reconcile daily. Never hold a lock across a PSP call.",
  },
};
