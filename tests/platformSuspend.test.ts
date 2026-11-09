// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DesktopBridge } from '../src/platform/types';

// The game's suspend oracle asks the platform adapter how much of a long gap the
// computer was really asleep. Only a real answer from the desktop shell is a number;
// everything else is null ("unknown"), never 0 ("it was awake").

async function adapterWith(getSuspendedMs?: DesktopBridge['getSuspendedMs']) {
  vi.resetModules();
  window.desktop = (
    getSuspendedMs ? { isDesktop: true, getSuspendedMs } : { isDesktop: true }
  ) as DesktopBridge;
  const { getPlatform } = await import('../src/platform/adapter');
  return getPlatform();
}

afterEach(() => {
  delete window.desktop;
});

describe('getSuspendedMs through the platform adapter', () => {
  it('passes the desktop shell its span and returns its answer', async () => {
    const bridge = vi.fn(async () => 123_000);
    const platform = await adapterWith(bridge);
    expect(platform.isDesktop).toBe(true);
    await expect(platform.getSuspendedMs(1_000, 500_000)).resolves.toBe(123_000);
    expect(bridge).toHaveBeenCalledWith(1_000, 500_000);
  });

  it('0 from the shell means awake the whole time, and stays 0', async () => {
    const platform = await adapterWith(async () => 0);
    await expect(platform.getSuspendedMs(1, 2)).resolves.toBe(0);
  });

  it('a rejected call (main refused the arguments) is unknown', async () => {
    const platform = await adapterWith(() => Promise.reject(new TypeError('bad span')));
    await expect(platform.getSuspendedMs(Number.NaN, 2)).resolves.toBeNull();
  });

  it('an odd answer is unknown', async () => {
    for (const odd of [Number.NaN, -5, Number.POSITIVE_INFINITY, '120', null, undefined]) {
      const platform = await adapterWith(async () => odd as unknown as number);
      await expect(platform.getSuspendedMs(1, 2), String(odd)).resolves.toBeNull();
    }
  });

  it('a bridge without the method (an older or partial stub) is unknown', async () => {
    const platform = await adapterWith();
    await expect(platform.getSuspendedMs(1, 2)).resolves.toBeNull();
  });

  it('the browser cannot see system sleep: unknown', async () => {
    vi.resetModules();
    delete window.desktop;
    const { getPlatform } = await import('../src/platform/adapter');
    const platform = getPlatform();
    expect(platform.isDesktop).toBe(false);
    await expect(platform.getSuspendedMs(1, 2)).resolves.toBeNull();
  });
});
