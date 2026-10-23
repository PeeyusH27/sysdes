import { Emitter } from './emitter.js'; // @hide
// The table is data. Add an entry (try lock under open) or a whole state, and the machine changes with it.
const table = {
  closed: { open: 'open', lock: 'locked' },
  open: { close: 'closed' },
  locked: { unlock: 'closed' },
};

let state = 'closed';
const changes = new Emitter();
changes.subscribe(({ from, event, to }) => console.log(`${from} --${event}--> ${to}`));
changes.subscribe(({ to }) => { if (to === 'locked') console.log('  alarm armed'); });

function send(event) {
  const to = Object.hasOwn(table[state], event) ? table[state][event] : null;
  if (!to) return console.log(`${state}: ${event} ignored`);
  const from = state;
  state = to; // change first, announce second
  changes.emit({ from, event, to });
}

['open', 'lock', 'close', 'lock', 'open', 'unlock'].forEach(send);
