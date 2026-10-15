# Publishing inventory (D-28)

Written 2026-09-29. What in this folder carries a location, a name, a device identity or
somebody else's copyright, so that each item can be decided one at a time.

**The rule** (the owner's words): "no PII goes on github but let me decide, each item we
need to select because we may just rename them as examples to show how the domains work."

**Nothing in this file is a decision.** The last column of each table is empty. Claude
Code has not committed, pushed, deleted or rewritten anything, and will not without being
asked.

How the facts below were found: by search and by comparison in code, without printing a
position. Where it says a file "holds the takeoff point", the logs' takeoff latitude and
longitude were compared with the file's text to two decimals.

---

## 1. What is already public

`NextApp/` is a git repository with one commit, pushed to a public GitHub repository
(`flight-companion`, under the owner's account). The repository answers to a browser that
is not signed in. The commit was made on 2026-09-29 at 14:31 local time, outside the
Claude Code session that wrote this file; that session found it at about the time it
wrote this. 147 files.

| # | what | where | what it carries | choices | decision |
|---|---|---|---|---|---|
| 1.1 | Commit author | git metadata of commits `2640f44`, `e4b98c7` and `a93e6b6` (still undecided, 2026-10-14) | the owner's name and email address, as git is configured on this computer | leave · set a GitHub no-reply address for future commits · rewrite the one commit (needs a force-push) | **leave**: the owner, 2026-10-14 ("yes my email") |
| 1.2 | Log viewer screenshot | `docs/screens/logs-charts-dark.png` | the names of three of the project's real logs (date and time of each flight), the start of the board's name, and real flight figures: battery voltages, heights, the failsafe messages. **No position, no map.** | leave · replace with a screenshot of a log made for the purpose (see 4.1) · remove | |
| 1.3 | Planner screenshots | `docs/screens/planner-grid.png`, `planner-tablet.png` | a map with place names, of a test point Claude Code chose for the walk-through. It is more than 1,000 km from the takeoff point in the logs. **It is not the flying site.** | leave · replace with the simulator's public point, which the new screenshots use | |
| 1.4 | Analysis checks | `scripts/verify-analysis.mjs` | figures from the project's real logs, written as expected values: times, voltages, motor outputs, the roll-over. Log names are matched by a tag such as "rollover". No position. | leave · it cannot run without the logs, so it could be left out of the public copy | |
| 1.5 | Built-in checklist | `lib/checklists/seed.ts` | the X500 V2 checklist written for this build: motor order, prop directions, the kill switch, the battery figures | leave as the worked example it is · rename to a generic multirotor and keep the specific one private | |
| 1.6 | Default aircraft | `stores/core/aircraftStore.ts` | "X500 V2", 4S 5200 mAh, and a hover current measured from the logs | leave · make the default generic | |
| 1.7 | A first name in comments | `components/shell/DrawerNav.tsx`, `DrawerShell.tsx` | "Jacob's pick", "Jacob's convention": came over with the shell from NRO Studio | leave · reword | |
| 1.8 | Verification notes | `docs/VERIFICATION.md` | says the checks ran on "the project's eleven logs" from "one aircraft", and names `build-log.md` | leave · reword | |

Already kept out by `.gitignore`, correctly: `scripts/ulog-reference.json`, which holds
values from the logs including positions and the board's identifier.

**Not found in the public copy**: any latitude or longitude of the flying site, the
board's full identifier, the client's name, a student's name, a file from `logs/`,
`params/` or `screenshots/`.

Removing something from a public repository is not the same as un-publishing it. A later
commit leaves the old file in the history. Taking it out of the history means rewriting
the commit and force-pushing, or deleting the repository and making a new one; and a
copy may already have been fetched by someone else.

**2026-09-30: the owner said "push", and everything in section 2 was published as
commit `e4b98c7`** (132 files; the scan of section 5 found only constants and the
simulator's home; every image was looked at). The decisions below are therefore
"publish" unless the owner later says otherwise. One exception: 2.10, the two workflow
files, are committed locally as `a93e6b6` and NOT pushed, because the stored GitHub
credential lacks the `workflow` scope; the push is the owner's, after a re-login.

## 2. What this session added to `NextApp/`, published 2026-09-30

Eight files changed and fourteen new files or folders: the Parameters domain, the
command-line tool, the shared cards, the assistant documents, the checks.

| # | what | where | what it carries | choices | decision |
|---|---|---|---|---|---|
| 2.1 | PX4's parameter reference | `public/data/px4-v1.16.0-parameters.json` (905 KB) | PX4's own descriptions of 2,696 parameters. © the PX4 documentation authors, **CC BY 4.0**: it may be published with attribution, which `README.md` and the file itself carry | publish with the attribution · leave it out and have users build it with `scripts/generate-px4-params.py` | |
| 2.2 | New screenshots | `docs/screens/missions-*.png`, `parameters-*.png` | examples only: a mission at the PX4 simulator's default home near Zurich, parameter sets built from PX4's defaults | publish | |
| 2.3 | Verification notes, new sections | `docs/VERIFICATION.md` | that nine parameter files from "the project's aircraft" were used, that it has 1,116 parameters, the name of the one parameter not in PX4's reference, and that a comparison gave the six parameters of decision D-16 | leave · reword to leave the aircraft out | |
| 2.4 | The default path of two checks | `package.json`: `verify:params`, `verify:cli` | the folder names `../params` and `../logs`. The checks skip what is not there | leave | |
| 2.5 | Examples | `lib/mission/samples.ts`, `lib/params/samples.ts` | made in code. The five parameter values in "After a bench session" are example values chosen for the lesson | publish | |

| 2.6 | The observer, public copy | `NextApp/mcp/observer/` (8 files) | source code and its guide. Made from 3.8 with every reference to this project taken out; a check fails if one returns. The position in its self-test is the PX4 simulator's default home. Its Python environment is kept out by `.gitignore` | publish, as decided | decided |
| 2.7 | A recording of Claude Code | `NextApp/scripts/fixtures/claude-code-stream.jsonl` | one real answer, with the session id, the folder and every field of this computer taken out; a check fails if one returns. It names the model that answered | publish · leave out, and the check that uses it is skipped | |
| 2.8 | New screenshots | `NextApp/docs/screens/assistant-*.png` | the practice assistant, the example missions, a screenshot of the app attached as a picture | publish | |

| 2.9 | The desktop app's source | `NextApp/desktop/` | source code, the icon and the guide. No data | publish | |
| 2.10 | Two GitHub workflows | `NextApp/.github/workflows/` | `desktop.yml` builds the installers when a tag beginning with `v` is pushed and attaches them to a DRAFT release. `pages.yml` publishes the hosted page and runs only when started by hand. **Pushing these files makes them able to run.** Neither holds a secret | publish both · publish one · hold both back until the first release is decided | pushed 2026-09-30 |
| 2.11 | The installer | `NextApp/release/Flight-Companion-Setup-0.1.0.exe`, 107 MB | built here, unsigned, kept out of git by `.gitignore`. It holds the app and the examples; no file of this project. It names the app's author as "Flight Companion" | give it to a tester by hand · publish it through a release · delete it | built by the workflow into release v0.1.0 with two .dmg files, and PUBLISHED, 2026-09-30 |
| 2.12 | Three made-up data files (D-33) | `NextApp/scripts/fixtures/mavlink-reference.json` (850 KB), `NextApp/scripts/fixtures/observer-reference.json` (53 KB), `NextApp/public/data/practice-telemetry.json` (104 KB) | packets built by pymavlink from random numbers with a fixed seed, and a made-up one-minute flight; the only position in any of them is the PX4 simulator's default home. A check fails if a folder of anybody's computer is named in the observer reference (an early version held this computer's user name in a path; removed) | publish (they are what the checks run against) · hold back and regenerate on each computer with the two Python scripts | |
| 2.14 | The Pi bridge (D-37, D-38) | `NextApp/pi/` | source code, its guide, an example of the teacher's settings, the tests. No address, password or name of this project's Pi; its default origin list names only the app's own. A stand-in autopilot for the tests, marked NOT PX4 | publish with the next commit · hold back | |
| 2.15 | The Pi screen's practice data | `NextApp/public/data/practice-pi.json` (157 KB) | a recording of the bridge's made-up room: no real room, camera or LiDAR; a check fails if a position or a path of this computer is in it | publish · hold back | |
| 2.16 | The desktop window's http setting | `NextApp/desktop/main.ts` | `allowRunningInsecureContent`, narrowed by the guard to one Pi address (`KNOWN-ISSUES.md` A8) | publish · revisit | |
| 2.13 | The map's contact (D-34) | one line in `NextApp/desktop/main.ts` | the User-Agent sent to OpenStreetMap's tile server names the public repository, and so the owner's GitHub account. Sent nowhere else. The owner said yes | keep · take out | yes (2026-09-29) |

Everything else added is source code with no data in it.

## 3. What is in this folder and in no repository

| # | what | where | what it carries | choices | decision |
|---|---|---|---|---|---|
| 3.1 | Flight logs | `logs/` (11 files, 11 MB) | **the position of every flight**, the board's identifier, every parameter, every message | keep private · publish one after the position has been taken out (4.1) | |
| 3.2 | Parameter files | `params/` (9 files) | the aircraft's whole configuration and its calibration values. No position. | keep private · publish one as an example of a real file · publish the two that show a comparison | |
| 3.3 | Build log | `build-log.md` (116 KB) | every decision with its reason, the incident, **and the takeoff point** (it holds the logs' takeoff position to two decimals or better) | keep private · publish with positions and names taken out, which needs a read from start to end | |
| 3.4 | Client brief | `notes.txt` | the client's requirements and rules; 17 lines hold what may be a name, an address or a number | keep private | |
| 3.5 | Handoff, checklists, project rules | `HANDOFF.md`, `flight-checklists.md`, `CLAUDE.md` | the state of the aircraft, the procedures, the rules of the build. No position found. | keep private · publish the checklists as teaching material | |
| 3.6 | MCP configuration | `.mcp.json` | absolute paths that include the Windows user name | keep private. `MCP-SETUP/mcp.example.json` exists for the purpose | |
| 3.7 | MCP setup kit | `MCP-SETUP/` (9 files) | written on 2026-09-29 by another session; not read by this one | the owner of that work decides | |
| 3.8 | Read-only observer | `tools/qgc-readonly-mcp/server.py` | source code. The `.venv` beside it is 236 MB and is never published | **decided 2026-09-29: a copy goes in the app**, see 2.6. This original stays private and unchanged | decided |
| 3.9 | Ground station screenshot | `screenshots/` (1 file) | the Actuators page of QGroundControl. Not looked at by this session for a map or a position | look at it before deciding | |
| 3.10 | Manuals | `docs/` (4 MB) | SIYI, YDLIDAR and Raspberry Pi documents: **their publishers' copyright** | do not publish. Link to the publishers' pages | |
| 3.11 | The sample app | `SampleApp/` (86 MB) | another of the owner's projects, the source of the shell | the owner decides; it is not part of this project's deliverable | |
| 3.12 | The Pi side | `drone-pi/` | parked. Not looked at by this session | decide when that work resumes | |
| 3.13 | Assistant memory | the Claude Code memory folder, outside this folder | notes about this project | never published | |

## 4. Ways to turn a real file into an example

These are options. None has been done.

| # | what | how | state |
|---|---|---|---|
| 4.1 | A flight log with no position | a tool that reads a `.ulg`, moves every position by one fixed offset to the simulator's public point, blanks the board's identifier, and writes a `.ulg` that the app and pyulog still read | **not built.** It would need its own check: that pyulog reads the result, and that no original position remains in any topic |
| 4.2 | A parameter file as an example | a parameter file holds no position. Calibration values identify the board only to someone who has another file from the same board. The header holds the firmware's version and revision | possible today: choose the file, and decide whether the calibration values stay |
| 4.3 | Examples made, not recorded | `node bin/fc.mjs samples-write <folder>` writes 63 files: six missions in eight formats, four parameter sets in four | **built and checked.** Every file is made by the app |

## 5. Before the next push

A list to go down, not a gate that anything enforces.

1. `git status` in `NextApp/`: read every new and changed path.
2. Decide 2.1 to 2.5 above.
3. Search the files about to be committed for the things that must not go:
   ```bash
   git diff --cached --name-only -z | xargs -0 grep -InE "[0-9]{1,3}\.[0-9]{5,}"
   ```
   Every hit should be the simulator's point (47.397, 8.545), a constant, or a coordinate
   from another project's public test file.
4. Look at every image about to be committed. A map is a position.
5. Decide 1.1 before the commit is made, since the author is written at that moment.
