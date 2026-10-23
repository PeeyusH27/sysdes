import type { ClassSpec, SequenceSpec, DecisionSpec } from "@/components/diagram/types";

export const doorObservers: ClassSpec = {
  id: "door-observers",
  title: "A door that announces its changes, in four steps",
  description:
    "Door owns its state and the transition table behind send(event). An Emitter inside it holds a set of listeners and calls each one after a legal transition. Listeners implement one tiny interface, so the log, the alarm and a display can be added without editing Door.",
  classes: [
    { id: "door", name: "Door", col: 0, row: 1, fields: ["state: closed | open | locked"], methods: ["send(event): result", "subscribe(fn): unsubscribe"] },
    { id: "emitter", name: "Emitter", col: 1, row: 1, fields: ["listeners: Set"], methods: ["subscribe(fn): unsubscribe", "emit(event): errors"] },
    { id: "listener", name: "DoorListener", col: 2, row: 1, stereotype: "interface", methods: ["(event): void"] },
    { id: "log", name: "DoorLog", col: 3, row: 0, methods: ["(event): write a line"] },
    { id: "alarm", name: "Alarm", col: 3, row: 1, fields: ["armed: boolean"], methods: ["(event): arm when locked"] },
    { id: "display", name: "StatusDisplay", col: 3, row: 2, methods: ["(event): show the new state"] },
  ],
  relations: [
    { from: "door", to: "emitter", type: "composition" },
    { from: "emitter", to: "listener", type: "association", label: "calls each" },
    { from: "log", to: "listener", type: "implements" },
    { from: "alarm", to: "listener", type: "implements" },
    { from: "display", to: "listener", type: "implements" },
  ],
  stages: [
    {
      title: "One class",
      note: "Door owns its state and a send(event) method. If a log, an alarm and a display should react to changes, the only place to write them is inside send, and Door grows with every new reaction.",
      add: ["door"],
    },
    {
      title: "Announce, do not call",
      note: "Door owns an Emitter and hands it one event after each legal transition. Door no longer knows who is interested, or whether anyone is.",
      add: ["emitter"],
    },
    {
      title: "Listeners plug in",
      note: "A listener is just a function of the event. The log and the alarm implement that one-method interface, and the emitter calls them without knowing which is which.",
      add: ["listener", "log", "alarm"],
    },
    {
      title: "A third listener",
      note: "The display subscribes at startup. Door, Emitter and the other two listeners are unchanged, which is the point of the pattern.",
      add: ["display"],
    },
  ],
};

export const notifyFlow: SequenceSpec = {
  id: "door-notify",
  title: "Locking the door, step by step",
  description:
    "The client sends lock. The door updates its state first, then asks the emitter to notify. Pick a branch to see every listener succeed, one listener throw, or a listener unsubscribe itself in the middle of the notification.",
  actors: [
    { id: "client", label: "Client", kind: "client" },
    { id: "door", label: "Door", kind: "service" },
    { id: "emitter", label: "Emitter", kind: "pubsub" },
    { id: "log", label: "DoorLog", kind: "worker" },
    { id: "alarm", label: "Alarm", kind: "worker" },
  ],
  items: [
    { from: "client", to: "door", label: "send('lock')" },
    { note: "Table lookup: closed + lock is legal. State becomes locked before anyone is told.", over: ["door", "emitter"] },
    { from: "door", to: "emitter", label: "emit(closed, lock, locked)" },
    { note: "The emitter copies its listener set first", over: ["emitter", "log"] },
    {
      alt: [
        {
          when: "all listeners fine",
          items: [
            { from: "emitter", to: "log", label: "listener(event)" },
            { from: "emitter", to: "alarm", label: "listener(event)" },
            { from: "emitter", to: "door", label: "errors: none", type: "reply" },
          ],
        },
        {
          when: "alarm throws",
          items: [
            { from: "emitter", to: "log", label: "listener(event)" },
            { from: "emitter", to: "alarm", label: "listener(event)" },
            { from: "alarm", to: "emitter", label: "throws: alarm offline", type: "reply" },
            { note: "Caught and collected. The door is still locked, and later listeners still run.", over: ["emitter", "alarm"] },
            { from: "emitter", to: "door", label: "errors: [alarm offline]", type: "reply" },
          ],
        },
        {
          when: "log unsubscribes itself",
          items: [
            { from: "emitter", to: "log", label: "listener(event)" },
            { from: "log", to: "emitter", label: "unsubscribe()" },
            { note: "Removing from the set does not disturb the copy being looped over", over: ["emitter", "log"] },
            { from: "emitter", to: "alarm", label: "listener(event)" },
            { from: "emitter", to: "door", label: "errors: none", type: "reply" },
          ],
        },
      ],
    },
    { from: "door", to: "client", label: "ok, state locked", type: "reply" },
  ],
};

export const tableOrObjects: DecisionSpec = {
  id: "table-or-state-objects",
  title: "Table or State objects?",
  start: "differ",
  nodes: {
    differ: {
      q: "Do the states differ only in which events they accept and where they lead?",
      yes: "table",
      no: "own",
    },
    own: {
      q: "Does each state need its own data or multi-step behaviour (timers, retries, different checks)?",
      yes: "objects",
      no: "guards",
    },
    table: {
      result: "A table",
      why: "State and event index a small map. It is easy to read, easy to print, and easy to test cell by cell. Most machines (a door, a ticket status, an order) stop here.",
    },
    guards: {
      result: "A table with guards",
      why: "Keep the table, and let a few cells hold a small function that checks a condition (the code is right, the cart is not empty) before the move is allowed.",
    },
    objects: {
      result: "State objects",
      why: "When Dispensing owns a timer and Idle owns none, give each state its own class so its data and behaviour live together. The vending machine question draws its states this way.",
    },
  },
};
