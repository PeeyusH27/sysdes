import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "A config file says channel: 'sms'. Today there are two channels, next quarter twelve, and plugins will add more. Where should the 'which class?' decision live?",
    options: [
      "In every caller, as a switch next to where the channel is used",
      "In one registry or factory that every caller asks",
      "In a Singleton that holds all the channels",
    ],
    answer: 1,
    explain: "Decide in exactly one place. Callers then ask for a channel by name and never learn which classes exist, so a new kind is one register() call. A switch in every caller is the thing the factory removes.",
  },
  {
    q: "Only one Logger ever exists, yet Logger.getInstance() called from 40 files is still a smell. Why?",
    options: [
      "Creating a single object is slow",
      "Callers gain a hidden dependency that tests cannot replace or reset",
      "A Singleton cannot be thread safe",
    ],
    answer: 1,
    explain: "One instance is fine. The problem is the global access point: nothing in a function's signature shows it uses the logger, and a test cannot swap it or start from a clean state. Create it once and pass it in.",
  },
  {
    q: "A user types 'a', 'b', 'c', undoes twice, then types 'x'. What can redo do now?",
    options: [
      "Restore 'b'",
      "Restore 'b' and then 'c'",
      "Nothing: a new edit clears the redo stack",
    ],
    answer: 2,
    explain: "Undoing moved 'c' and 'b' to the redo stack. The new edit starts a different future, so History clears that stack. The text is 'ax' and redo returns false.",
  },
];
