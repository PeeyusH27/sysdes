import type { ClassSpec, SequenceSpec } from "@/components/diagram/types";

export const classes: ClassSpec = {
  id: "vending-machine-classes",
  title: "Vending machine class diagram",
  description:
    "VendingMachine owns its inventory and coin box and points at its current state. Each state object (Idle, HasMoney, Dispensing, OutOfService) lists the events it accepts; HasMoney asks ChangeMaker for change before it sells. Payment methods sit behind one interface, and telemetry observes the machine without the machine knowing.",
  classes: [
    { id: "payment", name: "PaymentMethod", col: 0, row: 0, stereotype: "interface", methods: ["credit(): cents", "commit(price)", "refund()"] },
    { id: "escrow", name: "CoinEscrow", col: 1, row: 0, fields: ["coins: Coin[]"], methods: ["credit(): sum of coins", "commit(price): to the tubes", "refund(): same coins back"] },
    { id: "card", name: "CardPayment", col: 2, row: 0, fields: ["authId: string"], methods: ["authorize(max)", "commit(price): capture", "refund(): void the hold"] },
    { id: "telemetry", name: "Telemetry", col: 3, row: 0, fields: ["machineId: string"], methods: ["onTransition(e)", "onSale(e)", "onRejected(e)"] },

    { id: "inventory", name: "Inventory", col: 0, row: 1, fields: ["slots: Map<code, Slot>"], methods: ["get(code)", "take(code)", "restock(code, n)"] },
    {
      id: "vm",
      name: "VendingMachine",
      col: 1,
      row: 1,
      fields: ["state: StateName", "escrow: Coin[]", "pending: { code, price, change }", "queue: Event[]"],
      methods: ["send(event)", "refund(why)", "commit()"],
    },
    { id: "state", name: "MachineState", col: 2, row: 1, stereotype: "interface", methods: ["[event](machine, e): next", "missing event: rejected"] },
    { id: "hasMoney", name: "HasMoney", col: 3, row: 1, methods: ["coin(m, e)", "select(m, e)", "cancel(m)", "service(m)"] },

    { id: "slot", name: "Slot", col: 0, row: 2, fields: ["code: 'B2'", "product, price (cents)", "count, capacity"], methods: ["soldOut: boolean"] },
    { id: "box", name: "CoinBox", col: 1, row: 2, fields: ["counts: { 100, 25, 10, 5 }"], methods: ["add(coins)", "remove(coins)", "with(coins)"] },
    { id: "change", name: "ChangeMaker", col: 2, row: 2, methods: ["makeChange(amount, counts)", "greedyChange(amount, counts)"] },
    { id: "dispensing", name: "Dispensing", col: 3, row: 2, fields: ["also: Idle, OutOfService"], methods: ["dropped(m)", "dropFailed(m)"] },
  ],
  relations: [
    { from: "vm", to: "inventory", type: "composition" },
    { from: "inventory", to: "slot", type: "composition", label: "1..*" },
    { from: "vm", to: "box", type: "composition", label: "tubes" },
    { from: "vm", to: "state", type: "association", label: "current" },
    { from: "hasMoney", to: "state", type: "implements" },
    { from: "dispensing", to: "state", type: "implements" },
    { from: "hasMoney", to: "change", type: "dependency", label: "select()" },
    { from: "vm", to: "payment", type: "association", label: "credit" },
    { from: "escrow", to: "payment", type: "implements" },
    { from: "card", to: "payment", type: "implements" },
    { from: "telemetry", to: "vm", type: "dependency", label: "observes" },
  ],
};

export const purchase: SequenceSpec = {
  id: "vending-machine-sequence",
  title: "Buy a cola with a dollar",
  description:
    "The customer inserts 100¢ and selects B2, a 65¢ cola. The machine checks the slot, reserves 35¢ of change, turns the spiral and waits for the drop sensor before it keeps any money. Pick a branch to see a sold-out slot, too little credit, no possible change, or an item that never drops.",
  actors: [
    { id: "customer", label: "Customer", kind: "client" },
    { id: "vm", label: "Machine", kind: "service" },
    { id: "inv", label: "Inventory", kind: "database" },
    { id: "box", label: "CoinBox", kind: "cache" },
    { id: "motor", label: "Spiral, sensor", kind: "worker" },
  ],
  items: [
    { note: "Idle, credit 0¢", over: ["customer", "vm"] },
    { from: "customer", to: "vm", label: "coin(100)" },
    { note: "escrow [100]: Idle → HasMoney", over: ["vm", "inv"] },
    { from: "customer", to: "vm", label: "select(B2)" },
    { from: "vm", to: "inv", label: "get(B2)" },
    {
      alt: [
        {
          when: "dispensed",
          items: [
            { from: "inv", to: "vm", label: "Cola, 65¢, 4 left", type: "reply" },
            { from: "vm", to: "box", label: "makeChange(35, tubes + escrow)" },
            { from: "box", to: "vm", label: "[25, 10]", type: "reply" },
            { note: "Change reserved, nothing paid yet: HasMoney → Dispensing", over: ["vm", "box"] },
            { from: "vm", to: "motor", label: "turn spiral B2" },
            {
              alt: [
                {
                  when: "item dropped",
                  items: [
                    { from: "motor", to: "vm", label: "dropped (beam broken)", type: "reply" },
                    { from: "vm", to: "box", label: "add [100], remove [25, 10]" },
                    { from: "vm", to: "inv", label: "take(B2): 3 left" },
                    { from: "vm", to: "customer", label: "Cola + 35¢ change", type: "reply" },
                    { note: "Dispensing → Idle; telemetry records the sale", over: ["customer", "vm"] },
                  ],
                },
                {
                  when: "nothing dropped",
                  items: [
                    { from: "motor", to: "vm", label: "dropFailed (no beam in 2 s)", type: "reply" },
                    { from: "vm", to: "customer", label: "refund [100]", type: "reply" },
                    { note: "No sale, stock unchanged: Dispensing → Idle, slot flagged", over: ["vm", "inv"] },
                  ],
                },
              ],
            },
          ],
        },
        {
          when: "sold out",
          items: [
            { from: "inv", to: "vm", label: "count 0", type: "reply" },
            { from: "vm", to: "customer", label: "display SOLD OUT", type: "reply" },
            { note: "Still HasMoney with 100¢: pick another item or cancel", over: ["customer", "vm"] },
          ],
        },
        {
          when: "not enough credit",
          items: [
            { from: "inv", to: "vm", label: "Juice, 125¢", type: "reply" },
            { from: "vm", to: "customer", label: "display INSERT 25¢", type: "reply" },
            { note: "Still HasMoney: nothing reserved, nothing moves", over: ["customer", "vm"] },
          ],
        },
        {
          when: "can't make change",
          items: [
            { from: "inv", to: "vm", label: "Cola, 65¢, 4 left", type: "reply" },
            { from: "vm", to: "box", label: "makeChange(35, tubes + escrow)" },
            { from: "box", to: "vm", label: "null (only quarters left)", type: "reply" },
            { from: "vm", to: "customer", label: "refund [100], EXACT CHANGE ONLY", type: "reply" },
            { note: "No sale: HasMoney → Idle, the same coin comes back", over: ["customer", "vm"] },
          ],
        },
      ],
    },
  ],
};
