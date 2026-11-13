# Packaged Build QA Checklist

Print this and tick every box on the **packaged** `.exe` (from
`release\win-unpacked\`), with the dev server NOT running, before any release.

Play in Brazilian Portuguese (the primary QA language). Each step names the English label and,
in parentheses, the pt-BR one the tester sees. Settings (Ajustes) opens from the gear in the top
bar and has five tabs: General (Geral), Sound (Som), Accessibility (Acessibilidade), Window
(Janela) and Save file (Arquivo). The dock along the bottom holds Team (Equipe), Upgrades
(Melhorias), Decorate (Decorar), Activities (Atividades) and Archive (Arquivo).

## Startup diagnostics (if the app won't stay open)

- The main process writes a **startup log** to
  `%APPDATA%\ZooWorkers\startup.log` (and to stdout with
  `--enable-logging`). A healthy launch logs these lines in this order, with others in between:
  `app ready. isPackaged=true …` → `BrowserWindow created (icon=set).` →
  `loading renderer: isPackaged=true unpacked=true … rendererPath=…\resources\app.asar.unpacked\dist\index.html exists=true …`
  → `startup complete.` → `renderer did-finish-load (…)` → `Tray created.` →
  `STARTUP SUCCESS: renderer loaded and window shown.` The line `mainWindow shown.` appears once,
  before or after `renderer did-finish-load`. The tray is only created after the game has loaded.
- Icons ship via electron-builder `extraResources` to
  `release\win-unpacked\resources\icon.png` and `tray.png`; the exe icon is
  embedded from `build\icon.ico` (`win.icon`). A missing/invalid icon must never
  crash — the tray is skipped and the window icon falls back to the default
  (`BrowserWindow created (icon=default)`).
- `uncaughtException` / `unhandledRejection` / `render-process-gone` /
  `did-fail-load` are all logged; the app will not quit silently on a startup
  error: a failed load shows a readable startup-error window instead.
- Renderer console warnings and errors are copied into the same log as lines starting
  `renderer console`.

## Launch & basics

- [ ] `ZooWorkers.exe` opens with no error dialog
- [ ] The window stays open (does NOT flash open then close within ~1s)
- [ ] `startup.log` contains `STARTUP SUCCESS` and `icon=set`, and no `ERR_FAILED`,
      `Object has been destroyed` or `render-process-gone`
- [ ] No blank/white window; the office appears
- [ ] No white flash on startup. The window is opaque (a dark wood colour until the game
      draws) and its edges look clean; Windows 11 rounds its corners
- [ ] First launch: the opening plays ("Claim the first acorn" (Pegar a primeira bolota), then
      "Start the company" (Abrir a empresa)); after a relaunch it is skipped and the save is kept
- [ ] First launch opens at 380×460 in the bottom-right corner, above other windows
- [ ] Launching the `.exe` a second time brings the open window forward; no second copy starts
- [ ] No dev server or internet connection required
- [ ] No Steam client required (normal local build)

## Core gameplay

- [ ] Clicking the crate (caixote) by Pip's (Tico's) desk collects it (a +X pop appears)
- [ ] Passive production raises the nuts (Castanhas) in the top bar, which shows the rate as `+X/s`
- [ ] Tapping a room's machine steadily fills its ring; at the top the room rushes
- [ ] The paper goal tag in the office turns green when affordable, and one click buys it
- [ ] Buying in Upgrades (Melhorias) updates production and the next cost
- [ ] Team (Equipe) → Hire (Contratar): the new teammate appears in a room (never invisible),
      and never as a fifth person in a room
- [ ] All 23 employees can be hired. The packaged build has no developer panel, so import a
      late-game save (Settings → Save file → Import save (Importar save)), for example one
      exported from a dev build (`npm run dev`, `?dev=1`, DEV → "Unlock all employees")
- [ ] Reassigning works both ways and the teammate moves in the office: Team card → Work
      location (Local de trabalho), or the office's Arrange (Arrumar) button, then drag the
      teammate onto another floor. A full room refuses with "{room} is full." ("{sala} está
      cheia.")
- [ ] Visit (Visitar) on a Team card opens a one-on-one with three tabs: Talk (Conversar), Gifts
      (Presentes) and Scrapbook (Álbum)

## Systems

- [ ] Activities (Atividades) has three minigames: **Coffee Rescue** (Resgate do Café), **Bug
      Squash** (Caça-Insetos) and **Cable Untangle Desk** (Mesa de Cabos Embolados). For each:
      Play (Jogar) starts it after a 3-2-1; Esc pauses ("Coffee break" (Pausa para o café),
      Resume (Continuar)); "Leave shift" (Sair do turno) ends it with no reward; a finished round
      pays exactly once (a repeat shows "Shift already on file" (Turno já registrado))
- [ ] Clicking away to another window during a round pauses it
- [ ] An incident: a teammate holds up a **!** ticket and the room's name shows a **!**. Opening
      it shows 2 to 4 answers, each with what it will do underneath; after choosing, the card
      turns over to "Here's what happened" (Veja o que aconteceu)
- [ ] A multi-step incident advances to its next step after the first answer
- [ ] Settings → General → "Disable choice popups" (Desativar janelas de escolha): incidents no
      longer wait; the team decides and each decision appears in the notifications
- [ ] Archive → Company (Arquivo → Empresa): "Recent decisions" (Decisões recentes) marks each as
      You (Você) or Team (Equipe); "Observation report" (Relatório de observação) opens the file;
      "Go there" (Ir até lá) takes you to the room
- [ ] Welcome back: quit for at least 2 minutes and relaunch. The "Welcome back!" (Bem-vindo de
      volta!) note shows the time away, the nuts banked, what is waiting, and "Read the
      observation report" (Ler o relatório de observação)
- [ ] Restructure: the Archive's "Restructure" (Reestruturação) tab appears half way to a million
      nuts this cycle. "Go Completely Nuts…" (Pirar na Castanha…) asks for confirmation and
      grants Permanent Kernels (Grãos Permanentes); "Not yet" (Ainda não) or Esc changes nothing
- [ ] Daily Challenges (Desafios Diários) on Archive → Company list three challenges; a finished
      one can be claimed (Resgatar)
- [ ] Decorate (Decorar): buy a piece; the message says where it went ("Done! It's already in
      {room}." (Feito! Já está na sala: …) or in storage (no depósito)). "Arrange" (Arrumar) on
      its card shows it in the office; dropping it on the storage strip (Depósito) puts it away,
      dragging it back out places it again
- [ ] Archive → Collections (Arquivo → Coleções): the drawers open; "Photo Mode" (Modo Foto) →
      "Save snapshot" (Salvar foto) saves a PNG; a Moment Card in "Moment Cards" (Cartões de
      Momento) saves as a PNG. Neither shows anything from the desktop
- [ ] "Production breakdown" (Detalhes da produção) on Archive → Company matches the top bar's `+X/s`
- [ ] Archive → Achievements (Conquistas) lists 44 achievements (hidden ones read `???` until
      unlocked), unlocked ones marked

## Save

- [ ] Close and reopen — progress persisted (the game autosaves every 20 s of play, when the
      window is hidden and on close)
- [ ] Settings → Save file (Arquivo) shows "Last saved" (Último salvamento); "Save now" (Salvar
      agora) updates it
- [ ] Offline progress summary (the welcome-back note) appears after being closed a while
- [ ] "Export save" (Exportar save) produces a `.json` named after the company and the date;
      "Import save" (Importar save) asks "Replace the current company?" (Substituir a empresa
      atual?) before restoring it; a file that is not a save is refused and the company is left
      untouched
- [ ] Old save from a previous version still loads (migration)
- [ ] "Reset game" (Reiniciar jogo) asks for confirmation and starts fresh

## Audio

- [ ] Music plays continuously without harsh pops (it is synthesized: chord progressions rotate,
      so listen across a few changes rather than for a loop point)
- [ ] Office ambience is a soft room tone plus a small sound every few seconds (typing, paper,
      coffee, a creak, a drip), never constant chatter. On the Radio Studio (Estúdio de Rádio),
      Repair Workshop (Oficina de Reparos) and Winter Garden (Jardim de Inverno) floors, their
      own sounds join in while in view
- [ ] The top bar's speaker mutes everything; its music-note button mutes the background (music
      and ambience) and leaves clicks and effects on
- [ ] Settings → Sound (Som): "Mute all" (Silenciar tudo), "Master volume" (Volume geral) and
      Music (Música), Ambience (Ambiente), Interface (Interface) and Sound effects (Efeitos
      sonoros), each with its own slider and mute button, all work
- [ ] Muting a channel then unmuting restores the previous volume
- [ ] "Reset audio to defaults" (Restaurar áudio para o padrão) works
- [ ] Settings persist after restart
- [ ] Quiet Mode (Modo Silencioso), ticked in the tray icon's menu, drops everything to about a
      quarter of its volume and calms the animation; unticking restores both
- [ ] A Focus Harvest session (Activities → Colheita de Foco; enable it there first) lowers the
      music and ambience while it runs
- [ ] "Mute when window is unfocused" (Silenciar quando a janela não está em foco) silences
      audio when the window loses focus

## Desktop window

- [ ] Drag the top bar (the company name) to move the window anywhere
- [ ] Settings → Window → "Screen corner" (Canto da tela): each of the 4 corners docks it
- [ ] "Always on top" (Sempre no topo; on by default) keeps it above other windows; off lets
      other windows cover it
- [ ] "Click-through mode" (Modo clique-através) can be enabled AND disabled again. While it is
      on the window ignores the mouse, and the choice survives a restart, so get back without
      the mouse: bring the window forward (taskbar, Alt+Tab, or the tray menu's "Settings…"
      (Ajustes…)), Tab to the switch and press Space. If there is no way back short of editing
      `window-settings.json`, record it as a release blocker
- [ ] "Hide to tray" (Esconder na bandeja), then restore by clicking the tray icon. The tray menu
      reads Mostrar, Esconder, Modo Silencioso, Ajustes…, Sair in pt-BR
- [ ] Ctrl+Shift+N hides and shows the window
- [ ] "Close button minimizes to tray" (Botão Fechar minimiza para a bandeja): off by default (✕
      quits); on, ✕ hides it to the tray
- [ ] "Launch on system startup" (Abrir ao iniciar o sistema): sign out and back in; the game
      opens
- [ ] "Window scale" (Escala da janela) 75%, 100%, 125% and 150% resize the window at its
      corner, and text stays readable
- [ ] Move to a second monitor, close, reopen → returns there; unplug that monitor, reopen →
      returns on-screen
- [ ] Change display scaling (125%/150%) → UI still readable

## Accessibility & language

- [ ] "Reduced motion" (Movimento reduzido) stops the ambient animation; Coffee Rescue becomes
      tap-a-cup (the cups wait on the counter; tap one or press 1 to 5)
- [ ] "High contrast" (Alto contraste), "Colorblind mode" (Modo daltônico), "Dyslexia-friendly
      font" (Fonte para dislexia), "Font size" (Tamanho da fonte), "Interface scale" (Escala da
      interface) and "Pause animations in menus" (Pausar animações nos menus) all apply
- [ ] Settings → General → "Game language" (Idioma do jogo) offers only English and Português
      (Brasil)
- [ ] Switch language to Português (Brasil) — no missing text, no overflow; the tray menu
      follows
- [ ] Switch back to English

## Performance (leave it running in a corner)

- [ ] CPU stays low while idle (Phase 1 measured 3.5% of one core minimized)
- [ ] No steady memory growth over ~30 minutes
- [ ] "Battery-friendly mode" (Modo economia de bateria, Settings → Window) pauses the ambient
      animation as soon as it is switched on
- [ ] No `renderer console` errors in `startup.log`

## Known issues (do not tick these as working)

Found in the code on 2026-11-13. Check each and note what you see, but do not count them as
passing features until they are fixed.

- **Four Accessibility switches change nothing.** "Disable screen shake" (Desativar tremor de
  tela), "Disable flashing" (Desativar piscadas), "Audio subtitles" (Legendas de áudio) and "Frame
  rate limit" (Limite de quadros) are saved, but no code reads them. The game has no spoken
  audio to subtitle.
- **Battery-friendly mode after a restart.** The setting is kept in `window-settings.json`, but
  the game only reads it when Settings is opened. Turn it on, restart, and the ambient animation
  runs again until Settings is opened.
- **Click-through has no mouse way back** (see Desktop window): only the keyboard path, which
  still needs a native check.
