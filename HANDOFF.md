
!!! Last message before cutoff !!!

The Pi side and its link to the app are built: the bridge, the Pi screen, the combined camera-and-LiDAR templates, and all three autopilot stages, each with its own test suite. Nothing has run on the Pi or against PX4 yet. Every result below comes from made-up sensors and a stand-in autopilot I wrote for the tests, which only mimics what PX4's documentation describes. It is not PX4.

What's built
- On the Pi (NextApp/pi/): a small server, the bridge, that reads the AI camera and the LiDAR and starts or stops modules when you ask from the app. Starting anything needs a token the bridge prints when it starts. The LiDAR settings are the hard-won SH-variant ones, copied unchanged.
- In the app: a new Pi screen with Overview, a LiDAR radar, Camera (boxes, with the LiDAR's distance to each), Modules and Autopilot. With no Pi connected it plays a recording of the made-up room. The assistant can see what the Pi sees but cannot start anything.
- The camera and LiDAR together: "Look and measure" (what the camera found, and how far away the LiDAR says it is), plus four command templates: hold, face a person, keep a distance, follow a person.
- The autopilot:
  - Stage A only listens and sends nothing.
  - Stage B sends the LiDAR scan as obstacle data.
  - Stage C streams movement commands, which PX4 obeys only in Offboard mode, a mode the pilot has to select.
- The safety gate: a level (student, instructor or developer) that the teacher sets in a file on the Pi; the app can't change it. Students can't send anything to the autopilot. The bridge's own code has no arm command. Your developer-level experiments are your own code and sit outside that promise.

Checks: the full test run passes in every group. The Pi suites are 21, 6, 9 and 17 checks, one suite per stage, and the desktop app 68. The desktop check included reaching a made-up bridge on this computer's real network address, because loopback wouldn't have proven the path a real Pi uses.

Fixed along the way
- Made-up mode could reach a real autopilot. It's the one mode that accepts a settings file of the caller's choosing, so a student could have claimed developer level and streamed real commands down a wired TELEM2 port. It now refuses any real autopilot port, and a test proves it.
- The bridge didn't read a refused request's body, which broke the next request on the same connection.
- On Windows, my test autopilot was listening on every network address instead of only this computer.
- The desktop app blocks plain-http requests from its secure pages, so I allowed them in the window and kept a guard that lets through exactly one Pi address. That's the policy loosening you accepted when you chose "the page connects directly".

Your three answers are recorded: your email stays as the commit author; bugs now go in the new KNOWN-ISSUES.md at the project root, never upstream; and the LiDAR range is noted as unresolved. Nothing is committed or pushed.

What I need from you, in order
1. Power on the Pi. I'll follow drone-pi/DEPLOY-BRIDGE.md and ask for the password when I get there.
2. Which cable you have for TELEM2, if any. Holybro's page gives the pins but not the connector type; a USB-to-serial adapter would avoid the Pi's pins entirely.
3. Where PX4's simulator can run. WSL is broken on this computer and there's no Docker. The options are GitHub's build machines, your client's Mac, or me repairing WSL here, which changes your computer, so that one's your call.
4. The LiDAR's own datasheet, saved into docs/. I didn't adopt 25 m because the only datasheet there is for the standard T-mini Plus, which says 12 m. Your unit is the SH variant, and its working settings cap at 16 m.
5. Before any stage C flight: COM_RC_OVERRIDE has to be 3. It's 1 on the board, which means moving the sticks would not take control back from the Pi in Offboard mode. That's a parameter change you'd make in QGC under its own decision.

!!! Last message before cutoff !!!


# Handoff — pick up here


Last aircraft session: **2026-09-28**: maiden-flight pre-check, the roll-over, D-22 (the crossed ESC leads), six hovers that held attitude and position, and the "critical battery" hover analysed. Nothing on the board has changed since; the baseline is still `params/2026-09-28-motors.params`. The build-log entries from "First hovers after D-22" to "Hover 23:03:40" have the detail. (This line said "maiden-flight bench pre-check" until 2026-10-14 and lagged the build log.) Read this, then `notes.txt` for the client
rules, then `build-log.md` from the "Session 2026-09-28 (daytime)" entry to the end
(D-16 to D-20) for the detail.

**Pi and app, 2026-10-14 (D-37, D-38 built, not committed):** the Pi bridge
(`NextApp/pi/`) and the app's Pi screen are built and checked against made-up sensors and
a stand-in autopilot (NOT PX4). The Pi was off all session. Next: power it on and follow
`drone-pi/DEPLOY-BRIDGE.md`. The build log's last entry has the owed list. Bugs now go in
`KNOWN-ISSUES.md`, not upstream.

Companion app (`NextApp/`): last worked **2026-09-30**. Everything through D-34 is built,
checked (`npm run verify` green in every group) and **pushed** to the public repository
`github.com/jacob-the-parson/flight-companion` (commits `e4b98c7`, `a93e6b6`). Release
**`v0.1.0` is public**: built by the `desktop.yml` workflow on its first run, with a
Windows installer and two macOS disk images. **The client has it running on macOS Tahoe
26.6.2** (the owner's report). What exists: checklists, planner, missions, parameters,
logs, a **Live** screen (practice flight everywhere; listening for the aircraft in the
desktop app), the Assistant (practice assistant in a browser, Claude Code in the desktop
app), and two MCP servers. There are **three observers** now: this project's own in
`tools/`, a public Python copy and a public JavaScript one in `NextApp/mcp/observer/`.
**None of the new code has heard the real aircraft.** Open on the app side: a suspected
Mac PATH defect in finding Claude Code (build log, last entry), stale "not checked" lines
in the public docs, D-35 and D-36 proposed and awaiting the owner. Nothing on the
aircraft changed in those sessions.

## Where the aircraft is

Holybro X500 V2 frame, Pixhawk 6C, factory PX4 v1.16.0 (official build, identity logged
in `build-log.md`). Ground station is QGroundControl only.

Done and verified:

- Airframe **Holybro X500 V2** (`SYS_AUTOSTART=4019`), D-13.
- GPS on the **GPS2 port** (`GPS_1_CONFIG=202`), D-12. Standing configuration.
- Compass, gyro, accel, level horizon calibrated; heading verified by phone compass.
- Safety switch not needed, `CBRK_IO_SAFETY=22027` factory default. D-03 resolved.
- **Radio working (D-14, built 2026-09-28).** RP4TD bound to the Pocket, protocol
  **SBUS** (Inverted SBUS gave nothing), head in the PPM/SBUS RC socket. Radio
  calibrated in QGC: sticks on channels 1–4 (AETR), throttle non-centering, 18 channels.
- **Switches assigned (D-16, 2026-09-28).** SB (ch 6): toward the pilot = Position,
  middle = Altitude, back = Stabilized. SD (ch 8) = kill switch, **green light on =
  motors allowed, light off = KILL** (`RC_KILLSWITCH_TH=-0.75`). Arming by stick
  gesture. All verified from the board. The client raised the risk of a push-button
  kill being bumped in flight, then decided it **stays as configured** for now; an
  instructor (trainer) radio is a separate future session.
- **Telemetry radio working (D-17, 2026-09-28).** Holybro SiK 915 MHz 100 mW on TELEM1,
  ground radio on laptop USB. QGC connects over it with no USB cable. No parameter
  change.

- **Power configured (D-18, 2026-09-28).** PM02 V3.3, battery told to the board as 4S
  5200 mAh. Divider 18.1 kept (meter 16.1 V vs board 16.05 V). Battery reports healthy
  with a real percentage. Every sensor healthy at once for the first time.

- **Failsafes configured (D-19, 2026-09-28 evening).** Battery action Return at
  critical / Land at emergency (`COM_LOW_BAT_ACT=3`), thresholds 30 / 20 / 15 %
  (client's figures). Geofence left **off** (client's call; QGC had been in feet and
  100/40 landed as 30.48/12.19 m before the client chose 0). No flight-time cap.
  RC loss Return at 30 m and telemetry-loss no-action unchanged.
- **Motors done (D-20, 2026-09-28 evening).** PWM MAIN 1–4 = Motor 1–4
  (`PWM_MAIN_FUNC1..4` = 101–104), min/max 1100/1900 written by QGC. ESC leads go
  into a "PWM IN / PWM OUT" breakout (rows S / + / −) whose 10-pin lead goes to the
  6C **I/O PWM OUT**. ESCs calibrated (PWM, BLHeli_S 20A). Slider test props off:
  1 front right CCW, 2 back left CW, 3 front left CW, 4 back right CCW, matching
  PX4's Quadrotor X diagram. No motor wires swapped.

Current parameter baseline: **`params/2026-09-28-motors.params`**, verified identical
to the board. History: `2026-09-28-failsafe.params` (D-19), `2026-09-28-power.params`
(D-18), `2026-09-28-switches.params` (D-16/D-17), `2026-09-28-radio.params` (RC
calibration), `2026-09-27-calibrated.params` (sensors). Each diff is explained line by
line in the build log.

## Hardware identified this session (labels read by the user)

| Item | Identity |
|---|---|
| Transmitter | RadioMaster Pocket, 2.4 GHz ExpressLRS, Mode 2 |
| Receiver | RadioMaster **RP4TD** ExpressLRS 2.4 GHz true-diversity, board marked `rp4td_v1.2`. Lead: **red +, black −, blue TX, green RX** |
| Telemetry radio | **Holybro SiK V3, 915 MHz, 100 mW**, Micro-USB ground unit. On TELEM1 (D-17) |
| Video/data link | **SIYI HM30** complete telemetry package (air unit, ground unit, Pixhawk telemetry cable). Shelved, D-15 on hold |
| Connectors | JST-GH 1.25 mm pre-crimped kit |
| Battery | Ovonic 5200 mAh 130C **4S1P** 14.8 V nominal (16.8 V full), ~77 Wh. Read 2026-09-28 |
| Power module | Holybro **PM02 V3.3**, on the POWER port. Read 2026-09-28 |
| Still unread | GPS variant (M8N/M9N/M10, V1/V2) |

## Decisions and their state

**D-14 — radio, BUILT AND VERIFIED 2026-09-28.** Factory PX4 v1.16.0 has no CRSF driver,
so the RP4TD outputs **SBUS** into the PPM/SBUS RC socket. Pocket model is **"FPV Drone"**,
Internal RF CRSF (never change that; it is the radio-to-module link). Receiver protocol
is set from the Pocket: long-press SYS → Tools → ExpressLRS → Other Devices → RP4TD →
Protocol → **SBUS**. Bind mode on the RP4TD: three quick power cycles. Cost of this
route: no telemetry on the Pocket's screen. ArduCopter and a custom PX4 build were
declined; see D-14 in the build log if the client reopens it.

**D-16 — switches, DONE 2026-09-28.** Details above. Six parameters; see the build log.

**D-17 — Holybro SiK 915 MHz radio on TELEM1, DONE 2026-09-28.** Replaces the HM30 for
now. Zero parameter change. Both radios solid green = linked.

**D-15 — SIYI HM30 on TELEM1, APPROVED, ON HOLD.** Client confirmed scope, then shelved
it until its ground unit has power. The 6-pin head is built and rung out (red 1, blue 2,
yellow 3, black 6; red open at the SIYI end) but **must not be plugged in while the SiK
radio is on TELEM1**; swapping back is a physical swap and a D-15 re-check. Ground unit
takes an NP-F series battery or 7–16.8 V DC on its PWR XT30; the kit supplied only a
bare pigtail. **Never wire the pigtail to mains.** Air unit runs from the aircraft 4S
battery via the power board (in spec). Manual v1.3 in `docs/`.

## What is next, in order

Aircraft:

1. **First thing at the next bench session, props off:** QGC Refresh with the USB cable
   in, then a full diff against `params/2026-09-28-motors.params` (owed since D-22);
   `status` from this project's observer, expecting `listening_on` `127.0.0.1:14445`
   and a quadrotor heartbeat (the D-32 check, never done).
2. **The yaw split, before more flying.** In every hover the CCW pair (MAIN 1, 2) runs
   about 1700 µs and the CW pair (MAIN 3, 4) about 1330 µs with the yaw stick centred;
   an ESC re-calibration did not change it. Remaining candidates, from the build log:
   props not all the same model (the replacement), a bent prop, a motor not square on
   its arm, or the CW and CCW ESCs configured differently (BLHeli_S settings; a free
   configurator only, D-09). Look at the props and motor mounts first.
3. **The battery.** Charge the pack full (4.20 V/cell, 16.8 V) and fly one hover log: it
   answers whether the percentage still follows the sag. The pack plus wiring measured
   70–90 mΩ; suspects in the build log. `BAT1_R_INTERNAL` stays −1 unless a D-number
   says otherwise.
4. **Remote ID / FAA registration** before any outdoor flight; aircraft is over 250 g.
   **Geofence** stays off until the client gives a site figure in metres (D-19).
5. A new photo of the breakout wiring (the one on record shows the crossed leads).
6. **Instructor (trainer) radio**, own session. Research whether the Pocket supports a
   trainer link (RadioMaster + EdgeTX docs, not a guess) and which radio becomes the
   instructor unit. Nothing on the aircraft changes for this.
7. **HM30 (D-15)**, own session, once the ground unit has a 7–16.8 V supply, and only by
   swapping it for the SiK radio on TELEM1. Order per the manual is in D-15.
8. GPS variant label. Prop guards. Vibration isolation.

Pi:

1. **Put the bridge on the Pi** (`drone-pi/DEPLOY-BRIDGE.md`): copy with `scp` and check
   the digests, the read-only checks (`pymavlink` on Trixie?), `--made-up` first, then the
   real camera and LiDAR. Compare its LiDAR settings with `lidar_radar.py` itself.
2. **The hand test** and the camera's field of view, into `/etc/flight-companion/pi.json`.
3. **Stage A**: which TELEM2 cable exists; Holybro's pinout PDF into `docs/`; the Pi 5's
   serial device; three parameters under their own entry.
4. **Stages B and C against PX4's simulator**, where it can run (WSL is broken here). Never
   on the aircraft from Claude Code. Stage C also needs `COM_RC_OVERRIDE` 3 (it is 1).

Companion app:

1. **Hear the real aircraft through the new code**, at the same bench session: QGC
   forwarding to `localhost:14445`, close this project's observer (one port, one
   listener), desktop app, Live screen, Listen. Then ask the app's Claude Code for
   `status`.
2. **The client's report**: what the Assistant screen says on his Mac with Claude Code
   installed. If it says "not found", fix the PATH lookup in `desktop/claude.ts` (build
   log, last entry) and release 0.1.1, with the stale "not checked" lines in
   `desktop/README.md` and `docs/VERIFICATION.md` corrected in the same commit.
3. **Awaiting the owner:** D-35 (3D view) and D-36 (Pi pictures and LiDAR), both
   proposed; the LiDAR's rated range (the owner: 25 m; no datasheet for the SH variant in
   `docs/`, `KNOWN-ISSUES.md` P5); `PUBLISHING.md` 2.14 to 2.16 (the Pi work); whether
   Learn mode stays on by default; whether to report the Next.js export bug upstream.
4. Not built: the API-key and custom-endpoint adapters for the hosted page; publishing
   the hosted page (`pages.yml`, by hand).

Open decision: D-04 (buzzer). Unchanged.

## How to reconnect next session

1. Props off. Pixhawk in over USB-C. QGC auto-connects (Windows shows it as
   "USB Serial Device (COMx)", Holybro VID 3185). Do not have the Firmware page open.
   With the battery in, QGC also connects over the SiK radio if the ground radio is on
   the laptop; **parameters do not download over the radio link by themselves, so
   plug the USB in before pressing Refresh.**
2. QGC: Application Settings → MAVLink → "Enable MAVLink forwarding" to
   `localhost:14445`. It persisted last time (`forwardMavlink=true` in QGC's ini).
3. **Only one Claude Code session in this folder.** Two observers both bind UDP 14445
   and one silently gets nothing. That cost twenty minutes this session.
4. Claude calls `status`. A `MAV_TYPE_QUADROTOR` heartbeat means the link is up. If
   `params_received` is 0, press **Refresh** in QGC's Parameters view; the observer only
   learns values by watching QGC download them.
5. Claude runs `diff_live_against_file` against the baseline. `_HASH_CHECK` as the only
   live-only item is normal (PX4's parameter-hash pseudo-parameter, never saved to file).

QGC menu names in this build: "Configure" is what the PX4 docs call "Vehicle Setup".

## Radio quick reference (Pocket, model "FPV Drone")

| Control | Channel | Does |
|---|---|---|
| Sticks | 1–4 | roll, pitch, throttle (non-centering), yaw |
| SB (3-pos, shoulder) | 6 | toward pilot = Position, middle = Altitude, back = Stabilized |
| SD (push button, LED) | 8 | **LED on = motors allowed, LED off = KILL** |
| SA (push button) | 5 | unassigned |
| SC (3-pos) | 7 | unassigned |
| SE (momentary) | 9 | unassigned |
| S1 (knob) | 10 | unassigned |

Arm: throttle down, yaw right, hold ~1 s. Disarm: throttle down, yaw left. After a
radio power-up SD comes up **on** (not killed). RP4TD bind mode: three quick power
cycles; bind from long-press SYS → Tools → ExpressLRS → Bind. Receiver protocol SBUS.

## Rules that bit us, keep in mind

- **The ArduPilot trap now includes wiring plans, not just parameter names.** The
  CRSF-on-TELEM1 plan was written for ArduCopter and is invalid on factory PX4.
- **The Pixhawk 6C runs happily on the power module and USB at once**, props off. That
  is the bench setup for anything needing the receiver or the ESCs.
- **Save-to-file in QGC lands wherever the dialog was last pointed.** Check `params/`
  after saving; today's snapshot went in under yesterday's date and had to be renamed.
- **Check QGC's distance unit before typing any distance.** The Safety page was in feet;
  100 and 40 became 30.48 m and 12.19 m on the board. Now set to metres.
- **QGC's Actuators page writes to whichever tab you are on.** Motors were assigned on
  PWM AUX as well as PWM MAIN by mistake; AUX was set back to Disabled and diffed.
- **ESC signal leads had been plugged by colour and were reversed.** The breakout's
  rows are marked S / + / −; the ESC's signal wire (white on these BLHeli_S leads,
  confirmed at the ESC pad) must be on S. Reversed leads give no chime, no response
  to sliders, and a "successful" ESC calibration that reached nothing. Read the pad
  at the ESC end, not the colour.
- **Wire colours are not evidence.** The receiver's lead and the HM30's lead were confused
  for each other for a while. Identify a cable by what it is attached to and by ringing
  it out, then by the manufacturer's pinout.
- **Count pins from the polarity key, not from "left".** Two people counted the same
  6-pin head from opposite ends and got reversed power.
- Applying an airframe resets parameters. Save `.params` after the reboot, not before.
- The observer never transmits. Every change is made by a human in QGC and then diffed.

## Files

| Path | What |
|---|---|
| `notes.txt` | Client brief and ground rules. Read first. |
| `build-log.md` | Decisions D-11 onward with sources, every session's findings. |
| `flight-checklists.md` | Maiden flight plan, pre-flight / landing / post-flight checklists, abort rules. |
| `params/` | QGC parameter snapshots, dated. |
| `logs/` | Flight logs (`.ulg`) pulled from the SD card after each flight. Empty until the maiden. |
| `screenshots/` | QGC screens and bench photos, dated. Latest: `2026-09-28-pwm-breakout-wiring.jpg`. |
| `docs/` | Manufacturer manuals saved locally (SIYI HM30 v1.3 + port diagrams). |
| `tools/qgc-readonly-mcp/` | The read-only MAVLink observer. `--watch` runs it standalone. |
| `NextApp/` | Flight Companion: checklists, live view, planner, missions, parameters, log viewer, assistant, desktop app (D-23 to D-34). `npm run dev`. Docs in `NextApp/docs/`. From a terminal: `node bin/fc.mjs help`. **Its own git repository, public on GitHub; release `v0.1.0` is public.** |
| `PUBLISHING.md` | What carries a position, a name or a device identity, item by item, for the owner to decide (D-28). Read before any commit or push. |
| `MCP-SETUP/` | Setup kit for the read-only observer, written 2026-09-29 by another session. It documents THIS project's observer in `tools/`. The app has its own copy and guide in `NextApp/mcp/observer/`. |
| `SampleApp/` | The user's reference app the companion's shell was ported from. Read only. |
| `missions/` | Plan files. Empty. |
| `drone-pi/` | Raspberry Pi smart package. Parked. |
