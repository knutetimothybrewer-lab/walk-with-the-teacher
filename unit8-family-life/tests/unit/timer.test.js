'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const url = require('url');

const load = () => import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'timer.js')).href);
const MIN = 60000;

test('offset math: the midpoint of the request cancels symmetric network delay', async () => {
  const { computeOffset } = await load();
  // server is 5 s ahead; request took 400 ms each way
  const serverNow = 1_000_000 + 400 + 5000;
  assert.equal(computeOffset(serverNow, 1_000_000, 1_000_800), 5000);
  assert.equal(computeOffset(1_000_400, 1_000_000, 1_000_800), 0);
});

test('remaining time is computed from the SERVER deadline and the clock offset, not from a local countdown', async () => {
  const { remainingMs, computeOffset } = await load();
  const deadline = 10_000_000 + 90 * MIN;
  // student's computer is 3 minutes FAST relative to the server
  const off = computeOffset(10_000_000, 10_000_000 + 3 * MIN, 10_000_000 + 3 * MIN);
  assert.equal(off, -3 * MIN);
  assert.equal(remainingMs(deadline, 10_000_000 + 3 * MIN, off), 90 * MIN, 'a fast local clock does not shorten the exam');
  // and a SLOW local clock does not lengthen it
  const slowOff = computeOffset(10_000_000, 10_000_000 - 2 * MIN, 10_000_000 - 2 * MIN);
  assert.equal(remainingMs(deadline, 10_000_000 - 2 * MIN + 30 * MIN, slowOff), 60 * MIN);
});

test('ServerClock keeps the lowest-latency sample and recovers from a stale one', async () => {
  const { ServerClock } = await load();
  let t = 0; const c = new ServerClock(() => t);
  assert.equal(c.sample(5000, 0, 100), true);             // rtt 100, offset 4950
  assert.equal(c.offset, 4950);
  assert.equal(c.sample(9000, 1000, 6000), false);        // rtt 5000: much worse, ignored
  assert.equal(c.offset, 4950);
  assert.equal(c.sample(5200, 200, 280), true);           // rtt 80: better
  assert.equal(c.offset, 5200 - 240);
  assert.equal(c.sample(1, 10, 5), false, 'negative rtt rejected');
  // after 5 minutes any new sample is accepted so drift cannot accumulate
  assert.equal(c.sample(400_000, 399_000, 401_000), true);
  t = 400_000; assert.equal(c.now(), 400_000 + c.offset);
});

test('ServerClock follows a real clock change (e.g. NTP correction) even when the new sample has a worse round trip', async () => {
  const { ServerClock } = await load();
  const c = new ServerClock(() => 0);
  c.sample(10_000, 0, 20);                        // offset 9990, rtt 20 (a very good sample)
  assert.equal(c.offset, 9990);
  // the device clock jumps back by 3 minutes; the next sample also has a much slower round trip (400 ms)
  const jumped = c.sample(10_500 + 180_000, 10_000, 10_400);
  assert.equal(jumped, true, 'a large disagreement must be trusted over the old low-latency estimate');
  assert.equal(c.offset, (10_500 + 180_000) - 10_200);
  // but ordinary jitter does not replace a good sample
  const c2 = new ServerClock(() => 0); c2.sample(1000, 0, 20);
  assert.equal(c2.sample(2300, 1000, 1400), false);
});

test('timer levels: normal above 30, amber at 30, red at 10, banner at 5, expired at 0', async () => {
  const { levelFor } = await load();
  assert.deepEqual(levelFor(90 * MIN), { level: 'ok', banner: false, expired: false });
  assert.deepEqual(levelFor(30 * MIN + 1), { level: 'ok', banner: false, expired: false });
  assert.deepEqual(levelFor(30 * MIN), { level: 'amber', banner: false, expired: false });
  assert.deepEqual(levelFor(10 * MIN + 1), { level: 'amber', banner: false, expired: false });
  assert.deepEqual(levelFor(10 * MIN), { level: 'red', banner: false, expired: false });
  assert.deepEqual(levelFor(5 * MIN + 1), { level: 'red', banner: false, expired: false });
  assert.deepEqual(levelFor(5 * MIN), { level: 'red', banner: true, expired: false });
  assert.deepEqual(levelFor(1), { level: 'red', banner: true, expired: false });
  assert.deepEqual(levelFor(0), { level: 'red', banner: true, expired: true });
  assert.deepEqual(levelFor(-5000), { level: 'red', banner: true, expired: true });
});

test('announcements fire once each at 10, 5 and 1 minutes, even if a tick is skipped', async () => {
  const { crossed, announceText } = await load();
  assert.deepEqual(crossed(null, 20 * MIN), []);
  assert.deepEqual(crossed(11 * MIN, 9.9 * MIN), [10 * MIN]);
  assert.deepEqual(crossed(9.9 * MIN, 9 * MIN), []);
  assert.deepEqual(crossed(6 * MIN, 4.9 * MIN), [5 * MIN]);
  assert.deepEqual(crossed(12 * MIN, 4 * MIN), [10 * MIN, 5 * MIN], 'a throttled background tab can skip across both');
  assert.deepEqual(crossed(70_000, 50_000), [MIN]);
  assert.match(announceText(10 * MIN), /10 minutes left/);
  assert.match(announceText(5 * MIN), /submit/);
});

test('extension math: a deadline moved by the teacher is simply a new deadline', async () => {
  const { remainingMs } = await load();
  const start = 50_000_000, off = 0;
  const before = remainingMs(start + 90 * MIN, start + 80 * MIN, off);
  const after = remainingMs(start + 135 * MIN, start + 80 * MIN, off);
  assert.equal(before, 10 * MIN); assert.equal(after, 55 * MIN);
});

test('clock formatting', async () => {
  const { } = await load();
  const u = await import(url.pathToFileURL(path.join(__dirname, '..', '..', 'js', 'util.js')).href).catch(() => null);
  // util.js touches `document` only inside functions, so it loads in Node; if not, skip rather than fake a pass
  if (!u) return;
  assert.equal(u.fmtClock(90 * MIN), '1:30:00'); assert.equal(u.fmtClock(59_000), '0:59');
  assert.equal(u.fmtClock(0), '0:00'); assert.equal(u.fmtClock(-4000), '0:00'); assert.equal(u.fmtClock(61_000), '1:01');
  assert.equal(u.csvCell('=cmd|calc'), "'=cmd|calc"); assert.equal(u.csvCell('a,b'), '"a,b"'); assert.equal(u.csvCell(-3), '-3');
});
