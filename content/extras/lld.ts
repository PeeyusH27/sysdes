// Page extras for the six LLD foundation lessons (content/lld/foundations/<dir>/page.mdx), keyed by lesson slug.
// Contract: docs/AUTHORING-EXTRAS.md. Numbers and trade-offs are taken from the lesson they belong to.
import type { PageExtras } from "./types";

export const extras: Record<string, PageExtras> = {
  "thinking-in-objects": {
    // No doodle: the set has none for "find the classes in a prompt".
    // Core: nouns and verbs, who owns the behaviour (god class to small classes), composition over inheritance,
    // the too-many-classes trap, practice. Folded: the scoring rubric, the diagram and relationship vocabulary, tell-don't-ask.
    detail: [
      "what-an-lld-round-scores",
      "the-relationships-you-draw",
      "what-each-line-means-in-code",
      "encapsulation-and-tell-dont-ask",
    ],
    sayIt: {
      answer:
        "I start an LLD answer by reading the requirements twice: nouns become classes, verbs become methods, and I ask of each method who owns it. Rules live next to the data they read, I prefer composition to inheritance, and I stop adding classes when a new one has nothing to protect.",
      numbers: [
        { value: "4 scores", label: "Requirements, model, change, a working core" },
        { value: "5 to 8", label: "Classes that usually suffice for a classic question" },
        { value: "1 sentence", label: "What a class must protect, or merge it away" },
      ],
      tradeoffs: [
        "Composition vs inheritance: a part you swap, and a hybrid that is a new part, against a tree that multiplies with every new trait.",
        "Composition vs dependency: composition creates and owns the part, so a test cannot swap it; a dependency is handed in, so a fake fits.",
        "Few classes vs a class per noun: five to eight classes with a reason each beat Manager and Factory suffixes that protect nothing.",
      ],
      mention:
        "Say which single class you would edit if a rule changed (students get 7 days instead of 14), because a rule written in two places is how a god class bites.",
    },
  },

  solid: {
    doodle: "solid",
    // Core: the five questions as a table, single responsibility, open/closed, dependency inversion (the three that drive most designs),
    // SOLID as vocabulary and when to stop, follow-ups. Folded: Liskov and interface segregation (both are summarised in the table).
    detail: [
      "liskov-substitution-keep-the-parents-promise",
      "interface-segregation-small-contracts",
    ],
    sayIt: {
      answer:
        "SOLID is five questions I ask a design when a requirement changes: how many reasons does a class have to change, can I add instead of edit, can a subtype stand in, is the contract too wide, and does policy depend on detail. I use them as one concrete sentence that names the change and where it lands.",
      numbers: [
        { value: "5 principles", label: "Five questions asked of a design" },
        { value: "1 reason", label: "Reasons to change per class: single responsibility" },
        { value: "3 branches", label: "An if ladder this long cues extraction" },
      ],
      tradeoffs: [
        "Interface now vs when pain arrives: extract at a second variant or a test fake; wrapping every class costs readability, not change.",
        "Wide vs small interfaces: one wide contract makes Cash stub refund and throw; role interfaces let a one-method fake test checkout.",
        "Injection vs inversion: injection passes a collaborator in; inversion makes the high-level code own the interface the detail implements.",
      ],
      mention:
        "Do not wrap every class in an interface, a factory and a manager: pay for an abstraction only where you can name the requirement that varies.",
    },
  },

  "strategy-decorator": {
    doodle: "strategy",
    // Core: Strategy, Decorator, the growing diagram, the wrapping-order trap (the part interviewers probe), practice and follow-ups.
    // Folded: the motivating if ladder, strategy vs a plain function, the over-engineering reminder.
    detail: [
      "the-ladder-that-grows",
      "strategy-decorator-or-just-a-function",
      "the-over-engineering-trap",
    ],
    sayIt: {
      answer:
        "When a rule keeps changing, like how a stay becomes a price, I put it behind a one-method interface: Strategy. Optional adjustments such as a grace period, a cap or a discount are Decorators, wrappers with the same interface that stack. The wrapping order is part of the rule, so I pin it with a test.",
      numbers: [
        { value: "1 method", label: "Size of the strategy interface: fee(stay)" },
        { value: "80 vs 50", label: "Same night stay, opposite wrapping order" },
        { value: "3rd case", label: "Cue to extract; two cases stay an if" },
      ],
      tradeoffs: [
        "Strategy vs Decorator: a strategy is an alternative chosen from outside; a decorator adjusts another strategy by wrapping it, and they stack.",
        "Class vs plain function: a function is the shortest strategy; use a class for inspectable configuration, several methods, state or a name for logs.",
        "Cap(NightDiscount) vs NightDiscount(Cap): 80 against 50 on an 8-hour night stay; neither is a bug, they are different policies.",
      ],
      mention:
        "Say out loud that wrapping order changes the answer, put the grace period outermost, and test both orders of any two rules that interact.",
    },
  },

  "state-observer": {
    doodle: "state-machine",
    // Core: the state table first, illegal moves made impossible, Observer, where Observer bites, practice and follow-ups.
    // Folded: the flags story, table vs State objects, the observable door, Observer vs event bus.
    detail: [
      "the-flags-that-rot",
      "two-ways-to-code-a-table",
      "let-the-door-announce-itself",
      "observer-or-an-event-bus",
    ],
    sayIt: {
      answer:
        "For an object that behaves differently by phase, I write the state table first: every state and event pair has one outcome, and anything not listed is rejected with nothing changed. Then the object announces each legal change to subscribers, so listeners can be added without edits. I raise the Observer pitfalls before I am asked.",
      numbers: [
        { value: "4 of 12", label: "Legal door moves out of 12 pairs, 8 rejected" },
        { value: "3 failures", label: "Classic Observer failures: unsubscribe mid-loop, throwing listener, leaks" },
        { value: "1 variable", label: "Holds the state; every change goes through send(event)" },
      ],
      tradeoffs: [
        "Table vs State objects: start with the table; move to State objects when a state grows its own fields or steps.",
        "Push vs pull: push carries from, event and to, so listeners need no door; pull gives the newest state but loses changes in between.",
        "Observer vs event bus: an observer attaches to one object; a bus routes topics, but you lose the direct call to follow.",
      ],
      mention:
        "A throwing listener must not stop the others, and a listener removed mid-notification still hears that one event, because emit loops over a copy.",
    },
  },

  "creation-and-commands": {
    doodle: "undo",
    // Core: create by name (factory or registry), Singleton as a smell, Command and its two stacks, grouping into one undo step,
    // which one and when, follow-ups. Folded: Builder, the growing diagram, the over-engineering reminder.
    detail: [
      "builder-and-when-it-is-overkill",
      "watch-the-design-grow",
      "the-over-engineering-trap",
    ],
    sayIt: {
      answer:
        "I decide which class to create in one place, a factory or registry, so a new kind is one register call. I skip the Builder when an options object will do, and I replace a Singleton with one instance created at startup and passed in. For undo and redo I model each action as a command with do and undo, on two stacks.",
      numbers: [
        { value: "1 place", label: "Where the choice of class to create lives" },
        { value: "2 stacks", label: "History keeps done and undone, for undo and redo" },
        { value: "10 million", label: "Characters a snapshot undo stores for 1,000 edits" },
      ],
      tradeoffs: [
        "Registry vs one switch: a registry adds kinds without editing old code; for few fixed kinds, one switch in one place is enough.",
        "Singleton vs injected instance: both give one in production; injection makes the dependency visible and testable.",
        "Snapshot undo vs commands: snapshots are simplest but cost document size times edits; commands store less but each needs a correct undo.",
      ],
      mention:
        "Clear the redo stack when a new edit follows an undo, and make each command remember exactly what it changed, so undo restores exactly that.",
    },
  },

  "lld-playbook": {
    // No doodle: the playbook is a process, and nothing in the set draws a process.
    // Core: what interviewers score, the 45-minute plan, the repeatable template, which pattern a requirement calls for,
    // the concurrency checklist, practice order, follow-ups. Folded: the extensibility check, the injected clock,
    // the worked example, the stuck recovery list.
    detail: [
      "the-extensibility-check",
      "test-with-an-injected-clock",
      "worked-example-a-meeting-room-booker",
      "when-you-are-stuck",
    ],
    sayIt: {
      answer:
        "I run every LLD round the same way: clarify, use cases, entities, public interface, diagram, code the core, then stress the design for extensibility, concurrency and tests, in about 45 minutes. I pick a pattern only when a requirement hurts, name the race before I am asked, and inject the clock so tests are deterministic.",
      numbers: [
        { value: "45 min", label: "Round length: 5, 12, 16 and 12 minute blocks" },
        { value: "9 steps", label: "Repeatable template, clarify through tests" },
        { value: "3 or 4 tests", label: "Happy path, boundary, failure, injected-clock case" },
      ],
      tradeoffs: [
        "Pattern first vs pain first: start from the wording of the requirement and let the pain choose; a plain class is right when nothing hurts.",
        "Lock per room vs one global lock: lock the invariant, not the world; hold it briefly, never across slow I/O.",
        "In-memory lock vs database constraint: a lock protects one process; across servers a unique constraint or conditional update arbitrates.",
      ],
      mention:
        "Name the check-then-act race before they ask, and never say Node is single threaded: any await between the check and the act reopens the gap.",
    },
  },
};
