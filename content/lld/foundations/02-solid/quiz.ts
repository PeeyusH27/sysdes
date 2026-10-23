import type { QuizItem } from "@/components/content/Quiz";

export const quiz: QuizItem[] = [
  {
    q: "areaAt4By5 sets width 4 and height 5 and expects an area of 20. It returns 25 for a Square that extends Rectangle. Which principle is broken?",
    options: ["Open/closed", "Liskov substitution", "Interface segregation"],
    answer: 1,
    explain: "Code written against Rectangle relies on width and height changing independently. A subclass that cannot be used wherever its parent is used breaks substitution.",
  },
  {
    q: "OrderService calls new SmtpMailer() inside place(). What does injecting a Mailer through the constructor buy you most directly?",
    options: [
      "A faster program",
      "A test can pass a fake mailer, with no mail server",
      "Fewer classes in the codebase",
    ],
    answer: 1,
    explain: "The service now depends on a small interface it owns, so a test hands in a fake that records messages. It adds a class, and speed is unchanged.",
  },
  {
    q: "A class has one implementation, no test needs a fake, and no second one is planned. Should you extract an interface for it?",
    options: [
      "Yes, SOLID says to depend on abstractions everywhere",
      "Not yet: extract it when a second variant or a test fake appears",
      "Yes, but only if the class name ends in Service",
    ],
    answer: 1,
    explain: "Principles are answers to pain you can name. With no varying behaviour and no test seam, the interface is just another file to keep in sync.",
  },
];
