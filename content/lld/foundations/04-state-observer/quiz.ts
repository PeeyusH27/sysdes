import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A door has 3 states and 4 events. How many (state, event) pairs must the design give an outcome, and what happens to the ones not in the table?",
    options: ["12, and unlisted ones are rejected without changing anything", "4, because only legal ones matter", "12, and unlisted ones throw away the current state"],
    answer: 0,
    explain: "Every pair needs exactly one outcome. Most are 'not allowed here', and the safe outcome is to reject the event and leave the state alone, so the machine can never land in a state nobody designed.",
  },
  {
    q: "Why does emit loop over a copy of the listeners?",
    options: ["It is faster", "A listener may unsubscribe (itself or another) during the loop, and changing a collection while iterating it skips or breaks entries", "It keeps listeners in random order"],
    answer: 1,
    explain: "With a copy, the loop is not disturbed by removals. The cost is a rule: a listener removed during a notification still hears that one event, and is gone for the next.",
  },
  {
    q: "When should the door tell its listeners about a transition?",
    options: ["Before changing state, so listeners can veto it", "After the state has changed, and only for legal transitions", "Once per second"],
    answer: 1,
    explain: "Announce after the change is complete so a listener that reads the door sees the new state. Rejected events changed nothing, so there is nothing to announce.",
  },
];
