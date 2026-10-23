import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A stay costs 160 before rules. The rules are a night discount of 50% and a cap of 100. What does a night driver pay for Cap(NightDiscount(base))?",
    options: ["50", "80", "100"],
    answer: 1,
    explain: "The inner NightDiscount runs first: 160 becomes 80. The outer Cap then sees 80, which is under 100, and leaves it alone. Wrapping the other way (Cap inside) gives 100 then 50.",
  },
  {
    q: "What makes a class a decorator rather than just another strategy?",
    options: ["It implements the same interface", "It holds another object of that interface and calls it", "It has no state"],
    answer: 1,
    explain: "Every strategy implements the interface. A decorator also wraps an inner one, so it can change its input or its answer and be stacked with other rules.",
  },
  {
    q: "In JavaScript or Python, when is a plain function a good enough strategy?",
    options: ["Never, patterns need classes", "When the rule is one small calculation with no state to configure or inspect", "Only for sorting"],
    answer: 1,
    explain: "A function is a strategy with one method. Reach for a class when the rule carries configuration, state, several methods or a name you need to log.",
  },
];
