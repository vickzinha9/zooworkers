// Where the companion window opens, and which of its geometry is worth keeping.
//
// Pure on purpose: no `electron` import, so main.ts feeds it the saved settings and
// the screen's work areas, and tests/windowPlacement.test.ts checks every rule.
// Every value is in DIP (device-independent pixels), the unit Electron's `screen`
// and `BrowserWindow` bounds use on Windows at any display scaling.
import type { WindowCorner } from './ipc';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

/** Gap between a corner-snapped window and the edges of its work area. */
export const CORNER_MARGIN = 16;

/**
 * The top strip of the window: the HUD shelf (`--hud-h`, 44 CSS px) is the
 * frameless window's drag handle, and a framed window's title bar fits inside it.
 * A window whose strip is off screen cannot be dragged back by the player.
 */
export const DRAG_STRIP_HEIGHT = 44;

/**
 * A remembered position is still reachable when at least this share of its drag
 * strip lies inside ONE connected display's work area. A sliver left on a
 * neighbouring monitor after the window's own monitor was unplugged does not count.
 */
export const MIN_VISIBLE_STRIP_FRACTION = 0.25;

/**
 * Windows parks a minimized window at about (-32000, -32000). Anything at or
 * beyond this is a minimized reading, never a place the player put the window.
 */
export const MINIMIZED_COORDINATE = -30000;

/** What window-settings.json remembers. Values come from disk, so all are checked. */
export interface SavedGeometry {
  corner: WindowCorner | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PlacementInput {
  saved: SavedGeometry;
  /** The work area of every connected display. */
  workAreas: readonly Rect[];
  /** The work area of the display nearest the mouse cursor. */
  cursorWorkArea: Rect;
  /** The scaled base size, used when no size is remembered. */
  defaultSize: Size;
  minSize: Size;
  maxSize: Size;
}

/** Which rule placed the window: its remembered spot, its corner, or the centre. */
export type PlacementSource = 'saved' | 'corner' | 'centre';

export interface Placement {
  bounds: Rect;
  source: PlacementSource;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

/** The remembered size when it is a real one, else the default; within min/max. */
export function rememberedSize(
  saved: SavedGeometry,
  defaultSize: Size,
  minSize: Size,
  maxSize: Size,
): Size {
  const width = isFiniteNumber(saved.width) && saved.width > 0 ? saved.width : defaultSize.width;
  const height =
    isFiniteNumber(saved.height) && saved.height > 0 ? saved.height : defaultSize.height;
  return {
    width: Math.round(clamp(width, minSize.width, maxSize.width)),
    height: Math.round(clamp(height, minSize.height, maxSize.height)),
  };
}

/**
 * The work area that holds the largest part of the window's drag strip, if that
 * part is big enough to grab (see MIN_VISIBLE_STRIP_FRACTION); otherwise null.
 */
export function workAreaHoldingStrip(rect: Rect, workAreas: readonly Rect[]): Rect | null {
  const strip: Rect = {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: Math.min(DRAG_STRIP_HEIGHT, rect.height),
  };
  const stripArea = strip.width * strip.height;
  if (stripArea <= 0) return null;
  let best: Rect | null = null;
  let bestArea = 0;
  for (const area of workAreas) {
    const visible = overlapArea(strip, area);
    if (visible > bestArea) {
      best = area;
      bestArea = visible;
    }
  }
  return best && bestArea >= stripArea * MIN_VISIBLE_STRIP_FRACTION ? best : null;
}

/**
 * Pulls a rectangle fully inside a work area: a size larger than the area shrinks
 * to it (never below the window's minimum), then the position is clamped. Only a
 * work area smaller than the window's minimum size can leave an overhang, and then
 * the window's top-left (and its drag strip) stays on the display.
 */
export function fitInside(rect: Rect, area: Rect, minSize: Size): Rect {
  const width = Math.round(Math.min(rect.width, Math.max(area.width, minSize.width)));
  const height = Math.round(Math.min(rect.height, Math.max(area.height, minSize.height)));
  return {
    x: Math.round(Math.max(area.x, Math.min(rect.x, area.x + area.width - width))),
    y: Math.round(Math.max(area.y, Math.min(rect.y, area.y + area.height - height))),
    width,
    height,
  };
}

/** A window of `size` snapped to `corner` of a work area, CORNER_MARGIN in. */
export function cornerBounds(corner: WindowCorner, size: Size, area: Rect): Rect {
  const left = area.x + CORNER_MARGIN;
  const right = area.x + area.width - size.width - CORNER_MARGIN;
  const top = area.y + CORNER_MARGIN;
  const bottom = area.y + area.height - size.height - CORNER_MARGIN;
  switch (corner) {
    case 'top-left':
      return { x: left, y: top, ...size };
    case 'top-right':
      return { x: right, y: top, ...size };
    case 'bottom-left':
      return { x: left, y: bottom, ...size };
    case 'bottom-right':
    default:
      return { x: right, y: bottom, ...size };
  }
}

function centredBounds(size: Size, area: Rect): Rect {
  return {
    x: Math.round(area.x + (area.width - size.width) / 2),
    y: Math.round(area.y + (area.height - size.height) / 2),
    ...size,
  };
}

/**
 * The launch bounds, by the first rule that applies:
 * 1. saved: a remembered position whose drag strip is reachable on a connected
 *    display reopens there, with the remembered size, pulled fully onto that display;
 * 2. corner: otherwise the remembered corner of the display nearest the cursor, at
 *    the remembered size (the scaled base size only when no size is remembered);
 * 3. centre: otherwise centred on the display nearest the cursor.
 */
export function placeWindow(input: PlacementInput): Placement {
  const { saved, workAreas, cursorWorkArea, minSize } = input;
  const size = rememberedSize(saved, input.defaultSize, minSize, input.maxSize);
  if (isFiniteNumber(saved.x) && isFiniteNumber(saved.y)) {
    const rect: Rect = { x: Math.round(saved.x), y: Math.round(saved.y), ...size };
    const home = workAreaHoldingStrip(rect, workAreas);
    if (home) return { bounds: fitInside(rect, home, minSize), source: 'saved' };
  }
  if (saved.corner) {
    return {
      bounds: fitInside(cornerBounds(saved.corner, size, cursorWorkArea), cursorWorkArea, minSize),
      source: 'corner',
    };
  }
  return {
    bounds: fitInside(centredBounds(size, cursorWorkArea), cursorWorkArea, minSize),
    source: 'centre',
  };
}

/** A live window's state, as BrowserWindow reports it. */
export interface WindowState {
  minimized: boolean;
  maximized: boolean;
  fullScreen: boolean;
  /** `getBounds()`: while minimized on Windows this is about (-32000, -32000). */
  bounds: Rect;
  /** `getNormalBounds()`: the bounds the window has, or returns to, in its normal state. */
  normalBounds: Rect;
}

function isPlausibleBounds(rect: Rect): boolean {
  return (
    isFiniteNumber(rect.x) &&
    isFiniteNumber(rect.y) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    rect.width > 0 &&
    rect.height > 0 &&
    rect.x > MINIMIZED_COORDINATE &&
    rect.y > MINIMIZED_COORDINATE
  );
}

/**
 * The normal-state bounds worth remembering, or null to keep what is already
 * saved. A minimized, maximized or full-screen window contributes its normal
 * bounds, never its current ones; a minimized reading is never returned.
 */
export function boundsToRemember(state: WindowState): Rect | null {
  const normal = !state.minimized && !state.maximized && !state.fullScreen;
  const rect = normal ? state.bounds : state.normalBounds;
  if (!isPlausibleBounds(rect)) return null;
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}
