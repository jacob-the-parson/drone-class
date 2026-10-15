# Known issues

Bugs and faults found in this project and in the tools it uses, kept here instead of
being reported upstream (the owner, 2026-10-14: "no reports on bugs, just file those here
in the project"). One entry each: what it is, whether it is confirmed, what is done about
it, and where the detail is.

Aircraft faults (the yaw split, the battery sag) are not here. They are flight work and
live in `build-log.md` and `HANDOFF.md`.

Status words: **confirmed** (seen and reproduced), **suspected** (reasoned, not seen),
**worked round** (the fault is still there; something here gets past it), **fixed**.

## Companion app (`NextApp/`)

| # | Issue | Status | What is done | Detail |
|---|---|---|---|---|
| A1 | **Next.js 16.3.7 static export on Windows misplaces files.** `next build` with `output: "export"` writes each page's segment files into folders (`planner/__next.!KG1haW4p/planner/__PAGE__.txt`) where the page asks for one dotted name (`planner/__next.!KG1haW4p.planner.__PAGE__.txt`). `convertSegmentPathToStaticExportFilename` replaces only `/`, and on Windows the path has `\`. Pages still load; moving between them is slower. | confirmed, worked round | `NextApp/scripts/fix-export.mjs` renames the files after each build; the build scripts call it. Never build the export with a bare `next build` on Windows. Not reported to Next.js, by the owner's decision. | `fix-export.mjs` header; `build-log.md`, "D-30 BUILT" |
| A2 | **The desktop app may not find Claude Code on a Mac.** `findClaudeCode` asks `which claude`. An app started from Finder gets a short PATH without `~/.local/bin` (Claude Code's own installer) or `/opt/homebrew/bin`. | suspected | Waiting for the client's report of what the Assistant screen says with Claude Code installed. Way round: start the app from Terminal, `"/Applications/Flight Companion.app/Contents/MacOS/Flight Companion"`. Fix: look in those folders too, in 0.1.1. | `build-log.md`, last entry before D-37 |
| A3 | **The public docs say things that are no longer true.** `desktop/README.md` and `docs/VERIFICATION.md` list "neither workflow has run", "nothing on macOS" and "the installer has not been run" under what was not checked. The workflow has run and a Mac runs the app. | confirmed | Correct in the 0.1.1 commit. Not edited in the meantime, since `NextApp/` is public and no push was asked for. | `HANDOFF.md`, "Companion app" |
| A4 | **The Windows installer has never been run** on any computer. It is built by the workflow and is on the public release. | open | Run it on this computer, or a spare one, before telling anyone it works. | `PUBLISHING.md` 2.11 |
| A5 | **Exported mission and parameter files have not been opened in a ground station.** They pass the formats' own schemas and round-trip byte for byte, which is not the same. | open | Open one `.plan` and one `.params` in QGroundControl at the next bench session. | `CLAUDE.md`, "Companion app" |
| A7 | **Stages A to C have only met a stand-in autopilot** (`pi/fcpi/standin.py`), which does what PX4's documentation says and is NOT PX4. | open, by design until a simulator runs | PX4 SITL before the aircraft: GitHub Actions, the client's Mac, or this computer with WSL repaired. | `build-log.md`, D-37 and D-38 built |
| A8 | **The desktop window allows insecure (http) content** so that the page can reach the Pi's bridge. Without it Chromium blocks every http request from the app's secure pages. | by the owner's choice (the page connects directly) | The guard lets through only the one Pi address the page asked for; checked by `verify:desktop`. | `desktop/README.md`, `build-log.md` |
| A6 | **The hosted page has never been published.** `pages.yml` runs only when started by hand. | open, by design | Start it from GitHub's Actions page when the owner wants a link that needs no install. | `PUBLISHING.md` 2.10 |

## Raspberry Pi (`drone-pi/`)

| # | Issue | Status | What is done | Detail |
|---|---|---|---|---|
| P1 | **`inputtensoronly` has no settings file on the Pi.** `ai_camera_lab.py` looks for `/usr/share/rpi-camera-assets/imx500_input_tensor_only.json`; only the mobilenet_ssd and posenet files are installed. The "AI's-Eye View" entry reports "no known way to run". | confirmed | Not looked up yet. | `drone-pi/pi-desktop/imx500/README.md`, "Known issues" |
| P2 | **A stale comment in `lidar_radar.py`.** The docstring of `make_lidar()` says "TYPE_TRIANGLE ... do not change it"; the code below it says `TYPE_TOF`, which is what was tested and is right for the SH variant. | confirmed | Leave the code. Fix the comment when the file is next touched. | `drone-pi/pi-inventory-2026-09-28.md` |
| P3 | **The Pi's address is not reserved.** `192.168.0.130` on `wlan0` comes from DHCP and may change. | open | Set a DHCP reservation on the router, or use `drone-pi-student.local`. | `drone-pi/CLAUDE_CODE_HANDOFF.md` |
| P4 | **The Pi dropped off the network once** about two minutes after the LiDAR was plugged in (2026-09-28). The cause was not found: there was no log from the previous boot. The power budget was checked and fits. | unexplained, not seen again | If it happens again with the LiDAR in, move the adapter's USB_PWR lead to a separate 5 V 1 A supply. Turn on persistent journald logging first, so there is a log next time. | `drone-pi/pi-inventory-2026-09-28.md`, Addendum 2 |
| P5 | **The LiDAR's rated range is not settled.** The owner says the unit is rated 25 m. The datasheet in `docs/` is the standard T-mini Plus (12 m at 80 % reflectivity). The unit on the Pi is the SH ("森合") variant, which has no datasheet in `docs/`. The working `lidar_radar.py` sets `MaxRange` 16 m. | open | Save the SH variant's datasheet, or Yahboom's product page, into `docs/`. Nothing depends on the number yet: the app's display range is a setting. | `build-log.md`, D-37 |
| P7 | **Whether Trixie packages `pymavlink`** (`python3-pymavlink`) is not known. Stages A to C need it; the camera and LiDAR do not. | open | `apt-cache policy python3-pymavlink` on the Pi; else a virtual environment with `--system-site-packages`. | `drone-pi/DEPLOY-BRIDGE.md` §2 |
| P8 | **The Pi 5's GPIO serial port** for TELEM2 is not known. PX4's Raspberry Pi page names `/dev/ttyAMA0` / `/dev/serial0` and has no Pi 5 note; the Pi inventory shows only `/dev/ttyAMA10`. | open | Check on the Pi after enabling the serial interface, or use a USB-to-serial adapter. | `build-log.md`, D-38 approved |
| P9 | **PX4's collision-prevention page contradicts itself**: 72 sectors in one place and 36 in another; "acceleration-based Position mode" in one and the velocity-based modes needed in another. | confirmed, in PX4's docs | Both recorded, neither picked; PX4's simulator settles it before stage B flies. | `build-log.md`, D-38 approved |
| P10 | **The bridge's LiDAR settings were copied from the Pi inventory**, not from `lidar_radar.py` itself, which was not in this folder. | open | Bring `lidar_radar.py` back with `scp` and compare the `setlidaropt` lines before the first real scan. | `drone-pi/DEPLOY-BRIDGE.md` §4 |
| P11 | **`--made-up` could reach a real autopilot.** It is the one mode that takes a settings file of the caller's choosing (so a student could claim the developer level), and it swapped only the sensors: the autopilot link still opened `/dev/serial0`. Found in review before the Pi was wired to anything. | fixed (2026-10-14) | In made-up mode every module that uses the link refuses any device but a network address on this computer (`modules.local_link`); a test tries six real-looking ports at the developer level. | `build-log.md`, D-37 and D-38 built |
| P6 | **The desktop icons on the Pi have not been clicked on screen.** All eight pass `desktop-file-validate` and every path exists. | open | Click each one over VNC. | `drone-pi/pi-inventory-2026-09-28.md`, Addendum 3 |

## Tools on this computer

| # | Issue | Status | What is done | Detail |
|---|---|---|---|---|
| T1 | **Bash heredocs mangle what is written through them.** Apostrophes end the string, `\n` inside a JavaScript string became a real newline, and a regular-expression `\b` became a backspace character (0x08) in `lib/observer/view.ts`. | confirmed | Source files are written with the editor tools, and patch scripts are written as files and then run. | memory note `feedback-start-programs-directly` |
| T2 | **Started through a shell on Windows, an empty argument is dropped.** `--tools ""` lost its empty value and the next flag was read in its place, so Claude Code was never given its tools. | confirmed, worked round | `desktop/claude.ts` starts Claude Code directly, never through a shell. | `build-log.md`, D-31 |
| T3 | **Git Bash's ssh can fail to start** with a cygheap error. | confirmed, worked round | Use Windows OpenSSH, `C:\Windows\System32\OpenSSH\ssh.exe`. | `drone-pi/pi-inventory-2026-09-28.md` |
| T5 | **WSL is broken on this computer** ("Class not registered", `Wsl/CallMsi/Install/REGDB_E_CLASSNOTREG`), so PX4's simulator cannot run here. Docker is not installed. | confirmed | Not repaired: it changes this computer, so it waits for the owner. | `build-log.md`, D-38 approved |
| T6 | **The scratchpad is emptied between sessions.** Downloaded definitions and the browser driver were gone after two weeks. | confirmed | Fetch again when needed; nothing the project relies on lives there. | this file |
| T4 | **The GitHub credential for pushes is the GitHub CLI's**, not Git Credential Manager's. A push that changes a workflow file needs the `workflow` scope. | confirmed, fixed | `gh auth refresh -h github.com -s workflow` (2026-09-30). | `build-log.md`, "Pushed to GitHub" |
