# Game Design — ZooWorkers

## Pitch

A cozy desktop idle game in a tiny transparent window. Pip the squirrel builds a
nut-processing company inside a tree trunk. It combines a desktop pet, a
satisfying incremental game, an animated diorama, a workplace comedy, and a
collectible decoration game. Understandable in seconds; hours of depth.

## Core loop

1. Employees automatically generate **Nuts**. Half goes straight to the vault;
   the team packs the other half into **the founder's crate** (10 minutes of
   packing fills it). Tapping the crate collects it. A full crate's share still
   reaches the vault at the offline efficiency, and automation raises that until
   nothing waits on the player (`src/sim/crate.ts`).
2. **Stations** in every room pay per tap and build a combo. Keep the rhythm for
   10 taps (9 on charge stations) and the room **rushes**: the people working in
   it produce double for 30 s, renewed by every tap that keeps the streak. A
   short burst of attention therefore scales with the company, and who works in
   which room matters.
3. Now and then a teammate **finds** something in their room (more often when
   they are in a good mood) and holds it out beside their sticker. A find waits,
   pays 45 s of production, and leaves the finder happy and a little friendlier.
4. Nuts buy machines, rooms, employees and improvements. The office always shows
   the **next goal** (the cheapest purchase, with what it will change) and buys
   it with one tap; the top of the tower shows the **next floor** being built.
5. **Things happen in the office**: an incident waits in its room until the
   player looks into it and decides, and what they decide comes back later (see
   below).
6. Milestones unlock new systems (rooms, employees, prestige).
7. **Go Completely Nuts** (prestige) grants Permanent Kernels for a skill tree
   and alternate company branches.

Keeping the game open is never worse than closing it: open time is credited in
full however rarely a hidden window ticks, and a gap long enough to mean the
computer slept is settled like time away (offline rules, crate filled, finds
waiting). On the desktop app the game asks Windows how much of such a gap the
computer was really asleep (a suspension Windows announces, or one in which the whole
app ran nothing for over a minute), so a long minimized stretch is not mistaken for
sleep; the browser judges by the gap alone. There are no arbitrary waiting walls.

## Resources

- **Nuts** — main currency (upgrades, furniture, rooms, employees, common cosmetics).
- **Golden Nuts** — rare, earned only through play (achievements, rare events,
  collections, daily challenges, milestones); buy rare cosmetics and conveniences.
- **Morale** — company modifier; low morale is a gentle inconvenience, never harsh.
- **Reputation** — unlocks applicants, rooms, events, milestones.
- **Permanent Kernels** — prestige currency for the permanent skill tree.

No real-money purchases, ads, loot boxes, crypto, NFTs, energy timers, or
manipulative monetization.

## Characters

Twenty-three teammates (`src/content/employees.ts`; names, roles and blurbs in
`employee.<id>.*`, animals in `src/art/critterShapes.ts`). Pip founded the company and is
on staff from the start; everyone else becomes hireable once reputation reaches their line
and is hired for nuts. The table is in that order.

| Teammate                  | `id`     | Animal    | Role                           | Home department                 | Passive        | Reputation |
| ------------------------- | -------- | --------- | ------------------------------ | ------------------------------- | -------------- | ---------- |
| Pip Acornsworth           | `pip`    | squirrel  | Founder & CEO                  | Founder's Desk                  | all production | founder    |
| Marlow Stillwater         | `marlow` | capybara  | Head of Human Resources        | Coffee & Morale Division        | morale         | 5          |
| Rizzo “Receipts” Ringtail | `rizzo`  | raccoon   | Procurement Specialist         | Procurement Burrow              | lucky crates   | 15         |
| Beatrice “Bea” Timberton  | `bea`    | beaver    | Construction Manager           | Construction Wing               | lower costs    | 30         |
| Corvus Crowley            | `corvus` | crow      | Marketing Director             | Marketing Burrow                | rare events    | 50         |
| Mina Deepwell             | `mina`   | mole      | Research Engineer              | Human Behavior Observation Room | reputation     | 80         |
| Nixie Bolt                | `nixie`  | mouse     | Head of Automation & IT        | Shell Research Laboratory       | own output     | 110        |
| Otto Driftwood            | `otto`   | otter     | Head of Finance                | Procurement Burrow              | lower costs    | 150        |
| Hazel Quill               | `hazel`  | hedgehog  | Legal & Compliance             | Very Serious Meeting Room       | morale         | 200        |
| Junie Hopwell             | `junie`  | rabbit    | Logistics & Scheduling         | Nut Sorting Department          | all production | 260        |
| Moss Moonfeather          | `moss`   | owl       | Night Operations & Observation | Human Behavior Observation Room | reputation     | 330        |
| Fenn Fenwick              | `fenn`   | fox       | Sales & Client Relations       | Marketing Burrow                | rare events    | 420        |
| Pingo Frost               | `pingo`  | penguin   | Logistics & Flow               | Nut Sorting Department          | all production | 500        |
| Canela Embertail          | `canela` | red panda | Field Research                 | Human Behavior Observation Room | reputation     | 560        |
| Nino Whiskerton           | `nino`   | cat       | Office Manager                 | Very Serious Meeting Room       | morale         | 620        |
| Bia Bramble               | `bia`    | bear      | Security & Facilities          | Golden Nut Vault                | lower costs    | 680        |
| Quincy Lilypad            | `quincy` | frog      | Quality & Testing              | Shell Research Laboratory       | lucky crates   | 740        |
| Sonny Slowbranch          | `dorm`   | sloth     | Wellbeing & Rest               | Employee Nap Chamber            | morale         | 800        |
| Inky Marlowe              | `inky`   | octopus   | Logistics & Sorting            | Nut Sorting Department          | all production | 870        |
| Echo Duskwing             | `echo`   | bat       | Night Research                 | Human Behavior Observation Room | reputation     | 940        |
| Rosa Plume                | `rosa`   | flamingo  | Marketing & Flair              | Marketing Burrow                | rare events    | 1,010      |
| Perry Billsby             | `perry`  | platypus  | Procurement & Odd Jobs         | Procurement Burrow              | lucky crates   | 1,080      |
| Axel Frill                | `axel`   | axolotl   | Research & Regeneration        | Shell Research Laboratory       | own output     | 1,150      |

- **Home department:** where a new hire sits when it has a free desk, and where "By
  department" sends them. No home department has more than four people.
- **Passives** grow with level: _all production_ adds to every nut produced; _own output_
  to their own only; _morale_ adds flat morale; _lower costs_ cuts upgrades, rooms, hiring
  and promotions (all cost cuts together stop at 75%); _rare events_ raises rare-event
  odds; _reputation_ adds reputation per minute; _lucky crates_ is a chance that a
  collected crate holds half as much again.

Each has a distinct silhouette, personality, animations, a passive, friendship, dialogue,
a personal story, a favorite item, a rare event, outfits (a starting one and a special one
for golden nuts; Pip has two), and a profile.

Animation is driven by a reusable state machine (`src/art/animation.ts`), not
hardcoded switches.

### People worth coming back for

Every one of the 23 teammates has a profile in `src/content/characters.ts` (voice,
gift tastes, story flavour and moods, a partner in their story) and words of their
own in the locales. Relationships are read from durable flags (`src/sim/bonds.ts`),
so they survive saves, old saves and prestige.

- **Stages:** new face → familiar (15) → trusted (40) → close (70). Each new stage
  is celebrated once, on the next visit; a close friend works 10% better.
- **Stories** (`src/content/stories.ts`): three parts per teammate, opening at
  familiar, trusted and close, at least 8 minutes apart. Part 1's answer comes
  back once on its own about five minutes later, then in office chatter (a line
  brought back rests ten minutes), and opens Part 3; Part 2's kind answer returns
  later as a find with their own note; the other pulls in their story partner.
  Part 3 ends in a moment card and their keepsake going on their desk. As a part
  ends, the visit says where the story stands and whether the answer set something
  in motion or will be remembered, never what.
- **Keepsakes** (`src/content/employeeKeepsakes.ts`): one personal object each,
  talked about from the visit's topics menu. Looking after it costs nuts (the
  answer shows the price first) and puts it on their desk; otherwise it waits in
  the drawer until their story is told. On display it can be picked up, in the
  office or in the visit, to read its card in their scrapbook.
- **Gifts:** six presents; each teammate loves one, likes one, is baffled by one
  and politely thanks the rest. Only what was actually given is learned; once
  trusted and two misses in, they drop a hint.
- **Coworkers** (`src/content/pairs.ts`): twelve pairs (friends, rivals, awkward,
  mentor). Sharing a room changes their mood, and they talk to each other.
- **Moments they start:** at most three teammates at a time wave the player over
  (a balloon on their sticker), never a popup.
- **Scrapbook:** derived entirely from what happened; nothing extra is stored.
  Each entry keeps what you said beside what they said back. A story is not named
  before it begins, and a keepsake not before you know it.

## Rooms

Twenty-one rooms (`src/content/rooms.ts`; names in `room.<id>.name`). The Founder's Desk
is always open; seven are built from the Upgrades tab for nuts ("Build: …", list price
before cost cuts); the rest open on their own when reputation reaches their line. Every
room has a tap station and a routine (next section) and seats **at most four** teammates.

Each open room is one storey of the trunk, stacked bottom to top in this order (the room's
`floor`, -1 to 6, then its place in `ROOMS`); the top of the tower shows the locked room
the company can open soonest.

| Room                            | `id`           | Opens                 | Routine | Kind            |
| ------------------------------- | -------------- | --------------------- | ------- | --------------- |
| Suspicious Basement             | `basement`     | built, 3,000,000 nuts | tend    |                 |
| Founder's Desk                  | `founder-desk` | always                | deliver |                 |
| Nut Cafeteria                   | `cafeteria`    | reputation 8          | brew    |                 |
| Nut Sorting Department          | `sorting`      | built, 500 nuts       | tend    |                 |
| Coffee & Morale Division        | `morale`       | reputation 5          | brew    |                 |
| Internal Mail Room              | `mailroom`     | built, 4,000 nuts     | deliver |                 |
| Procurement Burrow              | `procurement`  | reputation 15         | deliver |                 |
| Construction Wing               | `construction` | reputation 30         | tend    |                 |
| Security Office                 | `security`     | reputation 45         | watch   | facility        |
| Radio studio                    | `broadcast`    | reputation 22         | tune    | facility, annex |
| Shell Research Laboratory       | `lab`          | built, 20,000 nuts    | brew    |                 |
| Marketing Burrow                | `marketing`    | reputation 50         | tune    |                 |
| Records Archive                 | `archive`      | built, 400,000 nuts   | watch   | facility        |
| Repair workshop                 | `repair`       | reputation 65         | tend    | facility, annex |
| Golden Nut Vault                | `vault`        | built, 150,000 nuts   | tune    |                 |
| Human Behavior Observation Room | `research`     | reputation 80         | watch   |                 |
| Behavioural Incubator           | `incubator`    | reputation 300        | brew    | facility        |
| Very Serious Meeting Room       | `meeting`      | built, 1,000,000 nuts | tune    |                 |
| Employee Nap Chamber            | `nap`          | reputation 120        | brew    |                 |
| Winter garden                   | `conservatory` | reputation 145        | brew    | facility, annex |
| Rooftop Acorn Garden            | `rooftop`      | reputation 200        | watch   |                 |

- **Four to a room** (`ROOM_CAP` in `src/sim/rooms.ts`) holds for assignment, hiring,
  auto-arrange, loading a save and the scene alike. A full room refuses a move. A new hire
  takes their home department if it is open and has a desk, otherwise the open room they
  work best in (then the emptiest). Whenever a room would hold a fifth (an old save, a room
  opening, an assignment cleared), whoever is only there by default moves to their next
  best room, and the player is told who moved. "By department" and "Spread evenly" fill
  against the same count.
- **Facility rooms** (`src/content/facilityDiscoveries.ts`): six rooms each hold a
  discovery. It comes forward in the room once two curiosities have been noticed there,
  once the room's decoration set is complete, or once a game is mastered (Cable Untangle
  Desk for the Security Office, Bug Squash for the Behavioural Incubator). The player opens
  it from the room as a rare card, decided once.
- **Annex rooms** (`src/art/AnnexArchitecture.tsx`): the Radio studio, the Repair workshop
  and the Winter garden carry architecture of their own (cork panels and the ON AIR lamp;
  a roll-up bay door and a crane rail; an iron-and-glass roof), and are the only rooms with
  sounds of their own while in view.

## The office is the playground

Every room keeps its tap station (the clicker's core verb), and the station also
carries the room's own routine, shown on the machine as a small tag
(`src/content/roomPlay.ts`, `src/sim/roomPlay.ts`). Five verbs, each used by a
handful of rooms with their own words, timing and payoff (rooms by short name; full names
in Rooms above):

| Verb    | What the player does                                     | Rooms                                                                         |
| ------- | -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| brew    | start it, come back when it is ready, share it out       | Coffee & Morale, Cafeteria, Laboratory, Incubator, Winter garden, Nap Chamber |
| tend    | the machine acts up; three taps free it, the room rushes | Sorting, Construction, Repair workshop, Basement                              |
| watch   | something shows on the screen for ~35 s; catch it        | Security, Observation Room, Rooftop, Archive                                  |
| deliver | a letter, parcel or order arrives; hand it over          | Founder's Desk, Mail Room, Procurement                                        |
| tune    | set the room's mode; each mode is one steady bonus       | Radio studio, Meeting Room, Marketing, Vault                                  |

Payouts only use existing systems: production-scaled nuts, golden nuts, morale,
reputation, short boosts, rushes, moods and friendship. Modes feed the company
modifiers while someone works in the room (and say so on the Company screen).

**Helpers** make a routine better, and the tooltip says who: the room's
specialists and the player's close friends working there brew faster (20% each,
up to two), free a stuck machine on their own after 45 seconds, keep a blip on
screen 50% longer and bring deliveries more often; a complete decoration set in the
room counts too, except for freeing a machine (only people do that).

**Decorations** (67, `src/content/decorations.ts`) are bought from the Decorate
catalogue for nuts or golden nuts; each card shows its surface (floor, wall or
ceiling), its room, its price or what is still missing, and its set. Buying is
one engine step (`purchaseDecoration`): checked, charged once, owned once, put
on its room's surface when there is a spot (otherwise in storage) and saved. A
piece gives its morale once, when bought; what lasts is a complete set in its
own room (`src/content/decorationEnsembles.ts`). Any owned piece can stand in any
open room, on its own surface. In the scene, wall art, rugs and hanging pieces
are behind the team, and floor furniture stands among them by where it stands;
the player can send a wall or floor piece to the other side.

**Curiosities** (55) are the rooms' small surprises: funny, wholesome, strange,
absurd and now and then paranormal. About half turn up on their own at a wall
fixture, a corner or the ceiling (one at a time, every ~7 minutes on average,
fading after 20); a teammate in the room usually notices first. The rest only come
out of a routine: dreams from the nap room's log, footage from the cameras, pages
from the archive scanner, nuts from the sorting chute. Some need a decoration
placed in the room, a story told, or the night. Twenty-one of them are the Nut
Encyclopedia's previously unobtainable nuts. Each is noticed once, logged in the
Archive's Secrets tab, and noticing two in a facility room brings its discovery
forward, in the room itself. Every curiosity in a room completes its file
(+2 golden).

The office produces its moments while it runs, with restraint: one stuck machine,
one blip and one curiosity at a time, at most two deliveries waiting, nothing in a
brand-new founder's first two minutes. The elevator's floor list marks floors with
something waiting.

## Things happen in the office

Events never open themselves (`src/content/happenings.ts`, `src/sim/happenings.ts`).
The loop is notice → investigate → choose → experience → consequence → remember.

- **Incidents.** A roll (every 45 s, 30% chance, nothing in the first three
  minutes) either plays a small moment or starts an incident in a room: the
  teammate it is about (or whoever knows the room) says a line and holds up a
  **!** ticket, the room's name gets a **!**, and the elevator marks the floor. At
  most two wait at once, one per room; nothing rolls while a card or a visit is
  open. Ignored, an ordinary one is handled by the team after 25–35 minutes (and
  reported); a rare one passes after 90 minutes, a legendary after six hours.
  "Disable choice popups" still handles everything on the spot.
- **Rarity is picked first** (common 52 : uncommon 32 : rare 12 : legendary 2),
  then the events' own weights within it. Event luck (rooms, passives, the
  prestige branch) raises rare odds up to double; after six incidents without a
  rare one they grow 25% per incident. Measured over 3,000 incidents: one rare in
  five or six, one legendary in thirty to forty-five, no dry spell past about
  twenty (the old pure-weight pick made a quarter of all events rare).
- **The card** is set in the room it is happening in, with the people it is
  about and a rarity stamp; the outcome is the same card turned over: their
  reaction first, then what changed. It says when something was set in motion
  and who will remember, never what. Each answer is a line on the report with
  what it will do under it (`previewEventChoice`, the engine's own rules: costs
  before rewards, who it changes and how, a room's mode, a souvenir, who will
  remember, "may come back later"); a secret or a new nut stays a surprise.
  Pointing at an answer (or reaching it by keys) shows its people taking it in
  the scene; the outcome shows the same marks as measured. A reload reopens an
  open card in the same room with the same presenter.
- **Consequences** come in three kinds. Immediate: resources, moods, a room's
  mode or rush, everyone's friendship. Later, and quiet (no notice): a teammate
  says something, a curiosity appears (eight exist only after a particular
  choice and count as a bonus, never toward a room's file), a small moment plays
  out, or a follow-up incident starts (it waits its turn if its room is busy).
  Remembered: 69 marks a choice can leave, each brought up by the teammate it
  concerns a few minutes later, then now and then when poked.
- **Small moments** (11): one or two lines, a small reward, no card. A line said
  on a floor out of view is on the room's slip instead; a moment whose own room
  is out of view (or that happens while the window is hidden) waits, up to three,
  and plays out when the player looks there.
- **Nothing is spent on nobody.** A promise that comes due while the game is
  closed, asleep or minimized waits for the first tick in view (its notice, or
  the moment it plays, is then seen); remarks and the office's news wait too.
- **Discoveries lead on.** Some curiosities point somewhere (the teammate says
  where) and unlock the next: a curiosity, or an incident (the soup of the week
  brings the soup back; the basement's knocking pipes bring the night shift's
  tape). Noticing three paranormal ones starts the building's thread, which
  unlocks the legendary _Thirteenth Button_. Chapter 4 adds 13 incidents (one
  legendary, three rare), three secret files and a follow-up chain.
- **The Archive's board** (Secrets) is read from the save: open leads first (the
  lead's own words, where it was found), then each room's finds as cards. A card
  opens its file: the thing in its words, where and when, what made it possible
  (a find, a decision, a story, a decoration, the night) and where it led (a
  find, a waiting curiosity, an incident happening or decided). A blank a lead
  points at is marked, never named; an aftermath does not exist until it turns
  up. Secret files say which decision filed them.
- **For the return.** The diary keeps the last 40 things that happened (started,
  opened, handled, passed, moments, promises landed, remarks); time away starts
  at most one incident per quarter hour, up to two, waiting in their rooms, and
  the welcome-back note counts them. `happenedSince` is what a "while you were
  away" view reads from.

## Progression targets

- Fast first upgrades; first hireable employee ~10 min; first new room ~20–30 min;
  first automation milestone within the first hour; first prestige after several
  hours; continued unlocks across prestige cycles.

## Prestige — the restructure ("Go Completely Nuts" / "Pirar na Castanha")

Opens once the current cycle has produced 1M nuts (lifetime totals do not count
twice) and pays ⌊√(nuts this cycle / 1M)⌋ Permanent Kernels (more with Kernel
Refinery). Each kernel held adds +2% production in every cycle; buying a skill
spends kernels for its effect instead. Five branches (Industrial, Cooperative,
Questionable Science, Aggressive Marketing, Underground Operations) set the next
cycle's production, morale and rare-event odds.

- **Kept:** the company's name, logo and founding date; settings; kernels, skills
  and the branch; golden nuts (and the dust still refining); every collection,
  decorations where they stand, achievements, lifetime stats, minigame records and
  focus sessions; each teammate's friendship, outfit, nickname, conversations and
  history; the day's challenges (a claimed one stays claimed).
- **Starts over:** nuts (Head Start excepted), hires and levels (Pip stays), rooms,
  upgrades, morale and reputation, the crate, whatever was waiting in the office,
  promised consequences, boosts and a focus session in progress. Decorations in a
  room that closes wait there; its set counts again when the room reopens.
- The Archive shows the continuity file from half way to the line. It states all
  of this from the operation itself (`restructurePreview`); the confirmation repeats
  the trade, and a second confirmation pays nothing. The guide offers the
  restructure once per cycle.

## Long-term systems

- **Collections:** the Archive's cabinet: Nut Encyclopedia (24 fictional nuts),
  office curiosities and secret files, decoration sets (9), team keepsakes (23),
  minigame masteries (3), special outfits (24) and Moment Cards. Every count is read
  from where the thing is earned (`src/sim/collections.ts`); what is not found yet is
  never named, and Moment Cards and secret files keep their total to themselves.
  Curiosities count over the board's rooms: those open now and those where something
  was noticed (a room a restructure closed keeps its finds, marked closed).
- **Daily challenges:** deterministic, date-seeded, offline, server-free.
- **Focus Harvest:** opt-in, supportive productivity companion; never blocks the
  computer; never punishes cancellation.
- **Micro-games:** Coffee Rescue, Bug Squash and Cable Untangle Desk — short, optional,
  skill-based, rewarding small boosts (below, and [`MINIGAMES.md`](MINIGAMES.md)).

## Micro-games

Three short shifts in the Activities sheet (rules in `src/sim/minigames.ts`, boards in
`src/ui/minigames/`), each hosted by the first of its team on staff, else Pip. A round
starts after a 3-2-1 countdown, pauses on Escape or when the window is left, and is paid
once at the whistle; leaving early pays nothing.

- **Coffee Rescue** (30 s; Marlow and Pip). Move the mug (pointer, finger, or Left/Right
  or A/D held) to catch falling coffee. Carafes fall slowly and pay double, espressos fall
  fast and pay most; the grey decaf must be let fall (catching it costs 3 points and the
  streak), and a missed drink ends the streak. The ticket on the counter is an order of
  two, then three, then four drinks; filling it pays a bonus. Each round is one of four
  days in turn (morning rush, espresso hour, catering run, decaf audit) and runs warm-up,
  service (decaf from 8 s) and rush (two at a time, from 20 s). Combo ×2 at 6 catches, ×3
  at 12. With reduced motion the cups wait on the counter: tap one or press 1 to 5.
- **Bug Squash** (30 s; Quincy and Nixie). Pests pop out of a 3×3 grid of drawers: tap
  them, or press the drawer's number 1 to 9, before they duck back. Runners pay double and
  hop to another drawer; armoured bugs take two taps and pay double; the golden bug has
  the shortest window and pays five times; the sticky note is a feature, and squashing it
  costs 4 points and the streak. An empty drawer costs 2 points, and a bug that gets away
  ends the streak. Three stages: triage (one at a time), peak hour from 9 s (two at once,
  armour, the first feature) and closing time from 20 s (three at once, and the golden bug
  always comes). Combo ×2 at 4 squashes, ×3 at 9.
- **Cable Untangle Desk** (45 s; Nixie and Bea). Drag the numbered plugs until no cable
  crosses or overlaps another (keyboard: Tab to a plug, arrows nudge, Shift for big steps,
  Escape puts a held plug back). Every knot is marked where it is, and a plug resting on a
  cable is in the way. A desk is wired as one loop, a hub feeding every plug, two separate
  loops, or a loop with shortcut cables, and is always solvable. A cleared desk pays
  points (more for more plugs, and more for any wiring but the single loop), plus a speed
  bonus under par, and the next desk has one more plug, from 5 up to 9. No combo.

**Rewards** (`rewardMicrogame` in `src/sim/engine.ts`). Each game grades its score on its
own scale (ok / great / mastery: Coffee Rescue 55 / 115 / 170, Bug Squash 40 / 115 / 200,
Cable Untangle Desk 10 / 20 / 32), so the same skill pays the same in any game.

- Any score above zero pays nuts scaled to current production and to the score's share of
  the mastery line (capped at 1.6 times the line), and a production boost of 1–50% for
  90 s (35% at the line). Minigame boosts share one slot: a stronger round takes it, a
  weaker one only adds its worth as time. A score of zero is filed as practice.
- A great round earns the game's team on staff +3 friendship and a proud mood.
- The first round at the mastery line pays 1 golden nut, a Moment Card and the game's
  souvenir decoration (Menu Board, Specimen Shelf, Pipe Cluster) if not already owned.
  Masteries are one of the Archive's collections. A mastery can later come back as an
  office incident, and two of them bring a facility room's discovery forward (see Rooms).
- Every finished round counts toward the day's challenges; records (best score, plays)
  survive the restructure.

## Writing style

Clever, warm, slightly absurd, character-driven, shareable, never cruel, never
reliant on copyrighted references. Nut puns used strategically, not constantly.
All humor authored through localization keys so it survives translation.

## Viral hook

Rare/funny events generate shareable **Moment Cards** (illustration, employee,
caption, date, company name, rarity, clean layout) exportable as PNG — never a
screenshot of the user's desktop. Photo Mode hides menus for posed shots.
