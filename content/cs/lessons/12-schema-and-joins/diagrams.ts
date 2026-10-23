import type { ClassSpec, DecisionSpec } from "@/components/diagram/types";

export const shopSchema: ClassSpec = {
  id: "shop-schema",
  title: "A normalized shop schema",
  description: "Customers place orders, an order has many items, and each item points at a product. Every fact lives in one table; the arrows are foreign keys.",
  classes: [
    { id: "customer", name: "customers", col: 0, row: 1, fields: ["id (PK)", "name", "city"] },
    { id: "order", name: "orders", col: 1, row: 1, fields: ["id (PK)", "customer_id (FK)", "created_at"] },
    { id: "item", name: "order_items", col: 2, row: 1, fields: ["order_id (FK)", "product_id (FK)", "quantity", "unit_price"] },
    { id: "product", name: "products", col: 3, row: 1, fields: ["id (PK)", "name", "price"] },
  ],
  relations: [
    { from: "order", to: "customer", type: "association", label: "many to one" },
    { from: "item", to: "order", type: "association", label: "many to one" },
    { from: "item", to: "product", type: "association", label: "many to one" },
  ],
};

export const joinChoice: DecisionSpec = {
  id: "join-choice",
  title: "Which join algorithm will the planner pick?",
  start: "few",
  nodes: {
    few: { q: "Few outer rows, and an index on the inner table's join column?", yes: "nested", no: "sorted" },
    sorted: { q: "Are both inputs already sorted on the join key?", yes: "merge", no: "hash" },
    nested: { result: "Nested loop with an index lookup", why: "Each outer row does one cheap index probe. Cost is about outer rows times log(inner rows)." },
    merge: { result: "Merge join", why: "Walk both sorted inputs once. No hash table and no extra memory. Cost is the two sizes added." },
    hash: { result: "Hash join", why: "Build a hash table on the smaller side, probe it with the other. Needs memory, may spill to disk when large." },
  },
};
