// The system suspensions (sleep, hibernation) the main process has seen, so the game
// can tell a computer that really slept from a window that was only minimized.
//
// A minimized Electron renderer on Windows can go minutes without running a timer, so
// a long gap between two sim ticks does not, by itself, mean the PC was asleep. Main
// records powerMonitor 'suspend' / 'resume' here and the renderer asks how much of a
// gap was a real suspension.
//
// Every time is passed in, on two clocks: the wall clock (Date.now() epoch ms, the
// renderer's clock too) and a monotonic one (performance.now() ms). The log answers in
// wall-clock ms and uses the monotonic clock only to notice the wall clock jumping.
//
// It answers null ("unknown") whenever it cannot vouch for the whole span: a span that
// starts before recording began, before the oldest suspension still kept, or before a
// wall-clock jump. A forgotten sleep would otherwise be paid as open play.
//
// Windows does not always say it is suspending (Modern Standby can freeze desktop apps
// without a 'suspend'), so main also beats every HEARTBEAT_MS. Main is never throttled
// while the computer is awake: a stretch longer than STALL_MS in which it ran nothing
// at all is a suspension nobody announced, and is recorded as one.
//
// Pure on purpose: no `electron` import, so tests/suspendLog.test.ts checks every rule.
// Runtime only: the list lives in memory and is never written to disk.

export interface SuspendInterval {
  /** Wall clock at 'suspend'. */
  start: number;
  /** Wall clock at the matching 'resume'; null while the system has not resumed. */
  end: number | null;
}

/** How many suspensions are kept; the oldest is dropped first. */
export const MAX_SUSPEND_INTERVALS = 64;

/** How often main reads both clocks for the log while it runs (see `SuspendLog.beat`). */
export const HEARTBEAT_MS = 10_000;

/**
 * How long main may run nothing at all (no heartbeat, event or question), by the
 * monotonic clock, before that silence counts as a suspension it was not told about.
 * Far above any delay of an awake main process, far below the renderer's 5 minutes.
 * Counting a frozen app as asleep pays that stretch as sleep: the safe direction.
 */
export const STALL_MS = 60_000;

/**
 * How far the wall clock may run apart from the monotonic one, outside suspensions,
 * before it counts as a jump: a fixed slack plus NTP's largest slew rate (500 ppm).
 */
export const CLOCK_SLACK_MS = 5000;
export const CLOCK_RATE_TOLERANCE = 0.0005;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Plain overlap arithmetic: milliseconds of [fromMs, toMs] inside the intervals, an
 * open interval counting up to `toMs`. An empty, reversed or non-finite span: 0.
 * Never more than the span. (Whether the log can vouch for a span is SuspendLog's job.)
 */
export function suspendedOverlapMs(
  intervals: readonly SuspendInterval[],
  fromMs: number,
  toMs: number,
): number {
  if (!isFiniteNumber(fromMs) || !isFiniteNumber(toMs) || toMs <= fromMs) return 0;
  let total = 0;
  for (const { start, end } of intervals) {
    const overlapStart = Math.max(start, fromMs);
    const overlapEnd = Math.min(end ?? toMs, toMs);
    if (overlapEnd > overlapStart) total += overlapEnd - overlapStart;
  }
  return Math.min(total, toMs - fromMs);
}

export class SuspendLog {
  private readonly intervals: SuspendInterval[] = [];
  /** Wall clock from which the log can vouch for every suspension. */
  private coveredFrom: number;
  /** The last moment both clocks were compared (an event or a question). */
  private anchor: { wall: number; mono: number };
  /** The last moment main read both clocks at all, its heartbeat included. */
  private lastRead: { wall: number; mono: number };
  private jumps = 0;
  private silences = 0;

  /** Recording starts now: `startWallMs` = Date.now(), `startMonoMs` = performance.now(). */
  constructor(
    startWallMs: number,
    startMonoMs: number,
    private readonly cap = MAX_SUSPEND_INTERVALS,
  ) {
    this.coveredFrom = startWallMs;
    this.anchor = { wall: startWallMs, mono: startMonoMs };
    this.lastRead = { wall: startWallMs, mono: startMonoMs };
  }

  /** powerMonitor 'suspend'. A second 'suspend' before a 'resume' is the same sleep. */
  suspend(wallMs: number, monoMs: number): void {
    if (!isFiniteNumber(wallMs) || !isFiniteNumber(monoMs)) return;
    this.observe(wallMs, monoMs);
    const last = this.intervals[this.intervals.length - 1];
    if (last && last.end === null) return;
    this.record({ start: wallMs, end: null });
  }

  /**
   * Main's heartbeat, every HEARTBEAT_MS while it runs: both clocks read, so a stretch
   * in which main ran nothing at all is noticed (see STALL_MS).
   */
  beat(wallMs: number, monoMs: number): void {
    if (!isFiniteNumber(wallMs) || !isFiniteNumber(monoMs)) return;
    this.noteSilence(wallMs, monoMs);
  }

  /** powerMonitor 'resume'. One with no open 'suspend' before it is ignored. */
  resume(wallMs: number, monoMs: number): void {
    if (!isFiniteNumber(wallMs) || !isFiniteNumber(monoMs)) return;
    const last = this.intervals[this.intervals.length - 1];
    // A wall clock set back during sleep must not make a negative interval (the clock
    // check below then treats it as a jump).
    if (last && last.end === null) last.end = Math.max(last.start, wallMs);
    this.observe(wallMs, monoMs);
  }

  /**
   * Milliseconds of [fromMs, toMs] (wall clock) the system was suspended: a finite
   * number >= 0, or null when the log cannot vouch for the whole span (it starts before
   * recording, before the oldest kept suspension or before a wall-clock jump) or the
   * span is not a span (non-finite, or ending before it starts). `nowWallMs` /
   * `nowMonoMs` are the two clocks at the moment of asking.
   */
  suspendedMs(fromMs: number, toMs: number, nowWallMs: number, nowMonoMs: number): number | null {
    if (isFiniteNumber(nowWallMs) && isFiniteNumber(nowMonoMs)) {
      this.observe(nowWallMs, nowMonoMs);
    }
    if (!isFiniteNumber(fromMs) || !isFiniteNumber(toMs) || toMs < fromMs) return null;
    if (fromMs < this.coveredFrom) return null;
    return suspendedOverlapMs(this.intervals, fromMs, toMs);
  }

  /** Wall clock from which answers are given; earlier spans get null. */
  coveredSince(): number {
    return this.coveredFrom;
  }

  /** How many wall-clock jumps have been noticed. */
  clockJumps(): number {
    return this.jumps;
  }

  /** How many silences (suspensions nobody announced) have been recorded. */
  unannounced(): number {
    return this.silences;
  }

  /** A copy of what is kept, oldest first. */
  snapshot(): SuspendInterval[] {
    return this.intervals.map((interval) => ({ ...interval }));
  }

  /** Keeps a suspension, dropping the oldest past the cap. */
  private record(interval: SuspendInterval): void {
    this.intervals.push(interval);
    while (this.intervals.length > this.cap) {
      const dropped = this.intervals.shift() as SuspendInterval;
      // What came before the end of a forgotten suspension can no longer be vouched for.
      this.coveredFrom = Math.max(this.coveredFrom, dropped.end ?? dropped.start);
    }
  }

  /** Both clocks read together: a silence is recorded, then the clocks are compared. */
  private observe(wallMs: number, monoMs: number): void {
    this.noteSilence(wallMs, monoMs);
    this.watchClock(wallMs, monoMs);
  }

  /**
   * Main ran nothing since the last reading for longer than STALL_MS by the monotonic
   * clock: the whole app was frozen, so the computer was suspended without a word. That
   * stretch (wall clock) is recorded as a suspension, unless one main was told about
   * already covers part of it. A monotonic clock that stopped with the app cannot show a
   * silence; the wall clock then runs ahead of it, which `watchClock` treats as a jump
   * (unknown), the safe direction too.
   */
  private noteSilence(wallMs: number, monoMs: number): void {
    const last = this.lastRead;
    this.lastRead = { wall: wallMs, mono: monoMs };
    const start = last.wall;
    if (monoMs - last.mono <= STALL_MS || wallMs <= start) return;
    if (suspendedOverlapMs(this.intervals, start, wallMs) > 0) return;
    this.silences += 1;
    this.record({ start, end: wallMs });
  }

  /**
   * Compares how far each clock moved since the last reading. Outside suspensions they
   * move together (within CLOCK_SLACK_MS and CLOCK_RATE_TOLERANCE); across a suspension
   * the wall clock may run ahead by up to its length, because a monotonic clock may or
   * may not count sleep. Anything else is the wall clock being set: everything recorded
   * belongs to the old clock, so the log forgets it and vouches only from now.
   */
  private watchClock(wallMs: number, monoMs: number): void {
    const monoElapsed = monoMs - this.anchor.mono;
    const drift = wallMs - this.anchor.wall - monoElapsed;
    const slack = CLOCK_SLACK_MS + Math.abs(monoElapsed) * CLOCK_RATE_TOLERANCE;
    const asleep = suspendedOverlapMs(this.intervals, this.anchor.wall, wallMs);
    if (monoElapsed < 0 || drift < -slack || drift > asleep + slack) {
      this.jumps += 1;
      const open = this.intervals[this.intervals.length - 1];
      this.intervals.length = 0;
      // A sleep still going on is real on the new clock too; keep it, restarted now.
      if (open && open.end === null) this.intervals.push({ start: wallMs, end: null });
      this.coveredFrom = wallMs;
    }
    this.anchor = { wall: wallMs, mono: monoMs };
  }
}
