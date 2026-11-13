# ZooWorkers: Steam store page text (draft)

Store text in English and Brazilian Portuguese, ready to paste into Steamworks (Store Presence →
Store Page). The two languages are written separately, in the same Nutshell Inc. voice: the
Portuguese is not a translation of the English.

Every count, number and setting here was checked against the code on 2026-11-13 (branch
`feat/zooworkers-1.0-release`, commit `82ac4fd`); the sources are listed in
[Evidence](#evidence). If content changes before release, re-check the counts there first.

- Paragraphs meant for pasting sit on one line each, so they paste without stray line breaks.
  Steam uses its own markup (`[h2]`, `[list]`, `[*]`); convert the headings and bullets when
  pasting.
- Anything marked **OWNER DECISION** is not ours to settle. Leave it blank on Steamworks until
  the owner fills it in.
- [Do not claim yet](#do-not-claim-yet) lists features the page must not mention.

## Owner decisions at a glance

| Item                                      | Status                                                                                                                                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Steam App ID                              | **OWNER DECISION.** Never commit it (see `docs/STEAM.md`).                                                                                                                 |
| Store name and subtitle                   | **OWNER DECISION** (see [Name](#name)).                                                                                                                                    |
| Developer and publisher names             | **OWNER DECISION.** The repo only says "ZooWorkers contributors" (`package.json` `build.copyright`).                                                                       |
| Price, discounts, regional pricing        | **OWNER DECISION.**                                                                                                                                                        |
| Release date, Early Access or full launch | **OWNER DECISION.**                                                                                                                                                        |
| Genres and tags                           | **OWNER DECISION** (suggestions in [Genres and tags](#genres-and-tags-suggested)).                                                                                         |
| System requirements                       | **To confirm** with the Phase 3 measurements (see [System requirements](#system-requirements-suggested)).                                                                  |
| Content survey answers, maturity rating   | **OWNER DECISION** (facts in [Content and maturity](#content-and-maturity)).                                                                                               |
| EULA                                      | **OWNER DECISION.** `docs/EULA_TEMPLATE.md` is a template that a lawyer must review. Steam's default subscriber agreement may be enough; the owner decides.                |
| Licence                                   | **OWNER DECISION.** The repository is MIT-licensed (`LICENSE`). The owner decides what licence the sold build ships under and whether that matches the EULA template's §2. |
| Steam Achievements, Steam Cloud, Deck     | **OWNER DECISION**, and not built yet (see [Do not claim yet](#do-not-claim-yet)).                                                                                         |
| Platforms beyond Windows                  | **OWNER DECISION.** macOS and Linux targets exist in `package.json` but have never been tested.                                                                            |

## Name

- **Store name:** ZooWorkers (`app.title`, `package.json` `productName`).
- **In-game subtitle**, if the owner wants one on the page:
  - EN: A Cozy Animal Office Idle Game
  - pt-BR: Um jogo idle aconchegante num escritório de bichos
- **OWNER DECISION:** "ZooWorkers" alone, or with the subtitle.

## Short description

Steam allows about 300 characters. Both versions include the cast count (23).

### English (279 characters)

A cozy idle game for the corner of your screen. Run Nutshell Inc., a tree-trunk company of 23 animal employees with stories, moods and opinions of their own, while you work or study. Leave the window open: the office keeps working, and its research department keeps taking notes.

### Português (Brasil) (288 caracteres)

Um jogo idle aconchegante para o canto da tela. Cuide da Nutshell Inc., uma empresa num tronco de árvore com 23 funcionários bichos, cada um com sua história e suas manias, enquanto você trabalha ou estuda. Deixe a janela aberta: o escritório segue rendendo. E os pesquisadores, anotando.

## About This Game

### English

**Welcome to Nutshell Inc.**

Pip the squirrel founded a nut-processing company inside a tree trunk. It is small, warm and extremely professional, and its Behavioural Research Department would like you to know that everything is perfectly normal. You run it now, from a little window in the corner of your screen.

ZooWorkers is a cozy idle and clicker game about an office of animals with lives of their own. Tap the stations, hire the team, open new floors, decorate every room and get to know twenty-three coworkers who remember what you said to them. Then go back to your work. The office keeps going without you. It also keeps notes.

**Made for the corner of your screen**

- A small window that resizes from 320×420 to full screen, stays on top of your other apps, snaps to any corner, scales from 75% to 150% and hides in the system tray. Ctrl+Shift+N shows or hides it.
- Thirty seconds is a real visit: collect the crate, take what someone found, buy the next thing. Twenty minutes is an afternoon at the office.
- Leave it open in a corner and the time counts in full. Close it and the team still works at 60% for up to 8 hours, longer with the right upgrades.
- When you come back, a welcome-back note says what came in, what is waiting for you and what the team decided without you.

**Twenty-three coworkers, twenty-three stories**

- Every employee has a personality, moods, a favourite kind of room and a voice of their own, plus friends, rivals and the occasional awkward pairing.
- Sit down with someone for a one-on-one visit: talk, try gifts until you find the one they love, and leaf through a scrapbook of everything you have shared.
- Each teammate's story comes in three parts, which open as you go from new face to familiar, trusted and close. What you answer comes back later. At the end, their keepsake goes on their desk.
- Four people to a room at most, and who works where changes both moods and output.

**Things happen in the office**

- Now and then someone holds up a little ticket: something is going on in their room. It waits for you. Look into it and decide; under each answer you can see what it costs and who it will change.
- Choices are remembered. People bring them up later, follow-ups arrive, and some things only turn up because of what you decided before.
- Leave a ticket long enough and the team sorts it out themselves. The Observation Report is the researchers' file on who decided what.
- Fifty-five curiosities wait on walls, in corners and inside the rooms' routines: funny, wholesome, absurd and, now and then, paranormal. Someone has lovingly named every nut in storage. Nobody has explained the basement.

**Build, decorate, collect**

- 21 rooms stacked up the trunk, from the Suspicious Basement to the Rooftop Acorn Garden, each with its own station and routine: brew the coffee, unjam the machine, watch the cameras, hand over the post, pick the radio show.
- 67 decorations for floors, walls and ceilings. Drag them wherever you like; complete a room's set for a lasting bonus.
- Collections: a Nut Encyclopedia of 24 fictional nuts, curiosities and secret files, team keepsakes, special outfits and Moment Cards. And 44 achievements.
- Once the company has made a million nuts, Go Completely Nuts: restructure for Permanent Kernels, pick one of five branches for the next cycle, and keep your friendships, stories, decorations and collections.

**Three tiny office emergencies**

- Coffee Rescue: catch the good coffee, let the decaf fall.
- Bug Squash: tap the pests out of the drawers. The sticky note is a feature.
- Cable Untangle Desk: drag the plugs until no cable crosses another.

Rounds last 30 to 45 seconds, pause when you switch windows and pay in proportion to how big your company has grown. Master one and a souvenir joins the office.

**Gentle by design**

- No ads, no microtransactions, no account, no internet connection needed.
- Optional Focus Harvest: start a work session and the team produces 25% more while it runs. It never blocks your computer, never looks at what you do, and ending early costs nothing.
- Golden nuts are earned by playing, never bought.
- Keep your favourite moments as Moment Cards or frame the office in Photo Mode, and save them as PNG images. They are drawn by the game, never captured from your desktop.
- Original synthesized music and office ambience, with separate volume and mute for music, ambience, interface and effects.

### Português (Brasil)

**Bem-vindo à Nutshell Inc.**

O Tico, um esquilo cheio de ambição, abriu uma empresa de castanhas dentro de um tronco de árvore. É uma firma pequena, acolhedora e profissionalíssima, e o Departamento de Pesquisa Comportamental pede que você não se preocupe: está tudo absolutamente normal. Agora quem manda é você, numa janelinha no canto da tela.

ZooWorkers é um jogo idle e clicker aconchegante sobre um escritório de bichos que têm vida própria. Toque nas estações, contrate a equipe, abra andares novos, decore cada sala e conheça 23 colegas que lembram do que você disse. Depois volte para o seu trabalho. O escritório segue sem você. E vai anotando tudo.

**Feito para o canto da tela**

- Uma janela pequena que vai de 320×420 até a tela cheia, fica por cima dos outros programas, encaixa em qualquer canto, muda de escala (de 75% a 150%) e se esconde na bandeja do sistema. Ctrl+Shift+N mostra ou esconde.
- Trinta segundos já valem a visita: recolher o caixote, pegar o que alguém achou, comprar a próxima melhoria. Vinte minutos viram uma tarde de expediente.
- Aberto no canto, o tempo conta inteiro. Fechado, a equipe continua rendendo 60% por até 8 horas, e mais com as melhorias certas.
- Na volta, um recado conta quanto entrou, o que está esperando por você e o que a equipe decidiu sozinha.

**23 colegas, 23 histórias**

- Cada funcionário tem personalidade, humor do dia, o tipo de sala onde rende mais e um jeito próprio de falar. E também amizades, rivalidades e uma ou outra convivência meio constrangedora.
- Sente para uma conversa a sós: bata papo, teste presentes até achar o favorito e folheie um álbum com tudo o que vocês já viveram juntos.
- A história de cada um vem em três partes, que se abrem conforme a relação passa de recém-chegado a conhecido, de confiança e amizade próxima. O que você responde volta depois. No fim, a lembrança de cada um vai parar na mesa.
- No máximo quatro por sala, e quem trabalha onde mexe com o humor e com a produção.

**Coisas acontecem no escritório**

- De vez em quando alguém levanta um bilhetinho: tem algo acontecendo na sala. Isso fica esperando por você. Vá ver e decida; embaixo de cada resposta aparece quanto custa e quem ela afeta.
- As escolhas ficam na memória. O pessoal comenta depois, outras situações aparecem, e certas coisas só surgem por causa do que você decidiu antes.
- Deixe um bilhete esperando tempo demais e a equipe resolve sozinha. O Relatório de observação é a ficha dos pesquisadores: quem decidiu o quê.
- 55 curiosidades escondidas nas paredes, nos cantos e nas rotinas das salas: engraçadas, fofas, absurdas e, de vez em quando, paranormais. Cada castanha do estoque ganhou um nome. Ninguém explicou o porão até agora.

**Construa, decore, colecione**

- 21 salas empilhadas tronco acima, do Porão Suspeito ao Jardim de Bolotas no Telhado, cada uma com sua estação e sua rotina: passar o café, destravar a máquina, vigiar as câmeras, entregar a correspondência, escolher o programa da rádio.
- 67 decorações para piso, parede e teto. Arraste para onde quiser; complete o conjunto de uma sala e ganhe um bônus que fica.
- Coleções: a Enciclopédia da Castanha com 24 castanhas fictícias, curiosidades e arquivos secretos, lembranças da equipe, roupas especiais e Cartões de Momento. E 44 conquistas.
- Quando a empresa chegar a um milhão de castanhas, é hora de Pirar na Castanha: reestruture em troca de Grãos Permanentes, escolha um de cinco ramos para o próximo ciclo e leve junto amizades, histórias, decorações e coleções.

**Três pequenas emergências de escritório**

- Resgate do Café: pegue o café bom, deixe o descafeinado cair.
- Caça-Insetos: tire os insetos das gavetas. O post-it é uma feature.
- Mesa de Cabos Embolados: arraste os plugues até nenhum cabo cruzar outro.

Rodadas de 30 a 45 segundos, que pausam quando você troca de janela e pagam conforme o tamanho da empresa. Dominou um? Ganha um suvenir para o escritório.

**Feito para não pesar**

- Sem anúncios, sem microtransações, sem conta, sem precisar de internet.
- Colheita de Foco opcional: comece uma sessão de trabalho e a equipe rende 25% a mais enquanto ela durar. Nunca bloqueia o computador, nunca olha o que você está fazendo, e parar antes não custa nada.
- Castanhas Douradas se ganham jogando, nunca comprando.
- Guarde os melhores momentos como Cartões de Momento ou enquadre o escritório no Modo Foto, e salve em PNG. Tudo desenhado pelo próprio jogo, nunca uma captura da sua tela.
- Música e sons de ambiente originais, sintetizados, com volume e mudo separados para música, ambiente, interface e efeitos.

## Feature list

A short list for the page's sidebar, a press release or a capsule caption.

### English

- A cozy idle and clicker game in a small, resizable desktop window
- 23 animal employees, each with a three-part personal story, gifts and a keepsake
- 21 rooms, each with its own station and routine
- Office incidents with choices that come back later, and an observation report of who decided what
- 55 curiosities to notice, some of them paranormal
- 67 decorations to place freely on floors, walls and ceilings
- Three minigames: Coffee Rescue, Bug Squash and Cable Untangle Desk
- Collections, 44 achievements and a restructure with five branches
- Time counts in full while the window stays open; the team keeps working while it is closed
- Optional Focus Harvest work-session companion
- Moment Cards and Photo Mode, saved as PNG
- No ads, no microtransactions, fully offline
- English and Brazilian Portuguese

### Português (Brasil)

- Um jogo idle e clicker aconchegante numa janela de desktop pequena e redimensionável
- 23 funcionários bichos, cada um com uma história pessoal em três partes, presentes e uma lembrança
- 21 salas, cada uma com sua estação e sua rotina
- Incidentes no escritório com escolhas que voltam depois, e um relatório de observação de quem decidiu o quê
- 55 curiosidades para reparar, algumas paranormais
- 67 decorações para pôr à vontade no piso, na parede e no teto
- Três minijogos: Resgate do Café, Caça-Insetos e Mesa de Cabos Embolados
- Coleções, 44 conquistas e uma reestruturação com cinco ramos
- Com a janela aberta, o tempo conta inteiro; com ela fechada, a equipe continua trabalhando
- Colheita de Foco opcional, para acompanhar suas sessões de trabalho
- Cartões de Momento e Modo Foto, salvos em PNG
- Sem anúncios, sem microtransações, totalmente offline
- Português do Brasil e inglês

## Genres and tags (suggested)

**OWNER DECISION:** confirm every entry against Steam's current genre and tag lists before
saving; Steam's tag names change over time.

- **Genres:** Casual, Simulation, Indie (the same three `docs/HOW_TO_PUBLISH_ON_STEAM.md`
  suggests).
- **Tags, most descriptive first:** Idler, Clicker, Incremental, Cozy, Cute, Management,
  Relaxing, Funny, Comedy, Cartoony, 2D, Singleplayer, Casual, Simulation, Indie.
- **Avoid:** any tag about controllers, multiplayer, Steam Deck, VR, horror or story-rich
  narrative choices beyond what the game has. The paranormal touches are mild office jokes, not
  horror.

## Supported languages

Steam's language table, for both entries:

| Language                        | Interface | Full audio | Subtitles |
| ------------------------------- | --------- | ---------- | --------- |
| English                         | ✓         | none       | none      |
| Portuguese - Brazil (Português) | ✓         | none       | none      |

- The game has no spoken dialogue, so there is no voice audio and nothing to subtitle in either
  language; tick only **Interface**.
- Both are complete: every player-facing string exists in `en.json` and `pt-BR.json`, and
  `npm run check:i18n` enforces it.
- The ten draft locales in `src/i18n/locales/` (es, fr, de, it, pl, ru, ja, ko, zh-CN, zh-TW)
  are not offered in the game (`PLAYER_LANGUAGES` lists only complete languages) and must not be
  listed on Steam.

## Accessibility features

Only what Settings (Ajustes) offers and the code actually applies. The pt-BR label is in
parentheses.

| Feature (EN)                                                      | pt-BR                                                  | Where in Settings                     |
| ----------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------- |
| Reduced motion; Coffee Rescue becomes tap-a-cup                   | Movimento reduzido                                     | Accessibility (Acessibilidade)        |
| High contrast                                                     | Alto contraste                                         | Accessibility                         |
| Dyslexia-friendly font                                            | Fonte para dislexia                                    | Accessibility                         |
| Colour-blind filters: deuteranopia, protanopia, tritanopia        | Modo daltônico                                         | Accessibility                         |
| Pause animations in menus                                         | Pausar animações nos menus                             | Accessibility                         |
| Font size, 80% to 150%                                            | Tamanho da fonte                                       | Accessibility → Sizes and speed       |
| Interface scale, 80% to 150%                                      | Escala da interface                                    | Accessibility → Sizes and speed       |
| Master volume and mute; music, ambience, interface, effects each  | Volume geral, Silenciar tudo, one slider and mute each | Sound (Som)                           |
| Mute when the window is unfocused                                 | Silenciar quando a janela não está em foco             | Sound                                 |
| Incidents decided by the team, still reported (no choice pop-ups) | Desativar janelas de escolha                           | General (Geral) → Gameplay            |
| Hints on or off; replay the tutorial                              | Mostrar dicas úteis; Repetir tutorial                  | General → Gameplay                    |
| Office background off, dimmed, or a static image                  | Fundo animado, Brilho, Qualidade                       | Window (Janela) → Office Background   |
| Window scale, 75% to 150%                                         | Escala da janela                                       | Window → Desktop Window (desktop app) |
| Save at any time; export and import a save file                   | Salvar agora, Exportar save, Importar save             | Save file (Arquivo)                   |

Also true and worth saying: all three minigames have keyboard controls (Coffee Rescue: Left and
Right arrows or A and D; Bug Squash: keys 1 to 9; Cable Untangle Desk: Tab, arrows and Shift) and
pause with Esc.

**OWNER DECISION:** which of Steam's accessibility checkboxes to tick. Supported by the table:
adjustable text size, colour alternatives, custom volume controls, save anytime. Do not tick
subtitle options or keyboard-only play: neither is true or verified (see
[Do not claim yet](#do-not-claim-yet)).

## System requirements (suggested)

**To confirm with the Phase 3 measurements** before publishing. The numbers below are the ones
`docs/STEAM.md` already states, plus what Phase 1 measured (`docs/ZOOWORKERS_STATE.md`, "Phase 1
record"); nothing here is new.

| Minimum (suggested) | Value                                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| OS                  | Windows 10 or 11, 64-bit. Only Windows 11 has been tested (Phase 1); Windows 10 is untested.                         |
| Processor           | Dual-core CPU (`docs/STEAM.md`).                                                                                     |
| Memory              | 4 GB RAM (`docs/STEAM.md`). Phase 1 measured a working set of about 595 MB in use and 440 MB minimized.              |
| Graphics            | Integrated graphics (`docs/STEAM.md`).                                                                               |
| Storage             | **OWNER DECISION, after Phase 3.** The packaged app measured 704 MB in Phase 1, so the old "~300 MB" is out of date. |
| Network             | None. The game never goes online.                                                                                    |

- **Recommended:** leave empty until Phase 3 measures a long session in the packaged build.
- **macOS and Linux:** **OWNER DECISION.** Do not list them until a build has been tested there.

## Content and maturity

What the Steam content survey will ask about, and what the game contains (checked in both locale
files and `src/content`). **OWNER DECISION:** the actual answers and any rating questionnaires
are the owner's to submit.

- **Violence, blood, gore:** none. A comedy about cartoon animals in an office.
- **Sexual content, nudity:** none.
- **Language:** no profanity in either language.
- **Alcohol, drugs, tobacco:** none. A great deal of coffee.
- **Fear:** mild paranormal office jokes (an office ghost, odd noises in the basement, curiosities
  marked paranormal). Nothing frightening, no jump scares.
- **Gambling and purchases:** no real money anywhere, no loot boxes, no in-app purchases. Chance
  only appears inside play (a lucky crate pays a little extra, events have rarities).
- **Player-written text:** the company name and teammates' nicknames, shown only on the player's
  own computer.
- **Online and data:** none. No account, no telemetry, no network requests (`PRIVACY.md`). The
  optional Focus Harvest reads only how long the computer has been idle, in the desktop app.
- **Shareable images:** Moment Cards and Photo Mode save PNG files that the player chooses to
  save; they are drawn from game content, never from the desktop.

## Press-kit paragraph

### English

ZooWorkers is a cozy idle and clicker game that lives in a small, resizable window in the corner of your screen. Pip the squirrel has founded Nutshell Inc., a nut-processing company inside a tree trunk, and hired a team of 23 animal employees, each with a personality, moods, a three-part personal story and a keepsake of their own. Players tap stations, open 21 rooms, place 67 decorations, play three short office minigames and decide what to do about the small incidents that keep happening upstairs, while a slightly suspicious behavioural-research department files a report on all of it. Left open, the office counts every minute in full; closed, the team keeps working at a gentler pace. It plays fully offline, has no ads or microtransactions, and is available in English and Brazilian Portuguese.

### Português (Brasil)

ZooWorkers é um jogo idle e clicker aconchegante que mora numa janela pequena e redimensionável no canto da tela. O Tico, um esquilo empreendedor, fundou a Nutshell Inc., uma empresa de castanhas dentro de um tronco de árvore, e contratou 23 funcionários bichos, cada um com personalidade, humor, uma história pessoal em três partes e uma lembrança só sua. Quem joga toca nas estações, abre 21 salas, espalha 67 decorações, encara três minijogos rápidos de escritório e decide o que fazer com os pequenos incidentes que vivem acontecendo andar acima, tudo sob o olhar de um departamento de pesquisa comportamental levemente suspeito, que anota cada detalhe. Com a janela aberta, cada minuto conta inteiro; fechada, a equipe segue trabalhando num ritmo mais tranquilo. Funciona totalmente offline, não tem anúncios nem microtransações e está disponível em português do Brasil e inglês.

## Do not claim yet

These exist in some form but are not true for players today. The page, the capsules and any
trailer must leave them out until they are built and verified.

- **Steam Achievements.** The 44 achievements unlock in the game, and each has a Steamworks API
  name (`docs/STEAM_ACHIEVEMENTS.md`), but `createAchievementAdapter()` still returns the local
  adapter: nothing reaches Steam (`src/platform/achievements.ts:70-73`).
- **Steam Cloud.** The save lives in the app's browser storage (Chromium's Local Storage
  database), not in a file Auto-Cloud can sync safely (see `docs/STEAM.md`).
- **Steam Deck, controller support, full keyboard play.** The desktop app reports a Deck, but
  nothing in the game changes on one and it has never been tested on one. There is no controller
  support. Keyboard play is verified only in the minigames.
- **macOS and Linux.** Packaging targets exist; no build has been tested.
- **A transparent window.** The window is opaque (`electron/main.ts`, `transparent: false`).
- **Four Settings that change nothing yet.** Disable screen shake (Desativar tremor de tela),
  Disable flashing (Desativar piscadas), Audio subtitles (Legendas de áudio) and Frame rate limit
  (Limite de quadros) are saved, but no code reads them. They must not appear as accessibility
  or performance features.
- **Battery-friendly mode** (Modo economia de bateria) as a headline feature. It works when
  switched on, but after a restart it is not applied until Settings is opened again.

## Evidence

Where each number on this page comes from. Counts are the lengths of the exported content arrays,
read with `npx tsx` on 2026-11-13.

| Claim                                                         | Source                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 23 employees                                                  | `EMPLOYEES` in `src/content/employees.ts`                                                    |
| 21 rooms; Suspicious Basement, Rooftop Acorn Garden           | `ROOMS` in `src/content/rooms.ts`; `room.<id>.name` in the locales                           |
| Four people per room                                          | `ROOM_CAP` in `src/sim/rooms.ts`                                                             |
| Three-part stories; new face → familiar → trusted → close     | `src/content/stories.ts` (`BOND_THRESHOLDS`); `bond.tier.*`                                  |
| 6 gifts, 12 coworker pairs, 23 keepsakes                      | `GIFTS`, `PAIRS`; `src/content/employeeKeepsakes.ts`                                         |
| 3 minigames, 30 s / 30 s / 45 s rounds, pause on window leave | `src/sim/minigames.ts`; `docs/GAME_DESIGN.md` "Micro-games"                                  |
| 67 decorations, 9 sets                                        | `DECORATIONS`, `DECORATION_ENSEMBLES`                                                        |
| 55 curiosities (plus 8 that only follow a choice)             | `ODDITIES` in `src/content/roomPlay.ts`: 63 entries, 8 with `extra`                          |
| "Every nut in storage has a name"                             | event `named-nuts` (common) in `src/content/events.ts`                                       |
| 24 fictional nuts                                             | `NUTS` in `src/content/nuts.ts`                                                              |
| 44 achievements                                               | `ACHIEVEMENTS` in `src/content/achievements.ts`                                              |
| 5 restructure branches, opens at 1M nuts this cycle           | `PRESTIGE_BRANCHES`; `docs/GAME_DESIGN.md` "Prestige"                                        |
| Incidents with 2 to 4 answers                                 | every choice list in `GAME_EVENTS` has 2 to 4 entries                                        |
| 60% while closed, 8 h cap, 24 h at most                       | `BALANCE.offline` in `src/sim/config.ts`; `returnNote.rule.closed`                           |
| Focus Harvest +25%, off by default                            | `BALANCE.focus.productionMultiplier`; `focusHarvestEnabled: false` in `src/sim/state.ts`     |
| Window 320×420 minimum, opens 380×460, scales 75 to 150%      | `MIN_WIDTH`, `BASE_WIDTH` in `electron/main.ts`; `SCALES` in `src/ui/views/SettingsView.tsx` |
| Ctrl+Shift+N                                                  | `globalShortcut.register` in `electron/main.ts`                                              |
| Synthesized music and ambience                                | `src/audio/audio.ts`                                                                         |
| Offline, no telemetry                                         | `PRIVACY.md`; the CSP `connect-src 'self'` in `electron/main.ts`; no network calls in `src/` |
| Two player languages                                          | `PLAYER_LANGUAGES` in `src/i18n/index.ts`; `_meta.complete` in the locale files              |
| Accessibility options                                         | `src/ui/views/SettingsView.tsx`, applied in `src/App.tsx` and the stylesheets                |
| 704 MB packaged, 595 / 440 MB working set                     | `docs/ZOOWORKERS_STATE.md`, "Phase 1 record"                                                 |
