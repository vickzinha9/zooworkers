import { describe, it, expect, vi } from 'vitest';
import { GameEngine } from '../src/sim/engine';
import { createInitialState } from '../src/sim/state';
import { BALANCE } from '../src/sim/config';
import { GAME_EVENTS } from '../src/content/events';
import { previewClickValue } from '../src/sim/clickStations';
import { gameStateSchema } from '../src/save/schema';
import type { GameState } from '../src/sim/types';

// Chapter 9: every interval of time is accounted for exactly once, by one rule.
// Open play (however rarely a hidden window is woken) at the open rules; time the
// game was not running at the away rules; a clock turned back pays nothing and
// stretches nothing; nothing waiting is decided while nobody can see the office.

const START = 1_800_000_000_000;

function company(): GameState {
  const state = createInitialState(START);
  state.onboardingComplete = true;
  for (const id of ['pip', 'marlow', 'rizzo', 'bea']) {
    state.employees[id].hired = true;
    state.employees[id].level = 10;
  }
  state.upgrades['room-sorting'] = 1;
  return state;
}

function env(state: GameState = company()) {
  let now = START;
  const engine = new GameEngine(state, { deterministic: true, now: () => now });
  return {
    engine,
    advance(ms: number) {
      now += ms;
    },
    set(ms: number) {
      now = ms;
    },
    now: () => now,
  };
}

/** Save → JSON → schema: a reload, as the game does it. */
const reload = (state: GameState) =>
  gameStateSchema.parse(JSON.parse(JSON.stringify(state))) as GameState;

const ordinary = () =>
  GAME_EVENTS.find((e) => e.rarity === 'common' && !e.requires && !e.employeeId)!;

/** Open play for `seconds`, the loop woken every `every` seconds. */
function play(setup: (e: ReturnType<typeof env>) => void, seconds: number, every: number) {
  const e = env(company());
  e.engine.state.stats.playTimeSeconds = 10; // finds and happenings stay quiet
  setup(e);
  const start = e.engine.state.stats.totalNutsEarned + e.engine.state.crate.nuts;
  const t0 = e.now();
  for (let t = every; t <= seconds + 1e-9; t += every) {
    e.set(t0 + Math.round(t * 1000));
    e.engine.catchUp();
  }
  return e.engine.state.stats.totalNutsEarned + e.engine.state.crate.nuts - start;
}

describe('open time counts in full, however rarely the window is woken', () => {
  const cases: Array<[string, (e: ReturnType<typeof env>) => void, number]> = [
    ['a x2 boost that runs out mid-minute', (e) => e.engine.addBoost(2, 30), 120],
    ['a Focus Harvest that ends mid-interval', (e) => e.engine.startFocus(1), 240],
    [
      'a rushing room',
      (e) => {
        for (let i = 0; i < 10; i += 1) {
          e.engine.tapStation('nut-crate');
          e.advance(150);
        }
      },
      120,
    ],
  ];
  for (const [label, setup, seconds] of cases) {
    it(`pays ${label} the same with a tick a minute as with ten a second`, () => {
      const quick = play(setup, seconds, 0.1);
      for (const every of [60, 120]) {
        const sparse = play(setup, seconds, every);
        // It used to lose the boost, the rush or the session for the whole minute
        // it ran out in: up to a fifth of the income.
        expect(Math.abs(sparse / quick - 1)).toBeLessThan(0.005);
      }
    });
  }

  it('rolls for happenings once per interval of company time', () => {
    const rolls = (every: number) => {
      const e = env();
      const spy = vi.spyOn(e.engine, 'maybeRollEvent');
      const t0 = e.now();
      for (let t = every; t <= 900 + 1e-9; t += every) {
        e.set(t0 + Math.round(t * 1000));
        e.engine.catchUp();
      }
      return spy.mock.calls.length;
    };
    const expected = Math.floor(900 / BALANCE.eventRollIntervalSeconds);
    expect(rolls(1)).toBe(expected);
    // A minute-long tick used to roll once and drop the rest of the minute.
    expect(rolls(60)).toBe(expected);
  });
});

describe('one rule for elapsed time', () => {
  it('counts a short gap as open play and a long one as time away', () => {
    const e = env();
    const played = e.engine.state.stats.playTimeSeconds;
    e.advance(200_000);
    expect(e.engine.catchUp()).toBeNull();
    expect(e.engine.state.stats.playTimeSeconds - played).toBeCloseTo(200, 3);

    e.advance((BALANCE.awayGapSeconds + 100) * 1000);
    const away = e.engine.catchUp();
    expect(away?.ignored).toBe(false);
    expect(away?.seconds).toBeCloseTo(BALANCE.awayGapSeconds + 100, 3);
    // ...and it is settled once: nothing left over for the next call.
    expect(e.engine.catchUp()).toBeNull();
  });

  it('files the moment the company is settled to, so a save between ticks skips nothing', () => {
    const e = env();
    e.advance(100);
    e.engine.catchUp();
    const settled = e.now();
    e.advance(45_000); // a hidden window: the next tick has not come yet
    e.engine.save();
    expect(e.engine.state.lastSaved).toBe(settled);
    const saved = reload(e.engine.state);
    e.advance(10_000);
    const back = new GameEngine(saved, { deterministic: true, now: e.now });
    expect(back.settleClosedTime()?.seconds).toBeCloseTo(55, 3);
  });

  it('pays a closed stretch exactly once, across a reload', () => {
    const e = env();
    e.engine.save();
    const closed = reload(e.engine.state);
    e.advance(2 * 3_600_000);
    const first = new GameEngine(closed, { deterministic: true, now: e.now });
    const paid = first.settleClosedTime();
    expect(paid?.cappedSeconds).toBeCloseTo(7200, 3);
    // Filed at once: a reload straight away settles only the second since.
    e.advance(1_000);
    const again = new GameEngine(reload(first.state), { deterministic: true, now: e.now });
    expect(again.settleClosedTime()?.seconds).toBeCloseTo(1, 3);
  });

  it('pays a months-long absence up to the cap instead of refusing it', () => {
    const e = env();
    e.engine.save();
    const closed = reload(e.engine.state);
    e.advance(90 * 86_400_000);
    const back = new GameEngine(closed, { deterministic: true, now: e.now });
    const result = back.settleClosedTime();
    expect(result?.ignored).toBe(false);
    expect(result?.wasCapped).toBe(true);
    expect(result?.cappedSeconds).toBeCloseTo(BALANCE.offline.defaultCapHours * 3600, 3);
    expect(result?.nutsEarned).toBeGreaterThan(0);
  });
});

describe('a clock turned back pays nothing, stretches nothing, locks nothing', () => {
  function rewound(open: boolean) {
    const e = env();
    e.engine.state.stats.playTimeSeconds = 4000;
    e.engine.addBoost(2, 30);
    e.engine.startFocus(1);
    expect(e.engine.rewardMicrogame('coffeeRescue', 20)).toBeDefined();
    e.advance(1_000);
    e.engine.catchUp();
    const nuts = e.engine.state.stats.totalNutsEarned;
    let engine = e.engine;
    if (open) {
      e.advance(-3_600_000);
      expect(engine.catchUp()).toBeNull();
    } else {
      engine.save();
      const saved = reload(engine.state);
      e.advance(-3_600_000);
      engine = new GameEngine(saved, { deterministic: true, now: e.now });
      expect(engine.settleClosedTime()).toBeNull();
    }
    return { e, engine, nuts };
  }

  for (const open of [true, false]) {
    it(`keeps every timer's time left ${open ? 'with the game open' : 'across a boot'}`, () => {
      const { e, engine, nuts } = rewound(open);
      expect(engine.state.stats.totalNutsEarned).toBeCloseTo(nuts, 6);
      // The boost had 29 s left and still has; it used to last the whole hour.
      expect((engine.state.boosts[0].endsAt - e.now()) / 1000).toBeCloseTo(29, 0);
      expect((engine.state.focus.endsAt - e.now()) / 1000).toBeCloseTo(59, 0);
      expect(engine.state.lastSaved).toBe(e.now());
      // A minigame round a minute later pays as usual (it was refused for the hour).
      e.advance(60_000);
      engine.catchUp();
      expect(engine.rewardMicrogame('coffeeRescue', 20)).toBeDefined();
      expect(engine.currentBoostMultiplier()).toBeLessThan(2);
    });
  }

  it('lets a golden pod refine again at once rather than an hour later', () => {
    const state = company();
    state.resources.reputation = 400;
    const e = env(state);
    e.engine.tapStation('incubation-pod');
    e.advance(100);
    e.engine.catchUp();
    e.advance(-3_600_000);
    e.engine.catchUp();
    e.advance(5_000);
    expect(previewClickValue(e.engine.state, 'incubation-pod', null, e.now())).toBeGreaterThan(0);
  });
});

describe('nothing waiting is decided while nobody can see the office', () => {
  it('keeps an incident waiting through an hour with the game closed', () => {
    const e = env();
    e.engine.state.stats.playTimeSeconds = 4000;
    expect(e.engine.queueIncident(ordinary().id)).toBe(true);
    const left = e.engine.state.happenings.incidents[0].until - e.now();
    e.engine.save();
    const closed = reload(e.engine.state);
    e.advance(3_600_000);
    const back = new GameEngine(closed, { deterministic: true, now: e.now });
    back.settleClosedTime();
    e.advance(100);
    back.catchUp();
    const still = back.state.happenings.incidents.find((i) => i.eventId === ordinary().id);
    // It used to be decided by the team the moment the player came back.
    expect(still).toBeDefined();
    expect(still!.until - e.now()).toBeCloseTo(left - 100, -2);
    expect(back.lastAutoResolved).toBeNull();
  });

  it('holds one while the window is minimized, and lets it run its course once seen', () => {
    const e = env();
    e.engine.state.stats.playTimeSeconds = 4000;
    e.engine.queueIncident(ordinary().id);
    e.engine.setAttended(false);
    for (let minute = 0; minute < 40; minute += 1) {
      e.advance(60_000); // a hidden window, woken once a minute
      e.engine.catchUp();
    }
    expect(e.engine.state.happenings.incidents.some((i) => i.eventId === ordinary().id)).toBe(true);
    e.engine.setAttended(true);
    for (let minute = 0; minute < 30; minute += 1) {
      e.advance(60_000);
      e.engine.catchUp();
    }
    // In view and left alone, the team deals with it as before.
    expect(e.engine.state.happenings.incidents.some((i) => i.eventId === ordinary().id)).toBe(
      false,
    );
  });

  it('holds what is waiting through a minimized gap the shell vouches was awake', () => {
    const e = env();
    e.engine.state.stats.playTimeSeconds = 4000;
    e.engine.queueIncident(ordinary().id);
    const left = e.engine.state.happenings.incidents[0].until - e.now();
    e.engine.setAttended(false);
    e.advance(40 * 60_000); // minimized, and not woken once
    expect(e.engine.catchUp({ suspendedSeconds: 0 })).toBeNull();
    const still = e.engine.state.happenings.incidents.find((i) => i.eventId === ordinary().id);
    expect(still).toBeDefined();
    expect(still!.until - e.now()).toBe(left);
  });

  it('resumes an imported company as it was filed, and importing it again pays nothing', () => {
    const e = env();
    e.engine.state.stats.playTimeSeconds = 4000;
    e.engine.addBoost(2, 30);
    e.engine.queueIncident(ordinary().id);
    e.engine.save();
    const file = JSON.stringify(e.engine.state);
    e.advance(2 * 86_400_000);
    const live = new GameEngine(company(), { deterministic: true, now: e.now });
    for (let round = 0; round < 2; round += 1) {
      live.replaceState(gameStateSchema.parse(JSON.parse(file)) as GameState);
      expect(live.state.resources.nuts).toBe(JSON.parse(file).resources.nuts);
      expect((live.state.boosts[0].endsAt - e.now()) / 1000).toBeCloseTo(30, 0);
      expect(live.state.happenings.incidents).toHaveLength(1);
      expect(live.catchUp()).toBeNull();
      expect(live.state.lastSaved).toBe(e.now());
    }
  });
});

// Windows: a minimized desktop window can go more than five minutes without a single
// timer, with the computer awake all along. The desktop shell knows how much of such a
// gap the computer was really suspended (`catchUp`'s hint); the rest is open play.

const paidSoFar = (engine: GameEngine) =>
  engine.state.stats.totalNutsEarned + engine.state.crate.nuts;

/** A company whose happenings stay quiet, so two ways of settling compare on production alone. */
function quiet(setup?: (e: ReturnType<typeof env>) => void) {
  const e = env(company());
  e.engine.state.stats.playTimeSeconds = 10;
  vi.spyOn(e.engine, 'maybeRollEvent').mockImplementation(() => undefined);
  setup?.(e);
  return e;
}

/** `seconds` of open play with the loop woken every half second. */
function wokenOften(seconds: number, setup?: (e: ReturnType<typeof env>) => void) {
  const e = quiet(setup);
  const start = paidSoFar(e.engine);
  const t0 = e.now();
  for (let i = 1; i <= seconds * 2; i += 1) {
    e.set(t0 + i * 500);
    e.engine.catchUp();
  }
  return { e, paid: paidSoFar(e.engine) - start };
}

/** One gap of `seconds`, settled with the shell's word on how much of it was suspended. */
function vouched(
  seconds: number,
  suspendedSeconds: number,
  setup?: (e: ReturnType<typeof env>) => void,
) {
  const e = quiet(setup);
  const start = paidSoFar(e.engine);
  const played = e.engine.state.stats.playTimeSeconds;
  e.advance(seconds * 1000);
  const result = e.engine.catchUp({ suspendedSeconds });
  return {
    e,
    result,
    paid: paidSoFar(e.engine) - start,
    played: e.engine.state.stats.playTimeSeconds - played,
  };
}

describe('a long gap the desktop shell vouches for', () => {
  it('pays ten unwoken minutes with nothing suspended at the open rules', () => {
    const often = wokenOften(600);
    const gap = vouched(600, 0);
    expect(gap.result).toBeNull();
    // It used to be settled as a sleep: the crate first, the rest at 60% (about 80%).
    expect(Math.abs(gap.paid / often.paid - 1)).toBeLessThan(0.005);
    expect(gap.played).toBeCloseTo(600, 6);
    expect(gap.e.engine.settledUntil()).toBe(gap.e.now());
    // Settled once: nothing is left for the next call, with or without the hint.
    const paid = paidSoFar(gap.e.engine);
    expect(gap.e.engine.catchUp({ suspendedSeconds: 0 })).toBeNull();
    expect(gap.e.engine.catchUp()).toBeNull();
    expect(paidSoFar(gap.e.engine)).toBe(paid);
  });

  it('settles the suspended part at the away rules and the rest at the open rules, open part first', () => {
    // A x2 boost was running when the window went out of sight: it is valued in the
    // open part, which comes first.
    const boost = (e: ReturnType<typeof env>) => e.engine.addBoost(2, 30);
    // Reference: four minutes of open play woken often, then six minutes asleep.
    const often = wokenOften(240, boost);
    often.e.advance(360_000);
    const refAway = often.e.engine.settleAway(360);
    const refTotal = often.paid + refAway.nutsEarned + refAway.crateFilled!;

    const gap = vouched(600, 360, boost);
    expect(gap.result?.ignored).toBe(false);
    expect(gap.result?.seconds).toBeCloseTo(360, 6);
    expect(gap.result?.cappedSeconds).toBeCloseTo(360, 6);
    expect(gap.played).toBeCloseTo(240, 6);
    expect(Math.abs(gap.result!.nutsEarned / refAway.nutsEarned - 1)).toBeLessThan(0.005);
    expect(Math.abs(gap.result!.crateFilled! - refAway.crateFilled!)).toBeLessThanOrEqual(
      refAway.crateFilled! * 0.005 + 1,
    );
    expect(Math.abs(gap.paid / refTotal - 1)).toBeLessThan(0.005);
    expect(gap.e.engine.settledUntil()).toBe(gap.e.now());
    expect(gap.e.engine.catchUp({ suspendedSeconds: 360 })).toBeNull();
  });

  it('never settles more than the gap: suspended throughout (or more) is today’s sleep', () => {
    for (const suspended of [600, 900, 1e12]) {
      const a = env();
      const b = env();
      a.advance(600_000);
      b.advance(600_000);
      expect(a.engine.catchUp({ suspendedSeconds: suspended })).toEqual(b.engine.catchUp());
      expect(JSON.stringify(a.engine.state)).toBe(JSON.stringify(b.engine.state));
    }
  });

  it('ignores a hint it cannot use, byte for byte', () => {
    const odd: unknown[] = [Number.NaN, -1, Number.POSITIVE_INFINITY, -Infinity, '30', null];
    for (const suspendedSeconds of odd) {
      for (const gap of [600_000, 200_000, -3_600_000]) {
        const a = env();
        const b = env();
        a.engine.addBoost(2, 30);
        b.engine.addBoost(2, 30);
        a.advance(gap);
        b.advance(gap);
        const hint = { suspendedSeconds } as unknown as { suspendedSeconds: number };
        expect(a.engine.catchUp(hint)).toEqual(b.engine.catchUp());
        expect(JSON.stringify(a.engine.state)).toBe(JSON.stringify(b.engine.state));
      }
    }
  });

  it('leaves short gaps and a turned-back clock to the usual rule, hint or not', () => {
    for (const gap of [200_000, -3_600_000]) {
      const a = env();
      const b = env();
      a.advance(gap);
      b.advance(gap);
      expect(a.engine.catchUp({ suspendedSeconds: 150 })).toEqual(b.engine.catchUp());
      expect(JSON.stringify(a.engine.state)).toBe(JSON.stringify(b.engine.state));
    }
  });

  it('ends a boost and a Focus Harvest inside an unwoken gap where they ended in time', () => {
    const setup = (e: ReturnType<typeof env>) => {
      e.engine.addBoost(2, 30);
      e.engine.startFocus(1);
    };
    const often = wokenOften(600, setup);
    const gap = vouched(600, 0, setup);
    expect(Math.abs(gap.paid / often.paid - 1)).toBeLessThan(0.005);
    expect(gap.e.engine.state.focus.active).toBe(false);
    expect(gap.e.engine.state.focus.completedSessions).toBe(
      often.e.engine.state.focus.completedSessions,
    );
  });

  it('completes Focus at its end, so its encouragement runs the two minutes right after', () => {
    const gap = vouched(330, 0, (e) => e.engine.startFocus(4));
    const ended = gap.e.now() - 330_000 + 240_000;
    expect(gap.e.engine.state.focus.active).toBe(false);
    expect(gap.e.engine.state.focus.completedSessions).toBe(1);
    const cheer = gap.e.engine.state.boosts.find((b) => b.multiplier === 1.2);
    expect(cheer?.endsAt).toBe(ended + 120_000);
  });

  it('pays more than an hour unwoken in full, in at most 120 slices', () => {
    // The office's own moments (a helper's quick fix and its short rush) are rolled
    // at the end of each settlement, so over two hours one settlement and a hundred
    // and twenty differ by them (measured: 1.8%); this compares the production rule.
    const noOffice = (e: ReturnType<typeof env>) =>
      vi
        .spyOn(e.engine as unknown as { stepOffice(seconds: number): void }, 'stepOffice')
        .mockImplementation(() => undefined);
    const e = quiet(noOffice);
    const start = paidSoFar(e.engine);
    const t0 = e.now();
    for (let minute = 1; minute <= 120; minute += 1) {
      e.set(t0 + minute * 60_000);
      e.engine.catchUp();
    }
    const often = paidSoFar(e.engine) - start;

    const g = quiet(noOffice);
    const steps = vi.spyOn(
      g.engine as unknown as { stepSimulation(dt: number): void },
      'stepSimulation',
    );
    const before = paidSoFar(g.engine);
    const played = g.engine.state.stats.playTimeSeconds;
    g.advance(7_200_000);
    expect(g.engine.catchUp({ suspendedSeconds: 0 })).toBeNull();
    expect(steps.mock.calls.length).toBeLessThanOrEqual(120);
    expect(g.engine.state.stats.playTimeSeconds - played).toBeCloseTo(7200, 6);
    expect(Math.abs((paidSoFar(g.engine) - before) / often - 1)).toBeLessThan(0.005);
  });

  it('keeps the work of a days-long awake gap bounded', () => {
    const e = env();
    const rng = (e.engine as unknown as { rng: { chance(p: number): boolean } }).rng;
    const rolls = vi.spyOn(rng, 'chance');
    const steps = vi.spyOn(
      e.engine as unknown as { stepSimulation(dt: number): void },
      'stepSimulation',
    );
    const played = e.engine.state.stats.playTimeSeconds;
    e.advance(3 * 86_400_000);
    expect(e.engine.catchUp({ suspendedSeconds: 0 })).toBeNull();
    expect(e.engine.state.stats.playTimeSeconds - played).toBeCloseTo(3 * 86_400, 3);
    expect(steps.mock.calls.length).toBeLessThanOrEqual(120);
    // Finds and the office's own moments are rolled for an hour at most (it used to
    // be one roll per 10-15 s of the whole gap: over a hundred thousand here).
    expect(rolls.mock.calls.length).toBeLessThan(5_000);
    expect(e.engine.state.finds.length).toBeLessThanOrEqual(BALANCE.finds.maxWaiting);
  });

  it('files a vouched gap once: a reload or an import straight after pays nothing for it again', () => {
    const gap = vouched(600, 240);
    const e = gap.e;
    e.engine.save();
    expect(e.engine.state.lastSaved).toBe(e.now());
    const paid = paidSoFar(e.engine);
    const file = JSON.stringify(e.engine.state);
    expect(e.engine.catchUp({ suspendedSeconds: 240 })).toBeNull();
    expect(paidSoFar(e.engine)).toBe(paid);
    e.advance(1_000);
    const back = new GameEngine(reload(e.engine.state), { deterministic: true, now: e.now });
    expect(back.settleClosedTime()?.seconds).toBeCloseTo(1, 3);
    const live = new GameEngine(company(), { deterministic: true, now: e.now });
    live.replaceState(gameStateSchema.parse(JSON.parse(file)) as GameState);
    expect(live.catchUp({ suspendedSeconds: 0 })).toBeNull();
    expect(paidSoFar(live)).toBeCloseTo(paid, 6);
  });

  // A starved, minimized renderer can take seconds over one catch-up. The store pairs
  // the instant the company is settled to with the monotonic clock read just before
  // the call, so that instant must be the one measured as the call began.
  it('ends settled at the instant it measured, however long the settlement itself takes', () => {
    const cases: Array<[number, Parameters<GameEngine['catchUp']>[0]]> = [
      [60_000, undefined],
      [600_000, undefined],
      [600_000, { suspendedSeconds: 0 }],
      [600_000, { suspendedSeconds: 240 }],
      [600_000, { suspendedSeconds: 900 }],
    ];
    for (const [gapMs, hint] of cases) {
      let now = START;
      let crawl = 0; // ms the clock moves at each read while the call runs
      const clock = () => {
        const t = now;
        now += crawl;
        return t;
      };
      const engine = new GameEngine(company(), { deterministic: true, now: clock });
      engine.state.stats.playTimeSeconds = 10;
      now += gapMs;
      const measured = now;
      crawl = 250;
      engine.catchUp(hint);
      crawl = 0;
      expect(now).toBeGreaterThan(measured); // real time passed during the call
      expect(engine.settledUntil()).toBe(measured);
    }
  });

  it('settles a boot to the instant it measured too, however long that takes', () => {
    let now = START;
    let crawl = 0;
    const clock = () => {
      const t = now;
      now += crawl;
      return t;
    };
    const state = company();
    state.lastSaved = START - 10 * 60_000; // closed for ten minutes
    const engine = new GameEngine(state, { deterministic: true, now: clock });
    const measured = now;
    crawl = 250;
    expect(engine.settleClosedTime()?.seconds).toBeCloseTo(600, 6);
    crawl = 0;
    expect(now).toBeGreaterThan(measured);
    expect(engine.settledUntil()).toBe(measured);
  });
});
