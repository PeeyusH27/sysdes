// Operational transformation (OT) for plain text, one character at a time.
//   { type: 'insert', pos, ch, site }   put `ch` before the character at index `pos`
//   { type: 'delete', pos, site }       remove the character at index `pos`
//   { type: 'noop' }                    nothing (what a delete becomes when someone already deleted that character)
// `site` is the author's id; it breaks the tie when two people insert at the same position.
//
// transform(a, b) answers: "a was made on the same document as b, but b has already been applied.
// What should a become so it still means the same thing?"  Guarantee (TP1):
//   apply(apply(doc, a), transform(b, a))  ===  apply(apply(doc, b), transform(a, b))

export function apply(doc, op) {
  if (op.type === 'insert') return doc.slice(0, op.pos) + op.ch + doc.slice(op.pos);
  if (op.type === 'delete') return doc.slice(0, op.pos) + doc.slice(op.pos + 1);
  return doc;
}

export const insert = (pos, ch, site) => ({ type: 'insert', pos, ch, site });
export const del = (pos, site) => ({ type: 'delete', pos, site });

export function transform(a, b) {
  if (a.type === 'noop' || b.type === 'noop') return a;
  if (a.type === 'insert' && b.type === 'insert') {
    if (a.pos < b.pos || (a.pos === b.pos && a.site < b.site)) return a;      // a stays left of b
    return { ...a, pos: a.pos + 1 };                                            // b's character is now before a
  }
  if (a.type === 'insert' && b.type === 'delete') {
    return a.pos <= b.pos ? a : { ...a, pos: a.pos - 1 };
  }
  if (a.type === 'delete' && b.type === 'insert') {
    return a.pos < b.pos ? a : { ...a, pos: a.pos + 1 };
  }
  // delete vs delete
  if (a.pos < b.pos) return a;
  if (a.pos > b.pos) return { ...a, pos: a.pos - 1 };
  return { type: 'noop' };                                                      // both deleted the same character
}

// Transform one op past a whole list of ops that were applied before it.
export const transformAgainst = (op, others) => others.reduce((o, other) => transform(o, other), op);
