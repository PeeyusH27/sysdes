import { test, expect } from 'vitest';
import { Appender, AsyncAppender, Level, json } from './models.js';
import { LogManager } from './logger.js';

const memory = opts => { const lines = []; return { lines, appender: new Appender(l => lines.push(l), opts) }; };
const setup = () => { let t = 0; return new LogManager({ now: () => ++t }); };

test('an event below the effective level is dropped, at or above is written', () => {
  const m = setup(); const { lines, appender } = memory();
  m.root.addAppender(appender);
  expect(m.getLogger('app').log(Level.DEBUG, 'noise')).toBe(0);
  expect(m.getLogger('app').log(Level.INFO, 'hello')).toBe(1);
  expect(lines).toEqual(['1 INFO app - hello']);
});

test('a child inherits the nearest ancestor level; an explicit level wins', () => {
  const m = setup();
  m.getLogger('app').level = Level.WARN;
  m.getLogger('app.db.pool').level = Level.DEBUG;
  expect(m.getLogger('app.db').effectiveLevel).toBe(Level.WARN);
  expect(m.getLogger('app.db.pool').effectiveLevel).toBe(Level.DEBUG);
  expect(m.getLogger('other').effectiveLevel).toBe(Level.INFO);
});

test('changing a level at runtime changes every descendant that inherits it', () => {
  const m = setup();
  const db = m.getLogger('app.db');
  expect(db.isEnabled(Level.DEBUG)).toBe(false);
  m.getLogger('app').level = Level.DEBUG;
  expect(db.isEnabled(Level.DEBUG)).toBe(true);
});

test('appenders on an ancestor receive events from its descendants', () => {
  const m = setup(); const a = memory(); const b = memory();
  m.getLogger('app').addAppender(a.appender);
  m.getLogger('app.db').addAppender(b.appender);
  expect(m.getLogger('app.db').log(Level.ERROR, 'down')).toBe(2);
  expect(a.lines).toHaveLength(1);
  expect(b.lines).toHaveLength(1);
});

test('each appender has its own threshold', () => {
  const m = setup(); const console_ = memory({ threshold: Level.INFO }); const file = memory({ threshold: Level.ERROR });
  m.root.addAppender(console_.appender); m.root.addAppender(file.appender);
  const log = m.getLogger('svc');
  expect([log.log(Level.INFO, 'a'), log.log(Level.ERROR, 'b')]).toEqual([1, 2]);
  expect(console_.lines).toHaveLength(2);
  expect(file.lines).toEqual(['2 ERROR svc - b']);
});

test('the formatter is swappable per appender', () => {
  const m = setup(); const p = memory(); const j = memory({ format: json });
  m.root.addAppender(p.appender); m.root.addAppender(j.appender);
  m.getLogger('a').log(Level.WARN, 'x "y"');
  expect(j.lines).toEqual(['{"time":1,"level":"WARN","logger":"a","message":"x \\"y\\""}']);
  expect(p.lines).toEqual(['1 WARN a - x "y"']);
});

test('a lazy message is built only when the level is enabled', () => {
  const m = setup(); let built = 0;
  const msg = () => { built++; return 'expensive'; };
  m.getLogger('a').log(Level.DEBUG, msg);
  expect(built).toBe(0);
  m.getLogger('a').log(Level.INFO, msg);
  expect(built).toBe(1);
});

test('an appender added during a call does not disturb that call (copy on write)', () => {
  const m = setup(); const late = memory();
  const log = m.getLogger('a');
  log.addAppender({ append: () => { log.addAppender(late.appender); return true; } });
  expect(log.log(Level.INFO, 'one')).toBe(1);
  expect(log.log(Level.INFO, 'two')).toBe(2);
  expect(late.lines).toHaveLength(1);
});

test('one appender that throws does not stop the others', () => {
  const m = setup(); const ok = memory();
  m.root.addAppender({ append: () => { throw new Error('disk full'); } });
  m.root.addAppender(ok.appender);
  expect(m.getLogger('a').log(Level.INFO, 'still here')).toBe(1);
  expect(ok.lines).toHaveLength(1);
});

test('an async appender queues, then writes in order on flush', () => {
  const m = setup(); const { lines, appender } = memory();
  const queued = new AsyncAppender(appender);
  m.root.addAppender(queued);
  m.getLogger('a').log(Level.INFO, 'one'); m.getLogger('a').log(Level.INFO, 'two');
  expect(lines).toEqual([]);
  queued.flush();
  expect(lines).toEqual(['1 INFO a - one', '2 INFO a - two']);
});

test('a full async queue drops the newest events and counts them', () => {
  const m = setup(); const { lines, appender } = memory();
  const queued = new AsyncAppender(appender, { capacity: 2 });
  m.root.addAppender(queued);
  for (const word of ['a', 'b', 'c', 'd', 'e']) m.getLogger('x').log(Level.INFO, word);
  queued.flush();
  expect(lines.map(l => l.slice(-1))).toEqual(['a', 'b']);
  expect(queued.dropped).toBe(3);
});
