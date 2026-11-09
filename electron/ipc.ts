// Shared, explicitly-typed IPC channel contract between the Electron main
// process and the renderer's preload bridge. Keeping this in one place makes
// the surface auditable: the renderer can ONLY invoke these channels.

export type WindowCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export interface WindowSettings {
  alwaysOnTop: boolean;
  clickThrough: boolean;
  corner: WindowCorner | null;
  scale: number; // 0.75 | 1 | 1.25 | 1.5
  frameless: boolean;
  quietMode: boolean;
  launchOnStartup: boolean;
  batterySaver: boolean;
  fpsLimit: number; // 30 | 60
  /** When true, the Close button hides to tray instead of quitting. */
  closeToTray: boolean;
  /**
   * Remembered normal-state bounds (DIP): where the window was and how big, saved
   * whenever it moves or resizes and when it closes. Never a minimized reading.
   * Absent on a first launch, when the window opens at `corner`.
   */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Whether the window was left maximized. */
  maximized?: boolean;
}

export const DEFAULT_WINDOW_SETTINGS: WindowSettings = {
  alwaysOnTop: true,
  clickThrough: false,
  corner: 'bottom-right',
  scale: 1,
  frameless: true,
  quietMode: false,
  launchOnStartup: false,
  batterySaver: false,
  fpsLimit: 60,
  closeToTray: false,
  maximized: false,
};

// Channels the renderer may invoke (request/response).
export const IPC = {
  getWindowSettings: 'window:get-settings',
  setWindowSettings: 'window:set-settings',
  setAlwaysOnTop: 'window:set-always-on-top',
  setClickThrough: 'window:set-click-through',
  moveToCorner: 'window:move-to-corner',
  setScale: 'window:set-scale',
  hideToTray: 'window:hide-to-tray',
  show: 'window:show',
  minimize: 'window:minimize',
  toggleMaximize: 'window:toggle-maximize',
  isMaximized: 'window:is-maximized',
  closeWindow: 'window:close',
  quit: 'app:quit',
  getPlatformInfo: 'platform:info',
  getIdleSeconds: 'system:idle-seconds',
  setTrayLabels: 'tray:set-labels',
  /** (fromMs, toMs) wall clock -> ms of that span the system was really suspended. */
  getSuspendedMs: 'system:suspended-ms',
} as const;

// Channels main pushes to the renderer (events).
export const IPC_EVENTS = {
  toggleVisibility: 'event:toggle-visibility',
  quietMode: 'event:quiet-mode',
  focusChanged: 'event:focus-changed',
  showSettings: 'event:show-settings',
  maximizeChanged: 'event:maximize-changed',
} as const;

export interface PlatformInfo {
  isDesktop: true;
  platform: NodeJS.Platform;
  isSteamDeck: boolean;
  appVersion: string;
}

/**
 * The tray menu's words. The OS draws that menu outside the page, so the renderer
 * sends them in the player's language (i18n group `tray`); main keeps English
 * until the first set arrives.
 */
export interface TrayLabels {
  show: string;
  hide: string;
  quietMode: string;
  settings: string;
  quit: string;
}

export const DEFAULT_TRAY_LABELS: TrayLabels = {
  show: 'Show',
  hide: 'Hide',
  quietMode: 'Quiet Mode',
  settings: 'Settings…',
  quit: 'Quit',
};

/** Longest label main accepts. Real labels are a word or two. */
export const MAX_TRAY_LABEL_LENGTH = 48;

const TRAY_LABEL_FIELDS = Object.keys(DEFAULT_TRAY_LABELS) as (keyof TrayLabels)[];

/** Control characters and line/paragraph separators: a menu label is one plain line. */
// eslint-disable-next-line no-control-regex
const NOT_PLAIN_TEXT = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;

/**
 * Validates a tray-label payload from the renderer: a plain object with exactly the
 * five fields, each a short, single-line, non-blank string. Anything else is
 * rejected whole (null), so a bad payload can never leave the menu half translated.
 */
export function parseTrayLabels(payload: unknown): TrayLabels | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const proto: unknown = Object.getPrototypeOf(payload);
  if (proto !== Object.prototype && proto !== null) return null;
  const record = payload as Record<string, unknown>;
  if (Object.keys(record).length !== TRAY_LABEL_FIELDS.length) return null;
  const labels = { ...DEFAULT_TRAY_LABELS };
  for (const field of TRAY_LABEL_FIELDS) {
    const value = record[field];
    if (typeof value !== 'string') return null;
    const label = value.trim();
    if (!label || label.length > MAX_TRAY_LABEL_LENGTH || NOT_PLAIN_TEXT.test(label)) return null;
    labels[field] = label;
  }
  return labels;
}
