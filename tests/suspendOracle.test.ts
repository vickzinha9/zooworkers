// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { createInitialState } from '../src/sim/state';
import { GameEngine } from '../src/sim/engine';
import { SaveManager } from '../src/save/saveManager';
import { GAME_EVENTS } from '../src/content/events';
import type { GameState } from '../src/sim/types';

// The desktop shell knows when the computer was suspended; the page does not. A
// minimized Windows window can go more than five minutes without one timer while the
// computer is awake, so the store asks the shell (`setSuspendOracle`) before it settles
// such a gap, and settles it exactly once, by what really happened.

type Store = typeof import('../src/state/store');

const START = 1_800_000_000_000;
let store: Store;
let engine: GameEngine;
/** The monotonic clock: moves with real time, not with a change of the wall clock. */
let mono = 0;
let visibility: DocumentVisibilityState = 'visible';

/** Real time passes and timers run (the loop itself is driven by hand). */
function pass(ms: number) {
  mono += ms;
  vi.advanceTimersByTime(ms);
}
/** Real time passes while the page runs nothing at all (no timer fires). */
function stall(ms: number) {
  mono += ms;
  vi.setSystemTime(Date.now() + ms);
}
/** Only the wall clock moves (somebody changed the computer's clock). */
function moveClock(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}
function show(visible: boolean) {
  visibility = visible ? 'visible' : 'hidden';
  document.dispatchEvent(new Event('visibilitychange'));
}
const flush = async () => {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
};
const paidSoFar = () => engine.state.stats.totalNutsEarned + engine.state.crate.nuts;
const note = () => store.useStore.getState().returnSummary;

/** Minimized for `minutes`; the loop is woken once a minute for the first `woken` of them. */
async function minimized(minutes: number, woken = 0) {
  show(false);
  for (let m = 0; m < woken; m += 1) {
    pass(60_000);
    store.advanceGame();
  }
  pass((minutes - woken) * 60_000);
  show(true);
  await flush();
  return note();
}

/** An oracle whose answers the test hands back by hand. */
function heldOracle() {
  const asked: Array<[number, number]> = [];
  const answers: Array<(ms: number | null) => void> = [];
  const oracle = (from: number, to: number) => {
    asked.push([from, to]);
    return new Promise<number | null>((resolve) => answers.push(resolve));
  };
  return { asked, answers, oracle };
}

function company(): GameState {
  const state = createInitialState(Date.now());
  state.onboardingComplete = true;
  state.stats.playTimeSeconds = 4000;
  for (const id of ['pip', 'marlow', 'rizzo']) {
    state.employees[id].hired = true;
    state.employees[id].level = 8;
  }
  return state;
}

beforeAll(async () => {
  vi.useFakeTimers({
    now: START,
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  });
  vi.spyOn(performance, 'now').mockImplementation(() => mono);
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibility,
  });
  localStorage.clear();
  store = await import('../src/state/store');
  engine = store.useStore.getState().engine;
});

afterAll(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => {
  store.setSuspendOracle?.(null);
  visibility = 'visible';
  store.replaceStateQuietly(company());
  engine.setAttended(true);
});

describe('a gap the desktop shell vouches for', () => {
  it('pays ten minimized minutes the shell says were awake at the open rules, and says so', async () => {
    const asked: Array<[number, number]> = [];
    store.setSuspendOracle(async (from, to) => {
      asked.push([from, to]);
      return 0;
    });
    const rate = engine.productionPerSecond();
    const before = paidSoFar();
    // The measured shape: woken for about four minutes, then not once for six.
    const summary = await minimized(10, 4);
    expect(asked).toHaveLength(1);
    expect(asked[0][1] - asked[0][0]).toBe(360_000);
    expect(summary?.mode).toBe('open');
    expect(summary?.offlineSeconds).toBe(0);
    expect(summary?.awaySeconds).toBeCloseTo(600, 3);
    // Open rules: the whole of production, between the vault and the crate (it was
    // the crate first and 60% of the rest, about 80%).
    expect(summary!.banked + summary!.packed).toBeGreaterThan(rate * 600 * 0.95);
    expect(paidSoFar() - before).toBeCloseTo(summary!.banked + summary!.packed, 3);
  });

  it('settles six suspended minutes of ten at the away rules and four at the open rules', async () => {
    store.setSuspendOracle(async () => 360_000);
    const played = engine.state.stats.playTimeSeconds;
    const summary = await minimized(10);
    expect(summary?.mode).toBe('asleep');
    expect(summary?.offlineSeconds).toBeCloseTo(360, 6);
    expect(summary?.countedSeconds).toBeCloseTo(360, 6);
    expect(summary?.awaySeconds).toBeCloseTo(600, 3);
    expect(engine.state.stats.playTimeSeconds - played).toBeCloseTo(240, 3);
  });

  it('tells a sleep in front of the player as its own return, from just before it', async () => {
    store.setSuspendOracle(async () => 897_000);
    const away = vi.spyOn(engine, 'settleAway');
    const played = engine.state.stats.playTimeSeconds;
    pass(900_000); // the computer slept 15 minutes with the game in view
    store.advanceGame();
    expect(note()).toBeNull(); // asked, not settled yet
    await flush();
    const summary = note();
    expect(summary?.mode).toBe('asleep');
    expect(summary?.offlineSeconds).toBeCloseTo(897, 6);
    expect(summary?.awaySeconds).toBeCloseTo(897, 6);
    // The three awake seconds were open play, before the sleep; the note holds the sleep.
    expect(engine.state.stats.playTimeSeconds - played).toBeCloseTo(3, 6);
    expect(away).toHaveBeenCalledTimes(1);
    const slept = away.mock.results[0].value as ReturnType<GameEngine['settleAway']>;
    expect(summary!.banked).toBeCloseTo(slept.nutsEarned, 6);
    expect(summary!.packed).toBeCloseTo(slept.crateFilled!, 6);
    away.mockRestore();
  });

  it('keeps what is waiting in place through the gap, then attends', async () => {
    store.setSuspendOracle(async () => 0);
    const def = GAME_EVENTS.find((ev) => ev.rarity === 'common' && !ev.requires && !ev.employeeId)!;
    expect(engine.queueIncident(def.id)).toBe(true);
    const left = engine.state.happenings.incidents[0].until - Date.now();
    await minimized(40);
    const still = engine.state.happenings.incidents.find((i) => i.eventId === def.id);
    expect(still).toBeDefined();
    expect(still!.until - Date.now()).toBe(left);
    expect(engine.lastAutoResolved).toBeNull();
    // In sight again: the next stretch is attended.
    pass(1_000);
    store.advanceGame();
    expect(engine.state.happenings.incidents.find((i) => i.eventId === def.id)!.until).toBe(
      still!.until,
    );
  });
});

describe('when the shell cannot say, today’s rules', () => {
  const cannot: Array<[string, () => Promise<number | null>]> = [
    ['says it cannot tell', async () => null],
    ['fails', async () => Promise.reject(new Error('ipc'))],
    [
      'throws',
      () => {
        throw new Error('no bridge');
      },
    ],
    ['answers nonsense', async () => Number.NaN],
    ['answers a negative', async () => -5_000],
  ];
  for (const [label, oracle] of cannot) {
    it(`settles a long gap as a sleep when the shell ${label}`, async () => {
      store.setSuspendOracle(oracle);
      const summary = await minimized(10);
      expect(summary?.mode).toBe('asleep');
      expect(summary?.offlineSeconds).toBeCloseTo(600, 3);
    });
  }

  it('waits about a second for an answer that never comes, paying nothing meanwhile', async () => {
    const { asked, oracle } = heldOracle();
    store.setSuspendOracle(oracle);
    show(false);
    pass(600_000);
    show(true);
    const paid = paidSoFar();
    for (let i = 0; i < 9; i += 1) {
      pass(100);
      store.advanceGame(); // the loop, while the question is out
    }
    expect(paidSoFar()).toBe(paid);
    expect(asked).toHaveLength(1);
    expect(note()).toBeNull();
    pass(100); // one second: no answer
    await flush();
    expect(note()?.mode).toBe('asleep');
    expect(note()?.offlineSeconds).toBeCloseTo(601, 3);
  });

  it('without an oracle (the browser) settles at once, by the same call as before', async () => {
    const calls = vi.spyOn(engine, 'catchUp');
    const summary = await minimized(10);
    expect(calls.mock.calls.length).toBeGreaterThan(0);
    expect(calls.mock.calls.every((args) => args.length === 0)).toBe(true);
    expect(summary?.mode).toBe('asleep');
    expect(summary?.offlineSeconds).toBeCloseTo(600, 3);
    calls.mockRestore();
  });

  it('does not pay a clock moved forward as open time, though nothing was suspended', async () => {
    store.setSuspendOracle(async () => 0);
    show(false);
    pass(60_000);
    moveClock(2 * 3_600_000); // one real minute; the clock says two hours more
    show(true);
    await flush();
    expect(note()?.mode).toBe('asleep');
    expect(note()?.offlineSeconds).toBeCloseTo(7260, 3);
  });
});

describe('a settlement that itself takes real time', () => {
  // Measured on the packaged app: a minimized renderer starved of CPU took seconds
  // over its last catch-up before a long unwoken stretch. The monotonic mark must be
  // read where the company was settled to, not after the call, or those seconds look
  // like a clock moved forward and the awake gap is paid as a sleep.
  for (const slowMs of [4_000, 10_000, 30_000]) {
    it(`pays ten unwoken minutes the shell says were awake at the open rules after a ${slowMs / 1000} s catch-up`, async () => {
      store.setSuspendOracle(async () => 0);
      const rate = engine.productionPerSecond();
      show(false);
      pass(60_000);
      const original = engine.catchUp.bind(engine);
      const slow = vi.spyOn(engine, 'catchUp').mockImplementationOnce((hint) => {
        const result = original(hint);
        stall(slowMs); // both clocks move while the call runs
        return result;
      });
      store.advanceGame();
      slow.mockRestore();
      stall(600_000); // not one timer for ten minutes, the computer awake
      show(true);
      await flush();
      expect(note()?.mode).toBe('open');
      expect(note()?.offlineSeconds).toBe(0);
      expect(note()!.banked + note()!.packed).toBeGreaterThan(rate * 600 * 0.95);
    });
  }

  it('still keeps today’s rule for a clock moved forward during a slow catch-up', async () => {
    store.setSuspendOracle(async () => 0);
    show(false);
    pass(60_000);
    const original = engine.catchUp.bind(engine);
    const slow = vi.spyOn(engine, 'catchUp').mockImplementationOnce((hint) => {
      const result = original(hint);
      stall(10_000);
      moveClock(2 * 3_600_000);
      return result;
    });
    store.advanceGame();
    slow.mockRestore();
    stall(400_000);
    show(true);
    await flush();
    expect(note()?.mode).toBe('asleep');
  });
});

describe('each second once', () => {
  it('pays nothing for repeated loop calls while the question is out, and settles once', async () => {
    const { asked, answers, oracle } = heldOracle();
    store.setSuspendOracle(oracle);
    const rate = engine.productionPerSecond();
    show(false);
    pass(600_000);
    show(true);
    const before = paidSoFar();
    const played = engine.state.stats.playTimeSeconds;
    for (let i = 0; i < 5; i += 1) {
      pass(100);
      store.advanceGame();
    }
    expect(asked).toHaveLength(1);
    expect(paidSoFar()).toBe(before);
    expect(engine.state.stats.playTimeSeconds).toBe(played);
    answers[0](0);
    await flush();
    const after = paidSoFar();
    expect(after - before).toBeGreaterThan(rate * 600 * 0.95);
    expect(engine.settledUntil()).toBe(Date.now());
    // A stale answer arriving twice changes nothing; the loop goes on from here.
    answers[0](0);
    await flush();
    expect(paidSoFar()).toBe(after);
    pass(100);
    store.advanceGame();
    expect(paidSoFar() - after).toBeLessThan(rate * 0.2);
    expect(asked).toHaveLength(1);
  });

  it('files the settled gap, so a reload straight after pays only the moment since', async () => {
    store.setSuspendOracle(async () => 0);
    await minimized(10);
    const settled = engine.settledUntil();
    expect(settled).toBe(Date.now());
    const loaded = new SaveManager().load();
    expect(loaded.isNew).toBe(false);
    expect(loaded.state.lastSaved).toBe(settled);
    pass(1_000);
    const back = new GameEngine(loaded.state, { deterministic: true });
    expect(back.settleClosedTime()?.seconds).toBeCloseTo(1, 3);
  });

  it('drops an answer that lands after an import: the imported company is paid nothing for it', async () => {
    const { answers, oracle } = heldOracle();
    store.setSuspendOracle(oracle);
    show(false);
    pass(600_000);
    show(true);
    const file = JSON.stringify(company());
    expect(store.useStore.getState().importSave(file)).toBe(true);
    const imported = paidSoFar();
    const played = engine.state.stats.playTimeSeconds;
    answers[0](0);
    await flush();
    expect(paidSoFar()).toBe(imported);
    expect(engine.state.stats.playTimeSeconds).toBe(played);
    expect(note()).toBeNull();
  });

  it('settles at once by today’s rules on a hide while the question is out; the late answer pays nothing', async () => {
    const { asked, answers, oracle } = heldOracle();
    store.setSuspendOracle(oracle);
    show(false);
    pass(600_000);
    show(true); // back, and the shell is asked...
    const played = engine.state.stats.playTimeSeconds;
    show(false); // ...and gone again before it answers
    expect(engine.settledUntil()).toBe(Date.now());
    expect(engine.state.stats.playTimeSeconds).toBe(played);
    // That brief return is still told.
    expect(note()?.mode).toBe('asleep');
    expect(note()?.offlineSeconds).toBeCloseTo(600, 3);
    const paid = paidSoFar();
    answers[0](0);
    await flush();
    expect(paidSoFar()).toBe(paid);
    expect(asked).toHaveLength(1);
  });

  it('asks again when the answer is read long after it was asked', async () => {
    const { asked, answers, oracle } = heldOracle();
    store.setSuspendOracle(oracle);
    show(false);
    pass(600_000);
    show(true);
    stall(400_000); // the page ran nothing between asking and reading the answer
    answers[0](0);
    await flush();
    expect(asked).toHaveLength(2);
    expect(asked[1][0]).toBe(asked[0][0]);
    expect(asked[1][1] - asked[0][1]).toBe(400_000);
    answers[1](0);
    await flush();
    expect(note()?.mode).toBe('open');
    expect(note()?.awaySeconds).toBeCloseTo(1000, 3);
  });
});
