// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { DesktopBridge, TrayLabels } from '../src/platform/types';
import en from '../src/i18n/locales/en.json';
import ptBR from '../src/i18n/locales/pt-BR.json';

// The desktop tray menu is drawn outside the page, so the renderer hands it its
// words: the App sends the localized `tray` labels at start and again whenever
// the player changes language. Main's side is covered by trayLabels.test.ts and
// the Electron window smoke.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const setTrayLabels = vi.fn<(labels: TrayLabels) => Promise<boolean>>(async () => true);

function stubBridge(): DesktopBridge {
  const settings = {
    alwaysOnTop: false,
    clickThrough: false,
    corner: null,
    scale: 1,
    frameless: true,
    quietMode: false,
    launchOnStartup: false,
    batterySaver: false,
    fpsLimit: 60,
    closeToTray: false,
  };
  const off = () => () => {};
  return {
    isDesktop: true,
    getWindowSettings: async () => settings,
    setWindowSettings: async () => settings,
    setAlwaysOnTop: async () => settings,
    setClickThrough: async () => settings,
    moveToCorner: async () => settings,
    setScale: async () => settings,
    hideToTray: async () => {},
    show: async () => {},
    minimize: async () => {},
    toggleMaximize: async () => false,
    isMaximized: async () => false,
    closeWindow: async () => {},
    quit: async () => {},
    getIdleSeconds: async () => 0,
    getPlatformInfo: async () => ({
      isDesktop: true,
      platform: 'win32',
      isSteamDeck: false,
      appVersion: '0.0.0-test',
    }),
    setTrayLabels,
    getSuspendedMs: async () => 0,
    onToggleVisibility: off,
    onQuietMode: off,
    onFocusChanged: off,
    onShowSettings: off,
    onMaximizeChanged: off,
  };
}

describe('the App hands the desktop tray its localized labels', () => {
  let host: HTMLDivElement;
  let root: Root;
  let i18n: (typeof import('../src/i18n'))['default'];
  let store: typeof import('../src/state/store');

  beforeAll(async () => {
    // jsdom has no layout: give the office the few DOM calls it makes on mount.
    Element.prototype.scrollTo ??= function scrollTo() {};
    HTMLMediaElement.prototype.play = async () => {};
    class NoopObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
    globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;
    // The platform adapter picks the desktop bridge when the store first loads it.
    window.desktop = stubBridge();
    const i18nModule = await import('../src/i18n');
    await i18nModule.initI18n('pt-BR');
    i18n = i18nModule.default;
    store = await import('../src/state/store');
    expect(store.useStore.getState().platform.isDesktop).toBe(true);
    const { App } = await import('../src/App');
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<App />));
    // Transforming the whole App graph is setup, not what is measured: on a busy
    // machine it alone can outlast the default 10 s hook budget.
  }, 60_000);

  afterAll(() => {
    if (root) act(() => root.unmount());
    host?.remove();
    store?.stopGameLoop();
    delete window.desktop;
  });

  it('sends the pt-BR labels at start', () => {
    expect(setTrayLabels).toHaveBeenCalled();
    expect(setTrayLabels).toHaveBeenLastCalledWith(ptBR.tray);
    expect(setTrayLabels.mock.lastCall?.[0]).toEqual({
      show: 'Mostrar',
      hide: 'Esconder',
      quietMode: 'Modo Silencioso',
      settings: 'Ajustes…',
      quit: 'Sair',
    });
  });

  it('does not resend them while the game ticks (the menu is rebuilt only on a change)', async () => {
    const before = setTrayLabels.mock.calls.length;
    const frame = store.useStore.getState().frame;
    // The sim loop runs every 100 ms and the App re-renders with each frame.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 650));
    });
    expect(store.useStore.getState().frame).toBeGreaterThan(frame + 2);
    expect(setTrayLabels.mock.calls.length).toBe(before);
  });

  it('sends them again, in the new language, when the language changes', async () => {
    const before = setTrayLabels.mock.calls.length;
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(setTrayLabels.mock.calls.length).toBeGreaterThan(before);
    expect(setTrayLabels).toHaveBeenLastCalledWith(en.tray);

    await act(async () => {
      await i18n.changeLanguage('pt-BR');
    });
    expect(setTrayLabels).toHaveBeenLastCalledWith(ptBR.tray);
  });

  it('a draft locale without tray words falls back to English', async () => {
    await act(async () => {
      await i18n.changeLanguage('de');
    });
    expect(setTrayLabels).toHaveBeenLastCalledWith(en.tray);
  });
});
