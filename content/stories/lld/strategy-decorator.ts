import { pricingDesign } from "../../lld/foundations/03-strategy-decorator/diagrams";
import type { Story } from "../types";

export const story: Story | undefined = {
  learn: [
    {
      head: "A rule that keeps changing",
      body: "Some rules change often, like how a parking stay becomes a price. Packed into one chain of ifs, every new rule means editing code that already works, and it may break.",
      eg: "A parking garage tariff",
      example: "Hourly on weekdays, flat on weekends, a cap for long stays, a night discount. Each new rule was one more branch squeezed into the same method.",
      doodle: "strategy",
    },
    {
      head: "Strategy: swap the rule",
      body: "Put the rule behind one small interface with a single method, such as fee of a stay. Hourly and flat become separate classes. The garage just calls whichever one it was given.",
      eg: "Picking a route in maps",
      example: "A maps app can plan by fastest, shortest or avoiding tolls. The app asks the chosen planner for a route and does not care how it works inside.",
    },
    {
      head: "Decorator: wrap to add",
      body: "A decorator has the same interface as the rule it wraps. It calls the inner rule, then adjusts the result: cap it, discount it, add a grace period. Wrappers stack like layers.",
      eg: "Coffee with extras",
      example: "A plain coffee wrapped with milk, then with syrup, is still served as a coffee. Each add-on adjusts the price of whatever is inside it.",
    },
    {
      head: "Order matters when stacking",
      body: "Each wrapper sees the number from the one inside it. Apply a cap then a discount, or a discount then a cap, and the final price can differ. So the order is part of the rule.",
      eg: "Two coupons at checkout",
      example: "A 10 percent coupon and a 5 dollar coupon give different totals depending on which applies first. The shop's policy decides the order.",
    },
    {
      head: "Do not over-build it",
      body: "Two fixed rules can stay a plain if. Reach for classes when a third case arrives or the rules keep changing. A pattern that solves no problem only makes code harder to read.",
      eg: "A nail gun for one picture",
      example: "Renting a nail gun to hang a single picture is worse than a hammer. Use the heavier tool when you have a wall of nails.",
    },
  ],
  steps: [
    {
      tag: "pain",
      head: "One class, one long ladder",
      line: "Every price rule is an if inside checkout. A new rule edits it and can break old ones.",
      scene: { kind: "classes", spec: pricingDesign, stage: 0 },
    },
    {
      tag: "sum",
      head: "How many rules is too many?",
      line: "A couple of fixed rules do not need classes. Drag to see where it tips.",
      scene: {
        kind: "meter",
        label: "Pricing rules",
        unit: "rules",
        min: 1,
        max: 12,
        start: 2,
        stops: [
          { upTo: 2, verdict: "A plain if is fine", tone: "good" },
          { upTo: 4, verdict: "Either works. Watch for change", tone: "warn" },
          { upTo: 12, verdict: "Pull each rule into a class", tone: "bad" },
        ],
      },
      predict: { q: "Six pricing rules that keep changing. Plain if or Strategy?", options: ["Plain if", "Strategy"], answer: 1, why: "Each rule gets its own class, so a change touches one place." },
    },
    {
      tag: "idea",
      head: "Pull the rule out",
      line: "Garage holds a price rule and calls it. Hourly and flat are separate classes.",
      scene: { kind: "classes", spec: pricingDesign, stage: 1 },
    },
    {
      tag: "idea",
      head: "Wrap to add a rule",
      line: "A cap looks like any other rule, so Garage needs no change.",
      scene: { kind: "classes", spec: pricingDesign, stage: 2 },
    },
    {
      tag: "choose",
      head: "Plain if, or a class?",
      line: "The tipping point is how often rules change, not how clever the design looks.",
      scene: {
        kind: "versus",
        left: { title: "Plain if is fine", points: ["Two rules", "They rarely change", "One person owns it"] },
        right: { title: "Use Strategy", points: ["Rules keep arriving", "Swap at runtime", "Test each rule alone"] },
      },
    },
    {
      tag: "catch",
      head: "Order matters when stacking",
      line: "A grace period and a night discount are wrappers. The order decides which number each sees.",
      scene: { kind: "classes", spec: pricingDesign, stage: 3 },
    },
    {
      tag: "skip",
      head: "Do not over-build it",
      line: "Interviewers mark down a factory for one rule as much as a god class.",
      scene: {
        kind: "verdicts",
        items: [
          { label: "FeeStrategy", tone: "good", why: "One swappable rule" },
          { label: "Cap wrapper", tone: "good", why: "A new rule, no edits" },
          { label: "FeeStrategyFactory", tone: "bad", why: "Nothing to choose yet" },
          { label: "Manager class", tone: "bad", why: "Protects nothing" },
        ],
      },
    },
  ],
};
