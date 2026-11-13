# Local Windows Verification Checklist

A focused, by-hand checklist for the two areas that only misbehave in the real
packaged Windows build (audio + window management), plus the decoration and
save flows, time away and sleep, and file exports. Run it on Windows after building locally —
the automated suite already covers the logic, but the mute and resize behaviours depend on the
native OS window, which can't be verified on the Linux CI box.

Play in Brazilian Portuguese: each step names the English label and, in parentheses, the pt-BR
one. Settings (Ajustes) opens from the gear in the top bar; its tabs are General (Geral), Sound
(Som), Accessibility (Acessibilidade), Window (Janela) and Save file (Arquivo). The full release
checklist is [`PACKAGED_BUILD_QA.md`](PACKAGED_BUILD_QA.md), including its known issues.

---

## 1. Build the app (Windows)

From the project root in **PowerShell** (or any Windows terminal):

```powershell
npm install
npm run build:windows:folder
```

`build:windows:folder` runs `npm run build:desktop` (web bundle + Electron main)
and then `electron-builder --win dir`, which produces an **unpacked folder**
build — the fastest option for local testing (no installer, no signing).

### Expected executable location

```
release\win-unpacked\ZooWorkers.exe
```

Double-click that `.exe` to launch. (There is no installer with the `dir`
target; the whole runnable app lives in `release\win-unpacked\`.)

### If the window never appears — run the isolated + staged bisection (in order)

Everything below imports NOTHING from the real `main.ts`, so the first one that
fails pinpoints the cause. Watch each console for `dom-ready` / `did-finish-load`
(good) vs `render-view-deleted` / `webContents destroyed` / `ERR_FAILED` (bad).

```powershell
npm run build:desktop

:: Truly isolated entrypoint — should behave exactly like your bare test:
npm run electron:minimal-isolated      :: expect ISOLATED MINIMAL SUCCESS

:: Staged bisect — each adds ONE thing on top of the previous:
npm run electron:stage-a   :: data: URL, plain window
npm run electron:stage-b   :: local HTML file
npm run electron:stage-c   :: real dist/index.html, no preload, sandbox:false
npm run electron:stage-d   :: + preload
npm run electron:stage-e   :: + PRODUCTION webPreferences (sandbox:true, webSecurity)
npm run electron:stage-f   :: + frameless window
npm run electron:stage-g   :: + saved window bounds
npm run electron:stage-h   :: + IPC handlers
npm run electron:stage-i   :: + single-instance lock
npm run electron:stage-j   :: + navigation guards
npm run electron:stage-k   :: + CSP / webRequest
npm run electron:stage-l   :: + Tray
npm run electron:stage-m   :: + GPU self-heal (logs only)
```

Tell me the FIRST stage that fails — that's the culprit. (Top hypothesis:
**stage-e**, i.e. `sandbox: true`, since your working bare/isolated test uses
`sandbox: false`.) A per-stage log is also written to
`%APPDATA%\wmno-diagnostic\diagnostic.log` (the staged entrypoint runs under its own app name,
`wmno-diagnostic`, so it never touches the game's folder).

### GPU / safe-mode fallbacks (manual only now — no auto-relaunch)

The app does **not** relaunch itself or write the safe-mode marker. If the renderer dies on
launch, `startup.log` says so ("GPU auto-relaunch is DISABLED; not restarting") and a startup
error window explains it. Safe mode (hardware acceleration off) is switched on only by hand, by
any one of: the `--disable-gpu-safe-mode` flag, `WMNO_DISABLE_GPU=1`, or an empty file named
`gpu-safe-mode` created in `%APPDATA%\ZooWorkers\`. To diagnose manually:

```powershell
npm run build:desktop

:: 1. Can Chromium open ANY window at all? (plain data: window, no app)
npx electron . --minimal-window-test
::    Expect the log to reach: MINIMAL WINDOW DOM READY / DID FINISH LOAD / SUCCESS

:: 2. Dev app, normal:            npx electron .
:: 3. Dev app, GPU disabled:      npm run electron:safe
:: 4. Packaged, normal:           release\win-unpacked\ZooWorkers.exe
:: 5. Packaged, GPU disabled:     npm run start:windows:safe
```

- If **GPU-disabled** opens the game but normal does not → it's the GPU/driver.
  Create the `gpu-safe-mode` file in `%APPDATA%\ZooWorkers\` to keep normal launches in safe
  mode. Re-enable acceleration later with `--force-gpu` (or `set WMNO_FORCE_GPU=1`), which also
  deletes that file.
- The startup log records `electron`/`chrome` versions, `GPU feature status`,
  `render-process-gone reason/exitCode`, and `winDestroyed` at each step.

### Automated packaged-startup check (recommended first)

```powershell
npm run verify:windows:packaged
```

This builds the unpacked app, verifies the renderer files are present, launches
the real `.exe`, and only passes once the game actually renders (it waits for
the `STARTUP SUCCESS` marker and fails on `ERR_FAILED` or `Object has been
destroyed`). You can also run the file check alone with `npm run verify:packaged`.

### Why the renderer is unpacked

The renderer is shipped **outside** `app.asar` (electron-builder
`asarUnpack: ["dist/**"]`) because Chromium's `file://` navigation into asar
content fails with `ERR_FAILED` on Windows. Confirm these exist after building:

```
release\win-unpacked\resources\app.asar.unpacked\dist\index.html
release\win-unpacked\resources\app.asar.unpacked\dist\assets\   (JS + CSS + fonts)
release\win-unpacked\resources\app.asar.unpacked\dist\backgrounds\   (animated office)
release\win-unpacked\resources\app.asar.unpacked\dist\employees\   (art for all 23 animals)
release\win-unpacked\resources\app.asar.unpacked\dist\office\   (office art)
```

`npm run verify:packaged` checks the first four, including the three files (`<id>.png`,
`<id>-1x.png`, `<id>-poster.png`) of every registered animal.

The app loads `resources\app.asar.unpacked\dist\index.html` via `loadFile`, and
every relative `./assets/...` path resolves next to it.

Other targets, if you want them:

| Command                  | Output                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `npm run build:windows`  | `release\ZooWorkers-1.0.0-x64.exe` (NSIS installer)           |
| `npm run build:portable` | `release\ZooWorkers-1.0.0-portable.exe` (single portable exe) |

> Note: these builds must be run **on Windows**. Building the Windows target on
> Linux/macOS fails at the executable-signing step with `wine is required` — an
> electron-builder cross-compile limitation, not a code problem.

Where things live at runtime (useful for the audio/window checks below):

- Game save + settings: browser-style `localStorage` (the save, three rotating backups and the
  language), which Electron persists as a database in
  `%APPDATA%\ZooWorkers\Local Storage\leveldb\`. It is not a file you can open; use Export save
  to get a readable copy.
- Window position/size/state, corner, scale and the Window-tab toggles:
  `%APPDATA%\ZooWorkers\window-settings.json`.
- Launch/crash log: `%APPDATA%\ZooWorkers\startup.log`.
- Manual GPU safe-mode marker, if you created one: `%APPDATA%\ZooWorkers\gpu-safe-mode`.

---

## 2. Mute / audio (the previously-broken flow)

Do this with the app window **focused** and your system volume up.

- [ ] **Mute** — click the speaker button in the header ("Mute all audio" (Silenciar tudo)).
      Its icon changes to the muted glyph and all sound stops **immediately** (music, ambience,
      clicks).
- [ ] **New sound stays silent** — while muted, click around (collect a crate,
      open Upgrades (Melhorias), buy something). No sound should play.
- [ ] **Minigame stays silent** — while muted, open **Activities** (Atividades) and start a
      minigame: Coffee Rescue (Resgate do Café), Bug Squash (Caça-Insetos) or Cable Untangle
      Desk (Mesa de Cabos Embolados). Play a few seconds: still completely silent.
- [ ] **Unmute** — click the speaker again. Music/ambience fade back in at the
      same volumes as before.
- [ ] **Background button** — the music-note button beside the speaker mutes music and ambience
      together; clicks and effects keep playing. Pressing it again brings both back.
- [ ] **Audio after restart** — mute, then fully **close** the app and relaunch
      the `.exe`. It should come back **muted** (the speaker shows the muted
      state and no sound plays until you unmute).
- [ ] **Per-channel volumes** — in Settings → Sound (Ajustes → Som), confirm the "Master volume"
      (Volume geral), Music (Música), Ambience (Ambiente), Interface (Interface) and "Sound
      effects" (Efeitos sonoros) sliders each change the right sound, each channel's own mute
      button silences only it, and "Mute all" (Silenciar tudo) overrides all of them.
- [ ] **Quiet Mode** — right-click the tray icon and tick "Quiet Mode" (Modo Silencioso):
      everything drops to about a quarter of its volume and the animation calms down. Untick it:
      both come back.
- [ ] **Mute when unfocused** — turn on "Mute when window is unfocused" (Silenciar quando a
      janela não está em foco), click another app: the game goes silent; click back: it returns.
- [ ] **Minimized** — minimize the window: sound stops; restore it: sound returns.
- [ ] **Room sounds** — take the elevator to the Radio Studio (Estúdio de Rádio), Repair Workshop
      (Oficina de Reparos) and Winter Garden (Jardim de Inverno): each adds sounds of its own
      while in view; everywhere else the office keeps its typing, paper and coffee sounds.

If any sound leaks while muted, capture `startup.log` and note which action
produced it.

---

## 3. Window controls & resizing (frameless title bar)

The window is frameless with a custom title bar (the header). It is now
**opaque**, so Windows draws its normal resize border right at the visible edge.

- [ ] **Minimize** — the ⎯ button sends the window to the taskbar; clicking the
      taskbar icon restores it.
- [ ] **Maximize / Restore** — the ▢ button fills the screen; clicking again
      (now the restore glyph) returns to the previous size.
- [ ] **Close** — the ✕ button saves the game + window size and **quits**
      (unless "Close button minimizes to tray" is on — see below).
- [ ] **Drag** — dragging the header (not on a button) moves the window; the
      buttons and resource readouts never trigger a drag.
- [ ] **Resize from every edge** — top, bottom, left, right: the resize cursor
      appears **right at the visible border**, not several pixels away, and the
      grab zone does **not** overlap the header buttons or room content.
- [ ] **Resize from every corner** — all four corners resize on both axes.
- [ ] **Minimum size** — shrink as far as it allows: it should stop at
      **320 × 420** and never clip the header or the dock into an unusable state.
- [ ] **Compact / horizontal / vertical proportions** — at a small square, a
      wide short strip, and a tall narrow strip, the UI stays readable (the header and the dock
      (Equipe, Melhorias, Decorar, Atividades, Arquivo) stay inside the window, sheets scroll
      internally, nothing scrolls sideways or is cut off).
- [ ] **Resize persistence** — resize + move the window, close, relaunch: it
      reopens at the **same size and position** (check `window-settings.json`).
- [ ] **Display scaling** — on a 125% / 150% display, the window and text scale
      cleanly with no blur or clipped controls.

### Desktop Window options

All in **Settings → Window → Desktop Window** (Ajustes → Janela → Janela de Desktop).

- [ ] **Screen corner** (Canto da tela) — each of the four corners puts the window 16 px in from
      that corner of the screen it is on.
- [ ] **Window scale** (Escala da janela) — 75%, 100%, 125% and 150% resize the window from its
      380 × 460 base (snapped to its corner, if one is set).
- [ ] **Always on top** (Sempre no topo) — on by default; off lets other windows cover it.
- [ ] **Click-through mode** (Modo clique-através) — on, clicks pass to whatever is behind the
      window, and this survives a restart. The mouse can no longer reach the switch, so turn it
      off by keyboard: bring the window forward (taskbar, Alt+Tab or the tray menu's
      "Settings…" (Ajustes…)), Tab to the switch, press Space. If that does not work, the only
      way back is editing `clickThrough` in `window-settings.json`: record it as a release
      blocker.
- [ ] **Launch on system startup** (Abrir ao iniciar o sistema) — sign out and back in: the game
      opens (normally, not hidden in the tray).
- [ ] **Hide to tray** (Esconder na bandeja) — the window hides; clicking the tray icon brings it
      back. **Ctrl+Shift+N** hides and shows it too.

### Tray behaviour (only if you opt in)

- [ ] In **Settings → Window** (Ajustes → Janela), the app does **not** hide to the tray on close
      by default.
- [ ] Enable **"Close button minimizes to tray"** (Botão Fechar minimiza para a bandeja). Now the
      ✕ button hides the app to the system tray; the tray icon restores it, and its menu can
      quit.
- [ ] The tray menu reads Mostrar, Esconder, Modo Silencioso, Ajustes…, Sair in pt-BR, and
      "Settings…" (Ajustes…) opens Settings in the window.
- [ ] Disable it again → ✕ quits normally.

---

## 4. Decorations (placement, depth, persistence)

Buy a few pieces first in **Decorate** (Decorar) in the dock: a floor piece (a plant, a lamp, a
rug) and a wall piece (a poster, a window).

- [ ] **Enter Arrange mode** — press **Arrange** (Arrumar) beside the elevator in the office, or
      **Arrange** (Arrumar) on an owned piece's card in Decorate. The storage strip (Depósito)
      opens along the bottom, and undo/redo buttons appear next to Arrange.
- [ ] **Drag a floor decoration** — it follows the pointer as a full-size ghost while the floor
      area it will land on is outlined (no text label); on drop it settles with a small dust
      puff + soft sound (silent if muted).
- [ ] **Drag a wall decoration** — it only lands on the wall.
- [ ] **Refused drops** — hold a wall piece down on the floor, or a floor piece up on the wall,
      and let go: the drop is **refused**, the piece goes back where it was, and a short message
      says where it belongs: "This stands on the floor." (Isto fica no piso.), "This goes on the
      wall." (Isto vai na parede.) or "This hangs from the ceiling." (Isto pendura no teto.).
      Let go at a room's very edge and it may say "Move it farther inside the room." (Mova mais
      para dentro da sala.); let go outside every room and it simply goes back.
- [ ] **Overlaps are allowed** — a piece may overlap another piece or stand where a teammate
      is; it is not refused. Furniture further back on the floor is drawn behind the teammates,
      nearer furniture in front of them. With a wall or floor piece picked, "Put behind" (Pôr
      atrás) / "Put in front" (Pôr na frente) changes its side.
- [ ] **Stow, cancel, undo** — let go over the storage strip ("Let go here to put it in storage"
      (Solte aqui para guardar no depósito)): it is put away. Press Escape mid-drag: the piece
      returns and nothing changes. Undo (Desfazer) and Redo (Refazer) step through the moves.
- [ ] **Without dragging** — tap a piece, then tap a spot to send it there; "Move To…" (Mover
      para…) moves it to another room from the keyboard or by touch.
- [ ] **Interact** — outside Arrange mode, click a lamp/screen/aquarium (turns
      on/off), a poster (art changes), a plant (wiggles). Sounds obey Mute.
- [ ] **Save & reload** — move a few decorations, then close + relaunch: every
      piece is exactly where you left it.

---

## 5. Accessibility / performance toggles

- [ ] **Reduced motion** (Ajustes → Acessibilidade → Movimento reduzido) — ambient animation
      (dust, decoration motion) stops; drag still works, just without the flourishes. Coffee
      Rescue (Resgate do Café) becomes tap-a-cup.
- [ ] **Battery-friendly mode** (Ajustes → Janela → Modo economia de bateria) — ambient
      animation pauses to save power as soon as it is switched on.
- [ ] **Battery-friendly mode after a restart (known issue)** — leave it on, quit, relaunch:
      the ambient animation runs again until Settings is opened (the game only reads the setting
      there). Record what you see; do not tick it as working.
- [ ] **Minimize the window** — ambient animation pauses while hidden and
      resumes when you bring it back.
- [ ] **Switches that change nothing (known issue)** — "Disable screen shake" (Desativar tremor
      de tela), "Disable flashing" (Desativar piscadas), "Audio subtitles" (Legendas de áudio)
      and "Frame rate limit" (Limite de quadros) are saved, but no code reads them. Do not tick
      them as working.

---

## 6. Time away, sleep and the welcome back

The desktop app asks Windows how long the computer really slept, which the browser cannot do, so
these only mean anything in the packaged build.

- [ ] **Minimized, PC awake** — minimize for 10 minutes, restore: the "Welcome back!" (Bem-vindo
      de volta!) note says the office made it all ("Left open in a corner, the office made it
      all." (Aberto no canto, o escritório rendeu tudo.)), never that the computer slept.
- [ ] **PC asleep** — put Windows to sleep for 10 minutes or more, wake it: the note says the
      computer slept and that time pays 60% ("The computer slept …" (O computador dormiu …)).
- [ ] **Closed** — quit for at least 2 minutes, relaunch: the note says what the team made at
      60% while the game was closed (Com o jogo fechado, a equipe rende 60%…).
- [ ] **A glance away** — hide to the tray for 5 seconds and back: no note.
- [ ] **Into the report** — "Read the observation report" (Ler o relatório de observação) on the
      note opens the "Observation report" (Relatório de observação); "Go there" (Ir até lá) takes
      you to the room.

---

## 7. Files the game writes for you

`docs/ZOOWORKERS_STATE.md` records none of these on the packaged build (LOCAL WINDOWS
VERIFICATION REQUIRED). The game hands each file to Chromium as a download and the desktop shell
does not handle downloads itself, so note whether Windows shows a save dialog or drops the file
in Downloads.

- [ ] **Export save** (Ajustes → Arquivo → Exportar save) — a `zooworkers_<company>_<date>.json`
      is written. The game says "Save exported to your downloads." (Save exportado para seus
      downloads.) at the click: note whether that is true, and what happens if you cancel a
      save dialog.
- [ ] **Import save** (Importar save) — pick that file: "Replace the current company?"
      (Substituir a empresa atual?) appears first, and "Replace company" (Substituir empresa)
      restores it.
- [ ] **Photo Mode** (Arquivo → Coleções → Modo Foto) → "Save snapshot" (Salvar foto) — a PNG is
      written, showing the office and nothing from the desktop.
- [ ] **Moment Card** — in Arquivo → Coleções → Cartões de Momento, save a card: a PNG of the
      card is written.

---

If anything fails, grab `%APPDATA%\ZooWorkers\startup.log` and note the
exact step; that log captures load, render and window events for diagnosis.
