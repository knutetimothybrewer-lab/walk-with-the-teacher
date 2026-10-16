// Timer math. Pure functions so they can be unit-tested without a browser.
// The server owns the deadline. The client only DISPLAYS it, corrected for the difference between its clock and the server's.

export const MIN = 60000;

/** offset = how far the server's clock is ahead of this computer's clock. Uses the midpoint of the request, so network delay cancels out. */
export function computeOffset(serverNow, sentAt, receivedAt) {
  return serverNow - (sentAt + receivedAt) / 2;
}

/** Keeps the most trustworthy clock sample: the one with the smallest round trip (least delay uncertainty). */
export class ServerClock {
  constructor(nowFn) { this.nowFn = nowFn || (() => Date.now()); this.offset = 0; this.rtt = Infinity; this.at = 0; this.samples = 0; }
  sample(serverNow, sentAt, receivedAt) {
    const rtt = receivedAt - sentAt;
    if (!isFinite(serverNow) || rtt < 0) return false;
    const stale = receivedAt - this.at > 5 * MIN;
    const next = computeOffset(serverNow, sentAt, receivedAt);
    // If the new sample disagrees with the old estimate by more than the measurement uncertainty, the device clock
    // (or the server's) changed, e.g. an NTP correction mid-exam. Trust the newest reading instead of the old best one.
    const disagrees = this.samples > 0 && Math.abs(next - this.offset) > Math.max(this.rtt, rtt) + 2000;
    if (this.samples === 0 || rtt <= this.rtt * 1.5 || stale || disagrees) {
      this.offset = next;
      this.rtt = rtt; this.at = receivedAt; this.samples++;
      return true;
    }
    return false;
  }
  now() { return this.nowFn() + this.offset; }
}

export function remainingMs(deadline, clientNow, offset) {
  return deadline - (clientNow + offset);
}

/** normal above 30 minutes, amber at 30 or less, red at 10 or less, banner at 5 or less */
export function levelFor(remMs) {
  if (remMs <= 0) return { level: 'red', banner: true, expired: true };
  return { level: remMs <= 10 * MIN ? 'red' : remMs <= 30 * MIN ? 'amber' : 'ok', banner: remMs <= 5 * MIN, expired: false };
}

export const ANNOUNCE_AT = [10 * MIN, 5 * MIN, 1 * MIN];

/** thresholds crossed going from prev to now remaining (so each announcement fires exactly once) */
export function crossed(prevRem, nowRem) {
  if (prevRem == null) return [];
  return ANNOUNCE_AT.filter((t) => prevRem > t && nowRem <= t);
}

export function announceText(thresholdMs) {
  const m = Math.round(thresholdMs / MIN);
  return m === 1 ? 'One minute left.' : m + ' minutes left.' + (m <= 5 ? ' Finish the question you are on, then submit.' : '');
}
