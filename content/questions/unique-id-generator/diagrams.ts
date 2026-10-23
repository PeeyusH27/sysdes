import type { DecisionSpec, FlowSpec } from "@/components/diagram/types";

export const architecture: FlowSpec = {
  id: "unique-id-generator-architecture",
  title: "Snowflake-style id generation",
  description:
    "Each app server runs an id generator in its own process. At boot it leases a worker id from a small registry (etcd). After that, every id is made locally from the clock, the worker id and a per-millisecond sequence, with no network call. A leaked or lost lease, or a clock that jumps back, makes the generator stop rather than risk a duplicate.",
  nodes: [
    { id: "app", label: "App server", kind: "service", col: 0, row: 1, sub: "creates orders" },
    { id: "gen", label: "ID generator", kind: "idgen", col: 1, row: 1, sub: "in process", note: "A library inside each server. nextId() takes about a microsecond and never calls the network." },
    { id: "clock", label: "System clock", kind: "external", col: 2, row: 0, sub: "milliseconds" },
    { id: "ntp", label: "NTP servers", kind: "external", col: 3, row: 0, sub: "keep clocks close" },
    { id: "registry", label: "Worker leases", kind: "database", col: 2, row: 2, sub: "etcd, 30 s TTL", note: "Hands out worker ids 0 to 1,023 as expiring leases, so two live servers never share one." },
    { id: "db", label: "Orders DB", kind: "database", col: 3, row: 1, sub: "bigint primary key" },
  ],
  edges: [
    { from: "app", to: "gen", label: "nextId()" },
    { from: "gen", to: "clock", label: "now()" },
    { from: "clock", to: "ntp", label: "sync", style: "async" },
    { from: "gen", to: "registry", label: "lease, renew" },
    { from: "app", to: "db", label: "INSERT" },
  ],
  scenarios: [
    {
      id: "boot",
      name: "Boot and first id",
      steps: [
        { edge: "gen>registry", caption: "A server starts. Its generator asks the registry for a worker id lease." },
        { edge: "gen>registry", reverse: true, tone: "ok", caption: "It gets worker 17 for 30 seconds, and will renew every 10. No other live server can hold 17.", mark: [{ node: "registry", state: "ok" }] },
        { edge: "app>gen", caption: "The app needs an id for a new order." },
        { edge: "gen>clock", caption: "The generator reads the clock: 4,512,000 ms since our epoch." },
        { edge: "app>gen", reverse: true, tone: "ok", caption: "It returns time (41 bits), worker 17 (10 bits) and sequence 0 (12 bits), packed into one 64-bit number." },
        { edge: "app>db", caption: "The app inserts the row. No call left the machine to make that id." },
      ],
    },
    {
      id: "burst",
      name: "4,097 ids in one millisecond",
      steps: [
        { edge: "app>gen", caption: "A batch job asks for ids as fast as it can. In the same millisecond the sequence counts 0, 1, 2 ..." },
        { edge: "gen>clock", caption: "The sequence reaches 4,095, the 12-bit maximum. One more id in this millisecond would repeat id number 0.", tone: "miss", mark: [{ node: "gen", state: "busy" }] },
        { edge: "gen>clock", caption: "The generator waits for the clock to reach the next millisecond. That is at most 1 ms." },
        { edge: "gen>clock", reverse: true, caption: "New millisecond: the sequence resets to 0." },
        { edge: "app>gen", reverse: true, tone: "ok", caption: "The id is issued. The limit is 4,096,000 ids a second per server, far above what one server needs.", mark: [{ node: "gen", state: null }] },
      ],
    },
    {
      id: "clock-back",
      name: "Clock moves backwards",
      steps: [
        { edge: "clock>ntp", caption: "The generator last issued an id at time T. NTP now corrects a clock that was running fast." },
        { edge: "clock>ntp", reverse: true, tone: "error", caption: "The clock steps back 3 ms. Issuing an id now could repeat one already given out.", mark: [{ node: "clock", state: "miss" }] },
        { edge: "gen>clock", caption: "The generator sees now() is before its last timestamp. A step of 5 ms or less is waited out." },
        { edge: "gen>clock", reverse: true, tone: "ok", caption: "3 ms later the clock has caught up. Ids continue and are still increasing.", mark: [{ node: "clock", state: null }] },
        { edge: "app>gen", reverse: true, tone: "error", caption: "A step of 60 ms is different: the generator refuses and raises an alert. The app uses another instance. Duplicate ids are worse than a brief error.", mark: [{ node: "gen", state: "down" }] },
      ],
    },
    {
      id: "lease",
      name: "Lease lost",
      steps: [
        { edge: "gen>registry", caption: "The generator tries to renew its worker lease. A network blip delays the call." },
        { edge: "gen>registry", reverse: true, tone: "error", caption: "The renewal fails. 5 seconds before the lease ends, the generator stops issuing ids.", mark: [{ node: "gen", state: "busy" }] },
        { edge: "gen>registry", caption: "The lease expires. Another server may now be given worker 17." },
        { edge: "gen>registry", reverse: true, tone: "ok", caption: "When the network returns, this server asks again and gets a different worker id.", mark: [{ node: "registry", state: "ok" }] },
        { edge: "app>gen", reverse: true, tone: "ok", caption: "Ids flow again under the new worker id. The stop margin guarantees the two servers never overlapped.", mark: [{ node: "gen", state: null }] },
      ],
    },
  ],
};

export const pickScheme: DecisionSpec = {
  id: "unique-id-generator-decision",
  title: "Which id scheme?",
  start: "sorted",
  nodes: {
    sorted: { q: "Do ids need to sort by creation time?", yes: "size", no: "random" },
    random: { q: "Is a 128-bit random id acceptable (large indexes, no locality)?", yes: "uuid4", no: "size" },
    size: { q: "Must the id fit in 64 bits (smaller indexes, bigint columns)?", yes: "reach", no: "uuid7" },
    reach: { q: "Can every writer cheaply reach one small database for ids?", yes: "rate", no: "snowflake" },
    rate: { q: "Under about 10,000 ids a second in total?", yes: "ticket", no: "snowflake" },
    uuid4: { result: "UUID v4", why: "Random 122 bits, no coordination at all. Inserts scatter across a B-tree, and ids reveal nothing about order." },
    uuid7: { result: "UUID v7", why: "A 48-bit millisecond timestamp plus random bits: time-sortable and coordination-free, at 128 bits." },
    ticket: { result: "Ticket server", why: "A database counter handed out in blocks, two servers for odd and even. Simple, ordered, and a gap after a crash." },
    snowflake: { result: "Snowflake-style id", why: "41 bits time, 10 bits worker, 12 bits sequence in 64 bits. Local, fast, roughly time-ordered, needs worker ids and sane clocks." },
  },
};
