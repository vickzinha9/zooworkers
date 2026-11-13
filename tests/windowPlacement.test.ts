import { describe, expect, it } from 'vitest';
import {
  CORNER_MARGIN,
  DRAG_STRIP_HEIGHT,
  boundsToRemember,
  cornerBounds,
  fitInside,
  placeWindow,
  type PlacementInput,
  type Rect,
  type SavedGeometry,
} from '../electron/windowPlacement';
import { DEFAULT_WINDOW_SETTINGS } from '../electron/ipc';

// The desktop window reopens where the player left it. These are the rules main.ts
// applies on launch (placeWindow) and on every move/resize/close (boundsToRemember).

// The Phase 1 report's display: a 2500x1080 work area starting at x 60.
const PRIMARY: Rect = { x: 60, y: 0, width: 2500, height: 1080 };
// A second monitor to the left of it, with its taskbar at the bottom.
const LEFT: Rect = { x: -1920, y: 0, width: 1920, height: 1040 };

const DEFAULT_SIZE = { width: 380, height: 460 };
const MIN = { width: 320, height: 420 };
const MAX = { width: 2600, height: 1800 };

function place(
  saved: Partial<SavedGeometry>,
  workAreas: Rect[] = [PRIMARY, LEFT],
  cursor = PRIMARY,
) {
  const input: PlacementInput = {
    saved: { corner: 'bottom-right', ...saved },
    workAreas,
    cursorWorkArea: cursor,
    defaultSize: DEFAULT_SIZE,
    minSize: MIN,
    maxSize: MAX,
  };
  return placeWindow(input);
}

function inside(rect: Rect, area: Rect): boolean {
  return (
    rect.x >= area.x &&
    rect.y >= area.y &&
    rect.x + rect.width <= area.x + area.width &&
    rect.y + rect.height <= area.y + area.height
  );
}

describe('launch placement: a remembered position', () => {
  it('reopens at the saved position and size while it is on screen', () => {
    const placed = place({ x: 900, y: 300, width: 500, height: 620 });
    expect(placed).toEqual({
      source: 'saved',
      bounds: { x: 900, y: 300, width: 500, height: 620 },
    });
  });

  it('reopens on the second monitor while that monitor is connected', () => {
    const placed = place({ x: -1500, y: 200, width: 380, height: 460 });
    expect(placed).toEqual({
      source: 'saved',
      bounds: { x: -1500, y: 200, width: 380, height: 460 },
    });
  });

  it('a position on an unplugged monitor falls back to the corner, at the remembered size', () => {
    // Saved on the left monitor, which is gone: only the primary is connected.
    const placed = place({ x: -1500, y: 200, width: 520, height: 600 }, [PRIMARY]);
    expect(placed.source).toBe('corner');
    expect(placed.bounds).toEqual({
      x: PRIMARY.x + PRIMARY.width - 520 - CORNER_MARGIN,
      y: PRIMARY.y + PRIMARY.height - 600 - CORNER_MARGIN,
      width: 520,
      height: 600,
    });
  });

  it('the corner fallback uses the display nearest the cursor', () => {
    const placed = place({ x: 99_999, y: 99_999 }, [PRIMARY, LEFT], LEFT);
    expect(placed.source).toBe('corner');
    expect(placed.bounds).toEqual({
      x: LEFT.x + LEFT.width - 380 - CORNER_MARGIN,
      y: LEFT.y + LEFT.height - 460 - CORNER_MARGIN,
      width: 380,
      height: 460,
    });
  });

  it('a sliver of the drag strip left on a neighbouring display does not count', () => {
    // The window's own monitor (to the right of the primary) was unplugged: 10 px of
    // it still touches the primary's right edge.
    const x = PRIMARY.x + PRIMARY.width - 10;
    expect(place({ x, y: 300 }, [PRIMARY]).source).toBe('corner');
  });

  it('a drag strip above the top of every display does not count', () => {
    // Only 4 of its 44 px reach into the work area: the player could not grab it.
    expect(place({ x: 900, y: -(DRAG_STRIP_HEIGHT - 4) }, [PRIMARY]).source).toBe('corner');
  });

  it('minimized parking coordinates in the file are never a place to reopen', () => {
    expect(place({ x: -32000, y: -32000, width: 160, height: 28 }).source).toBe('corner');
  });

  it('without a corner, an unreachable position is centred on the cursor display', () => {
    const placed = place({ corner: null, x: 50_000, y: 50_000 }, [PRIMARY]);
    expect(placed.source).toBe('centre');
    expect(placed.bounds).toEqual({
      x: Math.round(PRIMARY.x + (PRIMARY.width - 380) / 2),
      y: Math.round(PRIMARY.y + (PRIMARY.height - 460) / 2),
      width: 380,
      height: 460,
    });
  });
});

describe('launch placement: no remembered position', () => {
  it('a fresh profile opens at the bottom-right corner at the base size', () => {
    const placed = place({});
    // The Phase 1 first launch: x 2164, y 604, 380x460.
    expect(placed).toEqual({
      source: 'corner',
      bounds: { x: 2164, y: 604, width: 380, height: 460 },
    });
  });

  it('an older settings file with only a size reopens at its corner, not centred', () => {
    // The file Phase 1 found after the second launch had opened centred.
    const placed = place({ corner: 'bottom-right', width: 380, height: 460 });
    expect(placed).toEqual({
      source: 'corner',
      bounds: { x: 2164, y: 604, width: 380, height: 460 },
    });
  });

  it('garbage geometry in the file is ignored, not trusted', () => {
    const garbage = {
      x: 'left',
      y: null,
      width: -5,
      height: Number.NaN,
    } as unknown as SavedGeometry;
    const placed = place(garbage);
    expect(placed).toEqual({
      source: 'corner',
      bounds: { x: 2164, y: 604, width: 380, height: 460 },
    });
  });

  it('matches the shipped defaults (bottom-right corner)', () => {
    expect(DEFAULT_WINDOW_SETTINGS.corner).toBe('bottom-right');
  });
});

describe('launch placement: clamping', () => {
  it('a reachable position partly off its display is pulled fully onto it', () => {
    // A 720x640 window left hanging off the primary's bottom-right corner.
    const placed = place({ x: 2164, y: 604, width: 720, height: 640 }, [PRIMARY]);
    expect(placed.source).toBe('saved');
    expect(placed.bounds).toEqual({
      x: PRIMARY.x + PRIMARY.width - 720,
      y: PRIMARY.y + PRIMARY.height - 640,
      width: 720,
      height: 640,
    });
    expect(inside(placed.bounds, PRIMARY)).toBe(true);
  });

  it('a window straddling two monitors lands on the one holding most of its strip', () => {
    // 240 of its 380 px on the left monitor, 80 on the primary's work area (the
    // 60 px between them are the primary's taskbar).
    const placed = place({ x: PRIMARY.x - 300, y: 100 });
    expect(placed.source).toBe('saved');
    expect(inside(placed.bounds, LEFT)).toBe(true);
    expect(placed.bounds.x).toBe(LEFT.x + LEFT.width - 380);
  });

  it('a remembered size larger than the display shrinks to fit it', () => {
    const small: Rect = { x: 0, y: 0, width: 1280, height: 680 };
    const placed = place({ x: 10, y: 10, width: 1900, height: 1000 }, [small], small);
    expect(placed.bounds).toEqual({ x: 0, y: 0, width: 1280, height: 680 });
  });

  it('the corner fallback never pushes a big window off the display', () => {
    const small: Rect = { x: 0, y: 0, width: 1280, height: 680 };
    const placed = place({ width: 1900, height: 1000 }, [small], small);
    expect(placed.source).toBe('corner');
    expect(inside(placed.bounds, small)).toBe(true);
  });

  it('never shrinks below the minimum window size', () => {
    const tiny: Rect = { x: 0, y: 0, width: 300, height: 400 };
    expect(fitInside({ x: 50, y: 50, width: 380, height: 460 }, tiny, MIN)).toEqual({
      x: 0,
      y: 0,
      width: 320,
      height: 420,
    });
  });

  it('a remembered size is held within the window min/max', () => {
    const placed = place({ x: 100, y: 100, width: 100, height: 9000 }, [
      { x: 0, y: 0, width: 4000, height: 4000 },
    ]);
    expect(placed.bounds.width).toBe(MIN.width);
    expect(placed.bounds.height).toBe(MAX.height);
  });
});

describe('corner snapping', () => {
  const size = { width: 380, height: 460 };
  it.each([
    ['top-left', 76, 16],
    ['top-right', 2164, 16],
    ['bottom-left', 76, 604],
    ['bottom-right', 2164, 604],
  ] as const)('%s', (corner, x, y) => {
    expect(cornerBounds(corner, size, PRIMARY)).toEqual({ x, y, ...size });
  });
});

describe('what gets remembered', () => {
  const normal: Rect = { x: 1234, y: 321, width: 400, height: 500 };
  const parked: Rect = { x: -32000, y: -32000, width: 160, height: 28 };

  it('a window in its normal state remembers its bounds', () => {
    expect(
      boundsToRemember({
        minimized: false,
        maximized: false,
        fullScreen: false,
        bounds: { x: 1234.4, y: 320.6, width: 400, height: 500 },
        normalBounds: { x: 0, y: 0, width: 1, height: 1 },
      }),
    ).toEqual(normal);
  });

  it('a minimized window never saves its parking coordinates', () => {
    const remembered = boundsToRemember({
      minimized: true,
      maximized: false,
      fullScreen: false,
      bounds: parked,
      normalBounds: normal,
    });
    expect(remembered).toEqual(normal);
  });

  it('a minimized reading is dropped even when the normal bounds report it too', () => {
    expect(
      boundsToRemember({
        minimized: true,
        maximized: false,
        fullScreen: false,
        bounds: parked,
        normalBounds: parked,
      }),
    ).toBeNull();
  });

  it('parking coordinates are dropped even if the minimized flag lags behind', () => {
    expect(
      boundsToRemember({
        minimized: false,
        maximized: false,
        fullScreen: false,
        bounds: parked,
        normalBounds: parked,
      }),
    ).toBeNull();
  });

  it('a maximized or full-screen window remembers the bounds it restores to', () => {
    const filled: Rect = { ...PRIMARY };
    for (const state of [
      { maximized: true, fullScreen: false },
      { maximized: false, fullScreen: true },
    ]) {
      expect(
        boundsToRemember({ minimized: false, ...state, bounds: filled, normalBounds: normal }),
      ).toEqual(normal);
    }
  });

  it('empty or broken bounds are not remembered', () => {
    for (const rect of [
      { x: 10, y: 10, width: 0, height: 400 },
      { x: Number.NaN, y: 10, width: 400, height: 400 },
    ]) {
      expect(
        boundsToRemember({
          minimized: false,
          maximized: false,
          fullScreen: false,
          bounds: rect,
          normalBounds: rect,
        }),
      ).toBeNull();
    }
  });

  it('what is remembered reopens in the same place', () => {
    const remembered = boundsToRemember({
      minimized: false,
      maximized: false,
      fullScreen: false,
      bounds: normal,
      normalBounds: normal,
    });
    expect(remembered).not.toBeNull();
    expect(place({ ...remembered! }).bounds).toEqual(normal);
  });
});
