// The low-level design (LLD) track: a short foundations path, the classic LLD questions (which live in
// content/questions/ and are marked with the "lld" tag), and runnable exercises in content/lld/exercises/.
// Lesson bodies live next to this file: content/lld/foundations/<dir>/page.mdx.
// Exercises are folders discovered from disk (src/lib/dsa/load.ts: loadExercises); their `patterns` are lesson slugs.

export interface LldLesson {
  slug: string;
  dir: string;
  order: number;
  title: string;
  short: string;
  summary: string;
  minutes: number;
  tags: string[];
  outcomes: string[];
  next: string;
}

export const lldLessons: LldLesson[] = [
  {
    slug: "thinking-in-objects", dir: "01-thinking-in-objects", order: 1,
    title: "From Requirements to Classes", short: "Thinking in objects",
    summary: "Every LLD answer starts the same way: read the requirements, pull out the nouns and verbs, and decide who owns which responsibility.",
    minutes: 25, tags: ["classes", "responsibility", "composition", "encapsulation"],
    outcomes: ["Turn a prompt into entities, methods and relationships", "Choose composition over inheritance and say why", "Spot a class that owns too much"],
    next: "Good classes are easy to extend. SOLID names the five ways they stop being easy.",
  },
  {
    slug: "solid", dir: "02-solid", order: 2,
    title: "SOLID, with Code That Breaks", short: "SOLID",
    summary: "Five principles that explain why a design survives the next requirement. Each one is shown as code that hurts, then code that doesn't.",
    minutes: 30, tags: ["solid", "srp", "open/closed", "dependency inversion", "interfaces"],
    outcomes: ["Recognise each SOLID violation in real code", "Fix it with a small interface or a split class", "Use the principles as a vocabulary in the interview"],
    next: "The cheapest way to satisfy open/closed is to let behaviour be swapped. That is Strategy and Decorator.",
  },
  {
    slug: "strategy-decorator", dir: "03-strategy-decorator", order: 3,
    title: "Swap Behaviour: Strategy and Decorator", short: "Strategy & Decorator",
    summary: "Replace an if/else ladder with an object you can swap, and stack extra rules around it without editing the original.",
    minutes: 25, tags: ["strategy", "decorator", "pricing", "open/closed"],
    outcomes: ["Pull a varying rule behind an interface", "Combine rules by wrapping instead of branching", "Tell Strategy and Decorator apart"],
    next: "Some behaviour changes with what the object is doing right now. That is State, and its cousin Observer.",
  },
  {
    slug: "state-observer", dir: "04-state-observer", order: 4,
    title: "State Machines and Observers", short: "State & Observer",
    summary: "Model an object that behaves differently in each phase as a state machine, and let other objects react to its changes without being wired into it.",
    minutes: 25, tags: ["state", "observer", "events", "vending machine", "elevator"],
    outcomes: ["Draw a state table and turn it into code", "Make illegal transitions impossible", "Publish events so listeners can be added without edits"],
    next: "Next: how objects get created, and how actions become objects you can undo.",
  },
  {
    slug: "creation-and-commands", dir: "05-creation-and-commands", order: 5,
    title: "Factory, Builder, Singleton and Command", short: "Factory & Command",
    summary: "Four patterns that show up constantly, and the honest answer to when each one is overkill.",
    minutes: 25, tags: ["factory", "builder", "singleton", "command", "undo", "dependency injection"],
    outcomes: ["Choose between a constructor, a factory and a builder", "Explain why a Singleton is usually a smell, and what to do instead", "Model undo and redo with commands"],
    next: "You have the pieces. Last: how to run a 45-minute LLD interview with them.",
  },
  {
    slug: "lld-playbook", dir: "06-lld-playbook", order: 6,
    title: "The LLD Interview Playbook", short: "Playbook",
    summary: "A repeatable 45-minute structure, what interviewers actually score, and the mistakes that cost points.",
    minutes: 20, tags: ["interview", "framework", "testing", "concurrency"],
    outcomes: ["Run an LLD round with a fixed structure", "Know where to spend the time and where to stop", "Check a design for extensibility, concurrency and testability"],
    next: "",
  },
];

export const getLldLesson = (slug: string) => lldLessons.find((l) => l.slug === slug);

/** The coding exercises that practise each classic LLD question (by question slug). Used by the readiness map. */
export const questionExercises: Record<string, string[]> = {
  "parking-lot": ["parking-lot", "pricing-rules"],
  "vending-machine": ["vending-machine"],
  elevator: [],
};
