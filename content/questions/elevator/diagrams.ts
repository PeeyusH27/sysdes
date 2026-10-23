import type { ClassSpec, SequenceSpec, TimelineSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "elevator-classes",
  title: "Elevator system class diagram",
  description:
    "ElevatorSystem owns the floors, the cars and every hall call. A DispatchStrategy (NearestCar or Collective) picks which car answers; each ElevatorCar owns its door and panel and orders its own stops with LOOK. Displays observe the system's events.",
  classes: [
    { id: "hall", name: "HallPanel", col: 0, row: 0, fields: ["floor: number", "up, down: lamp"], methods: ["press(dir)", "clear(dir)"] },
    { id: "hallcall", name: "HallCall", col: 1, row: 0, fields: ["floor: number", "dir: up | down", "key: '5▲'"] },
    { id: "strategy", name: "DispatchStrategy", col: 2, row: 0, stereotype: "interface", methods: ["pick(call, cars): Car|null"] },
    { id: "nearest", name: "NearestCar", col: 3, row: 0, fields: ["stopCost: 2 floors"], methods: ["cost(car, call)", "pick(call, cars)"] },

    { id: "floor", name: "Floor", col: 0, row: 1, fields: ["level: number", "panel: HallPanel"] },
    {
      id: "system",
      name: "ElevatorSystem",
      col: 1,
      row: 1,
      fields: ["cars: ElevatorCar[]", "assigned: Map<key, car>", "waiting: HallCall[]", "strategy"],
      methods: ["hallCall(floor, dir)", "carCall(carId, floor)", "tick()", "takeOutOfService(carId)"],
    },
    {
      id: "car",
      name: "ElevatorCar",
      col: 2,
      row: 1,
      fields: ["floor, dir, state", "upStops, downStops: Set", "doorTimer: ticks"],
      methods: ["addStop(floor, dir?)", "step(): Stop | null", "openDoors()", "takeOutOfService()"],
    },
    { id: "collective", name: "Collective", col: 3, row: 1, fields: ["idle or passing cars"], methods: ["pick(call, cars)"] },

    { id: "display", name: "Display", col: 0, row: 2, fields: ["floor + arrow per car"], methods: ["onArrived(stop)"] },
    { id: "carcall", name: "CarCall", col: 1, row: 2, fields: ["carId: string", "floor: number"] },
    { id: "panel", name: "CarPanel", col: 2, row: 2, fields: ["carId", "lit: Set<floor>"], methods: ["press(floor)", "doorOpen(), alarm()"] },
    { id: "door", name: "Door", col: 3, row: 2, fields: ["open: 0..1", "sensorBlocked: boolean"], methods: ["open()", "close()", "reopen()"] },
  ],
  relations: [
    { from: "system", to: "floor", type: "composition", label: "1..*" },
    { from: "floor", to: "hall", type: "composition" },
    { from: "hall", to: "system", type: "dependency", label: "hallCall()" },
    { from: "system", to: "hallcall", type: "association", label: "owns" },
    { from: "system", to: "strategy", type: "association", label: "pick()" },
    { from: "nearest", to: "strategy", type: "implements" },
    { from: "collective", to: "strategy", type: "implements" },
    { from: "system", to: "car", type: "composition", label: "1..*" },
    { from: "car", to: "panel", type: "composition" },
    { from: "car", to: "door", type: "composition" },
    { from: "panel", to: "carcall", type: "dependency", label: "creates" },
    { from: "system", to: "carcall", type: "dependency", label: "carCall()" },
    { from: "display", to: "system", type: "dependency", label: "observes" },
  ],
  stages: [
    { title: "The building", note: "ElevatorSystem owns the floors and the cars. Each floor has a hall panel with the up and down buttons.", add: ["system", "floor", "hall", "car"] },
    { title: "A press becomes an object", note: "A button press is a HallCall or a CarCall, so it can be queued, assigned to a car, cleared and logged.", add: ["hallcall", "carcall", "panel"] },
    { title: "A car owns its door", note: "Opening and closing belongs to the car, which is what lets a car refuse to open while it is moving.", add: ["door"] },
    { title: "Dispatch becomes a strategy", note: "Which car answers a hall call is the rule most likely to change, so ElevatorSystem asks a DispatchStrategy and never decides itself.", add: ["strategy", "nearest", "collective"] },
    { title: "Displays observe", note: "Lamps and displays listen to the system's events. The system never knows they exist.", add: ["display"] },
  ],
};

export const hallCallFlow: SequenceSpec = {
  id: "elevator-sequence",
  title: "A hall call, from button to doors",
  description:
    "Someone on floor 5 presses ▲. The controller checks the key is new and asks the strategy for a car, which adds a stop. Arriving on its way up, the car opens, the lamp clears, and the rider presses 12. Switch branches to see every car busy, or the chosen car failing.",
  actors: [
    { id: "hall", label: "Hall panel 5", kind: "client" },
    { id: "sys", label: "ElevatorSystem", kind: "service" },
    { id: "strat", label: "Strategy", kind: "service" },
    { id: "carB", label: "Car B", kind: "worker" },
    { id: "carA", label: "Car A", kind: "worker" },
    { id: "panel", label: "Car B panel", kind: "client" },
  ],
  items: [
    { note: "Someone on floor 5 presses ▲ (twice: the second press is ignored)", over: ["hall", "sys"] },
    { from: "hall", to: "sys", label: "hallCall(5, up)" },
    { from: "sys", to: "sys", label: "key 5▲ is new" },
    { from: "sys", to: "strat", label: "pick(5▲, cars in service)" },
    {
      alt: [
        {
          when: "car assigned",
          items: [
            { from: "strat", to: "sys", label: "car B (cost 3)", type: "reply" },
            { from: "sys", to: "carB", label: "addStop(5, up)" },
            { from: "sys", to: "hall", label: "lamp 5▲ on", type: "reply" },
            { note: "B steps floor by floor; LOOK keeps its sweep while stops lie ahead", over: ["carB", "carA"] },
            { from: "carB", to: "sys", label: "arrived(5, up)", type: "async" },
            { from: "sys", to: "hall", label: "cleared 5▲: lamp off", type: "async" },
            { note: "Doors open only now: B is stopped exactly at 5", over: ["carB", "panel"] },
            { from: "panel", to: "carB", label: "carCall(12)" },
            { note: "Sensor clear, timer done: doors close, B continues up to 12", over: ["carB", "panel"] },
          ],
        },
        {
          when: "all cars busy",
          items: [
            { from: "strat", to: "sys", label: "null: no car idle or passing", type: "reply" },
            { from: "sys", to: "sys", label: "waiting.push(5▲)" },
            { from: "sys", to: "hall", label: "lamp 5▲ on (queued)", type: "reply" },
            { note: "Every tick retries the waiting list, oldest first", over: ["sys", "strat"] },
            { from: "sys", to: "strat", label: "pick(5▲) on a later tick" },
            { from: "strat", to: "sys", label: "car A, now idle", type: "reply" },
            { from: "sys", to: "carA", label: "addStop(5, up)" },
          ],
        },
        {
          when: "car B fails",
          items: [
            { from: "strat", to: "sys", label: "car B", type: "reply" },
            { from: "sys", to: "carB", label: "addStop(5, up)" },
            { from: "carB", to: "sys", label: "fault: door motor", type: "async" },
            { from: "sys", to: "carB", label: "takeOutOfService()" },
            { from: "sys", to: "strat", label: "pick(5▲, cars without B)" },
            { from: "strat", to: "sys", label: "car A", type: "reply" },
            { from: "sys", to: "carA", label: "addStop(5, up)" },
            { note: "The lamp never went out: only the owner of 5▲ changed", over: ["hall", "sys"] },
          ],
        },
      ],
    },
  ],
};

export const trip: TimelineSpec = {
  id: "elevator-trip",
  title: "One car's trip, second by second",
  description:
    "An idle car at G answers 5▲ and carries two people to 12, using the capacity numbers: 1.4 s per floor, 3 s lost braking and accelerating per leg, doors 2 s to open and 3 s to close, 1.2 s per person. Of 37.6 s, only 16.8 s is full-speed travel; the rest is spent stopping.",
  unit: "s",
  lanes: [
    { id: "motion", label: "Motion" },
    { id: "doors", label: "Doors" },
    { id: "people", label: "Passengers" },
  ],
  spans: [
    { lane: "motion", start: 0, end: 10, label: "G → 5", tone: 1 },
    { lane: "doors", start: 10, end: 12, label: "open", tone: 2 },
    { lane: "people", start: 12, end: 14.4, label: "2 board", tone: 3 },
    { lane: "doors", start: 14.4, end: 17.4, label: "close", tone: 2 },
    { lane: "motion", start: 17.4, end: 30.2, label: "5 → 12", tone: 1 },
    { lane: "doors", start: 30.2, end: 32.2, label: "open", tone: 2 },
    { lane: "people", start: 32.2, end: 34.6, label: "2 leave", tone: 3 },
    { lane: "doors", start: 34.6, end: 37.6, label: "close", tone: 2 },
  ],
  markers: [
    { at: 0, label: "5▲ pressed" },
    { at: 10, label: "5▲ cleared" },
    { at: 17.4, label: "leaves 5" },
    { at: 30.2, label: "at 12" },
  ],
};
