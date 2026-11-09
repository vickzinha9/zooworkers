import type {
  DesktopBridge,
  PlatformInfo,
  TrayLabels,
  WindowCorner,
  WindowSettings,
} from './types';

// A single adapter the whole UI uses for "desktop companion" features. On the
// desktop it forwards to the preload bridge (`window.desktop`); in the browser
// it provides safe, no-op fallbacks so the exact same UI runs everywhere.

const BROWSER_DEFAULTS: WindowSettings = {
  alwaysOnTop: false,
  clickThrough: false,
  corner: null,
  scale: 1,
  frameless: false,
  quietMode: false,
  launchOnStartup: false,
  batterySaver: false,
  fpsLimit: 60,
  closeToTray: false,
};

export interface PlatformAdapter {
  readonly isDesktop: boolean;
  getWindowSettings(): Promise<WindowSettings>;
  setWindowSettings(partial: Partial<WindowSettings>): Promise<WindowSettings>;
  setAlwaysOnTop(value: boolean): Promise<WindowSettings>;
  setClickThrough(value: boolean): Promise<WindowSettings>;
  moveToCorner(corner: WindowCorner): Promise<WindowSettings>;
  setScale(scale: number): Promise<WindowSettings>;
  hideToTray(): Promise<void>;
  show(): Promise<void>;
  minimize(): Promise<void>;
  toggleMaximize(): Promise<boolean>;
  isMaximized(): Promise<boolean>;
  closeWindow(): Promise<void>;
  quit(): Promise<void>;
  getIdleSeconds(): Promise<number>;
  getPlatformInfo(): Promise<PlatformInfo>;
  /** Hands the tray menu its words in the player's language. False if not applied. */
  setTrayLabels(labels: TrayLabels): Promise<boolean>;
  /**
   * Milliseconds of [fromMs, toMs] (Date.now() wall clock) the system was really
   * suspended (asleep, hibernating), or null when that cannot be known.
   */
  getSuspendedMs(fromMs: number, toMs: number): Promise<number | null>;
  onToggleVisibility(cb: () => void): () => void;
  onQuietMode(cb: (enabled: boolean) => void): () => void;
  onFocusChanged(cb: (focused: boolean) => void): () => void;
  onShowSettings(cb: () => void): () => void;
  onMaximizeChanged(cb: (maximized: boolean) => void): () => void;
}

class DesktopAdapter implements PlatformAdapter {
  readonly isDesktop = true;
  constructor(private bridge: DesktopBridge) {}
  getWindowSettings() {
    return this.bridge.getWindowSettings();
  }
  setWindowSettings(p: Partial<WindowSettings>) {
    return this.bridge.setWindowSettings(p);
  }
  setAlwaysOnTop(v: boolean) {
    return this.bridge.setAlwaysOnTop(v);
  }
  setClickThrough(v: boolean) {
    return this.bridge.setClickThrough(v);
  }
  moveToCorner(c: WindowCorner) {
    return this.bridge.moveToCorner(c);
  }
  setScale(s: number) {
    return this.bridge.setScale(s);
  }
  hideToTray() {
    return this.bridge.hideToTray();
  }
  show() {
    return this.bridge.show();
  }
  minimize() {
    return this.bridge.minimize();
  }
  toggleMaximize() {
    return this.bridge.toggleMaximize();
  }
  isMaximized() {
    return this.bridge.isMaximized();
  }
  closeWindow() {
    return this.bridge.closeWindow();
  }
  quit() {
    return this.bridge.quit();
  }
  getIdleSeconds() {
    return this.bridge.getIdleSeconds();
  }
  getPlatformInfo() {
    return this.bridge.getPlatformInfo();
  }
  setTrayLabels(labels: TrayLabels) {
    // The real preload always has it; a partial QA stub of the bridge may not.
    if (typeof this.bridge.setTrayLabels !== 'function') return Promise.resolve(false);
    return this.bridge.setTrayLabels(labels);
  }
  getSuspendedMs(fromMs: number, toMs: number): Promise<number | null> {
    // Anything but a real answer (no such bridge method, a rejected or odd reply) is
    // "unknown", never "awake": the game then keeps its own rule for long gaps.
    if (typeof this.bridge.getSuspendedMs !== 'function') return Promise.resolve(null);
    return this.bridge.getSuspendedMs(fromMs, toMs).then(
      (ms) => (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0 ? ms : null),
      () => null,
    );
  }
  onToggleVisibility(cb: () => void) {
    return this.bridge.onToggleVisibility(cb);
  }
  onQuietMode(cb: (e: boolean) => void) {
    return this.bridge.onQuietMode(cb);
  }
  onFocusChanged(cb: (f: boolean) => void) {
    return this.bridge.onFocusChanged(cb);
  }
  onShowSettings(cb: () => void) {
    return this.bridge.onShowSettings(cb);
  }
  onMaximizeChanged(cb: (m: boolean) => void) {
    return this.bridge.onMaximizeChanged(cb);
  }
}

class BrowserAdapter implements PlatformAdapter {
  readonly isDesktop = false;
  private settings: WindowSettings = { ...BROWSER_DEFAULTS };

  async getWindowSettings() {
    return this.settings;
  }
  async setWindowSettings(p: Partial<WindowSettings>) {
    this.settings = { ...this.settings, ...p };
    return this.settings;
  }
  async setAlwaysOnTop(v: boolean) {
    this.settings.alwaysOnTop = v;
    return this.settings;
  }
  async setClickThrough(v: boolean) {
    this.settings.clickThrough = v;
    return this.settings;
  }
  async moveToCorner(c: WindowCorner) {
    this.settings.corner = c;
    return this.settings;
  }
  async setScale(s: number) {
    this.settings.scale = s;
    return this.settings;
  }
  async hideToTray() {
    /* not available in the browser */
  }
  async show() {
    /* not available in the browser */
  }
  async minimize() {
    /* not available in the browser */
  }
  async toggleMaximize() {
    return false;
  }
  async isMaximized() {
    return false;
  }
  async closeWindow() {
    /* the browser tab can't close itself */
  }
  async quit() {
    /* the browser tab can't quit itself */
  }
  async getIdleSeconds() {
    // Browser cannot read OS idle time; Focus Harvest just won't auto-detect.
    return 0;
  }
  async getPlatformInfo(): Promise<PlatformInfo> {
    return { isDesktop: false, platform: 'browser', isSteamDeck: false, appVersion: 'web' };
  }
  async setTrayLabels() {
    // The browser has no tray menu.
    return false;
  }
  async getSuspendedMs(): Promise<number | null> {
    // A browser cannot see system sleep.
    return null;
  }
  onToggleVisibility() {
    return () => {};
  }
  onQuietMode() {
    return () => {};
  }
  onFocusChanged(cb: (f: boolean) => void) {
    const onFocus = () => cb(document.visibilityState === 'visible');
    const onBlur = () => cb(false);
    const onVisibility = () => cb(document.visibilityState === 'visible' && document.hasFocus());
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }
  onShowSettings() {
    return () => {};
  }
  onMaximizeChanged() {
    return () => {};
  }
}

let cached: PlatformAdapter | null = null;
export function getPlatform(): PlatformAdapter {
  if (cached) return cached;
  cached =
    typeof window !== 'undefined' && window.desktop
      ? new DesktopAdapter(window.desktop)
      : new BrowserAdapter();
  return cached;
}
