// Extras for the classic low-level design questions added after parking lot, elevator and vending machine.
// Kept in its own file so the shared questions.ts is not edited by two workstreams at once. See docs/AUTHORING-EXTRAS.md.
import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "lru-cache-lld": {
    detail: [
      "public-interface",
      "what-it-remembers",
      "get-and-put-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "cache",
    sayIt: {
      answer:
        "I'd use a hash map for O(1) lookup and a doubly linked list for the order of use, so get and put are both O(1). The eviction order sits behind a small policy interface only if LFU or FIFO is likely. One lock guards everything, because a hit reorders the list, so a read is also a write.",
      numbers: [
        { value: "O(1)", label: "get and put, with a map and a list" },
        { value: "1 lock", label: "guards reads too, since a hit reorders" },
        { value: "N stripes", label: "independent caches to cut lock contention" },
      ],
      tradeoffs: [
        "Policy interface vs inline LRU: swappable rules, at the cost of one more layer when only LRU is asked for.",
        "One lock vs striping: exact LRU and simple code, against contention that grows with the number of cores.",
        "Lazy expiry vs a sweeper: no extra thread, but dead entries hold memory until someone reads them.",
      ],
      mention:
        "A put of a key that already exists must replace and refresh it without evicting, or a full cache throws away a good entry for nothing.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about generics, the eviction rule, TTL, thread count and whether a miss loads a value.",
          hint: "Only LRU or swappable, per-entry TTL, many threads or one, and whether the cache fetches on a miss.",
        },
        {
          id: "estimate",
          prompt: "Size the cache: how many entries and calls, and why O(1) per call matters.",
          hint: "With 100,000 entries and 1,000 calls a second, a scan per call is 100 million steps a second.",
        },
        {
          id: "interface",
          prompt: "List the public methods, what a miss returns, and what a put of an existing key does.",
          hint: "get, put with an optional TTL, delete, size and onRemove; a known key is replaced and refreshed, not evicted.",
        },
        {
          id: "design",
          prompt: "Name the classes, and say what the cache owns and what the policy owns.",
          hint: "Cache owns entries and the lock; EvictionPolicy owns the order; a Clock and listeners come in from outside.",
        },
        {
          id: "deepdive",
          prompt: "Explain why get needs the lock, and give two ways to scale it.",
          hint: "A hit relinks the list, so it writes. Stripe the keys over several caches, or buffer hits and replay them.",
        },
      ],
      checklist: [
        "Pairs a hash map with a doubly linked list for O(1)",
        "Uses sentinel nodes so unlink and push-front have no edge cases",
        "Replaces a known key without evicting anything",
        "Evicts before inserting, so capacity is never exceeded",
        "Explains why a read needs the lock too",
        "Runs listeners after releasing the lock",
        "Adds a policy interface only when asked for a second rule",
        "Injects the clock so expiry tests need no sleep",
      ],
    },
  },
  logger: {
    detail: [
      "public-interface",
      "what-it-remembers",
      "thread-safety",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "observer",
    sayIt: {
      answer:
        "I'd make a tree of named loggers where a child inherits its level from the nearest ancestor. A call checks the level first, builds one record, and hands it to appenders up the tree, each with its own threshold and formatter. Slow I/O goes behind a bounded async queue, and I'd inject the manager instead of using a singleton.",
      numbers: [
        { value: "4 levels", label: "DEBUG, INFO, WARN, ERROR as ordered values" },
        { value: "1 record", label: "built once per call and shared by appenders" },
        { value: "drop or block", label: "the choice a bounded queue forces" },
      ],
      tradeoffs: [
        "Drop vs block: dropping keeps the request fast and counts losses, blocking keeps every line but can stall callers.",
        "Copy-on-write vs a lock: no lock on the hot path, at the cost of copying the appender list on each rare add.",
        "Lazy message vs a plain string: no cost when the level is off, in exchange for a slightly clumsier call.",
      ],
      mention:
        "On shutdown the async queue must be flushed, or the last and most useful lines before a crash or restart are lost.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about hierarchy, runtime changes, whether logging may block, formats and thread count.",
          hint: "One global logger or a tree with inherited levels, runtime level changes, drop or block under load, JSON as well as text.",
        },
        {
          id: "estimate",
          prompt: "Size the load: calls per second, how many are disabled, and what a slow disk costs.",
          hint: "With 20 debug calls on each of 1,000 requests a second, 20,000 strings would be built for nothing without a level check.",
        },
        {
          id: "interface",
          prompt: "List the public calls and what log returns when a level is off or an appender throws.",
          hint: "getLogger by name, log with a level and a message that may be a function, addAppender, and a count of appenders that wrote.",
        },
        {
          id: "design",
          prompt: "Name the classes, and say which are strategies, which are decorators, and what owns what.",
          hint: "Logger owns a level and appenders, Formatter is a strategy, AsyncAppender is a decorator, and the manager is injected.",
        },
        {
          id: "deepdive",
          prompt: "Explain what happens when the async queue is full, and what shutdown must do.",
          hint: "A bounded queue forces drop or block. Close puts a stop marker behind the last record so everything queued is written.",
        },
      ],
      checklist: [
        "Checks the level before building the message or record",
        "Resolves an unset level by walking up the logger tree",
        "Gives each appender its own threshold and formatter",
        "Treats the formatter as a strategy, not an if ladder",
        "Wraps slow appenders in a bounded async queue and states drop or block",
        "Flushes the queue on shutdown",
        "Uses a copy-on-write appender list and per-appender error isolation",
        "Avoids a singleton, or injects it so tests can reset",
      ],
    },
  },
  atm: {
    detail: [
      "public-interface",
      "what-it-remembers",
      "withdraw-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "state-machine",
    sayIt: {
      answer:
        "An ATM is a state machine: Idle, CardIn and Authenticated, with a table that gives every event one outcome and rejects the rest. Cash comes from a chain of note handlers that backtracks, so limited stock never strands a remainder. I plan the notes first, then debit under the account lock, then dispense, and credit back if the cash jams.",
      numbers: [
        { value: "3 x 5 cells", label: "three states, five events, one outcome each" },
        { value: "3 tries", label: "wrong PINs before the account locks" },
        { value: "60 = 3 x 20", label: "what greedy misses with one 50 left" },
      ],
      tradeoffs: [
        "Table vs flags: every cell is visible and unlisted means rejected, against a little more structure.",
        "Chain vs loop: a chain lets each note own rules, but four fixed notes need only a loop with backtracking.",
        "Undo vs hold and commit: crediting back is simple, while a hold survives a crash between debit and dispense.",
      ],
      mention:
        "The failed-PIN count must live on the account, not the session, or an attacker gets three guesses per machine and per card insert.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask which services, note values, lockout rule and jam behaviour to assume, and whether accounts are shared by machines.",
          hint: "Withdraw only or deposit too, notes of 100, 50, 20 and 10, lock after three wrong PINs, and what a jam does to the balance.",
        },
        {
          id: "estimate",
          prompt: "Size the problem: how many events per session, and why correctness matters more than speed.",
          hint: "A session is a handful of events, so speed is irrelevant; one wrong transition keeps a session open or loses money.",
        },
        {
          id: "interface",
          prompt: "List the events, which states accept each one, and what a rejected event returns.",
          hint: "insertCard, enterPin, withdraw, balance and eject; a rejection returns a result and changes nothing.",
        },
        {
          id: "design",
          prompt: "Name the states and classes, and say where the PIN counter and the note stock live.",
          hint: "Atm holds the card and stock, Account owns balance and PIN tries, and a NoteHandler chain plans the cash.",
        },
        {
          id: "deepdive",
          prompt: "Owe 60 with one 50 and three 20s. Explain why greedy fails, and what order debit and dispense go in.",
          hint: "Greedy takes the 50 and strands 10; backtrack to three 20s. Plan, debit under the lock, dispense, credit back on a jam.",
        },
      ],
      checklist: [
        "Says this is a state machine and lists three states",
        "Gives one outcome in every state and event cell",
        "Keeps the failed-PIN count on the account",
        "Shows greedy failing on limited notes and backtracks",
        "Plans the notes before touching the balance",
        "Debits under the account lock so two machines cannot overspend",
        "Undoes the debit when the cash unit jams",
        "Says when the chain is more than a loop needs",
      ],
    },
  },

  "tic-tac-toe": {
    detail: [
      "public-interface",
      "what-it-remembers",
      "one-move-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "state-machine",
    sayIt: {
      answer:
        "I'd split it into a Board that owns the grid and a Game that owns the turn and the ending. The board keeps a signed total per row, column and diagonal, so a move is checked in O(1) at any size: a line is won when its total reaches n or minus n. Undo is a stack of moves, and a bot is a swappable strategy.",
      numbers: [
        { value: "O(1)", label: "win check per move, at any board size" },
        { value: "n or -n", label: "a line total that means a win" },
        { value: "4 totals", label: "row, column and two diagonals touched" },
      ],
      tradeoffs: [
        "Running totals vs scanning: constant time per move, but only for n in a row, and they must stay in step with the grid.",
        "Mark as a string vs a Player class: less code now, but no place for a name or a score later.",
        "Lock plus version vs trusting the client: a little more state, but two tabs can never both apply a move.",
      ],
      mention:
        "A rejected move must change nothing and must not use up the turn, so every check runs before the board is touched.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about board size, k in a row, player count, undo, a bot and remote play.",
          hint: "Fixed 3 by 3 or n by n, n in a row or fewer, two players, undo, computer opponent, one screen or two clients.",
        },
        {
          id: "estimate",
          prompt: "Size the problem: how many cells and moves, and why a scan per move might matter.",
          hint: "A 3 by 3 board has nine cells, but a 500 by 500 board with a scan per move is hundreds of millions of checks.",
        },
        {
          id: "interface",
          prompt: "List the public methods and the results of move, including every rejection.",
          hint: "move returns OK, WIN or DRAW, or one of NOT_YOUR_TURN, INVALID_MOVE, GAME_OVER and STALE; undo returns a boolean.",
        },
        {
          id: "design",
          prompt: "Name the classes and say what Board owns and what Game owns.",
          hint: "Board owns the grid and the line totals; Game owns the turn, the status, the version and the undo stack.",
        },
        {
          id: "deepdive",
          prompt: "Explain the O(1) win check, and what you change for k in a row.",
          hint: "Add plus or minus one to the touched totals and test for n; for k in a row count same marks outward from the new cell.",
        },
      ],
      checklist: [
        "Splits Board (lines) from Game (turn and ending)",
        "Checks a win in O(1) with signed line totals",
        "Checks the win before the draw on the last cell",
        "Validates everything before changing anything",
        "Leaves the turn unchanged after a rejected move",
        "Adds undo as a stack of reversible moves",
        "Makes the bot a swappable strategy",
        "Handles two clients with a lock and a version",
      ],
    },
  },
  "snake-and-ladder": {
    detail: [
      "public-interface",
      "what-it-remembers",
      "concurrency",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "strategy",
    sayIt: {
      answer:
        "I'd settle three rules first: what happens on overshoot, whether jumps chain, and whether a six repeats. A board holds one map of jumps, since a snake and a ladder only differ in direction. The dice and the ending rule are strategies, so tests use fixed rolls, and bad boards are refused at construction.",
      numbers: [
        { value: "1 jump map", label: "snakes and ladders share one structure" },
        { value: "3 end rules", label: "exact, finish or bounce, one class each" },
        { value: "0 chains", label: "jumps may not land on another jump" },
      ],
      tradeoffs: [
        "One jump type vs Snake and Ladder classes: less code and no duplicate logic, at the cost of being less literal.",
        "Refusing chains vs following them: no loops are possible, but some fun layouts are ruled out unless you add a visited check.",
        "Rule as a strategy vs a switch: new rules need no edits to play, in exchange for one more small interface.",
      ],
      mention:
        "A ladder that lands on a snake that lands on the ladder never ends a turn, so validate the layout up front and refuse any jump that lands on another jump's start.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask what happens on overshoot, whether jumps chain, whether a six repeats, and how many players.",
          hint: "Exact landing, finish on any roll or bounce back; chaining jumps; an extra turn on a six; at least two players.",
        },
        {
          id: "estimate",
          prompt: "Size the game: board squares, players, and why speed does not matter but correctness does.",
          hint: "A hundred squares and a handful of players mean a turn is a few steps; the risk is rules, not performance.",
        },
        {
          id: "interface",
          prompt: "List the public calls and what play returns after someone has won.",
          hint: "A board with size and jumps, a game with play and on, a move result, and nothing returned once the game is over.",
        },
        {
          id: "design",
          prompt: "Name the classes, and say which parts are strategies and why there is no Snake class.",
          hint: "Game, Board, Player, Dice and EndRule; a snake and a ladder are both a jump, higher end meaning ladder.",
        },
        {
          id: "deepdive",
          prompt: "Explain how you stop jump loops, and how tests get a repeatable game.",
          hint: "Refuse any jump that lands on another jump's start; inject fixed dice so the nth roll is known.",
        },
      ],
      checklist: [
        "Asks about overshoot, chaining and the six before coding",
        "Stores snakes and ladders as one jump map",
        "Makes the dice a strategy so tests can use fixed rolls",
        "Makes the ending rule a strategy with exact, finish and bounce",
        "Refuses chained jumps or jumps from the last square",
        "Counts a ladder onto the last square as a win",
        "Passes the turn in one place, with the six as the exception",
        "Serialises play per game so two threads cannot move one player twice",
      ],
    },
  },
  splitwise: {
    detail: [
      "public-interface",
      "what-it-remembers",
      "settle-up-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "strategy",
    sayIt: {
      answer:
        "I'd keep money in integer cents and make each split type a strategy that turns an amount into one share per person, with the leftover cents handed out in a fixed order. Shares become debts to the payer in a ledger that nets each pair. Simplify matches the biggest debtor to the biggest creditor, and settle-up checks and subtracts under one group lock.",
      numbers: [
        { value: "1001 = 334+334+333", label: "equal split of 1001 cents among three" },
        { value: "n - 1", label: "most payments the greedy simplify needs" },
        { value: "1 lock", label: "per group, around check and subtract" },
      ],
      tradeoffs: [
        "Strategy per split vs one function: open to new split types, at the cost of an interface for a few lines.",
        "Greedy simplify vs the minimum: fast and repeatable, but the true fewest payments is NP-hard.",
        "Pair debts vs net balances only: pairs show who owes whom, at the cost of two numbers to keep in step.",
      ],
      mention:
        "Two people tapping settle-up on the same debt must not both pay, so the check and the subtract happen in one locked step.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask which split types, rounding, currency and simplify behaviour to support, and whether the payer must be a participant.",
          hint: "Equal, exact, percent and shares; one currency; who gets the stray cent; and whether to suggest fewer payments.",
        },
        {
          id: "estimate",
          prompt: "Size the problem: members per group, expenses per day, and why a pair ledger is small.",
          hint: "A friend group is a handful of people, so a pair ledger has a few dozen entries and a scan is fine.",
        },
        {
          id: "interface",
          prompt: "List the public methods, and what addExpense and settleUp return for bad input.",
          hint: "addExpense, settleUp, owes, balances and simplify; a bad expense is rejected before anything is written.",
        },
        {
          id: "design",
          prompt: "Name the classes, and say what the strategy owns and what the ledger owns.",
          hint: "Group owns members, expenses and a lock; a SplitStrategy makes shares; the Ledger nets debts per pair.",
        },
        {
          id: "deepdive",
          prompt: "Split 1001 cents three ways, then explain simplify and what goes wrong if two people settle at once.",
          hint: "334, 334, 333; match biggest debtor to biggest creditor; check and subtract inside one lock.",
        },
      ],
      checklist: [
        "Stores money as integer cents, never floats",
        "States a fixed rule for the leftover cents",
        "Makes each split type a strategy chosen by name",
        "Validates the whole expense before writing to the ledger",
        "Nets opposite debts between the same pair",
        "Simplifies from net balances, with deterministic tie-breaks",
        "Notes the true minimum is NP-hard and greedy needs n - 1",
        "Does settle-up's check and subtract under one lock",
      ],
    },
  },

  "library-management": {
    detail: [
      "public-interface",
      "what-it-remembers",
      "borrow-and-return-step-by-step",
      "how-to-approach-it",
      "step-by-step-answer",
      "implementation",
      "code-it-yourself",
      "failure-modes",
      "trade-offs",
    ],
    doodle: "state-machine",
    sayIt: {
      answer:
        "I'd separate the title, Book, from the physical copy, BookItem. A copy is a small state machine: available, loaned, held or lost. Fines are a strategy chosen by member type, notices are observers, and borrowing the last copy is one atomic check-and-set. A returned copy goes to the reservation queue before it can become available.",
      numbers: [
        { value: "4 states", label: "available, loaned, held, lost per copy" },
        { value: "3 days", label: "example hold deadline for the next in line" },
        { value: "1 atomic step", label: "check available and set loaned together" },
      ],
      tradeoffs: [
        "Member type as data vs a subclass each: no hierarchy to grow, but an odd rule needs code.",
        "One lock vs a lock per title: simple and correct now, against contention across a big catalogue.",
        "Hold with a deadline vs no hold: fair to the queue, but it needs a daily sweep and a notice.",
      ],
      mention:
        "The last-copy race: if the code checks available and then writes loaned as two steps, two members both get the copy.",
    },
    explain: {
      steps: [
        {
          id: "clarify",
          prompt: "Ask about member types, fines, reservations, holds, renewals and branches.",
          hint: "Different limits and loan periods per member type, a fine cap, how long a hold lasts, renewals, one branch or many.",
        },
        {
          id: "estimate",
          prompt: "Size the library: titles, copies, members, loans per day, and whether search needs an index.",
          hint: "Even 100,000 titles and a few thousand loans a day is tiny, so correctness of the queue and the race matters more.",
        },
        {
          id: "interface",
          prompt: "List the public methods and what each returns on a refusal.",
          hint: "borrow, returnItem, reserve, renew, search and a daily sweep; refusals are reasons such as LIMIT_REACHED and NO_COPY.",
        },
        {
          id: "design",
          prompt: "Name the classes, and say where state, fines and notices live.",
          hint: "Book owns copies and the queue; BookItem has the state machine; FinePolicy is a strategy; listeners observe events.",
        },
        {
          id: "deepdive",
          prompt: "Two members borrow the last copy at once. Explain what goes wrong and the fix.",
          hint: "A separate check and write lets both pass; make them one atomic step with a lock or a conditional update.",
        },
      ],
      checklist: [
        "Separates the title from the physical copy",
        "Draws the copy's states and its legal moves",
        "Hands a returned copy to the queue before it is available",
        "Gives holds a deadline so an absent member cannot block",
        "Makes fines a strategy, with a cap as a wrapper",
        "Keeps member limits as data, not subclasses",
        "Makes check-and-loan of the last copy atomic",
        "Passes time in so tests need no clock",
      ],
    },
  },
};
