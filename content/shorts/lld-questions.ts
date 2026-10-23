// Shorts for the classic low-level design questions added after parking lot, elevator and vending machine.
import type { Short } from "./types";

export const shorts: Short[] = [
  // ── Question: LRU cache (LLD) ──────────────────────────────────────────────
  {
    id: "lru-cache-lld-map-and-list",
    track: "System design",
    topic: "LRU cache",
    title: "An LRU cache is a hash map plus a doubly linked list",
    hook: "A map alone cannot say which key is oldest, and a list alone cannot find a key fast. Together both operations cost O(1).",
    points: [
      "The **map** goes from key to list node, so a lookup is one step.",
      "The **list** holds keys from newest (front) to oldest (back).",
      "A hit unlinks the node and pushes it to the front. A full put removes the back.",
      "A **dummy head and tail** mean every real node has two neighbours, so no edge cases.",
      "Update both structures in one method, or a key is evicted twice or never.",
    ],
    more: [
      {
        title: "Put, in order",
        points: [
          "A key that already exists is replaced and refreshed. Nothing is evicted.",
          "A new key on a full cache evicts first, then inserts, so the size never passes capacity.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "Evicting before checking whether the key exists throws away a good entry.",
          "A model test against a simple ordered map over thousands of random calls finds list bugs.",
        ],
      },
    ],
    code: `put(key, value) {
  if (this.entries.has(key)) { /* replace, refresh */ return; }
  if (this.entries.size >= this.capacity)
    this.#remove(this.policy.victim(), 'evicted');
  this.entries.set(key, { value });
  this.policy.onInsert(key);
}`,
    say: "A hash map for lookup and a doubly linked list for recency, so get and put are O(1). A new key on a full cache evicts the back of the list before inserting.",
    source: "/questions/lru-cache-lld#step-by-step-answer",
  },
  {
    id: "lru-cache-lld-thread-safety",
    track: "System design",
    topic: "LRU cache",
    title: "In an LRU cache, a read is also a write",
    hook: "A hit moves the key to the front of the list. Two readers relinking at once can corrupt it, so reads need the lock too.",
    points: [
      "Start with **one lock** around get and put. It is correct, and cheap while the work is a few pointer moves.",
      "A plain read-write lock does not help: every hit would still need the write side.",
      "**Lock striping** hashes each key to one of N small caches, each with its own lock.",
      "Run **listeners after unlocking**, so a slow or re-entrant one cannot stall or deadlock the cache.",
    ],
    more: [
      {
        title: "Scaling further",
        points: [
          "Striping makes the order approximate across stripes, which is usually fine.",
          "High-end caches buffer hits and replay them in batches. It is faster and harder to reason about.",
        ],
      },
      {
        title: "A hot key",
        points: ["All threads still queue on one lock. A tiny front cache or a per-key copy absorbs it."],
      },
    ],
    say: "A hit relinks the list, so even reads take an exclusive lock. I start with one lock, then stripe the keys across several caches if contention shows up.",
    source: "/questions/lru-cache-lld#thread-safety",
  },

  // ── Question: Logging framework (LLD) ──────────────────────────────────────
  {
    id: "logger-lld-level-tree",
    track: "System design",
    topic: "Logger design",
    title: "A logger tree: levels inherited, appenders fan out",
    hook: "Name loggers with dots, and a child can inherit its level from the nearest ancestor that has one.",
    points: [
      "`app.db` has `app` as its parent, and `app` has the **root**. The name is the tree.",
      "An unset level means ask the parent. The root always has one, so the walk ends.",
      "Check the **level first**. A disabled call builds no record and no string.",
      "A record goes to the logger's **appenders**, then up to its parent's, each with its own threshold.",
      "Return how many appenders wrote, so tests can see the filters work.",
    ],
    more: [
      {
        title: "Lazy messages",
        points: [
          "Take the message as a function, called only when the level is on.",
          "At 20 debug calls on 1,000 requests a second, 20,000 strings a second are saved.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "An appender with a low threshold cannot bring back a record the logger already dropped.",
          "Catch per appender, so one broken disk does not silence the console.",
        ],
      },
    ],
    code: `log(level, message) {
  if (!this.isEnabled(level)) return 0;
  const text = typeof message === 'function' ? message() : message;
  const record = { time: this.now(), level, logger: this.name, text };
  let written = 0;
  for (let l = this; l; l = l.parent)
    for (const a of l.appenders) if (a.append(record)) written++;
  return written;
}`,
    say: "Loggers form a tree by dotted name, and an unset level is inherited from the nearest ancestor. I check the level before building anything, then fan the record out to appenders up the tree.",
    source: "/questions/logger#step-by-step-answer",
  },
  {
    id: "logger-lld-async-queue",
    track: "System design",
    topic: "Logger design",
    title: "Async logging needs a bounded queue and a policy",
    hook: "A slow disk must not slow the request, but a queue with no limit just moves the outage into memory.",
    points: [
      "An **async appender** is a decorator: it queues records and one worker writes them in order.",
      "Bound the queue. When it is full you must pick: **drop** the newest, or **block** the caller.",
      "Drop and **count** for debug and info noise. Block for audit lines that must never be lost.",
      "On shutdown, put a **stop marker** behind the last record so everything queued is written.",
    ],
    more: [
      {
        title: "Thread safety",
        points: [
          "Keep the appender list copy-on-write, so a call in flight iterates a snapshot with no lock.",
          "Lock each write so two threads never interleave half-lines.",
        ],
      },
      {
        title: "Singleton",
        points: ["A global logger cannot be reset between tests. Inject the manager and add a default on top."],
      },
    ],
    say: "I'd wrap slow appenders in a bounded async queue with one worker, drop and count when it is full unless the lines are audit records, and flush with a stop marker on shutdown.",
    source: "/questions/logger#async-logging",
  },
  // ── Question: ATM (LLD) ────────────────────────────────────────────────────
  {
    id: "atm-state-and-cash",
    track: "System design",
    topic: "ATM",
    title: "An ATM: a state table plus a backtracking note planner",
    hook: "The session needs a table that rejects out-of-order events, and the cash needs a planner that never strands a remainder.",
    points: [
      "Three states: **Idle**, **CardIn**, **Authenticated**. Each lists the events it accepts; the rest are rejected and change nothing.",
      "Failed PINs are counted on the **account**, so three wrong tries lock it on every machine.",
      "Greedy fails: owe 60 from one 50 and three 20s, and it takes the 50 and strands 10.",
      "A **chain of note handlers** tries the most notes, then fewer, so it finds three 20s.",
      "Four fixed notes are also fine as a **loop** with the same backtracking.",
    ],
    more: [
      {
        title: "Order of a withdrawal",
        points: [
          "Validate the amount, plan the notes, debit in one locked step, then dispense.",
          "Planning changes nothing, so most failures happen before any money moves.",
          "If the cash unit jams after the debit, credit the amount back.",
        ],
      },
      {
        title: "Two machines, one account",
        points: ["Check and subtract the balance inside the account's lock, or both machines can spend the same 50."],
      },
    ],
    code: `plan(amount, stock) {
  const d = this.denom;
  const most = Math.min(Math.floor(amount / d), stock[d] ?? 0);
  for (let n = most; n >= 0; n--) {
    const tail = this.next.plan(amount - n * d, stock);
    if (tail) return n ? { [d]: n, ...tail } : tail;
  }
  return null;
}`,
    say: "A state table for the session, a chain of note handlers that backtracks for the cash, and a withdrawal that plans first, debits under the account lock, then dispenses and undoes on a jam.",
    source: "/questions/atm#cash-is-a-chain",
  },
  {
    id: "atm-pin-and-failures",
    track: "System design",
    topic: "ATM",
    title: "Where an ATM keeps the PIN counter and how it handles a jam",
    hook: "The counter and the debit both cross machine boundaries, so each needs to live next to the account.",
    points: [
      "A counter in the session resets on the next insert. Put it on the account and update it under the account's lock.",
      "The third wrong PIN locks the account and the machine keeps the card.",
      "Debit and dispense cannot be one transaction. Debit, dispense, and **credit back** if the cash unit fails.",
      "A bank would **hold** the amount, then commit on success or release on failure.",
    ],
    more: [
      {
        title: "Power cut mid-withdraw",
        points: [
          "Write the intent before the debit and the result after the dispense.",
          "On boot, reconcile any open entry with the bank.",
        ],
      },
    ],
    say: "The PIN counter lives on the account so it is shared across machines. For a jam I credit the debit back, and in production I would hold the amount and commit or release it.",
    source: "/questions/atm#money-threads-and-failures",
  },

  // ── Question: Tic-tac-toe (LLD) ────────────────────────────────────────────
  {
    id: "tic-tac-toe-o1-win-check",
    track: "System design",
    topic: "Tic-tac-toe",
    title: "Check a tic-tac-toe win in O(1) with running totals",
    hook: "Scanning the row, column and diagonals after every move costs O(n). Keep one signed total per line instead.",
    points: [
      "Give X the value **+1** and O the value **-1**.",
      "A move touches one row, one column and at most two diagonals. Add its value to those four totals.",
      "A line is won exactly when its total is **n or -n**. A mixed line cancels toward zero.",
      "Keep a `filled` count, so a draw is `filled === n * n` and needs no scan.",
      "Check the win **before** the draw, so a last move that completes a line wins.",
    ],
    more: [
      {
        title: "Undo",
        points: [
          "Undo is the same update with the sign flipped, applied to the same four totals.",
          "Only `place` and `clear` write the grid and the totals, so they cannot drift apart.",
        ],
      },
      {
        title: "Fewer than n in a row",
        points: ["The totals stop working, because a run can sit inside a longer line. Count same marks outward from the new cell in four directions: O(k)."],
      },
    ],
    code: `wouldComplete(mark, r, c) {
  const d = mark === 'X' ? 1 : -1;
  const totals = [this.rows[r] + d, this.cols[c] + d];
  if (r === c) totals.push(this.diag + d);
  if (r + c === this.n - 1) totals.push(this.anti + d);
  return totals.some(t => Math.abs(t) === this.n);
}`,
    say: "I keep a signed total per row, column and diagonal. A move updates at most four of them, and a line is won when a total reaches n or minus n, so the check is O(1).",
    source: "/questions/tic-tac-toe#win-check-in-o1",
  },
  {
    id: "tic-tac-toe-two-clients",
    track: "System design",
    topic: "Tic-tac-toe",
    title: "Two clients, one tic-tac-toe game: lock plus version",
    hook: "If two requests act on the same board, one can silently overwrite the other. Make the move a single atomic step.",
    points: [
      "Take a **lock per game** so the turn check and the cell check are one step.",
      "Send a **version** with every move. A move based on an old version is refused as stale.",
      "The server owns whose turn it is. Never trust a client to say it.",
      "A rejected move changes nothing and does not use up the turn.",
    ],
    more: [
      {
        title: "Why a version",
        points: [
          "A lock alone orders the requests but cannot tell that the second one was decided on an old board.",
          "The stale client refreshes the board and decides again.",
        ],
      },
    ],
    say: "One writer per game, and a version in every request. If the version is old, the move is stale and the client refreshes. The server decides whose turn it is.",
    source: "/questions/tic-tac-toe#two-clients-one-game",
  },

  // ── Question: Snake and Ladder (LLD) ───────────────────────────────────────
  {
    id: "snake-and-ladder-lld-one-jump",
    track: "System design",
    topic: "Snake and Ladder",
    title: "Snake and Ladder: one jump map, no Snake class",
    hook: "A snake and a ladder behave the same way. Only the direction differs, so they do not need two classes.",
    points: [
      "The board is a size and one map: square to square. A higher end is a **ladder**, a lower end is a **snake**.",
      "Refuse a jump from the **last square**, or the winner could slide away.",
      "Refuse any jump that lands on **another jump's start**. Chains can loop forever.",
      "A ladder onto the last square is a **win**, so check the win after the jump.",
      "Each turn returns a result: player, roll, from, to and an event.",
    ],
    more: [
      {
        title: "Watch out",
        points: [
          "A class per square, or a builder for two numbers, is over-engineering.",
          "If you allow chains, follow them in a loop and remember the squares you visited.",
        ],
      },
    ],
    code: `for (const [from, to] of jumps) {
  if (from < 1 || from >= size) throw new RangeError('start');
  if (to < 1 || to > size || to === from) throw new RangeError('end');
  if (jumps.has(to)) throw new RangeError('chain');  // could loop
}`,
    say: "A snake and a ladder are the same thing, a jump from one square to another, so the board has one map. I refuse chains and jumps from the last square at construction.",
    source: "/questions/snake-and-ladder#step-by-step-answer",
  },
  {
    id: "snake-and-ladder-lld-strategies",
    track: "System design",
    topic: "Snake and Ladder",
    title: "Dice and the ending rule are the two strategies",
    hook: "Ask what happens past the last square before coding. That rule changes, so it belongs behind an interface.",
    points: [
      "**Exact**: must land on the last square, else stay. **Finish**: any roll that reaches it wins. **Bounce**: extra steps walk back.",
      "An ending rule maps position, roll and size to a landing square, or refuses the move.",
      "**Dice** are passed in. Random dice play the game and fixed dice make every test repeatable.",
      "A six may give another turn. Say whether a refused move still earns it.",
    ],
    more: [
      {
        title: "Concurrency",
        points: [
          "One game has one writer at a time: lock the whole turn so a player never moves twice.",
          "Different games share nothing and never wait for each other.",
        ],
      },
    ],
    say: "The dice and the ending rule are strategies. Tests pass fixed dice, and a new overshoot rule is one new class with no edits to the game.",
    source: "/questions/snake-and-ladder#patterns-and-when-to-skip-them",
  },
  // ── Question: Splitwise (LLD) ──────────────────────────────────────────────
  {
    id: "splitwise-cents-and-strategies",
    track: "System design",
    topic: "Splitwise",
    title: "Splitwise: integer cents and a strategy per split type",
    hook: "Shares must add up to the bill, to the cent, and the same input must always give the same split.",
    points: [
      "Keep money in **integer cents**. A dinner is `1001`, not `10.01`.",
      "Each split type is a **strategy**: it turns an amount into one share per person, or says the data is invalid.",
      "Floor every proportional share, then give the leftover cents one each to the **first people, in order**.",
      "1001 cents among three is 334, 334, 333, and the shares always sum to the bill.",
      "Validate the whole expense first, so a bad one never half-applies.",
    ],
    more: [
      {
        title: "Four split types",
        points: [
          "Equal, exact (must sum to the amount), percent (whole, summing to 100) and shares (positive weights).",
          "Equal, percent and shares share one rounding routine, so the stray cent is handled in one place.",
        ],
      },
      {
        title: "Over-engineering",
        points: ["If only equal splits are asked for, a plain function is enough. Add the interface with the second type."],
      },
    ],
    code: `const shares = weights.map(w => Math.floor(amount * w / total));
let left = amount - sum(shares);
for (let i = 0; left > 0; i++, left--) shares[i]++;`,
    say: "Money is integer cents. Each split type is a strategy returning one share per person, and the leftover cents go one each to the first people in order, so shares always sum to the bill.",
    source: "/questions/splitwise#splitting-the-bill",
  },
  {
    id: "splitwise-simplify-debts",
    track: "System design",
    topic: "Splitwise",
    title: "Simplify debts by matching biggest debtor to biggest creditor",
    hook: "Pair debts can form chains. Net balances show who really needs to pay whom.",
    points: [
      "Net each person: what they are owed minus what they owe. The nets always sum to 0.",
      "Take the **biggest debtor** and the **biggest creditor**, and move the smaller of the two amounts.",
      "Drop whoever reaches 0, and repeat. Each payment clears at least one person.",
      "So n people need at most **n - 1** payments. Break ties by name so the result repeats.",
      "The true minimum is **NP-hard** in general, so say greedy is not always the fewest.",
    ],
    more: [
      {
        title: "A chain",
        points: ["Ann owes Ben 10 and Ben owes Cam 10. Ben's net is 0, so one payment, Ann to Cam, settles both."],
      },
      {
        title: "Races",
        points: ["Settle-up must check and subtract in one locked step, or two taps can both pay the same debt."],
      },
    ],
    say: "I net everyone's balance, then repeatedly pay the biggest debtor to the biggest creditor, breaking ties by name. That needs at most n - 1 payments, though the true minimum is NP-hard.",
    source: "/questions/splitwise#simplifying-debts",
  },

  // ── Question: Library management (LLD) ─────────────────────────────────────
  {
    id: "library-copy-state-machine",
    track: "System design",
    topic: "Library system",
    title: "A library copy is a state machine, and the queue comes first",
    hook: "A title and a physical copy are different things. A copy moves through a few states, and a returned copy must reach the queue before anyone else.",
    points: [
      "**Book** is the title people search and reserve. **BookItem** is one physical copy that is loaned.",
      "A copy is **AVAILABLE**, **LOANED**, **HELD** for a waiting member, or **LOST**. Only listed moves are legal.",
      "A returned copy goes to the first member in the queue, who is told. It is available only if nobody waits.",
      "A hold has a **deadline**. If it lapses, the copy passes to the next member or becomes available.",
    ],
    more: [
      {
        title: "Why the queue comes first",
        points: [
          "If a returned copy became available first, a walk-in could take it ahead of someone who waited a week.",
          "So a free copy exists only when the queue is empty, and borrow can just take any available one.",
        ],
      },
      {
        title: "Watch out",
        points: [
          "A member at their loan limit cannot collect a held copy. Check the limit first and keep the hold.",
          "Send overdue notices once per loan, not once per daily sweep.",
        ],
      },
    ],
    say: "A copy is a small state machine, and a returned copy is handed to the reservation queue before it can become available, so the queue stays fair. Holds expire so an absent member cannot block the next one.",
    source: "/questions/library-management#a-copys-life",
  },
  {
    id: "library-last-copy-race",
    track: "System design",
    topic: "Library system",
    title: "Two members, one last copy: make check-and-loan atomic",
    hook: "Checking that a copy is available and then marking it loaned are two steps. Two requests can both pass the check.",
    points: [
      "The bug: both requests see **AVAILABLE**, both write **LOANED**, and one copy has two loans.",
      "Fix it with one lock around the change, or in SQL a **conditional update**: set LOANED where the state is still AVAILABLE.",
      "Then read how many rows changed. Zero means someone else won, so answer NO_COPY.",
      "Check the **member limit** in the same step, or two quick borrows slip past it.",
      "Tell listeners **after** the lock is released, so a slow email never blocks a borrow.",
    ],
    more: [
      {
        title: "Scaling it",
        points: [
          "One lock for the whole library is correct. Use a lock per title when contention shows up.",
          "A database row is the lock when copies live in a table.",
        ],
      },
    ],
    code: `UPDATE book_item
   SET state = 'LOANED', loan_id = $2
 WHERE id = $1 AND state = 'AVAILABLE';
-- 1 row changed: you got it. 0 rows: someone else did.`,
    say: "The last copy is a race. I make the check and the move to LOANED one atomic step, with a lock or a conditional update, and treat zero rows changed as no copy.",
    source: "/questions/library-management#the-last-copy",
  },
];
