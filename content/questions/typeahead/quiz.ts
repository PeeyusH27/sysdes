import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "What stops suggestions for an older query from replacing the newer ones?",
    options: ["Debouncing alone", "Aborting stale requests and ignoring results whose signal was aborted", "Caching every response"],
    answer: 1,
    explain: "Debounce cuts requests, but two can still be in flight and answer in any order. Abort the old one, and drop any result that arrives after its signal was aborted.",
  },
  {
    q: "Which element gets role=\"combobox\"?",
    options: ["The text input", "The ul that holds the suggestions", "Each suggestion"],
    answer: 0,
    explain: "The input is the combobox. It points at the list with aria-controls and at the active option with aria-activedescendant. The ul is the listbox and each li an option.",
  },
  {
    q: "Why call preventDefault in each option's onMouseDown?",
    options: ["To stop text selection styling", "To keep focus in the input, so blur doesn't close the list before the click registers", "To block the browser's built-in autocomplete"],
    answer: 1,
    explain: "mousedown fires before click and would blur the input. Blur closes the popup, so the click would land on nothing. Preventing the default keeps focus in place.",
  },
];
