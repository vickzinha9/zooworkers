import { describe, expect, it } from 'vitest';
import {
  AWAKE_CONFIRM_MS,
  CLOCK_RATE_TOLERANCE,
  CLOCK_SLACK_MS,
  HEARTBEAT_MS,
  MAX_SUSPEND_INTERVALS,
  RESUME_TIMEOUT_MS,
  STALL_MS,
  SuspendLog,
  suspendedOverlapMs,
  type SuspendInterval,
} from '../electron/suspendLog';

// The desktop shell's record of real system suspensions. The game asks it how much of
// a long gap was the computer asleep, so a minimized window is not paid as sleep. It
// answers a number only for spans it can vouch for; otherwise null ("unknown").

const T = 1_700_000_000_000;
const MIN = 60_000;

/**
 * A log plus two clocks that move together, as they do while the computer is awake;
 * main beats every HEARTBEAT_MS meanwhile, as it does. `sleep(ms, monoCounts)` moves
 * the wall clock across a real suspension: a monotonic clock may or may not count the
 * time asleep, so both are tried. `freeze(ms, monoCounts)` is one nobody announced.
 */
function harness(cap?: number) {
  let wall = T;
  let mono = 50_000;
  const log = new SuspendLog(wall, mono, cap);
  return {
    log,
    now: () => wall,
    mono: () => mono,
    pass(ms: number) {
      for (let left = ms; left > 0; left -= HEARTBEAT_MS) {
        const step = Math.min(left, HEARTBEAT_MS);
        wall += step;
        mono += step;
        log.beat(wall, mono);
      }
    },
    /** Main runs nothing at all for `ms` (no beat, no event), and nobody says why. */
    freeze(ms: number, monoCounts = true) {
      wall += ms;
      if (monoCounts) mono += ms;
    },
    beat() {
      log.beat(wall, mono);
    },
    sleep(ms: number, monoCounts = false) {
      log.suspend(wall, mono);
      wall += ms;
      if (monoCounts) mono += ms;
      log.resume(wall, mono);
    },
    /** The wall clock is set: it moves by `ms`, the monotonic clock does not. */
    setClock(ms: number) {
      wall += ms;
    },
    ask(from: number, to: number) {
      return log.suspendedMs(from, to, wall, mono);
    },
  };
}

describe('suspendedOverlapMs (the arithmetic)', () => {
  const slept: SuspendInterval[] = [{ start: T + 10 * MIN, end: T + 20 * MIN }];

  it('no suspensions: 0', () => {
    expect(suspendedOverlapMs([], T, T + 60 * MIN)).toBe(0);
  });

  it('full overlap, and a span inside a suspension', () => {
    expect(suspendedOverlapMs(slept, T, T + 60 * MIN)).toBe(10 * MIN);
    expect(suspendedOverlapMs(slept, T + 12 * MIN, T + 15 * MIN)).toBe(3 * MIN);
  });

  it('partial overlap at either end', () => {
    expect(suspendedOverlapMs(slept, T + 15 * MIN, T + 30 * MIN)).toBe(5 * MIN);
    expect(suspendedOverlapMs(slept, T, T + 12 * MIN)).toBe(2 * MIN);
  });

  it('nothing before or after, edges included', () => {
    expect(suspendedOverlapMs(slept, T, T + 10 * MIN)).toBe(0);
    expect(suspendedOverlapMs(slept, T + 20 * MIN, T + 30 * MIN)).toBe(0);
  });

  it('adds up several suspensions', () => {
    const nights: SuspendInterval[] = [
      { start: T + 1 * MIN, end: T + 3 * MIN },
      { start: T + 5 * MIN, end: T + 9 * MIN },
      { start: T + 50 * MIN, end: T + 70 * MIN },
    ];
    expect(suspendedOverlapMs(nights, T, T + 60 * MIN)).toBe(2 * MIN + 4 * MIN + 10 * MIN);
  });

  it('an open suspension counts up to the end of the span', () => {
    expect(suspendedOverlapMs([{ start: T + 40 * MIN, end: null }], T, T + 60 * MIN)).toBe(
      20 * MIN,
    );
  });

  it('an empty, reversed or non-finite span is 0, and never more than the span', () => {
    expect(suspendedOverlapMs(slept, T + 30 * MIN, T)).toBe(0);
    expect(suspendedOverlapMs(slept, Number.NaN, T)).toBe(0);
    const twice: SuspendInterval[] = [
      { start: T, end: T + 10 * MIN },
      { start: T + 5 * MIN, end: T + 10 * MIN },
    ];
    expect(suspendedOverlapMs(twice, T, T + 10 * MIN)).toBe(10 * MIN);
  });
});

describe('SuspendLog: what it records', () => {
  it('nothing recorded: 0 for a span it covers', () => {
    const h = harness();
    h.pass(10 * MIN);
    expect(h.ask(T, h.now())).toBe(0);
  });

  it('a sleep, whether or not the monotonic clock counts it', () => {
    for (const monoCounts of [false, true]) {
      const h = harness();
      h.pass(MIN);
      h.sleep(6 * MIN, monoCounts);
      h.pass(MIN);
      expect(h.ask(T, h.now())).toBe(6 * MIN);
      expect(h.ask(T + 4 * MIN, h.now())).toBe(3 * MIN);
      expect(h.ask(T, T + 3 * MIN)).toBe(2 * MIN);
      expect(h.log.clockJumps()).toBe(0);
    }
  });

  it('a suspension with no resume yet counts up to the end of the span', () => {
    const h = harness();
    h.pass(MIN);
    h.log.suspend(h.now(), 50_000 + MIN);
    expect(h.ask(T, T + 5 * MIN)).toBe(4 * MIN);
  });

  it('several sleeps add up', () => {
    const h = harness();
    h.pass(MIN);
    h.sleep(2 * MIN);
    h.pass(MIN);
    h.sleep(5 * MIN, true);
    expect(h.ask(T, h.now() + MIN)).toBe(7 * MIN);
  });

  it('ignores a resume with no suspend, and a second suspend in the same sleep', () => {
    const h = harness();
    h.pass(MIN);
    h.log.resume(h.now(), 50_000 + MIN);
    expect(h.log.snapshot()).toEqual([]);
    h.log.suspend(h.now(), 50_000 + MIN);
    h.log.suspend(h.now() + 1000, 50_000 + MIN + 1000);
    expect(h.log.snapshot()).toEqual([{ start: T + MIN, end: null }]);
  });

  it('ignores non-finite event times', () => {
    const h = harness();
    h.log.suspend(Number.NaN, 1);
    h.log.suspend(T, Number.POSITIVE_INFINITY);
    expect(h.log.snapshot()).toEqual([]);
  });
});

describe('SuspendLog: null when it cannot vouch for the span', () => {
  it('a span starting before recording began is unknown', () => {
    const h = harness();
    h.pass(10 * MIN);
    expect(h.ask(T - 1, h.now())).toBeNull();
    expect(h.ask(T - 60 * MIN, h.now())).toBeNull();
    expect(h.ask(T, h.now())).toBe(0);
  });

  it('a reversed or non-finite span is unknown; an empty one is 0', () => {
    const h = harness();
    h.pass(10 * MIN);
    expect(h.ask(T + 5 * MIN, T + 2 * MIN)).toBeNull();
    expect(h.ask(Number.NaN, h.now())).toBeNull();
    expect(h.ask(T, Number.POSITIVE_INFINITY)).toBeNull();
    expect(h.ask(T + MIN, T + MIN)).toBe(0);
  });

  it(`keeps the last ${MAX_SUSPEND_INTERVALS} sleeps; spans before a dropped one are unknown`, () => {
    const h = harness();
    for (let i = 0; i < MAX_SUSPEND_INTERVALS + 6; i += 1) {
      h.pass(9 * MIN);
      h.sleep(MIN);
    }
    const kept = h.log.snapshot();
    expect(kept).toHaveLength(MAX_SUSPEND_INTERVALS);
    // The 6th sleep (index 5) was the last one dropped: it ended at T + 60 min.
    expect(h.log.coveredSince()).toBe(T + 60 * MIN);
    expect(kept[0].start).toBe(T + 69 * MIN);
    expect(h.ask(T, h.now())).toBeNull();
    expect(h.ask(T + 60 * MIN - 1, h.now())).toBeNull();
    expect(h.ask(T + 60 * MIN, h.now())).toBe(MAX_SUSPEND_INTERVALS * MIN);
  });

  it('honours a smaller cap', () => {
    const h = harness(2);
    for (let i = 0; i < 5; i += 1) {
      h.pass(MIN);
      h.sleep(1000);
    }
    expect(h.log.snapshot()).toHaveLength(2);
    expect(h.ask(T, h.now())).toBeNull();
    expect(h.ask(h.log.coveredSince(), h.now())).toBe(2000);
  });
});

describe('SuspendLog: a suspension nobody announced', () => {
  // Modern Standby can freeze the app without a 'suspend'. Main beats while it runs, so
  // a stretch in which it ran nothing at all is recorded as a suspension.
  it('records a frozen stretch noticed by the next beat, from the last reading to it', () => {
    const h = harness();
    h.pass(MIN);
    const frozeAt = h.now();
    h.freeze(8 * 60 * MIN);
    h.beat();
    expect(h.log.snapshot()).toEqual([{ start: frozeAt, end: h.now() }]);
    expect(h.log.unannounced()).toBe(1);
    h.pass(MIN);
    expect(h.ask(T, h.now())).toBe(8 * 60 * MIN);
    expect(h.log.clockJumps()).toBe(0);
  });

  it('is noticed by a question that comes before the overdue beat', () => {
    const h = harness();
    h.pass(MIN);
    h.freeze(30 * MIN);
    // The renderer asks the moment it wakes, before main's own timer has run.
    expect(h.ask(T, h.now())).toBe(30 * MIN);
  });

  it('ignores beats that are only late, and counts nothing it was told about twice', () => {
    const h = harness();
    h.pass(MIN);
    h.freeze(STALL_MS); // as long as STALL_MS, not longer: a late beat
    h.beat();
    h.pass(MIN);
    expect(h.ask(T, h.now())).toBe(0);
    h.sleep(20 * MIN, true);
    h.beat();
    h.pass(MIN);
    expect(h.ask(T, h.now())).toBe(20 * MIN);
    expect(h.log.unannounced()).toBe(0);
  });

  it('a beat during an announced sleep that has not resumed yet adds nothing', () => {
    const h = harness();
    h.pass(MIN);
    h.log.suspend(h.now(), h.mono());
    h.freeze(10 * MIN);
    h.beat();
    h.log.resume(h.now(), h.mono());
    expect(h.ask(T, h.now())).toBe(10 * MIN);
    expect(h.log.unannounced()).toBe(0);
  });

  it('a monotonic clock that stopped with the app: unknown (a jump), not open time', () => {
    const h = harness();
    h.pass(MIN);
    h.freeze(30 * MIN, false);
    expect(h.ask(T, h.now())).toBeNull();
    expect(h.log.clockJumps()).toBe(1);
  });

  it('keeps the cap: the oldest unannounced suspension is dropped like any other', () => {
    const h = harness(2);
    for (let i = 0; i < 3; i += 1) {
      h.pass(MIN);
      h.freeze(5 * MIN);
      h.beat();
    }
    expect(h.log.snapshot()).toHaveLength(2);
    expect(h.ask(T, h.now())).toBeNull();
    expect(h.ask(h.log.coveredSince(), h.now())).toBe(10 * MIN);
  });

  it('a resume with no suspend after a freeze: the freeze counts once, no jump', () => {
    const h = harness();
    h.pass(MIN);
    const frozeAt = h.now();
    h.freeze(30 * MIN);
    h.log.resume(h.now(), h.mono());
    expect(h.log.snapshot()).toEqual([{ start: frozeAt, end: h.now() }]);
    h.pass(MIN);
    expect(h.ask(T, h.now())).toBe(30 * MIN);
    expect(h.log.clockJumps()).toBe(0);
  });

  it('a suspend delivered late, after the overdue beat: nothing is counted twice', () => {
    const h = harness();
    h.pass(MIN);
    h.freeze(30 * MIN);
    h.beat(); // main wakes and its overdue timer runs first
    h.log.suspend(h.now(), h.mono()); // then the late 'suspend', and its 'resume'
    h.pass(5_000);
    h.log.resume(h.now(), h.mono());
    h.pass(MIN);
    // The freeze, and the 5 s between the late events: never more than what happened.
    expect(h.ask(T, h.now())).toBe(30 * MIN + 5_000);
    expect(h.log.unannounced()).toBe(1);
  });

  it('ignores a non-finite beat', () => {
    const h = harness();
    h.log.beat(Number.NaN, 0);
    h.log.beat(T, Number.POSITIVE_INFINITY);
    h.pass(MIN);
    expect(h.ask(T, h.now())).toBe(0);
  });
});

describe('SuspendLog: a wall clock that jumps', () => {
  it('the clock set forward while awake: spans before the jump are unknown', () => {
    const h = harness();
    h.pass(10 * MIN);
    h.setClock(30 * MIN);
    const jumpedAt = h.now();
    expect(h.ask(T, h.now())).toBeNull();
    expect(h.log.clockJumps()).toBe(1);
    expect(h.log.coveredSince()).toBe(jumpedAt);
    h.pass(MIN);
    expect(h.ask(jumpedAt, h.now())).toBe(0);
  });

  it('the clock set back while awake: unknown, and old sleeps are forgotten', () => {
    const h = harness();
    h.pass(MIN);
    h.sleep(5 * MIN);
    h.pass(MIN);
    h.setClock(-20 * MIN);
    // Asked on the new clock about a span that the old sleep's numbers fall inside.
    expect(h.ask(T - 19 * MIN, h.now())).toBeNull();
    expect(h.log.snapshot()).toEqual([]);
    h.pass(MIN);
    expect(h.ask(h.log.coveredSince(), h.now())).toBe(0);
  });

  it('the clock set back during sleep is a jump, not a negative sleep', () => {
    const h = harness();
    h.pass(MIN);
    h.log.suspend(h.now(), 50_000 + MIN);
    h.setClock(-10 * MIN);
    h.log.resume(h.now(), 50_000 + MIN);
    expect(h.log.clockJumps()).toBe(1);
    expect(h.ask(T, h.now() + MIN)).toBeNull();
  });

  it('is noticed at the next event (here the suspend), and the sleep after it stays known', () => {
    const h = harness();
    h.pass(MIN);
    h.setClock(3 * MIN);
    h.sleep(2 * MIN);
    expect(h.log.clockJumps()).toBe(1);
    // The jump came before the sleep, so the sleep itself is still known.
    expect(h.ask(h.log.coveredSince(), h.now())).toBe(2 * MIN);
  });

  it('small corrections and slow drift are not jumps', () => {
    const h = harness();
    h.pass(MIN);
    h.setClock(CLOCK_SLACK_MS - 1);
    expect(h.ask(T, h.now())).toBe(0);
    // A day awake, the wall clock slewed at the tolerated rate.
    const day = 24 * 60 * MIN;
    h.pass(day);
    h.setClock(day * CLOCK_RATE_TOLERANCE);
    expect(h.ask(T, h.now())).toBe(0);
    expect(h.log.clockJumps()).toBe(0);
  });
});

describe('SuspendLog: a suspend whose resume never comes', () => {
  it('closes once main is clearly running again, at the first reading after the sleep', () => {
    for (const monoCounts of [true, false]) {
      const h = harness();
      h.pass(MIN);
      const start = h.now();
      h.log.suspend(start, h.mono());
      h.freeze(30 * MIN, monoCounts); // asleep; no 'resume' is ever delivered
      h.beat(); // main runs again: the sleep ended by here
      const woke = h.now();
      // One beat is not yet "clearly running": the sleep still counts up to now.
      expect(h.ask(start, h.now())).toBe(h.now() - start);
      h.pass(AWAKE_CONFIRM_MS);
      expect(h.log.closedWithoutResume()).toBe(1);
      expect(h.log.snapshot().at(-1)).toEqual({ start, end: woke });
      // Later play is open time again, not paid as sleep until the app restarts.
      h.pass(20 * MIN);
      expect(h.ask(woke, h.now())).toBe(0);
      expect(h.ask(start, h.now())).toBe(woke - start);
      expect(h.log.clockJumps()).toBe(0);
    }
  });

  it('a later sleep after the closed one is recorded on its own', () => {
    const h = harness();
    h.pass(MIN);
    h.log.suspend(h.now(), h.mono());
    h.freeze(10 * MIN);
    h.beat();
    h.pass(AWAKE_CONFIRM_MS + MIN);
    const after = h.now();
    h.sleep(5 * MIN, true);
    h.pass(MIN);
    expect(h.ask(after, h.now())).toBe(5 * MIN);
    expect(h.log.closedWithoutResume()).toBe(1);
  });

  it('a sleep called off (main never froze) closes after RESUME_TIMEOUT_MS, at that moment', () => {
    const h = harness();
    h.pass(MIN);
    const start = h.now();
    h.log.suspend(start, h.mono());
    h.pass(RESUME_TIMEOUT_MS - HEARTBEAT_MS);
    expect(h.log.closedWithoutResume()).toBe(0);
    h.pass(HEARTBEAT_MS);
    expect(h.log.closedWithoutResume()).toBe(1);
    const closed = h.now();
    expect(h.log.snapshot().at(-1)).toEqual({ start, end: closed });
    h.pass(30 * MIN);
    expect(h.ask(closed, h.now())).toBe(0);
    expect(h.ask(start, h.now())).toBe(RESUME_TIMEOUT_MS);
  });

  it('a resume that does come still ends the sleep where it says, and is counted once', () => {
    const h = harness();
    h.pass(MIN);
    const start = h.now();
    h.log.suspend(start, h.mono());
    h.freeze(8 * MIN);
    h.beat();
    h.log.resume(h.now(), h.mono());
    h.pass(AWAKE_CONFIRM_MS + MIN);
    expect(h.log.closedWithoutResume()).toBe(0);
    expect(h.ask(start, h.now())).toBe(8 * MIN);
    // A late resume after main closed the sleep itself changes nothing.
    const g = harness();
    g.pass(MIN);
    g.log.suspend(g.now(), g.mono());
    g.freeze(8 * MIN);
    g.beat();
    g.pass(AWAKE_CONFIRM_MS);
    const before = g.log.snapshot();
    g.log.resume(g.now(), g.mono());
    expect(g.log.snapshot()).toEqual(before);
  });
});
