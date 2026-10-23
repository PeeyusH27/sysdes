import type { ClassSpec, DecisionSpec } from "@/components/diagram/types";

export const pricingDesign: ClassSpec = {
  id: "pricing-strategy-decorator",
  title: "Pricing design, built up in four steps",
  description:
    "Garage starts with the whole fee calculation inside it. Step by step the calculation moves behind the PricingStrategy interface, concrete rates implement it, and decorators implement it too while holding another strategy, so grace periods, caps and discounts stack without touching Garage.",
  classes: [
    { id: "garage", name: "Garage", col: 0, row: 1, methods: ["checkout(stay): fee"] },
    { id: "strategy", name: "PricingStrategy", col: 1, row: 1, stereotype: "interface", methods: ["fee(stay): number"] },
    { id: "hourly", name: "HourlyRate", col: 2, row: 0, fields: ["rate"], methods: ["fee(stay)"] },
    { id: "flat", name: "FlatRate", col: 3, row: 0, fields: ["amount"], methods: ["fee(stay)"] },
    { id: "cap", name: "Cap", col: 2, row: 2, fields: ["inner: PricingStrategy", "max"], methods: ["fee(stay)"] },
    { id: "grace", name: "GracePeriod", col: 2, row: 1, fields: ["inner: PricingStrategy", "minutes"], methods: ["fee(stay)"] },
    { id: "night", name: "NightDiscount", col: 3, row: 2, fields: ["inner: PricingStrategy", "percentOff"], methods: ["fee(stay)"] },
  ],
  relations: [
    { from: "garage", to: "strategy", type: "association", label: "pricing" },
    { from: "hourly", to: "strategy", type: "implements" },
    { from: "flat", to: "strategy", type: "implements" },
    { from: "cap", to: "strategy", type: "implements", label: "wraps one" },
    { from: "grace", to: "strategy", type: "implements", label: "wraps one" },
    { from: "night", to: "strategy", type: "implements", label: "wraps one" },
  ],
  stages: [
    {
      title: "One class, one ladder",
      note: "Garage computes the fee itself: every vehicle, grace period, discount and cap is an if inside checkout. Each new rule edits this class and can break the old ones.",
      add: ["garage"],
    },
    {
      title: "Pull the rule out",
      note: "The fee becomes a PricingStrategy. Garage only holds one and calls fee(stay). Hourly and flat pricing are separate classes, and switching between them is a one-line assignment.",
      add: ["strategy", "hourly", "flat"],
    },
    {
      title: "Wrap to add a rule",
      note: "Cap implements the same interface and holds another strategy. Garage cannot tell the difference, so a cap needs no change to Garage, HourlyRate or FlatRate.",
      add: ["cap"],
    },
    {
      title: "Stack more rules",
      note: "A grace period and a night discount are two more wrappers. Any order is legal, and the order is part of the pricing rule: it decides which number each rule sees.",
      add: ["grace", "night"],
    },
  ],
};

export const chooseShape: DecisionSpec = {
  id: "strategy-decorator-function",
  title: "If, function, strategy or decorator?",
  start: "grow",
  nodes: {
    grow: {
      q: "Will this rule grow beyond two cases, or change on its own schedule?",
      yes: "small",
      no: "keepIf",
    },
    small: {
      q: "Is it one small calculation with nothing to configure and no state?",
      yes: "fn",
      no: "wraps",
    },
    wraps: {
      q: "Does the new rule adjust the answer of another rule instead of replacing it?",
      yes: "decorator",
      no: "strategy",
    },
    keepIf: {
      result: "Keep the if",
      why: "Two cases that rarely change are clearer as an if. Extract the interface when the third case arrives, not before.",
    },
    fn: {
      result: "Pass a function",
      why: "In JavaScript and Python a function is already a strategy. A function that wraps a function is already a decorator.",
    },
    decorator: {
      result: "Decorator",
      why: "A cap, a discount or a grace period only makes sense on top of another rule. Wrap it, and decide the order on purpose.",
    },
    strategy: {
      result: "Strategy",
      why: "The rule is one of several whole alternatives (hourly, flat, event day). Put them behind one interface and inject the one you want.",
    },
  },
};
