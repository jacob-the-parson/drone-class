# Maiden flight plan and checklists — X500 V2 / Pixhawk 6C

Written 2026-09-28 after the bench configuration was completed (D-13 to D-20).
Aircraft state assumed by this document: baseline `params/2026-09-28-motors.params`.
If the board has moved from that baseline, re-read `build-log.md` before flying.

Sources: PX4 v1.16 "First Flight Guidelines", "Pre-flight Checks", "Multicopter
Flight Modes" and "Safety Configuration" pages (docs.px4.io/v1.16), plus this
build's own decisions (D-14, D-16, D-18, D-19, D-20). Where a line is this build's
choice rather than PX4's guidance it says so.

The maiden flight is flown by the **instructor only**. Students watch from behind
the pilot. Nothing in this document is student-operated until the instructor has
flown the aircraft at least once and the post-flight review is clean.

---

## 0. Before leaving for the field (gate: do not go without these)

| # | Item | Done |
|---|---|---|
| 0.1 | **FAA registration.** The aircraft is over 250 g, so it must be registered at faadronezone.faa.gov under the recreational flyer option (one number covers all the owner's recreational aircraft) and the number marked on the airframe. Not yet done as of 2026-09-28. | ☐ |
| 0.2 | **Remote ID.** Registered aircraft need Remote ID in the US unless flown inside a FAA-Recognized Identification Area (FRIA). This airframe has no Remote ID module. Either add a broadcast module or fly at a FRIA. Confirm current rules on faa.gov; do not rely on this line. | ☐ |
| 0.3 | **Pilot credential.** Flying as a recreational (hobbyist) flyer under the Exception for Limited Recreational Operations, decided 2026-09-28. Each pilot needs a **TRUST** certificate (free online test, carry proof). Recreational rules in short: fly for fun only, under 400 ft, in sight, give way to crewed aircraft, follow the safety guidelines of a FAA-recognised community-based organisation, and get LAANC authorisation in controlled airspace. The instructor flies the maiden; students on the sticks later are also recreational flyers and also need TRUST. If the program ever charges for flight itself or flies for the client's business, that is Part 107 and this line must be revisited. | ☐ |
| 0.4 | **Airspace.** Check the site in B4UFLY or an equivalent LAANC app. Class G with no advisories is the target for a maiden flight. | ☐ |
| 0.5 | **Site (PX4 first-flight guidance).** Open space, no tall trees, hills or buildings nearby (they hurt GNSS), no people within 100 m, nothing you could not recover the aircraft from (water, roofs, tall crops). | ☐ |
| 0.6 | **Second person.** PX4 recommends an experienced pilot beside you. In this program that is the instructor plus one adult spotter. | ☐ |
| 0.7 | **Weather.** Wind low enough that a hover is easy to hold by hand: light breeze at most. No rain. Daylight. This is the build's rule, not PX4's. | ☐ |
| 0.8 | **Batteries.** Flight pack fully charged and balanced (about 16.8 V, all cells within 0.02 V). Pocket charged. Laptop charged. | ☐ |
| 0.9 | **Pack the kit.** Aircraft, four props (2 CW, 2 CCW), prop tool, Pocket, laptop with QGC, SiK ground radio, USB-C cable, fire-safe LiPo bag, first-aid kit, multimeter, spare props, this checklist on paper. | ☐ |
| 0.10 | **Parameters.** `diff_live_against_file` against `params/2026-09-28-motors.params` shows no change, or every change is logged with a D-number. Done 2026-09-28 late evening, clean; repeat on the day. | ☐ |
| 0.11 | **SD card in the Pixhawk.** `COM_ARM_SDCARD=1` is warning-only, so a missing card will not stop arming but there will be no flight log and §4.2–4.3 cannot be done. Check the slot, or look for the "SD card missing" arming warning in QGC. | ☐ |

---

## 1. Pre-flight, at the field, props OFF

Do these in order. Props go on last.

### 1a. Airframe

| # | Check | Done |
|---|---|---|
| 1.1 | Arms tight, no cracked carbon, landing gear firm. | ☐ |
| 1.2 | Motors: spin each by hand, free, no grinding; bells tight. | ☐ |
| 1.3 | All four ESC signal leads on the breakout, **signal wire on S, ground on −** (the trap of 2026-09-28). Breakout lead into I/O PWM OUT. Position 3 → front-left motor, position 4 → back-right (D-22 fixed a crossed pair). | ☐ |
| 1.4 | ESC XT30s seated on the power board. PM02 XT60 to the power board seated. PM02 6-pin into the POWER port. | ☐ |
| 1.5 | GPS mast upright and locked, arrow forward. Receiver antennas clear of carbon. SiK air radio antenna vertical. | ☐ |
| 1.6 | Nothing loose that could reach a prop: cable ties, labels, the SiK lead. | ☐ |

### 1b. Power up and link, in this order

| # | Step | Expect | Done |
|---|---|---|---|
| 1.7 | Pocket on first. Model "FPV Drone". Throttle fully down. SB toward you (Position). **SD light off = kill engaged.** | | ☐ |
| 1.8 | SiK ground radio on the laptop USB, QGC open. | | ☐ |
| 1.9 | Aircraft on level ground, nose away from you. Plug the battery in. **Do not move the aircraft for 20 s** while the gyros settle. | Startup tones, ESC chime, Pixhawk LED. | ☐ |
| 1.10 | QGC connects over the SiK radio. | Vehicle shows in Fly view. | ☐ |
| 1.11 | Battery in QGC. | About 16.6–16.8 V, 95 % or more. Below 90 % is a charging problem, not a flight. | ☐ |
| 1.12 | GPS. | 3D fix, satellites 10 or more, HDOP under 1.5. Wait if needed; the site check in 0.5 is why. | ☐ |
| 1.13 | Compass. Rotate the aircraft by hand 90°; the QGC heading follows. | Matches a phone compass within ~10°. | ☐ |
| 1.14 | Readiness indicator top-left of Fly view. | **Green "Ready to Fly"**. Amber: click it, read the Arming Check Report, fix or stop. "GPS Horizontal Pos Drift too high" must be clear; it was normal indoors and is not normal here. | ☐ |
| 1.15 | Radio check in QGC (Configure → Radio, or the RC bars). All four sticks move the right bars the right way. | | ☐ |
| 1.16 | Kill switch check. Press SD (light on). QGC shows no kill message. Press again (light off). QGC shows "Kill switch engaged". Leave it **off = killed**. | | ☐ |
| 1.17 | Mode switch check, from the HEARTBEAT or QGC mode label: SB toward you = Position, middle = Altitude, back = Stabilized. Set it to **Position** for takeoff. | | ☐ |
| 1.18 | Home position set. QGC shows the H marker where the aircraft sits. Return will come back here at 30 m. Nothing over 25 m between the flying area and this spot. | | ☐ |

### 1c. Props on, last

| # | Step | Done |
|---|---|---|
| 1.19 | Battery **out** for prop fitting. | ☐ |
| 1.20 | Props by the motor's spin direction, read from the marking on each prop: **CCW props on front right and back left, CW props on front left and back right** (the Actuators diagram: 1 and 2 blue, 3 and 4 green). Tight. D-20's old table was wrong; see D-22. | ☐ |
| 1.21 | Everyone behind the pilot, at least 10 m back. Spotter has eyes on the aircraft. | ☐ |
| 1.22 | Battery back in, 20 s still, re-check 1.10 to 1.14 quickly. | ☐ |

---

## 2. Maiden flight, flown by the instructor

Failsafe state on this aircraft (D-19): battery warn 30 %, **Return at 20 %**, **Land
at 15 %**; RC loss → Return after 0.5 s at 30 m; telemetry loss → nothing; **no
geofence**. Kill switch: SD light off kills the motors instantly and the aircraft
falls. Only use it on the ground or when a crash is already certain.

| # | Step | Watch for |
|---|---|---|
| 2.1 | Mode **Position**. Throttle down. SD light **on** (motors allowed). | No kill message. |
| 2.2 | Arm: throttle down, yaw right, hold about 1 s. | Motors idle. If they do not, do not retry blindly; read the Arming Check Report. |
| 2.3 | If nothing happens for 10 s the board disarms itself (`COM_DISARM_PRFLT`). That is fine; re-arm when ready. | |
| 2.4 | **Hop:** raise throttle smoothly through centre until the skids leave the ground, hover at knee height for 5 s, lower gently. Disarm: throttle down, yaw left. | Level lift-off, no yaw spin, no lean. Any of those: land, disarm, stop, diagnose. |
| 2.5 | Remove the battery, feel the motors. Warm is fine, hot is not. Check props tight. | |
| 2.6 | **Hover:** arm, climb to about 2 m, hold 30 s with sticks centred. Position mode should hold within a metre or so. | Drift, toilet-bowling, oscillation: land. |
| 2.7 | Small inputs, one axis at a time, one metre each way: forward/back, left/right, yaw 90° each way, up to 4 m and back down. Land, disarm. | |
| 2.8 | **Mode check:** climb to 3 m in Position, flip SB to Altitude, hold 10 s, back to Position. Do the same for Stabilized only if the wind is calm; it drifts. | The aircraft answers the change without a lurch. |
| 2.9 | **Return test:** fly 15 m out at 3 m, select Return from QGC. Aircraft climbs to 30 m, comes home, descends, lands, disarms after 2 s. Hands on the sticks throughout; SB back to Position takes control back at any time. | |
| 2.10 | Land and stop. Maiden flight ends here. Total under 5 minutes; the pack should still read above 60 %. | |

Do not on the maiden flight: fly a mission, fly out of easy sight, test the battery
failsafe by running the pack down, use the kill switch in the air, let a student
touch the sticks.

---

## 3. Landing and shutdown, every flight

| # | Step | Done |
|---|---|---|
| 3.1 | Land on the pad, throttle fully down, hold. Board auto-disarms 2 s after touchdown. If not, throttle down + yaw left. | ☐ |
| 3.2 | Press SD: light **off**, kill engaged. Say "killed" out loud. After 5 s of kill the board disarms itself (`COM_KILL_DISARM`). | ☐ |
| 3.3 | Battery out of the aircraft. Only now approach the props. | ☐ |
| 3.4 | Props off before the aircraft goes in a case or a student touches it. | ☐ |
| 3.5 | Pocket off last. | ☐ |
| 3.6 | Battery into the LiPo bag. Note its voltage: if it is below 14.8 V (3.7 V/cell) after a short flight, log it. Never store it full or empty; storage charge is 3.8 V/cell. | ☐ |

---

## 4. Post-flight review, same day

| # | Item | Done |
|---|---|---|
| 4.1 | Walk the airframe: props, arms, motor bells, cable ties, GPS mast, antennas. | ☐ |
| 4.2 | Pull the flight log from the SD card via QGC → Analyze → Log Download. Save it as `logs/YYYY-MM-DD-maiden.ulg`. | ☐ |
| 4.3 | Open the log in Flight Review (logs.px4.io) or QGC's log viewer. Look at: vibration (the PX4 page on log analysis gives limits), estimator warnings, battery voltage sag under hover, and any failsafe events. | ☐ |
| 4.4 | Write the flight into `build-log.md` as a session entry: site, wind, duration, pack start and end, what was flown, anything odd. Screenshots of QGC into `screenshots/` dated. | ☐ |
| 4.5 | `diff_live_against_file` against `params/2026-09-28-motors.params` once the aircraft is back on the bench. Flight should move nothing. Explain any line that did. | ☐ |
| 4.6 | Decide and log: is the aircraft ready for a student on the sticks? Only after an instructor radio arrangement exists (deferred, see HANDOFF). | ☐ |

---

## 5. Abort rules, said out loud before every flight

- Anything unexpected in the first hop: land, disarm, battery out, stop for the day.
- Losing sight of the aircraft: flip SB back to Position, centre sticks, select Return on QGC.
- Aircraft flying away and not answering sticks: Return from QGC. If it still does not answer and it is heading for people or property, PX4's own guidance is to crash it in an empty area as soon as possible: that is what the kill switch is for.
- "Low battery" from QGC at 30 %: bring it home now. At 20 % the aircraft comes home by itself; do not fight it.
- Any person or animal enters the flying area: land where it is.
