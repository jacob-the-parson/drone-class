# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Working folder for a custom quadcopter build (Holybro X500 V2, Pixhawk 6C) for a client's
educational program, students aged 9–15. It is a documentation and configuration project, not
a software product: the aircraft side has no build system, test suite, or linter. The
deliverable is an aircraft that a child can disassemble, rebuild, and re-validate, with every
step explainable. The folder is not a git repository; history lives in `build-log.md` and the
dated files in `params/`, `logs/` and `screenshots/`.

**Start with `HANDOFF.md`, then read the tail of `build-log.md`.** The build log is written
during a session and is the record of truth; `HANDOFF.md` is rewritten at session close and
can lag behind it. When the two disagree the build log wins, and say so rather than silently
picking one. The build log corrects itself in place (struck claims, "Correction to..."
paragraphs), so read an entry to its end before relying on its first paragraph.

`notes.txt` is the client brief and the rules. `build-log.md` holds decisions D-11 onward
with sources and every session's findings; D-01 to D-10 are summarised in `notes.txt`.
`flight-checklists.md` is the go/no-go gate and the pre-flight, landing and post-flight
checklists. `00-hardware-manifest.md` is referenced by the notes but is not in this folder;
ask before assuming anything about hardware identity.

**Current focus: the aircraft, and since 2026-10-14 the Pi and its link to the app**
(D-37, D-38). The Pi's bridge lives in `NextApp/pi/`; this project's Pi notes in `drone-pi/`.

## Client ground rules (verbatim, standing)

> "Do not guess an electrical pinout or silently change the architecture. Document any
> recommended change and the reason before implementing it."

- Never guess a pinout. Cite a primary source (datasheet, manufacturer docs) or say it must be
  rung out with a multimeter.
- Never guess a parameter name or value. Look it up in official PX4 documentation. If you
  cannot find it, say so.
- Never change architecture silently. Propose, document the reason, wait for a decision.
- Prefer manufacturer docs and datasheets over forum posts. When they conflict, say so
  explicitly rather than picking one.

## Firmware and ground station (settled, not up for debate)

- Aircraft runs **PX4 v1.16.0** as shipped from the factory. No reflash.
- Ground station is **QGroundControl only**. Mission Planner has left the project.

### The ArduPilot parameter trap

An earlier phase planned to flash ArduCopter, so older notes, parameter plans and drafts use
**ArduPilot parameter names**. These do not exist in PX4 and there is no translation table.
Examples you may meet that are invalid here:

`SERIAL1_PROTOCOL` · `SERIAL2_BAUD` · `BRD_SAFETY_DEFLT` · `NTF_BUZZ_PIN` · `GPS_AUTO_SWITCH` ·
`FRAME_CLASS` · `INS_HNTCH_*` · `ATC_RAT_*` · `PRX_*` · `BATT_VOLT_MULT`

When you encounter one: treat the **decision as still standing** but the **parameter as
needing re-derivation from PX4 docs**. Flag it. Do not invent the PX4 equivalent. The trap
covers wiring plans too: the CRSF-on-TELEM1 plan was written for ArduCopter and is invalid
on factory PX4.

Missions are the one portable thing between the two stacks: waypoint files are coordinates
and altitudes, and both ground stations read the same format. `missions/` exists and is empty.

## Standing decisions (D-numbers live in `build-log.md`)

Still valid: D-05 (two SD cards, no multi-boot), D-06 (Pi OS Desktop, not Full), D-07 (SSH
password auth, not keys), D-08 (Pi Connect disabled), **D-09 (no subscription-licensed
software anywhere in the handoff, build-wide)**, D-10 (flight card runs Trixie).

Dead: D-01 (flash ArduCopter), D-02 (flash from Mission Planner).

Resolved: D-03 (no safety switch) is satisfied by the factory default `CBRK_IO_SAFETY=22027`.

Open: D-04 (buzzer). Under PX4 the buzzer is a pin on the GPS1 port, not a PWM output; the
old `NTF_BUZZ_PIN` idea does not translate. Depends on the GPS module. Not decided.

Made this phase: D-11 (read-only observer, below), D-12 (GPS on the GPS2 port,
`GPS_1_CONFIG=202`; standing configuration, no 10-pin cable expected soon), D-13 (airframe Holybro
X500 V2, `SYS_AUTOSTART=4019`), D-14 (RP4TD receiver on SBUS into the PPM/SBUS RC port; built and verified
2026-09-28, protocol SBUS), D-15 (SIYI HM30 on TELEM1; approved, on hold, shelved behind
D-17), D-16 (switches: SB flight mode, SD kill with inverted threshold; done 2026-09-28),
D-17 (Holybro SiK 915 MHz radio on TELEM1; done 2026-09-28, no parameter change),
D-18 (PM02 V3.3 power setup, 4S 5200 mAh; done 2026-09-28), D-19 (failsafes; done
2026-09-28), D-20 (motors on PWM MAIN 1–4, ESCs calibrated; done 2026-09-28, **its motor
position and direction table is struck**, see below), D-21 (observer may download flight
logs; client approved option B, **not built**, see the observer section), D-22 (MAIN 3 / MAIN 4
ESC leads were crossed on the breakout; fixed by swapping the two leads, net parameter change
none; done 2026-09-28). Applying an airframe resets parameters, so anything set
before an airframe change must be re-applied and re-diffed afterwards.

### Motor layout: use the board's geometry, not D-20's table

D-20 recorded the spin directions of the two back motors the wrong way round and "verified"
motors 3 and 4 on the wrong arms. Props were fitted against it and the aircraft rolled over on
its first throttle-up (incident entry, 2026-09-28). The layout read from the board's
`CA_ROTORn_PX/PY/KM` parameters, confirmed in the air after D-22:

| Output | Position | Spin |
|---|---|---|
| Motor 1 | front right | CCW |
| Motor 2 | back left | CCW |
| Motor 3 | front left | CW |
| Motor 4 | back right | CW |

Any document in this folder that says motor 2 is CW or motor 4 is CCW is repeating the struck
table. Flag it and correct it from the build log; do not average the two.

## Hard rules for the flight controller

- **Do not put the flight controller under agentic control.** Claude Code may read, diff and
  summarise `.params` files (plain text). It must not drive the board over MAVLink. That
  fights QGC for the serial port and puts write access to flight parameters inside an
  automated loop. The board stays under direct human control through QGroundControl.
- **One tool on the serial port at a time.** Close QGC before anything else touches the board.
- Never paste large files over SSH to any device in this project. Use `scp`, then verify.

## Read-only MAVLink observer (D-11 in `build-log.md`)

`tools/qgc-readonly-mcp/server.py` is an MCP server registered in `.mcp.json`. It listens
on UDP 14445 for the stream QGC mirrors when "Enable MAVLink forwarding" is on
(Application Settings → MAVLink, host `localhost:14445`). Tools: `status`,
`autopilot_version`, `params`, `param`, `messages`, `sensors`, `traffic`, `latest`, plus
`.params` file readers and diffs. It **never transmits**: the socket's send methods are
replaced with a function that raises. Do not add write tools without a new D-number.
It listens on `127.0.0.1` only (D-32), so nothing else on the network can feed it;
QGroundControl must forward to `localhost`, which is its default.

D-21 is that D-number for one narrow case: the client approved a `download_log` tool that
may send exactly three MAVLink log-request messages (IDs 117, 119, 122) and nothing else.
It has **not been implemented**; `server.py` still has no transmit path. It is blocked on an
unanswered question (whether QGC routes packets arriving on the forwarding port on to the
vehicle), which must be tested, not assumed. Until it is built, logs come off the SD card
or through QGC's Analyze → Log Download.

How it is built, for anyone editing it: one daemon thread receives and fills a single
in-memory cache behind a lock; the MCP tools only read that cache. It learns parameters
solely by overhearing QGC's download, and it clears the parameter cache when the vehicle's
parameter count changes (a reboot after a port-config change adds and removes parameters).
After a reconnect the cache may hold only a few freshly written values, so a diff taken
then is partial; ask for a Refresh before trusting `only_in_file`.

Parameter values in the cache come from QGC's own download. If they look stale, ask the
user to press Refresh in QGC's Parameters view. Parameters do not download over the SiK
radio link by themselves; the USB cable must be in before Refresh. Diagnose without MCP with:

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\python.exe tools\qgc-readonly-mcp\server.py --watch
```

The venv is Python 3.12 with `pymavlink`, `mcp` and `pyulog`. `.mcp.json` holds absolute
paths to this folder, so moving or renaming the folder breaks the registration.

`MCP-SETUP/` documents the observer: `README.md` (overview, daily use), `INSTALL.md`
(rebuild on a new computer, with `requirements.txt`), `TOOLS.md`, `TROUBLESHOOTING.md`.
Two checks live there, both read-only, neither touches the board:

```powershell
powershell -ExecutionPolicy Bypass -File MCP-SETUP\check-observer.ps1          # who holds UDP 14445, what is wrong
tools\qgc-readonly-mcp\.venv\Scripts\python.exe MCP-SETUP\selftest.py          # offline decoder test, 21 checks
```

Run the self-test after any edit to `server.py`; four of its checks prove the socket still
refuses to send. Keep `MCP-SETUP/` in step with `server.py` when tools are added or changed.

Parameter backups go in `params/` named `YYYY-MM-DD-<what>.params`. Save them **after**
the reboot that follows a port-config or airframe change, not before. QGC's save dialog
opens wherever it was last pointed, so check the file landed in `params/` under today's
date. Current baseline is named in `HANDOFF.md`. At the start of a session run
`diff_live_against_file` against it. `_HASH_CHECK` as the only live-only item is normal.

Only one Claude Code session per folder: two observers on UDP 14445 bind silently and one
starves. If `status` shows zero bytes with QGC connected, check `recent_errors` for the
port clash and close the other session.

The observer filters QGC's own forwarded traffic (system ID 255). If `status` ever shows
`MAV_TYPE_GCS` or an armed flag with no vehicle, that is QGC, not the board.

## Flight logs

`logs/` holds PX4 `.ulg` files copied from the Pixhawk's SD card, named
`YYYY-MM-DD-NN-HHMMSSZ-what.ulg` (NN is flight order; the time is the board's clock, which
is UTC; local was UTC−4). `logs/README.md` maps each file to its original name on the card,
which is the name older build-log entries use. Reading a saved log file is file analysis,
not board control, and needs no D-number. The `pyulog` tools are in the observer's venv:

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\ulog_info.exe     logs\<file>.ulg   # duration, firmware, dropouts
tools\qgc-readonly-mcp\.venv\Scripts\ulog_messages.exe logs\<file>.ulg   # the board's own message log
tools\qgc-readonly-mcp\.venv\Scripts\ulog_params.exe   logs\<file>.ulg   # parameters as flown
```

Numbers quoted in the build log come from the log, not from anyone's memory of the flight.
Judge vibration and similar limits against PX4's log-analysis guidance and cite it.

## Working pattern that has held up

Every parameter change: look up the parameter in PX4 v1.16.0 sources or docs and cite it
in `build-log.md`, write the D-number entry with the reason and the revert, get the user's
yes, the user makes the change in QGC, then diff live against the last snapshot and
explain every line that moved. QGC screenshots go in `screenshots/` dated. A flight is
written up as a session entry, not a D-number, unless a parameter moves.

Prefer the fix a student can see. D-22 chose swapping two leads over remapping
`PWM_MAIN_FUNC3/4` so that the wiring matches every PX4 diagram; a hidden mapping is what a
child rebuilding the aircraft would trip over.

QGC naming in this build: "Configure" is what PX4 docs call "Vehicle Setup". Check QGC's
distance unit before any distance is typed (it was in feet once; now metres), and check which
tab the Actuators page is on before anything is assigned (PWM AUX was written by mistake once).

## Open items on the aircraft side

Bench configuration is complete and the aircraft has hovered (2026-09-28, six logs after
D-22: attitude and position hold good, no estimator warnings). Baseline is still
`params/2026-09-28-motors.params`. Open, from the last build-log entries:

- **Constant yaw-torque demand.** The CCW pair (motors 1, 2) runs about 1700 µs against
  about 1330 µs for the CW pair in a hover with the yaw stick centred. An ESC re-calibration
  did not change it. Remaining candidates are in the build log. To be resolved before more
  flying.
- **Battery percentage follows voltage sag.** `BAT1_R_INTERNAL=-1` (no load compensation)
  and a pack that sags hard put the reading through the D-19 thresholds with about 3 % of
  capacity used. The failsafe behaved as configured. Every flight so far started on a
  part-charged pack. Any parameter change here needs its own D-number.
- A full live diff after a QGC Refresh is still owed since D-22.
- The breakout wiring photo in the record shows the old, crossed wiring; a new one is wanted.
- The build log and `HANDOFF.md` cite screenshots that are not in `screenshots/`. Check a
  file exists before pointing anyone at it.
- FAA registration, TRUST and Remote ID (or a FRIA) gate outdoor flight; the aircraft is over
  250 g. Geofence stays off until the client gives a site figure in metres.

Radio: RadioMaster Pocket + RP4TD on SBUS into the PPM/SBUS RC socket, calibrated,
switches assigned (D-14, D-16). **CRSF does not work on factory PX4**; `RC_CRSF_PRT_CFG`
does not exist on this board. Telemetry: Holybro SiK 915 MHz on TELEM1 (D-17). Power: PM02 V3.3
with a 4S 5200 mAh Ovonic (D-18). Kill switch stays as configured; instructor radio and HM30
are each a separate future session. GPS is a Holybro standard module with an IST8310 compass,
exact variant unread. Video/data link is a SIYI HM30; D-15 (approved, on hold) covers wiring
it to TELEM1, which would mean swapping out the SiK radio. Manuals live in `docs/`. Also
outstanding: prop guards, LiPo-safe storage, vibration isolation, HM30 8-pin-to-RJ45 adapter
cables.

## Companion app (`NextApp/`, D-23 to D-34)

`NextApp/` is a Next.js app, "Flight Companion": checklists, flight planning, mission
files (D-24), parameter files (D-25) and a PX4 log viewer. It is the one part of this
folder with a build system. It has its own `CLAUDE.md` and `AGENTS.md`; its system book
starts at `NextApp/docs/README.md`.

**`NextApp/` is its own git repository, and it is PUBLIC on GitHub** (one commit, made
2026-09-29 outside Claude Code). The rest of this folder is in no repository. Never
commit or push from it without being asked, and read `PUBLISHING.md` first: the owner
decides item by item what is published, and nothing that carries a position, a name or a
device identity goes in. Logs, parameter files, `build-log.md` and `notes.txt` stay out.
`SampleApp/nro-studio` is the user's reference app that its shell was ported from; read
it, do not edit it.

- **It never sends to the aircraft.** The web app, the command-line tool and the files
  server open no serial port, socket or MAVLink link: they read logs,
  missions and parameter files and write missions and parameter files. The observer is
  the one part that hears an aircraft, and it cannot send. This is the
  flight-controller rule above applied to the app; do not add a link to the board
  without a new D-number. **It may write a parameter file. It never sends one.**
- **To read this project's data, use the command-line tool**, from `NextApp/`:
  `node bin/fc.mjs help`. It reads a log, a mission or a `.params` file and prints JSON;
  `params-diff <after> <before>` compares two parameter files with each row explained;
  `explain <NAME>` gives PX4 v1.16.0's own description, unit, limits and default. It is
  a second way to do what the observer's file tools do, and it needs no board and no
  QGroundControl. `NextApp/docs/FOR-ASSISTANTS.md` is the guide.
- **Parameter descriptions are PX4's, never ours.** They come from
  `NextApp/public/data/px4-v1.16.0-parameters.json`, built from PX4's parameter
  reference at the v1.16.0 tag. The app offers no PX4 name for an ArduPilot name.
- Examples shipped with the app are made in code, around the PX4 simulator's default
  home. No example may be a recording of a real flight or hold a real site.
- Architecture is registry-driven: one folder per domain in `domains/`, a manifest, a
  thin route, zero-prop slot components that read their own store. Adding a domain never
  edits the Shell. Domains do not import each other's stores; they meet in `stores/core/`.
- Next.js here is version 16 and differs from older versions: read
  `NextApp/node_modules/next/dist/docs/` before writing Next-specific code.
- Commands, from `NextApp/`: `npm run dev`, `npm run build`, `npm run typecheck`,
  `npm run lint`, `npm run verify` (log reader against pyulog, analysis against the
  build log's figures, planner against known answers, mission formats, parameter files
  against `../params`, the command-line tool; the log checks need `../logs`).
- Files in `lib/` import each other with the `.ts` extension and use no enums, so Node 24
  can run them directly in the verify scripts. Keep it that way.
- The "never guess" rule applies to the app's content: camera figures, MAVLink command
  numbers and thresholds are cited or left for the user to enter.
- No file the app has written has been opened in QGroundControl, Mission Planner, DJI
  Pilot 2 or on a Garmin device, and none has been flown. Until one has, say so when the
  subject comes up. Garmin, GPX and KML output passes the owners' schemas; a `.params`
  file read and written back is the same byte for byte.
- **The MCP files server is built** (`NextApp/mcp/files/server.mjs`, D-29): thirteen
  tools over the command-line tool's functions, standard input and output, no port.
  `NextApp/mcp/files/README.md` has the setup.
- **The observer has a public copy in `NextApp/mcp/observer/`** (D-29, the owner's yes on
  2026-09-29). It is a COPY: this project's own observer stays in
  `tools/qgc-readonly-mcp/`, registered in `.mcp.json`, and was not changed. The copy
  listens on `127.0.0.1` only (as the original does since D-32), leaves the position out unless `FC_OBSERVER_PLACE=1`, has
  nine tools (the three that only read files were taken out), and names nothing of this
  project. Its guard against sending is the same, line for line. **Neither copy may be
  given a way to transmit without a new D-number**, and D-21 applies to neither until it
  is built. A change to one is not a change to the other: say which one is meant.
  `npm run verify:observer` runs its 43-check self-test and a loopback.
- **The observer also exists in JavaScript** (D-33): `NextApp/lib/mavlink/` (reader,
  tables generated from MAVLink's definitions, checked against pymavlink by
  `verify:mavlink`), `NextApp/lib/observer/` (the nine answers, checked against the
  Python copy by `verify:observer-js`), `NextApp/mcp/observer/server.mjs` and
  `listener.ts` (Node MCP server, `verify:observer-node`). That makes THREE observers:
  this project's own (Python, `tools/`), the public Python copy, the public JavaScript
  one. The JavaScript one is what the desktop app and its Live screen use. Same rule:
  none may be given a way to transmit; the listener's `SENDING` methods are replaced
  with one that raises and the checks try them. The Python copies mask the position
  by field name; the JavaScript one by MAVLink's units too, and closes a gap the Python
  copies had (mission items' `x` and `y`), which the public Python copy now has as well.
- **The desktop app opens one port** (D-33 part 2): UDP on `127.0.0.1`, QGroundControl's
  forwarding port, only when the user switches listening on in the Live screen, off at
  every start. What it hears is written to `userData/observer/heard.json` for the
  observer's tools (started with `FC_OBSERVER_SNAPSHOT`, in which mode the server opens
  no port) and removed on stop and at quit. Never use port 14445 in a check: this
  session's own observer holds it; the checks ask the system for a free port.
- The map's User-Agent names the public repository as a contact (D-34).
- **The Assistant domain is built** (D-31): a chat, the widget in every screen, and an
  adapter layer in `NextApp/lib/assistant/`. Claude Code is one adapter and answers only
  in the desktop app. In a browser the practice assistant answers and says it is not an AI.
- **The desktop app and the hosted page are built** (D-30): Electron in
  `NextApp/desktop/`, unsigned; `npm run desktop:build`, `desktop:start`, `desktop:dist`,
  `hosted:build`, from `NextApp/`. `NextApp/desktop/README.md` is the guide. Release
  **`v0.1.0` is public**, built by `desktop.yml` on a `v*` tag (2026-09-30); the client
  runs a macOS disk image on Tahoe 26.6.2 (the owner's report). The Windows installer has
  still **not been run** on any computer, and `pages.yml` (the hosted page) has never
  run. Builds go to `out/`, `out-hosted/`,
  `desktop/dist/` and `release/`, all kept out of git.
- **`desktop/claude.ts` is the only code that starts a program.** It gives Claude Code
  the files server's reading tools, the observer's nine tools (answering from the file
  the Live screen keeps), Read, and a folder of its own. Do not give it a
  shell, a tool that writes, web access or another folder without a new D-number.
- **Do not make a page draw differently in the desktop app the first time.** The pages
  are built once; what differs is read from a store after the page has loaded.
- On Windows, `next build` with `output: "export"` misplaces some files;
  `NextApp/scripts/fix-export.mjs` says why and corrects it. The build scripts call it.
  Do not build the export with a bare `next build`.
- **Start Claude Code directly, never through a shell.** A shell drops the empty argument
  after `--tools`, and the allowed tools are then never set.
- An assistant in the app reads and explains. Do not give it a tool that changes the
  app, writes a file or could reach an aircraft without a new D-number.
- **The Pi screen and the bridge (D-37, D-38).** `NextApp/pi/bridge.py` on a Raspberry Pi
  reads its AI camera and LiDAR and runs modules a person starts from the app's Pi screen;
  some talk to an autopilot over MAVLink (stage A listen, B obstacle data, C setpoints).
  What must stay true: **no assistant, MCP tool or Claude Code path to the Pi's controls
  or the autopilot** (the assistant's `what_the_pi_sees` only reads); **the app makes no
  MAVLink** (`lib/mavlink/decode.ts` stays a reader); **the Pi never arms** (no arm
  command in `pi/fcpi/`, a test reads for it); the level is set on the Pi by the teacher,
  never by the app. **Claude Code never runs stage B or C against the real flight
  controller, including over SSH.** The tests use `pi/fcpi/standin.py`, which is NOT PX4;
  say so whenever a result is quoted. Run `npm run verify:pi` after touching `pi/` or
  `lib/pi/`; on the Pi, `python3 pi/run-tests.py`.

## Pi side

`drone-pi/DEPLOY-BRIDGE.md` puts the bridge on this project's Pi (not yet done).
`drone-pi/pi-inventory-2026-09-28.md` is what is installed on it;
`drone-pi/CLAUDE_CODE_HANDOFF.md` and `drone-pi/ai_camera_lab.py` are the earlier camera
test bench. Its hard rules stand: never toggle Wayland/X11 in `raspi-config`; **do not
reconfigure the LiDAR** (the SH variant's settings are copied unchanged into the bridge);
never paste a file over SSH; SSH with Windows OpenSSH, and ask the owner for the password.
`KNOWN-ISSUES.md` holds the Pi's open faults.
