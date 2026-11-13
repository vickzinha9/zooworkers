import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TRAY_LABELS,
  MAX_TRAY_LABEL_LENGTH,
  parseTrayLabels,
  type TrayLabels,
} from '../electron/ipc';
import en from '../src/i18n/locales/en.json';
import ptBR from '../src/i18n/locales/pt-BR.json';

// Main validates the tray labels the renderer sends before it rebuilds the menu.

const PT: TrayLabels = {
  show: 'Mostrar',
  hide: 'Esconder',
  quietMode: 'Modo Silencioso',
  settings: 'Ajustes…',
  quit: 'Sair',
};

describe('tray labels: the i18n group', () => {
  it("main's English fallback is the en locale's tray group, word for word", () => {
    expect(DEFAULT_TRAY_LABELS).toEqual(en.tray);
  });

  it("pt-BR uses the game's own words", () => {
    expect(ptBR.tray).toEqual(PT);
    // Quiet Mode and Settings are already named in the game.
    expect(ptBR.tray.quietMode).toBe(ptBR.settings.quietMode);
    expect(ptBR.tray.settings).toBe(`${ptBR.settings.title}…`);
  });

  it('both shipped locales pass main validation unchanged', () => {
    expect(parseTrayLabels(en.tray)).toEqual(en.tray);
    expect(parseTrayLabels(ptBR.tray)).toEqual(PT);
  });
});

describe('tray labels: main validation', () => {
  it('trims surrounding spaces', () => {
    expect(parseTrayLabels({ ...PT, show: '  Mostrar ' })).toEqual(PT);
  });

  it('rejects anything that is not a plain object', () => {
    for (const payload of [null, undefined, 'Mostrar', 42, [PT.show], new Map(), new Date()]) {
      expect(parseTrayLabels(payload)).toBeNull();
    }
    class Labels {
      show = PT.show;
      hide = PT.hide;
      quietMode = PT.quietMode;
      settings = PT.settings;
      quit = PT.quit;
    }
    expect(parseTrayLabels(new Labels())).toBeNull();
  });

  it('rejects a missing, extra or non-string field', () => {
    const { quit: _quit, ...missing } = PT;
    expect(parseTrayLabels(missing)).toBeNull();
    expect(parseTrayLabels({ ...PT, about: 'Sobre' })).toBeNull();
    expect(parseTrayLabels({ ...PT, show: 1 })).toBeNull();
    expect(parseTrayLabels({ ...PT, hide: { text: 'Esconder' } })).toBeNull();
  });

  it('rejects blank, overlong and multi-line labels', () => {
    for (const quit of [
      '',
      '   ',
      'x'.repeat(MAX_TRAY_LABEL_LENGTH + 1),
      'Sair\nagora',
      'Sair\u0000',
      'Sair\u2028agora',
      '\u001b[31mSair',
    ]) {
      expect(parseTrayLabels({ ...PT, quit }), JSON.stringify(quit)).toBeNull();
    }
    expect(parseTrayLabels({ ...PT, quit: 'x'.repeat(MAX_TRAY_LABEL_LENGTH) })).not.toBeNull();
  });
});
