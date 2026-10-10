import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "parking-lot-classes",
  title: "Parking lot class diagram",
  description:
    "ParkingLot owns its floors and open tickets, and floors own their spots. Spot choice, pricing and payment sit behind small interfaces, so new rules are new classes, not edits. Card, Cash and Wallet implement PaymentMethod.",
  classes: [
    { id: "vehicle", name: "Vehicle", col: 0, row: 0, fields: ["type: VehicleType", "plate: string", "needsCharger?: boolean"] },
    { id: "payment", name: "PaymentMethod", col: 1, row: 0, stereotype: "interface", methods: ["pay(amount): Payment"] },
    { id: "selector", name: "SpotSelector", col: 2, row: 0, stereotype: "interface", methods: ["choose(floors, veh, fits)"] },
    { id: "lowest", name: "LowestFloorFirst", col: 3, row: 0, methods: ["choose(floors, veh, fits)"] },

    { id: "ticket", name: "Ticket", col: 0, row: 1, fields: ["id: uuid", "vehicle: Vehicle", "spot: Spot", "entry: timestamp"] },
    {
      id: "lot",
      name: "ParkingLot",
      col: 1,
      row: 1,
      fields: ["floors: Floor[]", "tickets: Map<id, Ticket>", "selector, pricing, clock"],
      methods: ["park(vehicle): Ticket", "quote(ticketId): number", "exit(ticketId, payment)"],
    },
    { id: "pricing", name: "PricingStrategy", col: 2, row: 1, stereotype: "interface", methods: ["fee(durationMs, vehicle)"] },
    { id: "hourly", name: "HourlyPricing", col: 3, row: 1, fields: ["rates: per type", "graceMs: number"], methods: ["fee(durationMs, vehicle)"] },

    { id: "spot", name: "Spot", col: 0, row: 2, fields: ["id: string", "type: SpotType", "floor: number", "features: Set"] },
    { id: "floor", name: "Floor", col: 1, row: 2, fields: ["level: number", "free: Map<type, Set>"], methods: ["take(types, accept)", "release(spot)", "available(type)"] },
    { id: "board", name: "DisplayBoard", col: 2, row: 2, fields: ["counts per floor/type"], methods: ["onChanged(floor)"] },
    { id: "cap", name: "DailyCap", col: 3, row: 2, fields: ["inner: PricingStrategy", "cap: number"], methods: ["fee(durationMs, vehicle)"] },
  ],
  relations: [
    { from: "lot", to: "floor", type: "composition", label: "1..*" },
    { from: "floor", to: "spot", type: "composition", label: "1..*" },
    { from: "lot", to: "ticket", type: "composition", label: "open" },
    { from: "ticket", to: "spot", type: "association" },
    { from: "ticket", to: "vehicle", type: "association" },
    { from: "lot", to: "selector", type: "association" },
    { from: "lowest", to: "selector", type: "implements" },
    { from: "lot", to: "pricing", type: "association" },
    { from: "hourly", to: "pricing", type: "implements" },
    { from: "cap", to: "pricing", type: "implements", label: "wraps one" },
    { from: "board", to: "lot", type: "dependency", label: "observes" },
    { from: "lot", to: "payment", type: "dependency", label: "exit()" },
  ],
};

export const parkAndExit: SequenceSpec = {
  id: "parking-lot-sequence",
  title: "Park, then exit",
  description:
    "A car enters, the selector takes a free spot, and the gate prints a ticket. Later the gate quotes the fee, the driver pays, and exit frees the spot. Pick a branch to see a full lot or a failed payment.",
  actors: [
    { id: "gate", label: "Gate", kind: "client" },
    { id: "lot", label: "ParkingLot", kind: "service" },
    { id: "selector", label: "Selector", kind: "service" },
    { id: "floor", label: "Floor", kind: "cache" },
    { id: "pricing", label: "Pricing", kind: "service" },
    { id: "pay", label: "Payment", kind: "external" },
  ],
  items: [
    { note: "Entry", over: ["gate", "lot"] },
    { from: "gate", to: "lot", label: "park({ type: 'car' })" },
    { from: "lot", to: "selector", label: "choose(floors, car)" },
    { from: "selector", to: "floor", label: "take([compact, large])" },
    {
      alt: [
        {
          when: "spot found",
          items: [
            { from: "floor", to: "selector", label: "spot 0-C1", type: "reply" },
            { from: "selector", to: "lot", label: "spot 0-C1", type: "reply" },
            { from: "lot", to: "lot", label: "tickets.set(id, ticket)" },
            { note: "emit('changed', 0): boards show one fewer compact spot", over: ["lot", "pricing"] },
            { from: "lot", to: "gate", label: "ticket (id, spot, entry)", type: "reply" },
          ],
        },
        {
          when: "lot full",
          items: [
            { from: "floor", to: "selector", label: "null on every floor", type: "reply" },
            { from: "selector", to: "lot", label: "null", type: "reply" },
            { from: "lot", to: "gate", label: "Error: Lot full for car", type: "reply" },
            { note: "Barrier stays down; the sign shows FULL", over: ["gate", "selector"] },
          ],
        },
      ],
    },
    { note: "Exit, 61 minutes later", over: ["gate", "lot"] },
    { from: "gate", to: "lot", label: "quote(ticketId)" },
    { from: "lot", to: "pricing", label: "fee(61 min, car)" },
    { from: "pricing", to: "lot", label: "40 (2 started hours)", type: "reply" },
    { from: "lot", to: "gate", label: "fee: 40", type: "reply" },
    { from: "gate", to: "pay", label: "pay(40)" },
    {
      alt: [
        {
          when: "payment ok",
          items: [
            { from: "pay", to: "gate", label: "paid: amount 40", type: "reply" },
            { from: "gate", to: "lot", label: "exit(ticketId, payment)" },
            { from: "lot", to: "lot", label: "tickets.delete(id)" },
            { from: "lot", to: "floor", label: "release(spot 0-C1)" },
            { note: "emit('changed', 0): boards show the spot free again", over: ["lot", "pricing"] },
            { from: "lot", to: "gate", label: "fee 40, change 0", type: "reply" },
          ],
        },
        {
          when: "payment failed",
          items: [
            { from: "pay", to: "gate", label: "declined", type: "reply" },
            { note: "Ticket stays open, spot stays taken, barrier stays down", over: ["gate", "floor"] },
            { from: "gate", to: "pay", label: "retry or another method" },
          ],
        },
      ],
    },
  ],
};
