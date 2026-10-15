# Build Log

Decisions carry a D-number. D-01 through D-10 are summarised in `notes.txt` section 4;
their full entries live in the earlier build log, which is not in this folder.

---

## 2026-09-27 — Fresh start on the aircraft side

Pixhawk 6C connected to QGroundControl over USB-C for the first time in this phase.
Pi smart-package work is parked.

### D-11 — Read-only MAVLink observer for Claude Code

**Proposed and approved 2026-09-27.**

**What:** A small MCP server (`tools/qgc-readonly-mcp/`) that listens to the MAVLink
stream QGroundControl mirrors over UDP ("Enable MAVLink forwarding" in QGC's Application
Settings → MAVLink). It caches what it hears and exposes it to Claude Code as read-only
tools: connection state, AUTOPILOT_VERSION, parameter values, STATUSTEXT messages,
sensor health, and message-rate summary. It can also parse and diff `.params` files
QGC saves.

**Why:** The slow part of configuration work is a human reading QGC screens aloud and
pasting them. Letting Claude see the same stream removes that step without giving it a
hand on the aircraft.

**How this respects the section 6 rule in `notes.txt`:**

- **No serial contention.** QGC keeps the USB port. The observer only binds a local UDP
  socket that QGC sends to.
- **No write path, by construction.** The observer never calls `send` on its socket. It
  does not request parameters, does not send commands, does not arm, does not change
  modes. If QGC's forwarding turns out to be bidirectional, that changes nothing, because
  no outbound code exists. Parameter values arrive because QGC itself downloads them on
  connect; pressing Refresh in QGC's Parameters view re-sends them.
- **All writes stay with the human in QGroundControl.**

**What this does not supersede:** the rule that the flight controller is not under
agentic control. Any future proposal to add write tools must be logged as its own
D-number superseding this one.

**Superseded by nothing.**

**Implemented 2026-09-27.** `tools/qgc-readonly-mcp/server.py`, registered in `.mcp.json`.
Verified against synthetic PX4-style traffic (heartbeat, SYS_STATUS, STATUSTEXT,
PARAM_VALUE with PX4 byte-wise integers, AUTOPILOT_VERSION). Not yet verified against
the real board; that needs QGC forwarding switched on.

### First connection, bench, USB only

QGC auto-connected on USB. Board reports **Not Ready**, mode Hold. Reasons shown:
no valid position estimate, no valid global position estimate, no manual control input.
All expected indoors with no GPS lock and no RC bound. Battery indicator reads nothing
(no pack connected; PM02 unpowered). "Allow Force Arm" left off. No parameters changed.

### Baseline captured

- `params/2026-09-27-first-connect.params` — 1100 parameters, QGC header says PX4 Pro 1.16.0.
- `screenshots/2026-09-27-qgc-summary.png`, `screenshots/2026-09-27-qgc-not-ready.png`.

Summary page, as shipped: System ID 1. Airframe **Generic Quadcopter, Quadrotor x**
(`SYS_AUTOSTART=4001`), green. Sensors green, Compass 0 Ready. **Radio red**: roll/pitch/
yaw/throttle setup required, all `RC_MAP_*` at 0. **Power red**: `BAT1_N_CELLS=0`,
source Power Module, full 4.05 V / empty 3.60 V. Flight modes 1–6 unassigned. Safety:
low battery → Warning, RC loss → Return after 0.5 s, data link loss disabled, RTL climb
30 m then land. Joystick none. QGC shows "Custom Fw. Ver. 0.0.0".

Notable factory values, meaning to be confirmed against PX4 1.16 docs before relying on
them: `CBRK_IO_SAFETY=22027`, `COM_RC_IN_MODE=3`, `COM_ARM_WO_GPS=1`, `MAV_0_CONFIG=101`
with `SER_TEL1_BAUD=57600`, `GPS_1_CONFIG=201` with `SER_GPS1_BAUD=0`.

### Factory values confirmed against PX4 v1.16.0 sources (2026-09-27)

Sources: `src/lib/circuit_breaker/circuit_breaker_params.c` and
`src/modules/commander/commander_params.c` at tag v1.16.0; PX4 docs
`getting_started/px4_basic_concepts` (v1.16); Holybro Pixhawk 6C ports page.

- **`CBRK_IO_SAFETY = 22027`** — "Setting this parameter to 22027 will disable IO safety."
  22027 is also the v1.16.0 **default**. So the board ships with the safety switch disabled.
- **`COM_RC_IN_MODE = 3`** — "RC or Joystick keep first": first available stick source is
  used until reboot. Default.
- **`COM_ARM_WO_GPS = 1`** — in v1.16.0 source this is "GPS preflight check: measures taken
  when a check defined by EKF2_GPS_CHECK is failing", values 0 Deny arming / 1 Warning only /
  2 Disabled. Default 1. **Conflict noted:** the v1.16 safety docs page still describes it
  as "0 Disabled, 1 Enabled". The source is taken as authoritative for the shipped build.
- **`CBRK_BUZZER = 0`** — magic value 782097 disables notification tunes; 0 leaves the
  buzzer enabled.

### D-03 — resolved

Intent: no on-aircraft safety switch. PX4 mechanism: `CBRK_IO_SAFETY`. Board value is
already 22027 (disabled) from the factory. **No change needed.** Verify on the bench that
the board arms in QGC without a switch once radio and battery are set up.

### D-04 — reframed, decision still open

Intent: buzzer on a spare FMU PWM output (an ArduPilot idea via `NTF_BUZZ_PIN`). Under
PX4 the buzzer is not a PWM-output choice. PX4 docs: the buzzer "is usually part of the GPS
module connected to the Pixhawk GPS1 port". Holybro's Pixhawk 6C pinout lists **GPS1 pin 9
as BUZZER-** (0–5 V), alongside pins 6–7 SAFETY_SWITCH and SAFETY_SWITCH_LED.

So the question becomes: does the GPS module fitted have a buzzer? If yes, nothing to do.
If no, the documented path is a buzzer on GPS1 pin 9, not a PWM output. This depends on
the GPS identity, which is an open item in the manifest. **Not decided.** Do not wire
anything until the GPS module is identified and the Holybro pinout is confirmed on the
physical connector.

### D-11 observer verified against the real board (2026-09-27)

QGC forwarding on, observer receiving ~25 message types (ATTITUDE 100 Hz, HIGHRES_IMU 50 Hz,
SYS_STATUS 5 Hz, HEARTBEAT 2 Hz). Heartbeat: MAV_TYPE_QUADROTOR, MAV_AUTOPILOT_PX4,
disarmed, landed, custom mode decodes as AUTO:LOITER (QGC labels it "Hold").

SYS_STATUS present sensors: gyro, accel, mag, baro, XY position control (unhealthy, expected
without position). **No GPS bit present and no GPS_RAW_INT traffic.** Either the GPS module
is not connected for this bench session or the board is not detecting it. To confirm with
the human before reading anything into it.

Bench readings: baro 986 hPa, pressure altitude ~229 m, baro temperature 39 °C, vibration
negligible, accelerometer clipping 0. Board had been up ~18 min at this point.

AUTOPILOT_VERSION and PARAM_VALUE were not captured because the observer started after
QGC had already connected. Needs a USB replug so QGC re-requests both.

### Reference — Pixhawk 6C GPS ports (Holybro docs, pixhawk-6c-ports page)

| Port | Pins | Signals |
|---|---|---|
| GPS1 | 10 | VCC 5V, TX1, RX1, SCL1, SDA1, SAFETY_SWITCH, SAFETY_SWITCH_LED, IO_VDD_3V3, BUZZER-, GND |
| GPS2 | 6 | VCC 5V, UART8_TX, UART8_RX, I2C2_SCL, I2C2_SDA, GND |

Factory params: `GPS_1_CONFIG=201` (GPS1 port enabled), so the GPS is expected on the
10-pin GPS1 port. A module on the 6-pin GPS2 port will not be detected without a
parameter change, which would be a logged decision.

### D-12 — GPS on the GPS2 port until a 10-pin cable arrives

**Proposed 2026-09-27, approved by the user the same day. Temporary.**

**Situation:** the GPS module in hand has only a 6-pin cable. On the Pixhawk 6C that fits
GPS2 (6-pin), not GPS1 (10-pin). Factory `GPS_1_CONFIG=201` expects the GPS on GPS1.

**Change:** set **`GPS_1_CONFIG = 202`** ("GPS 2") in QGC, then reboot. Nothing else.

**Why `GPS_1_CONFIG` and not `GPS_2_CONFIG`:** in PX4 v1.16.0 `src/drivers/gps/module.yaml`,
`GPS_1_CONFIG` is the *Main GPS* port selector and `GPS_2_CONFIG` is the *Secondary GPS* for
dual-GPS setups. We have one GPS; we are only telling the main driver which port it is on.

**Sources, all PX4 v1.16.0 unless stated:**
- `Tools/serial/generate_config.py`: `GPS1` index 201, `GPS2` index 202.
- `boards/px4/fmu-v6c/default.px4board`: `CONFIG_BOARD_SERIAL_GPS2="/dev/ttyS6"`, so the
  port exists on this board.
- `boards/px4/fmu-v6c/src/i2c.cpp`: I2C bus 2 is declared external, so the external compass
  on the GPS2 port's I2C2 lines should be probed at boot.
- PX4 docs `peripherals/serial_configuration` (v1.16): reboot required after changing a
  port config parameter; `SER_GPS2_BAUD` will appear after reboot, default Auto.
- Holybro Pixhawk 6C ports page: GPS2 carries VCC, UART8 TX/RX, I2C2 SCL/SDA, GND only.

**Consequences while on GPS2:** no safety switch, LED or buzzer lines reach the module.
Safety switch is already disabled (D-03), so arming is unaffected. Any buzzer on the GPS
module will be silent (relevant to D-04).

**Revert:** when the 10-pin cable arrives, move the module to GPS1, set `GPS_1_CONFIG` back
to 201, reboot, save a new `.params`, and mark this decision superseded.

**Verification plan:** after reboot, observer should show a GPS bit in SYS_STATUS,
GPS_RAW_INT traffic, and a second magnetometer. Save `params/2026-09-27-gps-on-gps2.params`.

### D-12 applied and verified (2026-09-27)

User set `GPS_1_CONFIG` 201 → 202 in QGC and rebooted. Observer confirms, live vs
`2026-09-27-first-connect.params`: **only `GPS_1_CONFIG` changed.** New parameters after
reboot: `SER_GPS2_BAUD` (Auto) and the `CAL_MAG1_*` set.

Result: **GPS detected on GPS2.** 3D fix indoors within ~2 minutes, 12 satellites,
HDOP 0.96. Position withheld from this log. A second compass (Compass 1) appeared,
which is the external magnetometer on the GPS module over I2C2. It is uncalibrated,
so preflight now reports "Compass 1 uncalibrated" and "heading estimate not stable".
That is expected and is the next setup step, **after** the GPS module is mounted in its
final position on the frame, since compass calibration is only valid for that position.

Board identity from AUTOPILOT_VERSION:

| Field | Value |
|---|---|
| Flight software | 1.16.0, FIRMWARE_VERSION_TYPE_OFFICIAL |
| flight_custom_version (raw 8 bytes) | `000000579153a36e` (git hash fragment; byte order not verified) |
| OS | NuttX 11.0.0 |
| board_version | 56 (0x38) |
| vendor_id / product_id | 0x3185 / 0x0038 |
| uid | `0x3134510438353631` |
| uid2 | `00060000000038353631313451040046002b` |

QGC's "Custom Fw. Ver. 0.0.0" on the Summary page is QGC's own decoding of a vendor
version field and is not evidence of anything wrong.

Observer fix: parameter cache is now cleared when the vehicle's parameter count changes,
so pre-reboot entries no longer linger. Takes effect on the next Claude Code restart.

**Still to do for D-12:** save `params/2026-09-27-gps-on-gps2.params` from QGC.

**D-12 closed out:** `params/2026-09-27-gps-on-gps2.params` saved. Diff against
first-connect: `GPS_1_CONFIG` 201→202; `SER_GPS1_BAUD` gone; `SER_GPS2_BAUD` and
`CAL_MAG1_*` appeared. Nothing else moved.

### Frame assembly state (2026-09-27)

GPS module and Pixhawk 6C are mounted to the X500 V2 frame. Orientation of both still to
be confirmed against the PX4 X500 V2 guide ("Make sure the arrow on the GPS is pointing
forward"; flight controller arrow forward, `SENS_BOARD_ROT=0` on the board now).

### D-13 — Select the "Holybro X500 V2" airframe (PROPOSED, not yet applied)

**What:** in QGC Configure → Airframe, choose Quadrotor x → **Holybro X500 V2**
(`SYS_AUTOSTART=4019`) instead of the factory Generic Quadcopter (4001).

**Why:** the PX4 X500 V2 build guide (docs.px4.io v1.16, frames_multicopter/
holybro_x500V2_pixhawk5x) says to select this airframe. The airframe file
`ROMFS/px4fmu_common/init.d/airframes/4019_x500_v2` at v1.16.0 sets frame-specific
defaults that Generic Quadcopter does not: `IMU_GYRO_CUTOFF 30`, `MC_ROLLRATE_P 0.14`,
`MC_PITCHRATE_P 0.14`, `MC_ROLLRATE_I 0.3`, `MC_PITCHRATE_I 0.3`, `MC_ROLLRATE_D 0.004`,
`MC_PITCHRATE_D 0.004`, plus the standard quad-X rotor geometry (`CA_ROTOR_COUNT 4`,
rotor 0 at +1/+1, 1 at -1/-1, 2 at +1/-1 KM -0.05, 3 at -1/+1 KM -0.05). These are
Holybro's tuned starting gains for this exact frame and motor set.

**Risk / side effect:** applying an airframe in PX4 resets parameters to defaults before
applying the airframe values. Expect `GPS_1_CONFIG` to return to 201 and need re-setting
to 202 (D-12). Verify with an observer diff after the reboot; anything else that moves
gets logged.

**Order if approved:** airframe first, reboot, re-apply `GPS_1_CONFIG=202`, reboot, save
`params/<date>-x500v2-airframe.params`, diff, then sensor calibration.

### Setup sequence from here (PX4 X500 V2 guide order)

1. Airframe (D-13, pending decision).
2. Confirm orientation of FC and GPS arrows. Sensor orientation settings only if either is
   not arrow-forward.
3. Sensors: compass (both mags), gyro, accelerometer, level horizon. Props off. Whole frame
   is rotated during compass cal, so a long USB lead or telemetry link is needed.
4. Radio: bind receiver, RC calibration. **Blocked on receiver identity** (open item).
5. Flight modes on a switch.
6. Power: cell count, PM02 voltage/current calibration. **Blocked on battery and PM02
   variant** (open items).
7. ESC calibration and motor order/direction check. Props off, battery required.
8. Safety / failsafe review.

**D-13 approved by the user 2026-09-27.** Being applied in QGC now.

### D-13 applied and verified (2026-09-27)

`params/2026-09-27-x500v2-airframe.params` vs `2026-09-27-gps-on-gps2.params`:

| Parameter | Before | After |
|---|---|---|
| SYS_AUTOSTART | 4001 | **4019** (Holybro X500 V2) |
| IMU_GYRO_CUTOFF | 40 | 30 |
| MC_ROLLRATE_P / MC_PITCHRATE_P | 0.15 | 0.14 |
| MC_ROLLRATE_I / MC_PITCHRATE_I | 0.2 | 0.3 |
| MC_ROLLRATE_D / MC_PITCHRATE_D | 0.003 | 0.004 |
| SENS_BOARD_X_OFF | 1.885 | **0** |
| SENS_BOARD_Y_OFF | -3.153 | **0** |

The gain changes are exactly the 4019 airframe file's values. **Side effect found:** the
airframe apply zeroed `SENS_BOARD_X_OFF` / `SENS_BOARD_Y_OFF`, which were the factory
level-horizon offsets. Accel, gyro and compass calibration (`CAL_*`) survived. Level
horizon must be recalibrated in the sensors step; it was on the list anyway.

`GPS_1_CONFIG` reads 202 in the file, but the file also contains `SER_GPS1_BAUD` rather
than `SER_GPS2_BAUD`, so it was saved after re-setting the port but before the reboot.
Live board after reboot: no differences from the file, `SER_GPS2_BAUD` present, GPS
detected and healthy, 27 satellites, HDOP 0.52, estimator has horizontal position.
File to be re-saved post-reboot to capture the clean state.

Remaining preflight failures: Compass 1 uncalibrated, heading estimate not stable.
Next: sensor calibration.

`params/2026-09-27-x500v2-airframe.params` re-saved post-reboot (the pre-reboot snapshot
was replaced). Clean: `SYS_AUTOSTART=4019`, `GPS_1_CONFIG=202`, `SER_GPS2_BAUD` present,
`SER_GPS1_BAUD` gone, live board identical. **D-13 closed.**

### GPS module orientation (2026-09-27)

Pixhawk 6C arrow confirmed pointing at the nose. GPS module has no arrow, only an LED;
user is repositioning it with the board powered down, using Holybro's note that the cable
exits at the back.

From Holybro's standard M8N/M9N/M10 GPS docs (overview page): all three variants use the
**IST8310** compass; M9N and M10 have a tri-color LED; V1 and V2 housings differ in
dimensions. The pinout and dimension pages carry the details as images only, so the
cable-exit-rear convention is taken from the user's reading of the printed documentation,
not from a text source I could quote. **Exact variant (M8N / M9N / M10, V1 / V2) still
unconfirmed — read the label.**

### Compass calibration done (2026-09-27)

GPS module remounted cable-to-rear, Pixhawk arrow forward. Calibration completed with
"[cal] calibration done: mag". Board messages during cal included one transient
"Preflight Fail: Attitude failure (roll)" while the frame was being rotated; expected.

| | Internal (CAL_MAG0) | External (CAL_MAG1) |
|---|---|---|
| Device ID | 396321 | 396817 |
| Priority | **0 (disabled)** | 75 (high) |
| Rotation | -1 (auto, internal) | **10 = ROTATION_ROLL_180_YAW_90** (auto-detected) |
| Scale X/Y/Z | 0.959 / 1.017 / 1.047 | 0.985 / 1.026 / 1.006 |
| Offset X/Y/Z | -0.104 / -0.037 / -0.037 | -0.010 / 0.025 / -0.108 |

Internal compass priority 0 is PX4 behaviour, not a user action. PX4 v1.16.0
`src/modules/commander/mag_calibration.cpp`: "automatically disable the internal mags as
they should not be used for navigation" when an external mag is present.

Rotation value 10 decoded from PX4 v1.16.0 `src/lib/conversion/rotation.h`. ROLL_180 is
consistent with the IST8310 sitting on the underside of the module PCB; the YAW_90
component is chip-orientation dependent and I have no Holybro text source to confirm it is
the expected value for a cable-to-rear mount. Auto-detection makes the heading correct
either way. **To confirm physically:** heading sanity check, nose pointed at a known
bearing from a phone compass, compare to the board's reported heading.

Compass is now healthy in SYS_STATUS. "Compass 1 uncalibrated" and "heading estimate not
stable" preflight failures are gone.

### Gyro, accelerometer, level horizon done (2026-09-27)

All three reported "[cal] calibration done" on the board. Transient "Attitude failure"
preflight messages during the six-position accel routine are expected.

| | Result |
|---|---|
| Gyro offsets X/Y/Z (rad/s) | -0.0021 / 0.0020 / 0.0003 |
| Accel offsets X/Y/Z (m/s²) | 0.024 / -0.014 / 0.038, scale 1.0 / 1.0 / 1.0 as cached |
| Accel side results | back 9.844, left 9.782, right 9.810 m/s² |
| Level horizon X_OFF / Y_OFF (deg) | **1.04 / -2.48** (factory was 1.89 / -3.15, wiped by D-13, now redone) |
| SENS_BOARD_ROT | 0 (arrow forward, unchanged) |

Orientation settings not touched: FC arrow forward, external compass rotation auto-detected.

Heading sanity check pending: board reports 182° with the frame at rest; to be compared
with a phone-compass bearing of the nose.

`params/2026-09-27-calibrated.params` saved. Diff vs `x500v2-airframe`: only `CAL_ACC0_*`,
`CAL_ACC1_*`, `CAL_MAG0_*`, `CAL_MAG1_*`, `SENS_BOARD_X/Y_OFF` and `EKF2_MAG_DECL` moved.
Nothing else. Notes:

- Board has two accelerometers (ACC0, ACC1), consistent with the Pixhawk 6C's dual IMU.
  Both recalibrated. ACC1 scale factors went from factory ~1.003/1.010/0.999 to exactly
  1.0; offsets are all under 0.04 m/s². Six-side results were 9.78–9.84 m/s² against
  g ≈ 9.81, so residual error is well under 1 %. Acceptable; not investigated further.
- `EKF2_MAG_DECL` auto-set to -5.21°, which is a plausible magnetic declination for the
  GPS-reported location. Set by PX4 from GPS, not by hand.

### Heading sanity check — PASSED (2026-09-27)

Frame at rest, nose bearing by phone compass ≈ 179–180°. Board heading 182–184° over the
same period. Agreement within phone-compass tolerance. **Auto-detected external compass
rotation (10, ROLL_180_YAW_90) confirmed correct for the cable-to-rear mount.** Open
question on the YAW_90 component is closed by measurement.

### Sensor setup complete. State at end of 2026-09-27

Done: airframe X500 V2 (D-13), GPS on GPS2 (D-12, temporary), compass, gyro, accel,
level horizon, heading verified. Baseline file: `params/2026-09-27-calibrated.params`.

Remaining red items in QGC Summary: **Radio** and **Power**. Both blocked on hardware
identity: receiver model, battery, PM02 variant. Then flight modes, ESC/motor check, safety.

Session closed 2026-09-27. `HANDOFF.md` written as the next-session entry point;
`CLAUDE.md` updated to match. Parameters persist on the board across power cycles;
`params/2026-09-27-calibrated.params` is the restore point if they ever do not.

**D-12 status change, 2026-09-27:** user reports no 10-pin GPS cable is coming for a
while. GPS on the GPS2 port is therefore the standing configuration, not a stopgap.
Consequences unchanged: safety switch lines unused (already disabled, D-03), buzzer line
unused (D-04 still open). Student documentation should describe GPS2 as the build.

**2026-09-27, late:** a second Claude Code session was started in this folder while the
first was still open. Both observers bound UDP 14445 (pymavlink sets SO_REUSEADDR) and only
the first received; the second reported zero bytes and diagnosed a missing vehicle. Fix:
observer now probes the port without REUSEADDR at start and reports a clash in
`recent_errors`. Rule added to HANDOFF.md and CLAUDE.md: one session per folder.

### Session start check (2026-09-27, evening)

Board reconnected over USB (Windows enumerated it as `USB Serial Device (COM3)`,
Holybro VID 3185). Observer initially saw zero bytes because a prior Claude Code session
still held UDP 14445; closing it fixed the starve (rule now in `CLAUDE.md`). Parameter
cache was empty until Refresh in QGC's Parameters view; observer then counted 1117
received against 1116 expected.

`diff_live_against_file` vs `params/2026-09-27-calibrated.params`: **no changed values,
nothing missing.** Only extra live item is `_HASH_CHECK`, PX4's parameter-hash
pseudo-parameter that QGC uses to verify its cache and never writes to a `.params` file.
Board state unchanged since last session. Baseline stands.

### D-14 — RC link: RadioMaster RP4TD outputs SBUS into the PPM/SBUS RC port (APPROVED 2026-09-27; BUILT AND VERIFIED 2026-09-28, protocol = SBUS, see session 2026-09-28)

**Hardware identified 2026-09-27 (user, from labels):** RadioMaster Pocket 2.4 GHz
ExpressLRS, Mode 2; RadioMaster RP4TD ExpressLRS 2.4 GHz true-diversity receiver; two
receiver antennas; JST-GH 1.25 mm pre-crimped connector kit.

**Problem.** The earlier plan (user's notes) was: RP4TD on a full Pixhawk UART using
CRSF, 5V-5V, GND-GND, Pixhawk TX to RP4TD RX, Pixhawk RX to RP4TD TX, CTS/RTS unused.
The wiring is electrically correct for TELEM1/TELEM2 (Holybro 6C pinout: pin 1 VCC 5V,
2 TX, 3 RX, 4 CTS, 5 RTS, 6 GND) and matches the PX4 CRSF page's TX-to-RX crossover.
But CRSF is not in the factory firmware:

- PX4 v1.16 docs, "CRSF Telemetry": "PX4 does not include the CRSF protocol support by
  default"; it requires a custom build with `crsf_rc` and the port set by `RC_CRSF_PRT_CFG`.
  https://docs.px4.io/v1.16/en/telemetry/crsf_telemetry
- `RC_CRSF_PRT_CFG` is absent from the 1116 parameters on the board (live list and
  `params/2026-09-27-calibrated.params`). A driver that is not compiled in has no parameter.
- Same page: "The RC IN port cannot be used" for CRSF.

Conclusion: the CRSF plan is an ArduPilot-era assumption (ArduPilot supports CRSF on any
UART stock). Decision "RP4TD is the receiver" stands; the protocol must change.

**Options.**
1. RP4TD set to SBUS output, wired to the 6C's dedicated PPM/SBUS RC port. No reflash.
   Loses telemetry to the Pocket's screen (ExpressLRS docs: SBUS "only have control
   packets and does not have Flight Controller Telemetry"). Control and range unaffected.
2. Custom PX4 build with `crsf_rc`. Full CRSF with telemetry; breaks the standing
   "factory v1.16.0, no reflash" rule and adds a firmware build to the student procedure.

**Proposal: option 1.** Reason: keeps the firmware rule, uses the port Holybro and PX4
document for exactly this, and needs no PX4 parameter change for the link itself.

**Sources.**
- Holybro Pixhawk 6C ports page, "PPM/SBUS RC": pin 1 VDD_5V_PPM_SBUS (+5V), pin 2
  PPM&SBUS_IN (+3.3V), pin 3 RSSI_IN (+3.3V), pin 4 not connected, pin 5 GND.
  https://docs.holybro.com/autopilot/pixhawk-6c/pixhawk-6c-ports
- Holybro 6C technical spec: "Dedicated R/C input for Spektrum / DSM and S.BUS, CPPM,
  analog / PWM RSSI"; IO processor STM32F103.
- PX4 v1.16 Pixhawk 6C quick start: "PPM or SBUS receivers connect to the PPM/SBUS
  input port." https://docs.px4.io/v1.16/en/assembly/quick_start_pixhawk6c
- PX4 v1.16 RC systems page: "PPM-Sum and S.BUS receivers must connect directly to the
  RC ground, power and signal pins."
  https://docs.px4.io/v1.16/en/getting_started/rc_transmitter_receiver
- ExpressLRS "Receiver Serial Protocols": options include "SBUS + Inverted"; selected in
  the receiver WebUI (Model tab, Serial Protocol) or the ELRS Lua script (Other Devices,
  Protocol). https://www.expresslrs.org/software/serial-protocols/
- ExpressLRS "Receiver Wiring": pads GND/G, VCC/5, TX, RX; "The TX or T pad should be
  connected to an RX pad" of the FC. https://www.expresslrs.org/quick-start/receivers/wiring-up/
- RadioMaster RP4TD manual (via manuals.plus / manualslib mirrors): input 4.5–12.4 V,
  output protocol CRSF, pads 5V / G / TX / RX, ships with "1x CRSF wire".

**Wiring (proposed).**

| RP4TD pad | Pixhawk 6C PPM/SBUS RC pin | Note |
|---|---|---|
| 5V | 1 VDD_5V_PPM_SBUS | receiver accepts 4.5–12.4 V |
| G | 5 GND | |
| TX | 2 PPM&SBUS_IN | serial output pad; SBUS is one-way |
| RX | not connected | no data goes to the receiver |
| – | 3 RSSI_IN, 4 NC | unused |

**Not yet verified, must be checked physically before plugging in:**
- Connector type and pin count of the 6C's PPM/SBUS RC socket. Holybro's text pages do
  not state it. Check the socket and whatever RC cable came in the Pixhawk box against
  the JST-GH kit. Do not force a connector.
- Pad order on the RP4TD: the manual names 5V, G, TX, RX but gives no diagram in text.
  Read the silkscreen.
- Which ExpressLRS SBUS variant the 6C expects. The official ExpressLRS page lists
  "SBUS + Inverted" without guidance. A secondary source (Oscar Liang, quoting older ELRS
  text) says a board with a dedicated SBUS pad and inverter should use "Inverted SBUS".
  Official and secondary sources therefore do not settle it. Plan: try "Inverted SBUS"
  first; if QGC's Radio page shows no channel movement, switch to "SBUS". Both are
  receiver-side settings and harmless either way; a wrong pick gives no signal, not damage.

**PX4 parameters.** None for the link. SBUS on the 6C's RC port is handled by the IO
processor and needs no port parameter; `RC_INPUT_PROTO` does not exist on this board
(checked baseline). QGC's Radio calibration will then write `RC_MAP_*`, `RCn_MIN/MAX/
TRIM/REV/DZ` and `RC_CHAN_CNT`; those get diffed and explained after calibration.

**Revert.** Unplug from the RC port; set the RP4TD protocol back to CRSF. No PX4
parameter to undo until calibration has run.

**Consequence to record in student docs.** No telemetry on the Pocket's screen. Battery
and link data come from QGC on the laptop.

Status: proposed. Waiting for the user's decision.

#### D-14 hardware facts verified on the bench (2026-09-27)

- RP4TD board marked `rp4td_v1.2`. Its lead has four labelled wires: **red +, black −,
  blue TX, green RX**. This is the receiver's own labelling, so wire colours here are
  authoritative for the receiver end.
- The client had terminated that lead in a **6-pin JST-GH head for a TELEM port** (the
  CRSF-on-TELEM plan). User's count: black pos 1, yellow pos 4, blue pos 5, red pos 6.
  Against Holybro's TELEM pinout (1 = 5V, 6 = GND) that is reversed power, or a miscount
  from the wrong end. Either way: **do not plug that head into any TELEM port.** Head to
  be replaced, not reused as-is.
- **PPM/SBUS RC socket counted on the board: 5 positions.** Matches Holybro's table
  (1 VDD_5V_PPM_SBUS, 2 PPM&SBUS_IN, 3 RSSI_IN, 4 NC, 5 GND). Housing: 5-position JST-GH
  1.25 mm from the pre-crimped kit.
- Firmware alternatives discussed with the user and declined for now: ArduCopter (reverses
  D-01/D-02 and the PX4 rule, redoes all of today's calibration) and a custom PX4 build
  with `crsf_rc` (toolchain setup, unknown interaction with the 6C's IO processor, loses
  the official build). SBUS on the RC port chosen. **D-14 approved by the user.**

**Final build spec.**

| RC socket position | Signal | RP4TD wire |
|---|---|---|
| 1 | 5V | red + |
| 2 | SBUS in | blue TX |
| 3 | RSSI | empty |
| 4 | NC | empty |
| 5 | GND | black − |

Green RX: not connected, taped off. Position 1 is at the keyed/latched end of the JST-GH
housing and socket; confirm by matching the empty housing to the socket, not by wire
colour. Ring out red→1, black→5, blue→2, open on 3 and 4 with a multimeter before the
head goes near a powered board.

Also on hand: an "HM30" video/data link (brand not yet read). Separate scope decision,
would take TELEM1 (already MAV_0_CONFIG=101 at factory). Parked until the radio works.

### D-15 — SIYI HM30 air unit on TELEM1, ground unit to the laptop (APPROVED 2026-09-28, on hold: ground unit supply)

**Hardware identified 2026-09-27 (user):** SIYI HM30 "complete telem package". The 6-pin
JST-GH lead the user first described (black / yellow / blue / red) is the HM30's Pixhawk
telemetry cable, not the RP4TD's. Counted with Holybro's pin 1 at the far right: red 1,
blue 2, yellow 3, empty 4–5, black 6.

**Scope note.** `notes.txt` lists "whether the HM30 is still in scope" as open. Plugging
the air unit into the aircraft is therefore a scope decision for the client, not only a
wiring step. This entry documents what is required so the decision can be made.

**What the HM30 does here.** Air unit carries MAVLink from the Pixhawk to the ground
unit over the 2.4 GHz link; the ground unit hands it to the laptop, so QGC works at range
instead of over USB. It also carries video from an IP camera (not wired yet; the notes'
"8-pin-to-RJ45 adapter cables" belong to that side). It does not replace the RP4TD for
stick control.

**Sources.**
- SIYI HM30 User Manual v1.3 (PDF, premium-modellbau mirror; siyi.biz v1.6 returned 403
  to direct download but its text matched via WebFetch). Kept in this session's
  scratchpad; recommend saving a copy under `docs/` in this folder.
  - §1.2.4 "Ports on HM30 Air Unit", interface diagram: **Link port pins: NC, GND, TX,
    RX.** No 5V pin. Air unit power: XT30, "11 ~ 16.8 V".
  - §1.3: "Datalink (to FC): UART (GH1.25 4-Pin)"; supported FC "Open-Source FC Pixhawk
    or APM ... any other flight controllers with UART datalink output".
  - §1.4 Packing list: "1 x PIX Telemetry Cable".
  - §3.1.5: datalink baud rates 9600 / 38400 / 57600 / 115200 / 230400, set on the
    ground unit OLED menu; changing it changes both ground and air unit UART baud.
  - §3.1.4 / §4: ground unit datalink output modes Bluetooth, Type-C, UART, UDP.
    §4.4: Type-C mode, "the windows device will recognize HM30 ground unit as a COM
    device"; GCS selects the COM port and baud. §4.2: UDP mode, laptop IP
    192.168.144.20, QGC UDP link port 19856, server 192.168.144.12.
  - §4.5: "If it is a DIY telemetry cable, please check: if the correct pin map is
    followed? If the TX pins go to the RX pins?"
  - §1.2.3 ground unit ports diagram: UART "RX, TX, Gnd, 5V 500 mA"; PWR "7 ~ 16.8 V".
- Holybro Pixhawk 6C ports page, TELEM1 (UART7): 1 VCC 5V, 2 TX, 3 RX, 4 CTS, 5 RTS,
  6 GND. https://docs.holybro.com/autopilot/pixhawk-6c/pixhawk-6c-ports
- PX4 v1.16 serial port configuration: TELEM1 preconfigured as a MAVLink port, 57600,
  mode Normal. https://docs.px4.io/v1.16/en/peripherals/serial_configuration
- PX4 v1.16.0 `src/modules/mavlink/module.yaml`: `MAV_0_CONFIG` default TEL1;
  `MAV_0_RATE` default 1200 B/s; `MAV_0_FLOW_CTRL` "0: Force off, 1: Force on,
  2: Auto-detected", "By default it is auto detected".
- PX4 v1.16 telemetry overview: "any radio with a UART interface should work".

**Board state (baseline `2026-09-27-calibrated.params`):** `MAV_0_CONFIG=101` (TELEM1),
`MAV_0_MODE=0` (Normal), `MAV_0_RATE=1200`, `MAV_0_FLOW_CTRL=2` (auto),
`MAV_0_FORWARD=1`, `MAV_0_RADIO_CTL=1`, `SER_TEL1_BAUD=57600`. **No PX4 parameter change
is required** if the HM30 datalink baud is set to 57600. CTS/RTS are unconnected on the
SIYI cable; flow control is auto-detected and will settle off.

**Cable check, pin by pin (proposed; do with a meter before plugging in).**

| Pixhawk TELEM1 pin | Signal | Cable wire | SIYI Link pin it must land on |
|---|---|---|---|
| 1 | VCC 5V | red | **NC** (must have no continuity to GND or any other pin) |
| 2 | UART7 TX (out) | blue | RX |
| 3 | UART7 RX (in) | yellow | TX |
| 4, 5 | CTS, RTS | none | – |
| 6 | GND | black | GND |

The red wire is the one to watch: the Pixhawk puts 5V on it, and it must go nowhere
on the air unit. The air unit is powered only from its XT30 (11–16.8 V), never from
the Pixhawk. If red shows continuity to anything at the SIYI end, stop.

**Ground unit to laptop (proposed): Type-C mode.** Set Datalink Mode = Type-C and
Datalink Baud = 57600 on the ground unit OLED. Connect Type-C to the laptop; Windows
enumerates a COM port. In QGC, Application Settings → Comm Links → Add, type Serial,
that COM port, 57600. Per SIYI, leave "Automatically Connect on Start" unchecked until
the link is proven. UDP mode over the LAN cable is the alternative if the COM device
does not appear.

**Interaction with the rest of the setup.** The observer keeps working unchanged: QGC
forwards whatever link it has. While the Pixhawk is still on USB, QGC will hold two
links to the same vehicle; that is normal in QGC but the USB link should be the one
used for parameter work. The HM30 SBUS/PWM outputs are not used; the RP4TD (D-14) is
the RC receiver.

**Revert.** Unplug the air unit from TELEM1. No parameter to undo.

**Prerequisites before this is plugged in.** (1) Client confirms the HM30 is in scope.
(2) The cable check above passes. (3) A battery or bench supply for the air unit's XT30
in the 11–16.8 V range, which ties into the still-open battery identity item.

Status: **approved by the client 2026-09-28** (verbal, relayed by the user during the
session). Scope question in `notes.txt` is closed: the HM30 is in scope. The "not before
D-14" ordering was relaxed the same day because two people were available: the client
builds the D-14 receiver head while the user prepares the HM30. The prerequisites (2)
cable check and (3) 11–16.8 V supply for the air unit still apply and are not yet done.

### Session closed 2026-09-28 (early hours)

Nothing was wired, bound or calibrated this session. Outcomes: board verified identical to
baseline; radio and video-link hardware identified; D-14 written and approved (RP4TD on
SBUS into PPM/SBUS RC, build spec above); D-15 written and proposed (SIYI HM30 on TELEM1,
pending client scope decision). SIYI manual v1.3 and port diagrams saved in `docs/`.
`HANDOFF.md` and `CLAUDE.md` updated. Next session starts with the receiver head build in
`HANDOFF.md` step 1. Baseline remains `params/2026-09-27-calibrated.params`.

### Session 2026-09-28 (daytime)

- Session-start check: `diff_live_against_file` against `params/2026-09-27-calibrated.params`
  showed no changes (`_HASH_CHECK` only). Board reset by the user mid-session; re-diffed
  after the reboot, still identical. Baseline unchanged.
- QGC map showed no vehicle icon. Cause: indoors, GPS fix none, 0 satellites. The
  GPS_RAW_INT stream was updating continuously, which PX4 only sends when the GPS driver
  publishes, so the module on GPS2 is alive; it just has no sky view. No action.
- No RC_CHANNELS traffic from the board, as expected with no receiver connected yet.
- **D-15 approved by the client** (see status line under D-15). Client is building the
  D-14 receiver head; user is preparing the HM30 wiring per the D-15 cable check.
  Confirmed the user's 6-pin head matches the D-15 table: red 1, blue 2, yellow 3,
  empty 4–5, black 6.
- User ran the D-15 cable check with the meter and reported it passed ("pins are good").
- **Battery identified (label read by the user):** Ovonic 5200 mAh, 130C, **4S1P, 14.8 V
  nominal** (16.8 V full). Label energy read as "7.69 Wh"; 5200 mAh × 14.8 V = 76.96 Wh,
  so treat the label as 77 Wh. Closes the battery-identity item; PM02 variant still unread.
- Air unit supply decision: XT30 fed from the aircraft power board at pack voltage. 4S
  full charge 16.8 V is the top of SIYI's 11–16.8 V range, in spec. A 6S pack would not
  be. Props off whenever the battery is connected on the bench.
- HM30 ground unit power: it runs from an NP-F series battery on its back or from the PWR
  XT30 (7–16.8 V). The kit supplied only a bare tinned XT30 pigtail and no NP-F battery,
  so the ground unit cannot be powered yet. Client is sourcing a 7–16.8 V DC supply
  (a 9 or 12 V DC adapter, at least 1 A). Manual (v1.3 §3.1.5) also says the datalink
  baud must be set while the air unit is linked, so the HM30 order is: air unit powered
  and paired first, then baud 57600 on the ground unit, then Type-C to the laptop.
  **HM30 on hold pending the supply.** The TELEM1 head is not yet plugged in.
- **D-14 built and working.** Client built the receiver head and wired the RP4TD into
  the PPM/SBUS RC socket. Model on the Pocket: "FPV Drone", Internal RF CRSF. Receiver
  was put into bind mode by three power cycles from the aircraft battery, then bound from
  the Pocket's ExpressLRS script (Bind); LED solid. With the RP4TD protocol set to
  **Inverted SBUS** the board reported no RC_CHANNELS at all. Changed to **SBUS** and
  QGC's Radio page responded immediately; the board then streamed RC_CHANNELS with
  chancount 18, RSSI 41, sticks reading ~1048 / 1937 / 983 / 1494 on channels 1–4.
  **Answer to the D-14 open question: RP4TD Protocol = SBUS (not Inverted SBUS) for the
  Pixhawk 6C PPM/SBUS RC port.** No PX4 parameter was changed to get here.
  The Pixhawk was run from the aircraft battery (via power module) and USB together
  during this, props off; Holybro rates the 6C for both inputs at once.
  Pocket model "FPV Drone", Mode 2, throttle non-centering (box left unticked).
- **Radio calibration done in QGC.** `diff_live_against_file` against
  `2026-09-27-calibrated.params`: 15 parameters moved, all `RC_*`, nothing else.
  Explanation of every line:

  | Parameter | Was | Now | Why |
  |---|---|---|---|
  | `RC_MAP_ROLL` / `PITCH` / `THROTTLE` / `YAW` | 0 | 1 / 2 / 3 / 4 | Stick-to-channel assignment learned during calibration. AETR order, EdgeTX default. |
  | `RC_CHAN_CNT` | 0 | 18 | Channels the receiver sends (SBUS, 16 + 2 digital). |
  | `RC1_TRIM`, `RC2_TRIM`, `RC4_TRIM` | 1500 | 1494 | Measured stick centres for roll, pitch, yaw. |
  | `RC3_TRIM` | 1500 | 1000 | Throttle rests at the bottom; correct for a non-centering throttle. |
  | `RC5_MAX`, `RC8_MAX`, `RC9_MAX` | 2000 | 1994 | Switches that were toggled during calibration; measured top of travel. |
  | `RC5_TRIM`, `RC8_TRIM`, `RC9_TRIM` | 1500 | 1497 | Measured mid-point for the same three channels. |

  All `RC*_MIN` stayed 1000, all `RC*_MAX` on channels 1–4 stayed 2000, no `RC*_REV`
  changed (no reversed channels). Channels 6, 7 and 10–18 kept defaults because they
  were not moved during calibration; harmless, they are unassigned. No flight-mode,
  kill or arm switch is mapped yet (`RC_MAP_FLTMODE`, `RC_MAP_MODE_SW`,
  `RC_MAP_KILL_SW`, `RC_MAP_ARM_SW` all 0); that is the next work item. Live stick
  readings after calibration: ch1 1494, ch2 1494, ch3 983, ch4 1494.
- Snapshot saved from QGC (user saved it as `2026-09-27-x500v2-RC-calibrated.params`;
  renamed to **`params/2026-09-28-radio.params`** for the date convention). Verified
  identical to the live board (`_HASH_CHECK` only). **New baseline.**
- **D-14 status: BUILT AND VERIFIED.** Remaining under D-14: switch assignments
  (flight mode, kill switch) and the RC-loss failsafe review.
- **Pocket switch-to-channel map, measured from the board's RC_CHANNELS stream** (user
  flipped each control on the "FPV Drone" model, Claude read the live values; no QGC):

  | Control | Channel | Type | Values seen (rest → moved) |
  |---|---|---|---|
  | SA | 5 | 2-position | 1994 → 993 |
  | SB | 6 | 3-position | 1994 / 1497 / 993 |
  | SC | 7 | 3-position | 1994 / 1497 / 993 |
  | SD | 8 | 2-position | 1994 → 993 |
  | SE | 9 | momentary button | 993 at rest, 1994 while held |
  | S1 | 10 | knob | 1497 centred, 993 turned one way |

  "Rest" is the position each switch was in when the session started; which physical
  direction that is (toward or away from the pilot) was not recorded and must be
  checked before the kill-switch polarity is set (see D-16).

### D-16 — Switch assignments on the Pocket (PROPOSED, awaiting decision)

**Sources (PX4 v1.16.0 tag, quoted from the source tree):**
- `src/modules/rc_update/params.c`: `RC_MAP_FLTMODE` "Single channel flight mode
  selection. If this parameter is non-zero, flight modes are only selected by this
  channel and are assigned to six slots." 0 = Unassigned, 1–18 = channel. Default 0.
  `RC_MAP_KILL_SW` "Emergency Kill switch channel", 0–18, default 0.
  `RC_KILLSWITCH_TH` "Threshold for the kill switch. 0-1 indicate where in the full
  channel range the threshold sits; sign indicates polarity: positive = true when
  channel > th, negative = true when channel < th." Default 0.75.
  `RC_MAP_ARM_SW` "Arm switch channel. Use it to arm/disarm via switch instead of
  default throttle stick. If this is assigned, arming and disarming via stick is
  disabled." Default 0. `RC_ARMSWITCH_TH` default 0.75. `RC_MAP_RETURN_SW` /
  `RC_RETURN_TH` (0.75) exist for a return switch.
- `src/modules/commander/module.yaml`: `COM_FLTMODE1`..`COM_FLTMODE6` "Mode slot N. If
  the main switch channel is in this range the selected flight mode will be applied."
  Default -1 (Unassigned). Values: 0 Manual, 1 Altitude, 2 Position, 9 Position Slow,
  3 Mission, 4 Hold, 10 Takeoff, 11 Land, 5 Return, 6 Acro, 7 Offboard, 8 Stabilized,
  12 Follow Me, 13 Precision Land, 100–107 External.
  `COM_ARM_SWISBTN` "Arm switch is a momentary button", default 0.
  `COM_KILL_DISARM` "Timeout value for disarming when kill switch is engaged", 5 s.
- PX4 v1.16 Flight Mode Configuration page: QGC → Vehicle Setup → Flight Modes lets
  you pick the Mode channel and fill up to 6 slots; moving the switch highlights the
  slot it lands in. Kill, Return and Offboard switches are assigned on the same page.
  https://docs.px4.io/v1.16/en/config/flight_mode
- PX4 v1.16 multicopter flight modes page: Position (needs GPS), Altitude (no GPS,
  drifts), Stabilized (levels only) are the modes listed for beginners.

**Board state now:** `RC_MAP_FLTMODE=0`, `COM_FLTMODE1..6=-1`, `RC_MAP_KILL_SW=0`,
`RC_MAP_ARM_SW=0`, `RC_MAP_RETURN_SW=0`, `RC_KILLSWITCH_TH=0.75`. Arming is by stick
gesture (PX4 default: throttle low, yaw right, hold).

**Proposal.**

| Control | Channel | Assignment | Parameters expected to move |
|---|---|---|---|
| SB (3-pos) | 6 | **Flight mode switch.** Position / Altitude / Stabilized across the three positions. | `RC_MAP_FLTMODE=6`; three of `COM_FLTMODE1..6` set to 2 / 1 / 8 in whichever slots QGC highlights for the three positions (a 3-pos switch lands in slots 1, 3 or 4, and 6). |
| SD (2-pos) | 8 | **Kill switch.** | `RC_MAP_KILL_SW=8`. `RC_KILLSWITCH_TH` stays +0.75 (kill when high) **only if** SD's normal flying position reads low (993); if the normal position reads high, either flip the convention physically or set `RC_KILLSWITCH_TH=-0.75`. Decide after the physical check. |
| SA (2-pos) | 5 | Unassigned for now. Option: arm switch (`RC_MAP_ARM_SW=5`), which disables stick arming. **Recommendation: leave stick arming**, the PX4 default, fewer parameters, and a gesture cannot be bumped; the kill switch is the emergency stop. Client's call. | none, or `RC_MAP_ARM_SW=5` |
| SC (3-pos) | 7 | Unassigned. Candidate for a Return switch later. | none |
| SE (momentary) | 9 | Unassigned. | none |
| S1 (knob) | 10 | Unassigned. | none |

**Reason.** SB is the largest 3-position switch and gives the three beginner modes on
one control. Position mode is the safest hover with GPS; Altitude keeps height without
GPS; Stabilized is the fallback that never refuses to engage. PX4 refuses a mode it
cannot fly (no GPS → Position) and stays in the previous mode with a warning, so a
child cannot select something the aircraft cannot do. Kill on a plain 2-position
toggle so an instructor can stop the motors in one movement. Momentary SE and the knob
are not suitable for any safety function.

**Order of modes on SB (decided by the client 2026-09-28):** the position SB was in at
the time (channel 6 reading **1994, high**) = **Position**; middle (1497) = **Altitude**;
other end (993, low) = **Stabilized**. In words: **SB tilted toward the front face of the
Pocket = Position; SB centred = Altitude; SB tilted back = Stabilized.** Arming stays by
stick gesture (client confirmed).

**Kill switch polarity (decided 2026-09-28).** SD on the Pocket is a latching push
button with a green LED. Pressed in with the **LED on** = channel 8 reads 993 (low) =
**normal flying**. Released, **LED off** = channel 8 reads 1994 (high) = **KILL**.
This matches the default `RC_KILLSWITCH_TH=+0.75` (kill when high), so the threshold is
not changed. To verify after assignment: (a) LED off → board reports kill engaged and
refuses to arm; (b) LED on → no kill message; (c) power-cycle the Pocket and read
channel 8 to learn the boot state of SD; record it here. If the boot state is LED off,
the aircraft cannot arm after a radio power-up until SD is pressed, which is acceptable
and must be taught.

**Kill switch polarity check (before assigning).** Put SD in the position that will be
"normal flying" and read channel 8 on the board. It must read ~993 for the default
threshold to be safe. Verification after assignment: with SD in the kill position the
board must send "Kill-switch engaged" (STATUSTEXT) and refuse to arm; in the normal
position it must not.

**Revert.** `RC_MAP_FLTMODE=0`, `COM_FLTMODEx=-1`, `RC_MAP_KILL_SW=0`,
`RC_KILLSWITCH_TH=0.75`, `RC_MAP_ARM_SW=0`. No hardware change.

**How it is applied.** In QGC only: Configure → Flight Modes. Mode channel = Channel 6;
fill the highlighted slots; Kill switch = Channel 8. Then diff against
`params/2026-09-28-radio.params` and explain every line; save
`params/2026-09-28-switches.params`.

Status: **approved 2026-09-28** (client via user). Applying in QGC.

**Applied 2026-09-28.** Diff against `2026-09-28-radio.params`: exactly five lines,
`RC_MAP_FLTMODE=6`, `COM_FLTMODE6=2` (Position, slot 6 = SB toward the pilot),
`COM_FLTMODE4=1` (Altitude, slot 4 = SB middle), `COM_FLTMODE1=8` (Stabilized, slot 1 =
SB back), `RC_MAP_KILL_SW=8`. Nothing else moved.

**Kill polarity correction.** The earlier note that "LED on = 993" was wrong; the button
had been toggled between observations. Verified twice from the board after assignment:
**SD LED on → channel 8 = 1994 (high) → board reports "Preflight Fail: Kill switch
engaged" and "Flight termination active"**; **SD LED off → channel 8 = 993 (low) →
board reports "Kill disengaged"** and the termination message clears. So with the
default `RC_KILLSWITCH_TH=+0.75`, **LED on = KILL**, LED off = flying. Recommendation
to the client: set **`RC_KILLSWITCH_TH=-0.75`** so that LED on = flying, LED off =
KILL (source: rc_update `params.c`, "negative: true when channel < th"). Awaiting the
client's decision; either way the outcome is recorded here and taught.

**Client approved the flip.** User set `RC_KILLSWITCH_TH=-0.75` in QGC Parameters
(Radio Switches group). Verified from the board both ways: **SD LED on → channel 8 =
1994 → no kill message**; **SD LED off → channel 8 = 993 → "Preflight Fail: Kill switch
engaged" + "Flight termination active"**. **Taught rule: green light on SD = motors
allowed; green light off = KILL.** The "Flight termination active" preflight line
appears and clears together with the kill message; it is how PX4's failsafe reports the
kill state, not a separate fault.

**Flight-mode switch verified from the board's HEARTBEAT:** SB toward the pilot →
POSCTL (Position); SB middle → ALTCTL (Altitude); SB back → STABILIZED. All three
positions confirmed live.

**SD boot state:** Pocket powered off and on with SD untouched; LED came up **on**,
channel 8 = 1994, board reported no kill. **After a radio power-up the aircraft is in
the flying (not killed) state.** The kill switch is therefore not a power-on guard;
the stick-arming gesture remains the guard against unintended motor start. Teaching
rule: instructor presses SD (light off = kill) before handing the Pocket to a student,
and presses it again (light on) only when ready to arm.

**Client concern raised 2026-09-28 (open).** SD is a push button on the top face of the
Pocket; an accidental press in flight kills the motors and drops the aircraft. The
client considers stick disarm (always deliberate) the safer route. Noted in reply:
PX4 will not stick-disarm in the air in the assisted modes, so without a kill switch
there is no RC-side stop for a runaway; QGC's Emergency Stop remains as a laptop-side
backstop. Options if the concern stands: revert (`RC_MAP_KILL_SW=0`,
`RC_KILLSWITCH_TH=0.75`) or move the kill to a deliberate toggle (SA ch5 or SC ch7).
**Preferred direction: an instructor (trainer / buddy-box) radio**, which makes the
student radio's switches moot. Needs research: whether the Pocket supports a trainer
link (jack or wireless) per RadioMaster / EdgeTX docs, and which radio becomes the
instructor unit. **Client decision 2026-09-28 (later the same day): the kill switch stays on SD as
configured.** The instructor (trainer) radio and the HM30 are each deferred to their own
later session. D-16 is closed.

**Snapshot saved:** `params/2026-09-28-switches.params` (saved by the user as
`2026-09-28-switch-test.params`, renamed). Verified identical to the live board.
**New baseline.** Diff from `2026-09-28-radio.params` is the six lines of D-16:
`RC_MAP_FLTMODE=6`, `COM_FLTMODE1=8`, `COM_FLTMODE4=1`, `COM_FLTMODE6=2`,
`RC_MAP_KILL_SW=8`, `RC_KILLSWITCH_TH=-0.75`.

### D-17 — Holybro SiK 915 MHz telemetry radio on TELEM1; HM30 shelved for now (APPROVED 2026-09-28 by the client, not yet plugged in)

**Decision (client, 2026-09-28).** The SIYI HM30 (D-15) is set aside until its ground
unit has a power supply. In its place a **Holybro SiK telemetry radio, 915 MHz**, goes
on **TELEM1**; the ground radio connects to the laptop over USB. D-15 stays approved
and on hold; its TELEM1 head must **not** be plugged in while the SiK radio occupies
TELEM1.

**Sources.**
- PX4 v1.16 SiK Radio page: "The vehicle-based radio is connected to the
  flight-controller's TELEM1 port, and typically requires no further configuration."
  "The ground station-based radio is connected via USB (essentially plug-n-play)."
  https://docs.px4.io/v1.16/en/telemetry/sik_radio
- Holybro SiK Telemetry Radio V3 page: serial "57.6 (default)" kbps, air rate "64
  (default)" kbps; 100 mW and 500 mW models: 5 V input, **Micro-USB** ground unit;
  1 W model: "7~28V" input, Type-C ground unit; 6-position JST-GH connector.
  https://docs.holybro.com/radio/sik-telemetry-radio-v3
  The Holybro page's pinout table could not be fetched as text this session; the
  connection relies on the **Holybro-supplied 6-pin JST-GH cable** between a Holybro
  radio and a Holybro Pixhawk 6C TELEM1, i.e. the manufacturer's intended pairing.
  If any other cable is used it must be rung out against the Pixhawk 6C TELEM1 pinout
  (1 VCC, 2 TX, 3 RX, 4 CTS, 5 RTS, 6 GND) first.

**Board state:** TELEM1 is already a MAVLink port at 57600 (`MAV_0_CONFIG=101`,
`SER_TEL1_BAUD=57600`, `MAV_0_MODE=0`), matching the radio's default serial rate.
**No PX4 parameter change expected.** Diff after plug-in must show none.

**Power.** The 100 mW / 500 mW radios take 5 V from the TELEM1 port; that is their
design, unlike the HM30. The 1 W radio needs its own 7–28 V supply. **Variant read by the user 2026-09-28: 100 mW**,
so 5 V from TELEM1, Micro-USB ground unit.

**Procedure.** Pixhawk fully off (battery and USB out). Air radio into TELEM1 with the
supplied cable. Ground radio into a laptop USB port (Micro-USB for 100/500 mW).
Power the Pixhawk. Both radios: solid green = linked, blinking green = searching,
red flashing = data. QGC's default auto-connect includes SiK radios, so it should open
a second link on the new COM port by itself; if not, Application Settings → Comm Links
→ Add, Serial, that COM port, 57600. USB link stays the one used for parameter work.

**Revert.** Unplug. No parameter to undo.

**Verification.** Both radios solid green; QGC shows the vehicle over the radio link
when the USB is unplugged (test with props off); `diff_live_against_file` against
`2026-09-28-switches.params` shows nothing moved.

**Built and verified 2026-09-28.** Air radio (100 mW) on TELEM1 with the supplied
cable; ground radio on laptop Micro-USB. Both LEDs solid green. QGC auto-connected
over the radio **with the Pixhawk on battery only, no USB**, before the USB was
reconnected. From the board: `RADIO_STATUS` streaming (rssi 157 / remrssi 157,
noise 33 / 23, txbuf 100 %, rxerrors 2), heartbeat present, disarmed.
`diff_live_against_file` against `2026-09-28-switches.params`: **no change**. No PX4
parameter touched. **Status: DONE.** Baseline remains `2026-09-28-switches.params`.

### D-18 — Battery / power module setup: PM02 V3.3, 4S 5200 mAh (PROPOSED)

**Hardware (labels read by the user 2026-09-28):** Holybro **PM02 V3.3** analog power
module on the Pixhawk POWER port; battery Ovonic **4S1P 5200 mAh** (see session entry).

**Sources.**
- Holybro Power Module docs (power-module.md, fetched 2026-09-28): PM02 V3 input "2~12S";
  "Voltage Divider: 18.182" and "Amperes per Volt: 36.364" for all Holybro analog power
  modules except PM08. The same page gives Pixhawk 6C pin settings as `BATT_MONITOR`,
  `BATT_VOLT_PIN`, `BATT_CURR_PIN`: **those are ArduPilot names** (the trap) and are
  not used here; on PX4 the 6C's ADC pins are fixed in the board definition.
  https://docs.holybro.com/power-module-and-pdb/power-module
- PX4 v1.16 Battery Estimation Tuning: `BAT1_N_CELLS` "number of cells connected in
  series"; `BAT1_V_CHARGED` "nominal maximum voltage of each cell", LiPo 4.05 V (QGC
  default); `BAT1_V_EMPTY` LiPo conservative 3.7 V, under load 3.5 V, damage 3.0 V;
  `BAT1_V_DIV` calibrated in QGC Setup → Power by comparing a multimeter reading with
  the module's reading; `BAT1_A_PER_V` likewise.
  https://docs.px4.io/v1.16/en/config/battery

**Board state (baseline `2026-09-28-switches.params`):** `BAT1_SOURCE=0` (power
module), `BAT1_N_CELLS=0` (unset → no % estimate, "Emergency battery level" spam),
`BAT1_V_DIV=18.1`, `BAT1_A_PER_V=36.3675`, `BAT1_V_CHARGED=4.05`, `BAT1_V_EMPTY=3.6`,
`BAT1_CAPACITY=-1`. Board-reported pack voltage at the time: 16.05 V with the divider
at 18.1.

**Proposal.**

| Parameter | Now | Proposed | Why |
|---|---|---|---|
| `BAT1_N_CELLS` | 0 | **4** | Battery label 4S1P. Enables the % estimate and stops the emergency spam. |
| `BAT1_CAPACITY` | -1 | **5200** | Label 5200 mAh. Lets PX4 use the PM02's current sense for remaining-capacity estimation. |
| `BAT1_V_DIV` | 18.1 | **keep**, unless the meter says otherwise | Holybro's figure is 18.182; 18.1 vs 18.182 is 0.45 %, about 0.07 V at 16 V. Only recalculate in QGC if the meter and the board differ by more than ~0.1 V. |
| `BAT1_A_PER_V` | 36.3675 | keep | Matches Holybro's 36.364. Cannot be checked without a known load; leave. |
| `BAT1_V_CHARGED` | 4.05 | keep | PX4 / QGC default for LiPo. |
| `BAT1_V_EMPTY` | 3.6 | keep | Between PX4's "under load" 3.5 and "conservative" 3.7. |

**Verification.** Meter across the pack leads vs the board's `voltage_battery_V` at the
same moment (record both). After the change: board reports a sane remaining %,
"Emergency battery level" stops, `battery_status.cells_mV` shows 4 entries. Diff
against `2026-09-28-switches.params`; explain every line; save
`params/2026-09-28-power.params`.

**Revert.** `BAT1_N_CELLS=0`, `BAT1_CAPACITY=-1`, and `BAT1_V_DIV` back to 18.1 if it
was recalculated.

**Applied in QGC:** Configure → Power: Number of cells 4, Full voltage 4.05, Empty
voltage 3.6, Battery capacity 5200 (if the page offers it; otherwise Parameters →
`BAT1_CAPACITY`). Voltage divider: leave, or use the page's Calculate with the meter
value if the difference exceeds 0.1 V.

Status: **approved 2026-09-28** (client via user). Meter across the pack: **16.1 V**;
board's last reported `voltage_battery_V` before the aircraft was powered down for the
measurement: **16.05 V** (not simultaneous, a few minutes apart, pack at rest).
Difference 0.05 V, under the 0.1 V threshold → `BAT1_V_DIV` stays 18.1.

**Applied 2026-09-28** in QGC → Configure → Power (screenshot
`screenshots/2026-09-28-qgc-battery-config.png`). Diff against `2026-09-28-switches.params`: exactly
**`BAT1_N_CELLS 0 → 4`** and **`BAT1_CAPACITY -1 → 5200`**. Nothing else moved; divider
and amps-per-volt untouched. After the reboot the board reports battery healthy,
15.9 V, 83 % remaining, current 0.0 A at rest; "Emergency battery level" stopped. One
"Low battery" message was emitted during the transition before the cell count took
effect. All SYS_STATUS sensors healthy at that moment (GPS 22 sats, HDOP 0.64, position
control healthy). **Status: DONE.** Snapshot saved by the user as
`2026-09-28-battery.params`, renamed **`params/2026-09-28-power.params`**, verified
identical to the live board. **New baseline.**

### D-19 — Failsafe review (PROPOSED, research done 2026-09-28, nothing changed, needs the client)

**Sources (PX4 v1.16.0 tag, quoted from the source tree).**
- `src/modules/commander/commander_params.c`:
  - `COM_RC_LOSS_T` "Manual control loss timeout. The time in seconds without a new
    setpoint from RC or Joystick, after which the connection is considered lost."
    0–35 s, default 0.5.
  - `NAV_RCL_ACT` "Set RC loss failsafe mode. The RC loss failsafe will only be entered
    after a timeout, set by COM_RC_LOSS_T." 1 Hold, 2 Return, 3 Land, 5 Terminate,
    6 Disarm. Default 2.
  - `COM_RCL_EXCEPT` "RC loss exceptions. Specify modes in which RC loss is ignored":
    bit 0 Mission, 1 Hold, 2 Offboard. Default 0.
  - `COM_DL_LOSS_T` "GCS connection loss time threshold", 5–300 s, default 10.
  - `NAV_DLL_ACT` "Set GCS connection loss failsafe mode": 0 Disabled, 1 Hold, 2 Return,
    3 Land, 5 Terminate, 6 Disarm. Default 0.
  - `COM_LOW_BAT_ACT` "Battery failsafe mode. Action the system takes at critical
    battery." 0 Warning, 2 Land mode, 3 Return at critical level, land at emergency
    level. Default 0.
  - `COM_DISARM_LAND` auto-disarm after landing, default 2.0 s. `COM_DISARM_PRFLT`
    auto-disarm if no takeoff within, default 10.0 s.
  - `COM_ARM_WO_GPS` "GPS preflight check": 0 Deny arming, 1 Warning only, 2 Disabled.
    Default 1.
  - `COM_POS_LOW_ACT` low position accuracy action, default 3 Return.
    `COM_FLTT_LOW_ACT` remaining-flight-time-low action, default 3 Return.
  - `COM_FLT_TIME_MAX` "Maximum allowed flight time ... returns to launch when time
    since takeoff exceeds this value", seconds, -1 disabled.
- `src/modules/navigator/rtl_params.c`: `RTL_RETURN_ALT` "Default minimum altitude
  above destination for return flight", m, default 60. `RTL_DESCEND_ALT` "Descend to
  this altitude after return, and wait for time defined in RTL_LAND_DELAY", default 30.
  `RTL_LAND_DELAY` "Delay before landing ... If set to -1 the system will not land but
  loiter", default 0. `RTL_MIN_DIST` default 10 m. `RTL_CONE_ANG` default 45°.
- `src/modules/navigator/geofence_params.c`: `GF_ACTION` 0 None, 1 Warning, 2 Hold,
  3 Return, 4 Terminate ("will kill the vehicle"), 5 Land; default 2.
  `GF_MAX_HOR_DIST` / `GF_MAX_VER_DIST` "Maximum ... distance in meters the vehicle can
  be from Home before triggering a geofence action. Disabled if 0." `GF_SOURCE` 0 GPOS
  / 1 GPS. `GF_PREDICT` experimental, "may cause flyaways".
- Battery thresholds `BAT_LOW_THR`, `BAT_CRIT_THR`, `BAT_EMERGEN_THR`: the source file
  was not reachable this session (404 on two guessed paths). PX4 v1.16 Safety page
  describes them as the remaining-capacity fractions for warning, Return, and
  immediate Land respectively. **Fetch the definitions before proposing a change.**

- **Fetched 2026-09-28 (evening).** In v1.16.0 the battery thresholds are not in a
  `.c` file (hence the 404s); they are in `src/lib/battery/module.yaml` at the
  v1.16.0 tag (tree sha 6ea3539). Verbatim:
  - `BAT_LOW_THR` "Low threshold. Sets the threshold when the battery will be reported
    as low. This has to be higher than the critical threshold." float, unit norm,
    min 0.12, max 0.5, increment 0.01, **default 0.15**.
  - `BAT_CRIT_THR` "Critical threshold. Sets the threshold when the battery will be
    reported as critically low. This has to be lower than the low threshold. This
    threshold commonly will trigger RTL." min 0.05, max 0.5, increment 0.01,
    **default 0.07**.
  - `BAT_EMERGEN_THR` "Emergency threshold. Sets the threshold when the battery will be
    reported as dangerously low. This has to be lower than the critical threshold.
    This threshold commonly will trigger landing." min 0.03, max 0.5, increment 0.01,
    **default 0.05**.
  Ordering constraint from the definitions: LOW > CRIT > EMERGEN. Values are fractions
  of remaining capacity (0.15 = 15 %).

**Board state now (baseline `2026-09-28-power.params`), all factory / airframe defaults:**

| Area | Parameter | Value | Meaning |
|---|---|---|---|
| RC loss | `COM_RC_LOSS_T` | 0.5 s | lost after half a second without RC |
| | `NAV_RCL_ACT` | 2 | **Return** |
| | `COM_RCL_EXCEPT` | 0 | no exceptions |
| Telemetry loss | `COM_DL_LOSS_T` | 10 s | |
| | `NAV_DLL_ACT` | 0 | **Disabled** (no action) |
| Battery | `COM_LOW_BAT_ACT` | 0 | **Warning only** |
| | `BAT_LOW_THR` / `BAT_CRIT_THR` / `BAT_EMERGEN_THR` | 0.15 / 0.07 / 0.05 | 15 % warn, 7 % critical, 5 % emergency |
| Return | `RTL_RETURN_ALT` | 30 m | X500 airframe default, not PX4's 60 |
| | `RTL_DESCEND_ALT` | 10 m | |
| | `RTL_LAND_DELAY` | 0 | lands immediately after return |
| Geofence | `GF_ACTION` | 2 | Hold, but |
| | `GF_MAX_HOR_DIST` / `GF_MAX_VER_DIST` | 0 / 0 | **fence disabled** |
| Arming | `COM_ARM_WO_GPS` | 1 | warn only, arming allowed without GPS |
| | `COM_DISARM_LAND` / `COM_DISARM_PRFLT` | 2 s / 10 s | |
| Other | `COM_POS_LOW_ACT` / `COM_FLTT_LOW_ACT` | 3 / 3 | Return |
| | `COM_FLT_TIME_MAX` | -1 | no flight-time limit |

**Proposal for discussion (nothing applied):**

1. **`COM_LOW_BAT_ACT` 0 → 3** (Return at critical, Land at emergency). Reason: a
   student will not watch the battery; warn-only means the aircraft falls out of the
   sky at 0 %. Alternative: 2 (Land where it is), simpler to explain, but lands wherever
   the student has wandered to. Recommendation: 3.
2. **Battery thresholds:** consider raising `BAT_LOW_THR` to ~0.25 and `BAT_CRIT_THR` to
   ~0.15 so the Return happens with margin on a 5200 mAh pack. Needs the parameter
   definitions fetched first (see above). Judgement call; the defaults are PX4's.
3. **`NAV_DLL_ACT` leave 0.** The 915 radio is a convenience link; the pilot's RC is the
   primary link and has its own failsafe. Triggering Return every time the laptop
   link hiccups would surprise a student mid-flight.
4. **`NAV_RCL_ACT` keep 2 (Return)** and **`RTL_RETURN_ALT` 30 m**: sensible for an
   open field; the return altitude must clear anything between the aircraft and home
   at the flying site. Confirm the site has nothing over ~25 m nearby. `RTL_LAND_DELAY`
   0 (auto-land) keep.
5. **Geofence: enable.** `GF_MAX_HOR_DIST` and `GF_MAX_VER_DIST` sized to the flying
   site (e.g. 100 m horizontal, 40 m vertical, to be chosen with the client), with
   `GF_ACTION` 2 (Hold) or 3 (Return). Never 4. This is the single most useful
   protection for a student who over-controls.
6. **`COM_ARM_WO_GPS`:** leave 1 for now so bench and indoor Stabilized tests work.
   Revisit once flying starts; 0 would force a GPS fix before any arming.
7. **`COM_FLT_TIME_MAX`:** optional; a hard cap (e.g. 600 s) that forces Return is a
   simple classroom rule. Discuss.

**Order of work next session:** fetch the `BAT_*_THR` definitions; client decides items
1, 2, 5 and 7; user applies in QGC → Configure → Safety (battery action, RTL altitude,
geofence are all on that page); diff against `2026-09-28-power.params`; explain every
line; save `params/YYYY-MM-DD-failsafe.params`.

Status: proposed.

**Client decisions 2026-09-28 (evening), via the user.** Session start: `status` showed
the board over the SiK link only (USB was not yet in, Pocket off, so Hold mode and no
RC_CHANNELS); after USB and a parameter Refresh, `diff_live_against_file` against
`2026-09-28-power.params`: **no change** (`_HASH_CHECK` only).

1. Battery action: **Return at critical, Land at emergency** (`COM_LOW_BAT_ACT=3`).
2. Thresholds: **30 % low, 20 % critical, 15 % emergency** (client's figures; my
   suggestion had been 25 / 15 / 8). The "land by 20 %" rule is a
   hobby convention, not a datasheet figure (DJI's defaults, 20 % low / 10 % critical,
   are the nearest industry reference; LiPo makers state a cell floor, usually 3.0 V,
   not a percentage). The board's 0 % is already 3.6 V/cell (`BAT1_V_EMPTY`), above the
   damage floor. The percentage is an estimate and `BAT1_A_PER_V` was never verified
   under load, so the extra margin covers estimate error. Satisfies LOW > CRIT > EMERGEN
   and the min/max ranges from `module.yaml`.
3. Geofence: **100 m horizontal, 40 m vertical, action Hold** (`GF_ACTION=2` unchanged).
   Fence is centred on Home, set where the aircraft arms. `GF_SOURCE=0`, `GF_PREDICT=0`
   unchanged.
4. Max flight time: **not set.** `COM_FLT_TIME_MAX` stays -1.
5. Unchanged: RC loss Return at 30 m (`NAV_RCL_ACT=2`, `RTL_RETURN_ALT=30`), telemetry
   loss no action (`NAV_DLL_ACT=0`), `COM_ARM_WO_GPS=1`.

**Approved change list (six parameters):**

| Parameter | Was | Set | QGC location |
|---|---|---|---|
| `COM_LOW_BAT_ACT` | 0 | 3 | Configure → Safety → Low Battery Failsafe Trigger → Failsafe Action: "Return at critical level, land at emergency level" |
| `BAT_LOW_THR` | 0.15 | 0.30 | same section, Battery Warn Level 30 % |
| `BAT_CRIT_THR` | 0.07 | 0.20 | same section, Battery Failsafe Level 20 % |
| `BAT_EMERGEN_THR` | 0.05 | 0.15 | same section, Battery Emergency Level 15 % |
| `GF_MAX_HOR_DIST` | 0 | 100 | Configure → Safety → Geofence Failsafe Trigger → Max Radius |
| `GF_MAX_VER_DIST` | 0 | 40 | same section, Max Altitude |

Field labels on the QGC Safety page are QGC's; if a label differs, set the parameter
by name in Parameters. Geofence action must read Hold.

**Revert:** `COM_LOW_BAT_ACT=0`, `BAT_LOW_THR=0.15`, `BAT_CRIT_THR=0.07`,
`BAT_EMERGEN_THR=0.05`, `GF_MAX_HOR_DIST=0`, `GF_MAX_VER_DIST=0`.

**Verification:** diff against `2026-09-28-power.params` shows exactly those six lines;
the board sends no new preflight failure; save `params/2026-09-28-failsafe.params` and
verify identical to the board.

Status: **approved 2026-09-28**, applying in QGC.

**Applied 2026-09-28 (evening), first pass.** Diff against `2026-09-28-power.params`:
the six expected lines and nothing else, no preflight message. Battery lines correct
(`COM_LOW_BAT_ACT=3`, `BAT_LOW_THR=0.30`, `BAT_CRIT_THR=0.20`, `BAT_EMERGEN_THR=0.15`).
**Geofence landed as `GF_MAX_HOR_DIST=30.48` and `GF_MAX_VER_DIST=12.19`**: QGC's
distance unit is set to feet, so "100" and "40" typed on the Safety page were 100 ft
and 40 ft, and the board stores metres. Lesson: check Application Settings → Units
before typing a distance on any QGC page; the log records board values in metres.

**Client decision, same session: geofence off for now.** Both fence distances set
back to 0 (disabled, factory state). `GF_ACTION` stays 2 (Hold) for whenever it is
enabled. Source for the range: `src/modules/navigator/geofence_params.c` at v1.16.0,
both limits 0–10000 m, increment 1, 0 = disabled. Re-enabling later is a one-line
change per parameter and needs a fresh D-entry with the site figure in metres.

Final D-19 change set: **four parameters**, all battery
(`COM_LOW_BAT_ACT`, `BAT_LOW_THR`, `BAT_CRIT_THR`, `BAT_EMERGEN_THR`).
Revert: `COM_LOW_BAT_ACT=0`, `BAT_LOW_THR=0.15`, `BAT_CRIT_THR=0.07`,
`BAT_EMERGEN_THR=0.05`.

**D-19 DONE 2026-09-28 (evening).** Snapshot saved by the user as
`2026-09-28-safety.params`, renamed **`params/2026-09-28-failsafe.params`**. Verified
identical to the live board (`_HASH_CHECK` only). File-to-file diff from
`2026-09-28-power.params`: exactly the four battery lines. **New baseline.**

### D-20 — ESC / motor order and direction check, props off (PROPOSED 2026-09-28 evening)

**Board state now (read 2026-09-28 evening, after D-19):** `PWM_MAIN_FUNC1..8 = 0` and
`PWM_AUX_FUNC1..8 = 0`. **No output on either header is assigned to a motor.** The
airframe file `4019_x500_v2` (v1.16.0 tag) sets only the rotor geometry
(`CA_ROTOR_COUNT=4`, rotor positions, `CA_ROTOR2_KM`/`CA_ROTOR3_KM=-0.05`) and rate
gains; it does not assign outputs, and neither `rc.mc_defaults` nor the fmu-v6c
`rc.board_defaults` does. So the motors cannot spin from the board until the
Actuators page assigns them. `COM_MOT_TEST_EN=1` (motor test allowed, factory).
`PWM_MAIN_TIM0=400` (400 Hz PWM on the first MAIN timer group). DShot driver is
compiled into the fmu-v6c build (`CONFIG_DRIVERS_DSHOT=y`) but nothing is configured.

**Hardware (Holybro kit page, docs.holybro.com PX4 Development Kit X500v2):** ESC
"BLHeli S ESC 20A (4 pcs) with XT30 plugs, 4S"; motors Holybro 2216 KV920. Holybro's
page does not say which protocol the ESCs are set to. BLHeli_S ESCs accept normal PWM
out of the box; DShot is possible but is a separate decision. **Proposal: plain PWM
400 Hz, the factory protocol. No DShot in this phase.**

**Which header (CONFLICT, flag).** PX4 v1.16 "Pixhawk 6C Wiring Quick Start" says
motors go to **I/O PWM OUT (MAIN)** and servos to FMU PWM OUT (AUX). PX4 v1.16
"Holybro X500 V2 (Pixhawk 6C)" build page says the ESCs go to **FMU PWM OUT**, white
wire up. Holybro's 6C ports page: FMU PWM OUT = AUX (pins 2–9 = FMU_CH1..8), I/O PWM
OUT = MAIN (pins 2–9 = IO_CH1..8), pin 1 VDD_Servo, pin 10 GND on both. Resolution:
**look at the aircraft.** Whichever header the four ESC leads are in is the tab used on
the Actuators page (I/O PWM OUT → "PWM MAIN" tab; FMU PWM OUT → "PWM AUX" tab). Do
not move the leads. Record which one here.

**Motor numbering, PX4 Quadrotor X (airframe reference v1.16):** Motor 1 front right
CCW, Motor 2 back left CW, Motor 3 front left CW, Motor 4 back right CCW. Holybro's
bottom plate is marked with each motor's direction; props must match.
Output function values: `Motor` starts at 101 (`src/lib/mixer_module/output_functions.yaml`),
so Motor 1..4 = 101..104.

**Procedure (PX4 v1.16 Actuators page + ESC Calibration page).**

Preconditions: **props off**, aircraft strapped or held on the bench, USB in, battery
in (ESCs need pack power; the 6C runs on both). Pocket on, SD light on, but the
aircraft stays disarmed throughout; the sliders work without arming.

1. QGC → Configure → Actuators. Geometry should already show 4 rotors from the
   airframe; do not change geometry.
2. In the output tab for the header the ESCs are actually on, assign outputs 1–4 to
   Motor 1–4 in order (output 1 = Motor 1 … output 4 = Motor 4). This is a
   parameter change: `PWM_MAIN_FUNC1..4` (or `PWM_AUX_FUNC1..4`) 0 → 101..104.
   Leave Disarmed / Minimum / Maximum PWM at QGC's defaults for now.
3. **ESC calibration** (PX4: "If using PWM or OneShot ESCs, you should first perform
   ESC Calibration"). Battery **out**, USB in. Configure → Power → Calibrate ESCs.
   When QGC asks, plug the battery in. Wait for the beep sequence to finish. PX4
   warns the calibration can report success even when it failed if the battery is
   connected late, and that a mis-detected sequence can spin motors at full speed:
   hence props off and hands clear.
4. Back on Actuators, toggle **Enable sliders**. Move output 1's slider slightly off
   its bottom stop: exactly one motor should twitch/spin, at the **front right**
   arm. Return it. Repeat for 2 (back left), 3 (front left), 4 (back right).
   If a slider spins the wrong arm, use **Identify & Assign Motors** (it spins each
   motor in turn and you click the arm on the diagram; it rewrites the FUNC
   parameters).
5. Direction: with a slider barely on, watch the motor bell. 1 and 4 must turn CCW,
   2 and 3 CW, seen from above. A motor turning the wrong way on a PWM BLHeli_S ESC
   is fixed by **swapping any two of the three motor wires at that ESC**, battery
   out. (DShot direction-by-parameter does not apply on PWM.) Record which motors
   were swapped.
6. Sliders back to bottom, disable sliders, battery out.

**Parameters expected to move:** exactly four `PWM_MAIN_FUNCn` or `PWM_AUX_FUNCn`
(0 → 101, 102, 103, 104), possibly permuted by Identify & Assign. ESC calibration
may also write `PWM_MAIN_MINn` / `PWM_MAIN_MAXn` (or AUX) if QGC's calibration
adjusts them; any such line gets explained. Nothing else.

**Revert:** the four FUNC parameters back to 0. Motor-wire swaps are physical;
swapping back restores direction.

**Verification:** diff against `2026-09-28-failsafe.params`; each motor number spins
the right arm in the right direction; save `params/2026-09-28-motors.params`.

**Header observed by the user 2026-09-28:** the four ESC signal leads go into a
breakout / power-distribution board ("PWM in/out"), and a single cable runs from
that board's PWM OUT to the Pixhawk 6C **I/O PWM OUT**. So the outputs are **MAIN**
and the Actuators tab is **PWM MAIN**; parameters are `PWM_MAIN_FUNC1..4`. The
breakout is assumed to pass channels straight through (in 1 → out 1); the slider
test in step 4 is what proves it, not the assumption. This matches the PX4 6C
quick start (motors on I/O PWM OUT).

Status: **approved 2026-09-28 (evening)**, applying.

**Step 1 applied.** First diff against `2026-09-28-failsafe.params` showed 24 lines:
Motor 1–4 had been assigned on **both** the PWM MAIN and PWM AUX tabs. AUX 1–4 set
back to Disabled by the user. Second diff, 20 lines, all explained:

| Parameter | Was | Now | Why |
|---|---|---|---|
| `PWM_MAIN_FUNC1..4` | 0 | 101, 102, 103, 104 | Motor 1–4 on I/O PWM OUT 1–4. The D-20 change. |
| `PWM_MAIN_MIN1..4` | 1000 | 1100 | Written by QGC when a Motor function is picked. PX4's own default is 1000 (`src/drivers/px4io/module.yaml`: min allowed 800–1400, default 1000). Kept; ESC calibration teaches the ESC these endpoints. |
| `PWM_MAIN_MAX1..4` | 2000 | 1900 | Same origin; PX4 default 2000, allowed 1600–2200. Kept. |
| `PWM_AUX_MIN1..4` / `PWM_AUX_MAX1..4` | 1000 / 2000 | 1100 / 1900 | Left over from the accidental AUX assignment; outputs are Disabled and nothing is on FMU PWM OUT, so no effect. Left as is, recorded. |

`PWM_AUX_FUNC1..8` back to 0. Board warning at the time: "Preflight: GPS Horizontal
Pos Drift too high" (indoors, unrelated).

**Step 2, ESC calibration, ran 2026-09-28 evening.** Board messages in order:
"[cal] calibration started: 2 esc", "[cal] Connect battery now", "[cal] Battery
connected" (+6 s), "[cal] calibration done: esc" (+8 s). PX4's side completed. The
user heard **no ESC tones** during it.

**Step 3, slider test: BLOCKED. Motors silent.** With battery and USB in, sliders
enabled and MAIN 1 raised (board reported `SERVO_OUTPUT_RAW` servo1 = 1740 µs, 2–4 =
1000), no motor moved and pack current stayed 0.0 A. Slider returned to bottom
(servo1 back to 1000). **Plugging the battery in gives no ESC power-up chime.**

Everything visible from the board is correct: `PWM_MAIN_FUNC1..4` = 101–104,
`PWM_MAIN_DIS1..4` = 1000, MIN 1100, MAX 1900, `PWM_MAIN_TIM0..2` = 400 Hz,
`PWM_MAIN_REV` = 0, `CBRK_IO_SAFETY` = 22027 (safety bypassed), `COM_MOT_TEST_EN` = 1,
pack 15.83 V, 80 %, `current_consumed` 3 mAh over the whole session (only the
Pixhawk has been drawing through the PM02). No warnings beyond the indoor GPS drift.
The Pixhawk is generating the PWM; the ESCs are not responding and are not making
their power-on tones. The tones come from the motor windings, so either the ESCs have
no pack power or the motors are not connected to the ESCs. User checked by eye: all
four ESC XT30s on the power board, power board fed, motor leads connected. **No
multimeter at the bench**, so the power board and ESC XT30 pins could not be measured.

**Next session, with a meter:** (1) battery in, meter across one ESC XT30 on the
power board, expect ~pack voltage; (2) if zero, meter the power board input and the
PM02 XT60 output; (3) if pack voltage is present at the ESC and still no chime, the
ESC-to-motor connections or the ESC itself. Only then repeat step 3. The 10-pin
breakout-to-I/O-PWM-OUT cable and the ESC signal-lead orientation on the breakout
are the next suspects after power, but they cannot cause silence at power-up.

**Photo of the breakout, 2026-09-28 evening** (`screenshots/2026-09-28-pwm-breakout-wiring.jpg`):
a black box marked "PWM IN" (10-pin JST-GH, cable to the Pixhawk 6C "PWM OUT [MAIN]"
socket) and "PWM OUT 8 7 6 5 4 3 2 1" (3-row 0.1" headers). Four two-wire ESC leads
(signal + ground, no BEC wire) sit in OUT 1–4; 5–8 are empty. Leads are tagged M1
(orange), M2 (blue), M3 (yellow) by the user; M4 tag not visible. **Not established
from the photo:** which of the three header rows is signal on this box (no Holybro
page for it found; must be read off the box or rung out), and whether tag Mn is in
slot n. Neither explains the missing power-on chime; those are the step-3 checks
after ESC power is proven. Holybro's 6C page "PWM Signal Voltage MOD" says the 6C
PWM signal level can be bridged to 3.3 V or 5 V by solder pads; noted only as a
later suspect if ESCs are powered and chime but ignore the signal.

**Breakout pin rows read by the user:** the PWM OUT header is marked **S, +, −**
(three rows). All four ESC leads sit on S and −, + empty, **but the black wire is on
S and the white on −**. If white is the ESC's signal wire (to be confirmed at the ESC
pad, not by colour), all four leads are reversed: signal grounded, Pixhawk signal pin
tied to ESC ground. That explains no response to the sliders and calibration, not
the missing chime. **Fix:** battery out, turn each plug so the signal wire is on S,
ground on −, same slot number. Note: MAIN 1 was driven to 1740 µs into a grounded
pin for a short time during the slider test; if MAIN 1 alone misbehaves later, that
is the first suspect.

**Resolved 2026-09-28 (evening), same session.** The user confirmed white is the
signal wire at the ESC pads and turned all four plugs (signal on S, ground on −).
**With the battery in the ESCs chimed**, so there was never a power fault; the
missing chime had been the reversed leads too (with the ESC signal pin grounded and
its ground on the Pixhawk signal pin the ESC did not sound off; the meter step is
no longer needed). ESC calibration repeated: board messages "calibration started",
"Connect battery now", "Battery connected", "calibration done: esc"; no parameter
moved. Slider test, props off: **MAIN 1 front right CCW, MAIN 2 back left CW, MAIN 3
front left CW, MAIN 4 back right CCW, exactly as PX4's Quadrotor X diagram in QGC.**
No motor wires swapped. Outputs at rest read 1000 µs on all four.

**D-20 DONE.** Final parameter change: the 20 lines tabled above (four
`PWM_MAIN_FUNC`, eight MAIN min/max, eight harmless AUX min/max). Snapshot
saved by the user as `2026-09-28-ESCs.params`, renamed
`params/2026-09-28-motors.params`, verified identical to the board (`_HASH_CHECK`
only); file-to-file diff from `2026-09-28-failsafe.params` is exactly the 20 lines.
**New baseline.**

Lesson for the handoff: on this breakout the rows are S / + / −; the ESC's two-wire
lead must put the signal wire on S. Wire colour was the trap again, in the other
direction: the leads had been plugged by colour and were reversed.

### Session closed 2026-09-28 (daytime)

Done this session, every step verified from the board and snapshotted: D-14 radio
built (SBUS), D-16 switches, D-17 SiK 915 MHz telemetry on TELEM1, D-18 power
(PM02 V3.3, 4S 5200 mAh). D-15 HM30 approved then shelved. D-19 failsafe review
researched and proposed, not applied. Client decisions recorded: kill switch stays on
SD; instructor radio and HM30 each get their own later session. Baseline
**`params/2026-09-28-power.params`**. Screenshot `screenshots/battery-config.png`
renamed to `2026-09-28-qgc-battery-config.png`. `HANDOFF.md`, `CLAUDE.md` updated.
Next session: D-19 with the client, then the ESC / motor order check.

**Also observed while doing this** (not part of D-16): the board now sees the pack
through the power module, `voltage_battery_V` 16.05 with `BAT1_N_CELLS=0` (unset), so
it cannot compute remaining charge, reports -100 % and "Emergency battery level".
`COM_LOW_BAT_ACT=0` (warn only) so no action is taken. This is the power-setup item;
16.05 V / 4 = 4.01 V per cell is plausible for a 4S pack and will be checked against a
meter reading when the power page is done. GPS had an 11-satellite 3D fix indoors near
the window at the time (34.4087, -84.9724, HDOP 2.5).

### Session closed 2026-09-28 (evening)

Done, every step verified from the board and snapshotted: D-19 failsafes (battery
Return/Land, 30/20/15 %, geofence off by client choice, no flight-time cap;
`2026-09-28-failsafe.params`), D-20 motor outputs, ESC calibration, order and
direction (`2026-09-28-motors.params`, baseline). Two traps recorded in HANDOFF.md:
QGC distance units were in feet; ESC signal leads had been plugged by colour and were
reversed on the breakout (S / + / −). Photo `screenshots/2026-09-28-pwm-breakout-wiring.jpg`.
Next: first outdoor hover in Stabilized / Position with an instructor on the Pocket,
then geofence once the client gives a site figure in metres; instructor radio and
HM30 remain their own sessions.

**Flight status decision (client via user, 2026-09-28 evening):** the aircraft flies
under the FAA recreational (hobbyist) exception. Consequences recorded in
`flight-checklists.md` §0: recreational registration (one number per owner, marked on
the airframe), TRUST certificate for every pilot including students on the sticks
later, Remote ID or a FRIA, under 400 ft, in sight, LAANC in controlled airspace. If
flying is ever sold or done for the client's business, Part 107 applies instead.

### Session 2026-09-28 (late evening) — maiden flight prep, bench pre-check

Start check: `diff_live_against_file` against `params/2026-09-28-motors.params`
clean (`_HASH_CHECK` only). Board last heard a few minutes before the session; all six
reported sensors healthy, GPS 3D fix with 23 satellites, HDOP 0.62, indoors by the
window.

Every aircraft-side value that `flight-checklists.md` relies on was read from the live
cache and matches the document:

| Claim in the checklist | Parameter | Live |
|---|---|---|
| Return climbs to 30 m | `RTL_RETURN_ALT` | 30 |
| descends to 10 m then lands with no loiter | `RTL_DESCEND_ALT`, `RTL_LAND_DELAY` | 10, 0 |
| RC loss → Return, telemetry loss → nothing | `NAV_RCL_ACT`, `NAV_DLL_ACT` | 2, 0 |
| RC loss timeout 0.5 s | `COM_RC_LOSS_T` | 0.5 |
| Battery warn / Return / Land 30 / 20 / 15 % | `BAT_LOW_THR`, `BAT_CRIT_THR`, `BAT_EMERGEN_THR`, `COM_LOW_BAT_ACT` | 0.3, 0.2, 0.15, 3 |
| Geofence off | `GF_ACTION` 2 but both distances 0 (D-19) | as D-19 |
| No flight-time cap | `COM_FLT_TIME_MAX` | -1 |
| Auto-disarm 2 s after landing | `COM_DISARM_LAND` | 2 |
| Auto-disarm 10 s if no takeoff | `COM_DISARM_PRFLT` | 10 |
| Kill switch on ch 8, modes on ch 6 | `RC_MAP_KILL_SW`, `RC_MAP_FLTMODE` | 8, 6 |
| SB: Stabilized / Altitude / Position | `COM_FLTMODE1/4/6` | 8 / 1 / 2 |

Arming-check parameters, meanings from PX4 v1.16.0
`src/modules/commander/commander_params.c` (tag v1.16.0):

- `COM_ARM_SDCARD` = 1, **"Warning only"** (0 disabled, 2 enforce). A missing SD card
  will not stop arming, but there will be no `.ulg` log and checklist §4.2–4.3 cannot
  be done. Whether a card is fitted has never been checked. Added to the gate as 0.11.
  No parameter change proposed; the check is physical.
- `COM_ARM_MAG_STR` = 2, **"Warning only"** (1 would deny arming). The three "Strong
  magnetic interference" and one "heading estimate not stable" messages in the log
  buffer this evening came during ESC calibration with the motors drawing current a
  few centimetres from the compass, indoors. Expected there; not acceptable at the
  field with motors off (checklist 1.14 already says stop on any amber).
- `COM_ARM_WO_GPS` = 1, **"Warning only"** for a failing `EKF2_GPS_CHECK`. Explains
  why "GPS Horizontal Pos Drift too high" shows as a warning indoors. Position mode
  still needs a valid position estimate to engage, so this does not let the aircraft
  take off in Position without a fix.
- `COM_ARM_ODID` = 0, no Remote ID check. Consistent with no module fitted.
- `COM_KILL_DISARM` = 5 s: once the kill switch has been engaged for 5 s the board
  disarms itself. Checklist 3.2 note added.

Made `logs/` for flight logs (checklist §4.2 names it). Nothing on the board changed.
What remains before the maiden is off the aircraft: FAA registration, TRUST, Remote ID
or FRIA, site, weather, SD card check.

### INCIDENT 2026-09-28 ~21:24 board time — roll-over on first manual throttle-up. DO NOT FLY.

Board messages, in order (observer buffer): "Armed by Stick gesture", logger opened
`/fs/microsd/log/2026-09-28/21_24_08.ulg`, "Takeoff detected", **"Preflight Fail:
Attitude failure (roll)"** about a second later, "Landing detected", "Disarmed by
landing", then "Arming denied: Resolve system health failures first" with attitude
failures in roll and pitch while it lay tilted. Two earlier arms the same minute timed
out on the 10 s pre-flight disarm. Outcome (user, same evening): flipped over on private property, one broken prop, no other damage, no injuries. Spare props are on the kit list (checklist 0.9).
Side finding: an SD card **is** fitted (the logger wrote to it), checklist 0.11 answered.

**Contradiction found while investigating.** The D-20 entry (proposal and the "DONE"
paragraph) states the PX4 Quadrotor X layout as "Motor 1 front right CCW, Motor 2 back
left CW, Motor 3 front left CW, Motor 4 back right CCW" and says the slider test matched
it. That statement is wrong, and it was mine. The board's own geometry, read live and
identical in `params/2026-09-28-motors.params`, is:

| Output | `CA_ROTORn_PX, PY` (FRD: +X forward, +Y right) | Position | `CA_ROTORn_KM` | Board expects |
|---|---|---|---|---|
| Motor 1 (rotor 0) | +1, +1 | front right | +0.05 | **CCW** |
| Motor 2 (rotor 1) | −1, −1 | back left | +0.05 | **CCW** |
| Motor 3 (rotor 2) | +1, −1 | front left | −0.05 | **CW** |
| Motor 4 (rotor 3) | −1, +1 | back right | −0.05 | **CW** |

Source for the sign: PX4 v1.16.0 `src/modules/control_allocator/module.yaml`,
`CA_ROTOR${i}_KM`: "Use a positive value for a rotor with CCW rotation. Use a negative
value for a rotor with CW rotation." Source for the axes: PX4 "Actuator Configuration"
page, motor positions are FRD body frame. Diagonal pairs spin the same way: 1 and 2
CCW, 3 and 4 CW. D-20 recorded the two **back** motors the other way round.

So one of two things is true, and the bench test decides which:
(a) motors 2 and 4 really spin CW and CCW as recorded, i.e. both back motors are
    reversed relative to what the board mixes for; or
(b) the observation was right about the bells but the record's CW/CCW labels were
    copied from my wrong statement, and the motors are actually fine.
Either way the props fitted today were chosen against a wrong table, so at least one
prop may be the wrong hand for its motor. A wrong-hand prop pushes down: that flips
the aircraft toward that corner the instant it unloads, which is what "Attitude
failure (roll)" within a second of "Takeoff detected" looks like.

Plan (nothing on the board changes for any of this):
1. Pull `21_24_08.ulg` (and the two short ones before it) via QGC Analyze → Log
   Download into `logs/`. Actuator outputs and attitude will show which corner went
   down and which motors saturated.
2. Bench, props off, battery in: Actuators slider test again. Record the true spin
   direction of each motor seen from above, against the table above, not against D-20.
3. Any motor spinning the wrong way: swap any two of its three ESC-to-motor wires
   (PWM ESC, no parameter for this). Re-test. Photograph.
4. Props: read the hand marking on each prop (CW/CCW or the moulded rotation arrow)
   and fit CCW props to motors 1 and 2, CW props to motors 3 and 4. Photograph from
   above into `screenshots/`.
5. Re-check the frame's bottom-plate arrows against the table; if Holybro's arrows
   disagree with the board, say so here rather than picking one.
6. Correct D-20 and checklist line 1.20 once the truth is known. Until then the
   D-20 direction claim is **struck**.

### D-21 — Let the observer download flight logs (PROPOSED 2026-09-28; CLIENT APPROVED the same evening, option B)

**Ask (user, 2026-09-28 evening):** pulling logs from the board should be allowed for
Claude Code; the rule should say so.

**Why it is a decision, not a tweak.** D-11 says the observer never transmits, and
`tools/qgc-readonly-mcp/server.py` enforces it by replacing the socket's send methods
with a function that raises. Downloading a log means sending `LOG_REQUEST_LIST`,
`LOG_REQUEST_DATA` and `LOG_REQUEST_END` to the board (MAVLink log-transfer
protocol). Those messages change nothing on the aircraft, but sending them opens the
transmit path that D-11 closed. CLAUDE.md: "Do not add write tools without a new
D-number." This is that D-number.

**Facts checked.**
- QGC's forwarding code (`src/Comms/MAVLinkProtocol.cc`, `_forward()`) only writes
  vehicle packets out to the forwarding host. Whether QGC also routes packets that
  arrive from that host on to the vehicle is **not established** from the source read
  today; it would have to be tested. If it does not, a log-download tool cannot use
  UDP 14445 at all and would need the serial port with QGC closed (the one-tool-on-
  the-port rule).
- The SD card can always be read in a card reader with nothing transmitted, and QGC's
  Analyze → Log Download does the same job in a few clicks over USB.

**Options.**
- **A. No change (recommended for now).** Logs come off via QGC Log Download or the
  card reader into `logs/`; Claude analyses the file. Zero risk, nothing to build.
  Cost: a minute of the user's time per log.
- **B. Scoped transmit.** Add one tool, `download_log`, to the observer. The socket
  wrapper stays, but permits exactly three outbound message IDs (117
  `LOG_REQUEST_LIST`, 119 `LOG_REQUEST_DATA`, 122 `LOG_REQUEST_END`) and refuses
  everything else, and every transmit is written to the observer's log. Needs the
  QGC routing question answered first; if the forwarding port is one-way, B means a
  serial-port mode used only with QGC closed, which is a bigger change.
  Revert: delete the tool and the allow-list; the wrapper is back to D-11.

**Recommendation.** A today, so the roll-over log gets analysed now. Decide B as its
own small session if the QGC step turns out to be a nuisance. If B is chosen, the
CLAUDE.md wording becomes: "It never transmits, except the three log-transfer request
messages allowed by D-21."

**Log analysis (`logs/2026-09-28-03-212408Z-rollover-motors-3-4-crossed.ulg`, read with pyulog, 2026-09-28 late evening).**
Position mode. Timeline, board seconds:

| t | roll ° | pitch ° | roll rate °/s | MAIN 1 2 3 4 (µs) | controller demand |
|---|---|---|---|---|---|
| 888.2 | −1.4 | +5.3 | 0 | 1100 1129 1100 1129 | nose-down (aircraft read 5° nose-up on the ground), so rear pair 2 and 4 raised first |
| 889.5 | −0.5 | +5.0 | 7 | 1278 1499 1273 1500 | thrust building, first roll-right movement |
| 889.6 | +1.2 | +5.4 | 28 | 1347 1483 1189 1629 | roll-left demanded: right pair 1 and 4 above their partners |
| 889.7 | +6.0 | +7.1 | 75 | 1214 1648 1100 1762 | roll-left harder |
| 889.8 | +20 | +10.9 | 218 | 1140 1754 1100 1793 | roll-left saturating |
| 889.9 | +63 | +15.6 | 612 | 1100 1900 1100 1900 | fully saturated, stick pulled to −1 |
| 890.0 | +126 | +7 | 720 | 1100 1900 1100 1900 | on its side; failure detector fires at 890.22 |

Two physical facts fall out of this, independent of any parameter:
1. **Raising the rear pair (2, 4) made the nose go up**, not down. Rear motors that
   push the tail *down* do that.
2. **Raising the right-hand motors (1 and 4 above 3 and 2) made the aircraft roll
   right**, harder the more it was commanded. That is positive feedback: at least one
   right-hand motor was pushing down. Motor 4 was at the top of the range while 1 was
   driven to minimum, so 4 (back right) is the one pushing down.

The one explanation that fits both, and the runaway: **the two rear props are the wrong
hand for their motors.** Props were fitted to the D-20 table (2 CW, 4 CCW). The board's
geometry, and the fact that the aircraft did generate lift and roll so violently, say
the motors spin 2 CCW and 4 CW. A prop of the wrong hand on a motor pushes air *up*
and the aircraft *down* at that corner. The rear was pushed down (nose up), the right
rear harder than the left because the roll controller kept asking motor 4 for more.

Ruled out: motors on the wrong arms (would reverse pitch as well as roll in a way that
does not match row 1), flight controller mounted backwards (`SENS_BOARD_ROT` 0 and the
heading check passed), a dead motor (all four outputs moved). A least-squares fit of
rotation against motor commands was tried and discarded: the commands move in
lock-step pairs at 10 Hz and the fit flipped sign between windows.

**If the bench slider test confirms 1 CCW, 2 CCW, 3 CW, 4 CW, the fix is to swap the
two rear props** (CCW prop on motor 2, CW prop on motor 4) and nothing else. If the
slider test instead shows 2 CW / 4 CCW, the motors are reversed and two wires get
swapped on each of those ESCs; the props then stay as they are. Either way no
parameter changes. Regression fit and timeline scripts were run ad hoc; the numbers
above are copied from their output.

**Bench slider test, props off, 2026-09-28 late evening (user, looking down, nose up
the page):** MAIN1 → front right, CCW. MAIN2 → back left, CCW. **MAIN3 turns the
back-right motor. MAIN4 turns the front-left motor.** Directions of those two: to be
recorded. Physical layout front row 3 (left) 1 (right), back row 2 (left) 4 (right).

**Correction to the log analysis above.** I wrote that motors on the wrong arms was
ruled out. That was wrong. With MAIN3 and MAIN4 crossed, every row of the timeline is
explained without any prop being wrong: the nose-down demand raised 2 (back left) and
4 (which is really front left), i.e. the whole left side, so the aircraft rolled right
and did not pitch down; the roll-left demand then raised 1 (front right) and 4 (really
front left) and lowered 2 and 3 (really back right), which is a front-pair-up /
back-pair-down pattern with no roll authority at all, so the roll ran away. The "wrong
hand rear props" paragraph is withdrawn. D-20's "verified" motor positions were
wrong for 3 and 4; the slider test in that session must have been read against the
diagram rather than the arms.

### D-22 — Motor 3 / Motor 4 crossed on the breakout: fixed by swapping the two ESC leads (DONE 2026-09-28; a parameter remap was tried first, then reverted)

**What:** on the PWM breakout, exchange the two-wire ESC leads that are in positions 3
and 4, so that MAIN3 drives the front-left motor and MAIN4 the back-right motor, as the
airframe geometry expects (`CA_ROTOR2` = +1,−1 front left; `CA_ROTOR3` = −1,+1 back
right; both `KM` −0.05, CW).

**Why physical rather than a parameter:** setting `PWM_MAIN_FUNC3=104` and
`PWM_MAIN_FUNC4=103` would also work, but then the wiring would disagree with every
PX4 diagram and with the frame's numbering, which is exactly the kind of hidden
mapping a student rebuilding the aircraft would trip over. The wiring should match
the picture. No parameter changes.

**Revert:** swap the two leads back.

**Verify after:** slider test props off: slider 3 turns front left, slider 4 turns back
right, both CW; 1 and 2 unchanged, CCW. Then fit props by the motor's spin direction
read from the prop's own marking: CCW props on 1 and 2, CW props on 3 and 4. Then
diff live against `params/2026-09-28-motors.params`: nothing should move.

**D-22 status change, 2026-09-28 late evening.** Before a decision was recorded the
user applied the *parameter* version in QGC's Actuators page: live board now reads
`PWM_MAIN_FUNC3=104` (Motor 4) and `PWM_MAIN_FUNC4=103` (Motor 3); baseline file has
103 / 104. Screenshot `screenshots/2026-09-28-qgc-actuators-remap.png`. Observed by
`diff_live_against_file` (cache had only the two freshly written values after a
reconnect; full re-diff needed after Refresh). This is functionally equivalent to the
lead swap. **The two fixes are exclusive: doing both re-crosses the motors.** Whichever
is kept, the other must not be done. If the parameter route is kept, D-22 is re-titled
"remap by parameter", the wiring note in HANDOFF/checklist must say "breakout position
3 → back-right motor, position 4 → front-left motor, mapped in parameters", and the
next snapshot becomes the baseline. My recommendation (wiring matches the diagram)
stands but the choice is the client's.

**D-22 DONE (parameter route), 2026-09-28 late evening.** User confirmed from the
sliders: MAIN 3 (`PWM_MAIN_FUNC3=104`) now drives the back-right motor as Motor 4,
MAIN 4 (`PWM_MAIN_FUNC4=103`) drives the front-left motor as Motor 3, and the sliders
match the physical layout and the Actuators diagram. Wiring untouched: breakout
position 3 → back-right ESC, position 4 → front-left ESC. Two parameters changed from
`2026-09-28-motors.params`; source for the function values: PX4
`src/lib/mixer_module/output_functions.yaml` (Motor1..4 = 101..104), as in D-20.
Revert: FUNC3=103, FUNC4=104 *and* swap the two leads, or FUNC3/4 back alone if the
leads are ever swapped. Remaining before the props go back on: spin direction of the
front-left and back-right motors confirmed CW from the sliders; prop hand read from
each prop's marking; QGC Refresh, full diff, snapshot `2026-09-28-motor-remap.params`
as the new baseline.

**D-22 FINAL, 2026-09-28 late evening.** The user rewired: the ESC leads in breakout
positions 3 and 4 were exchanged, and `PWM_MAIN_FUNC3` / `PWM_MAIN_FUNC4` were put back
to 103 / 104 (read live from the board). Slider test props off: every slider turns the
motor the Actuators diagram shows, in the direction it shows (user's report). Net
parameter change from `2026-09-28-motors.params`: **none**; baseline unchanged, to be
confirmed by a full diff after a QGC Refresh. The parameter-route paragraph above is
history only. Photo `screenshots/2026-09-28-pwm-breakout-wiring.jpg` shows the OLD,
crossed wiring; a new photo is wanted.

### First hovers after D-22 — 2026-09-28, board time 22:45–22:49 (logs copied from the SD card)

Six armed sessions, five airborne, all Position mode, sticks centred except throttle.
Read with pyulog; numbers below are from the logs, not from anyone's memory.

| Log | Airborne | Max alt | Max roll / pitch | Drift from lift-off | Pack start → min V | Remaining % | Max A |
|---|---|---|---|---|---|---|---|
| 22_45_38 | none | | | | | | |
| 22_45_54 | 9 s | 0.1 m | 3° / 3° | 0.1 m | 15.55 → 14.41 | 86 → 64 | 18.7 |
| 22_46_46 | 16 s | 0.0 m | 6° / 7° | 0.2 m | 15.65 → 14.58 | 84 → 57 | 24.9 |
| 22_47_15 | 21 s | 1.5 m | 3° / 2° | 0.1 m | 15.93 → 14.35 | 79 → 43 | 27.1 |
| 22_48_01 | 13 s | 0.1 m | 4° / 3° | 0.4 m | 15.70 → 15.06 | 78 → 60 | 8.9 |
| 22_48_47 | 25 s | 1.6 m | 4° / 11° | 0.6 m | 15.64 → 14.98 | 77 → 57 | 9.0 |

**Attitude and position: good.** Roll and pitch within a few degrees, position held
within 0.6 m, no attitude failures, no estimator warnings. D-22 is confirmed in the
air. The "max alt 0.0–0.1 m" flights are skids-just-off hops.

**Battery failsafe fired twice (22_46_46 at 271.6 s, 22_47_15 at 303.6 s).** In the
second the sequence was "Low battery" → Hold 5 s → Return → "RTL: start return at
253 m (2 m above destination)" → "land at destination" → landed → disarmed. So D-19
works as configured. Why it fired at a displayed 43 %: the pack was only ~3.9 V/cell
at the start (15.5–15.9 V, i.e. not fully charged; checklist 1.11 wants 95 %+), and at
27 A it sagged to 14.35 V = 3.59 V/cell, below `BAT1_V_EMPTY` 3.6, so the
voltage-based estimate dipped through the 20 % critical line for a moment.
`BAT1_R_INTERNAL` is −1 (no load compensation). Two consequences, no change made:
fly on a full pack; and a future D-number could consider PX4's internal-resistance
estimate so the percentage does not dip under load. Also learned: **within
`RTL_MIN_DIST` (10 m) of home, Return does not climb to 30 m**, it lands from where
it is. Checklist 2.9 flies 15 m out precisely so that the 30 m climb is exercised.

**One thing to fix before more flying: a constant yaw-torque demand.** In every
flight the CCW pair (motors 1 front right, 2 back left) averaged 150–350 µs above the
CW pair (3 front left, 4 back right), yaw stick dead centre, heading held. The yaw
torque setpoint averaged +0.13 to +0.22 of full scale and never went negative. The
controller is holding the nose against a steady nose-left torque: the CW props are
making more drag torque per unit thrust than the CCW props, or the CW ESCs deliver
more RPM per microsecond than the CCW ESCs. Candidates, cheapest first: (1) the ESC
calibration mismatch the user found on the sliders afterwards and re-calibrated (a
pair-wise throttle-range difference looks exactly like this); (2) the replacement
prop is a different size, pitch or brand from the other three; (3) a bent prop or a
motor no longer square on its arm after the roll-over. It did not make the aircraft
unsafe today but it eats yaw authority and battery. The test is one more hover log
after the ESC re-calibration: the split should shrink to tens of µs.

**Vibration:** `accel_vibration_metric` max 2.2–4.8 m/s² across flights; no
estimator complaints. To be judged against PX4's log-analysis guidance, not by me.

Parameters: `PWM_MAIN_FUNC3/4` 103/104 and MIN/MAX 1100/1900 in every log header,
i.e. baseline. Full live diff still owed after a QGC Refresh. The SD card also
holds `param_import_fail.txt` dated 1999 (no clock yet): the board's very first boot
with an empty parameter store, 0/2065 parameters. Factory first-power-on, harmless.

### Hover 23:03:40 board time, 2026-09-28 — "critical battery" analysed. There is no power dump.

Log `logs/2026-09-28-11-230340Z-hover-39s-critical-battery-land.ulg`. Position mode, 39 s airborne, hover current a steady 14–16 A,
max 18.6 A at lift-off. That is a normal hover for this aircraft. Battery timeline:

| t | Event | Pack V | per cell | A | Board % | mAh used so far |
|---|---|---|---|---|---|---|
| 207.6 | armed, at rest | 15.74 | 3.94 | 0 | 75 | 0 |
| 223.8 | Low battery warning | 14.84 | 3.71 | 14.8 | 30 | 34 |
| 243.8 | Critical → Hold 5 s → Land | 14.74 | 3.68 | 15.1 | 20 | 118 |
| 244.0 | lowest reading | 14.33 | 3.58 | 14.1 | 20 | |
| 254.0 | landed; user killed at 254.5; disarmed 256 | 15.0+ | | | 55 | 150 |

Three things stack up:
1. **The pack was not full.** Every flight today started at 4.04 V/cell or less; this
   one at 3.94 V/cell, which is roughly 70 % real charge. Full is 4.20 V/cell, 16.8 V.
2. **The pack sags hard under load**: about 1.1–1.4 V at 15 A, and 5 V at the 66 A
   spike in the roll-over log (11.23 V at 890.1 s). That is 70–90 mΩ for pack plus
   wiring, three to five times what a healthy 5200 mAh 130C pack and short leads
   should show. Suspects: a tired or mis-rated pack, XT60 contact resistance, the
   PM02 and its leads, ESC power joints on the distribution board.
3. **The board's percentage is voltage-only.** `BAT1_R_INTERNAL` = −1 so there is no
   load compensation; `BAT1_V_EMPTY` 3.6 / `BAT1_V_CHARGED` 4.05 map 3.71 V/cell to
   about 25–30 % and 3.68 to 20 %, straight into the D-19 thresholds, while only
   150 mAh (3 % of the pack) had actually been used. Reading back at rest after
   landing the same pack shows 55 %.

Net: the failsafe did exactly what D-19 asks; the *input* to it is a sagging, not-full
pack read without load compensation. Fixes in order of cheapness: charge to 16.8 V
and verify with a meter; find the resistance (warm connector, bad joint, or the pack
itself); then, as its own D-number, give the board a measured internal resistance so
the percentage stops following the sag. No parameter touched tonight.

**Yaw split still present after the ESC re-calibration**: MAIN 1/2 ≈ 1700 µs, MAIN 3/4
≈ 1330 µs throughout the hover, yaw stick centred. So it is not ESC throttle range.
Remaining candidates: props not all the same model (the replacement), a bent prop, a
motor not square on its arm, or the two CW ESCs configured differently from the two
CCW ESCs (BLHeli_S settings; reading them is a separate session with a free
configurator, D-09 applies). This is also the "uneven descent / motors cutting" the
user felt: the CW pair reaches the 1100 floor first when the throttle comes down.

### D-23 — Companion web app in `NextApp/` (requested by the user 2026-09-29; BUILT the same day)

**What:** a Next.js application, working title "Flight Companion", kept in `NextApp/`.
Three jobs: (1) build and run checklists for pre-flight, in-flight, landing,
post-landing and post-flight; (2) plan flights for different survey types and export
them as files QGroundControl or Mission Planner can open; (3) open PX4 flight logs
(`.ulg`) and show them as interactive charts, a map track, events and parameters.
It works beside the ground station. It does not replace it.

**Boundaries, so the hard rules for the flight controller stay intact:**
- The app never connects to the aircraft. No serial, no MAVLink, no UDP. It reads log
  files from disk and writes plan files to disk. Uploading a plan is done by a human
  in QGroundControl, as before.
- D-09 holds: every dependency is permissively licensed and free (Next.js, React,
  Tailwind, uPlot, Leaflet, lucide icons, zustand: MIT/BSD/ISC). Map tiles come from
  OpenStreetMap, no account, no key. Nothing subscription-licensed.
- All data stays in the browser on the laptop (local storage). No server, no cloud.
- Log formats in the first version: PX4 ULog only. ArduPilot `.bin` and MAVLink `.tlog`
  are not read yet and the app says so rather than guessing.

**Why:** the paper checklist and my ad-hoc log scripts did the job on 2026-09-28 but
neither is something a student can pick up. The roll-over, the crossed motor pair,
the yaw split and the battery sag were all found by reading a log; that reading
should be a screen anyone in the class can open.

**Revert:** delete `NextApp/`. Nothing else in the project depends on it.

**Correction to the battery analysis, 2026-09-29.** The entry "Hover 23:03:40" above
put pack-plus-wiring resistance at "70 to 90 mΩ". That was read off a handful of
samples by eye and is too high. Measured properly from the same log, two ways that
agree (pyulog, and the companion app's own reader): resting voltage 15.73 V before
takeoff; in the air 14.94 V at a mean 12.7 A, which is **63 mΩ**; taking only the
steady hover at 14 A and over, 14.86 V at 15.3 A, **57 mΩ**. Say 57 to 63 mΩ, about
15 mΩ per cell including wiring. The conclusion does not change: that is still
several times what a healthy 5200 mAh pack and short leads should show, and the
sag still takes the voltage-only percentage through the failsafe thresholds. The
"5 V at 66 A" figure from the roll-over log (76 mΩ) stands as measured but is a
stalled-motor spike, not a hover.

**D-23 BUILT, 2026-09-29.** "Flight Companion" is in `NextApp/`: Next.js 16, React 19,
TypeScript, Tailwind 4. Its shell, registry, stores and design tokens are the user's own
sample app (`SampleApp/nro-studio`) carried over: one folder per domain with a manifest,
zero-prop slots, a header island with a drawer toggle on each side, a left unit that
collapses to a rail, a paged right drawer, a five-keycap footer that reads N/A until a
domain declares it. Auth and the asset vault were dropped; an aircraft dock took the
vault's place. Three domains:

- **Checklists.** Five phases, go/no-go items, notes, saved runs, print. Seeded with this
  aircraft's checklist from `flight-checklists.md`, carrying the corrected motor layout
  and the "a pack is full when a meter says 16.8 V" rule.
- **Flight Planner.** Area grid, crosshatch, corridor, orbit, perimeter. Ground detail,
  spacing, flight time against the aircraft's endurance, warnings. Writes a
  QGroundControl `.plan` or a `QGC WPL 110` list. Camera presets are copied from the
  Raspberry Pi camera documentation; the AI Camera is absent because its table could not
  be read from a primary source, and any other camera is entered by hand.
- **Flight Logs.** Reads PX4 `.ulg` in the browser. Findings first, then fifteen charts
  that share one time range and cursor, a map, events, parameters. It reproduces from the
  logs, without help, what was found by hand on 2026-09-28: the roll-over and its timing,
  motors 1 and 2 working harder than 3 and 4, the pack not full, the voltage sag, and the
  percentage following the sag rather than the charge.

Checked, and how (`NextApp/docs/VERIFICATION.md`):
- Log reader against pyulog, every field of every topic of all eleven logs: 25,790
  fields, 0 failures.
- Flight analysis against the figures recorded in this log on 2026-09-28: 58 checks pass.
  One check corrected this log (the resistance entry above).
- Planner against answers worked out on paper: 124 checks pass.
- Driven end to end in Chrome, light and dark, at desktop, tablet and phone widths: no
  console errors. Two faults were found this way and fixed: three clicks on the opening
  world map asked the planner for a continent of lines and overflowed the stack (the
  planner now refuses areas over 20 km or 400 lines, and the map ignores clicks until it
  is zoomed in); and a saved map view was ignored on reload.

Not checked: **no exported plan has been opened in QGroundControl.** The file follows
the published format and its structure is tested, but the first real plan must be opened
in QGC's Plan view and looked at before it goes near the aircraft. The thresholds behind
the findings are rules of thumb and say so. Only logs from this aircraft on PX4 v1.16.0
have been read. ArduPilot `.bin` and `.tlog` are refused with a message.

Boundaries held: the app has no serial, MAVLink or network path to a flight controller.
D-09 holds: every dependency is MIT, BSD, ISC or Apache-2.0; map tiles are OpenStreetMap.

Practical note: `NextApp/node_modules` and `NextApp/.next` sit inside OneDrive. They are
tens of thousands of small files that OneDrive will try to sync. If that becomes slow,
move the project folder out of OneDrive or exclude those two folders from sync; nothing
in the app depends on where it lives. (`.mcp.json` does: it holds absolute paths.)

Run it: `cd NextApp`, `npm install` (first time), `npm run dev`, open
http://localhost:3000. Every check: `npm run verify`.

### Session 2026-09-29 (afternoon) — companion app, second round. Decisions D-24 to D-28

The user's direction, in their words where it matters: the app must "read these types
of files, edit them, and even create them as well to be compatible with things like qgc
and mission planner"; "the Assistant is last, that is the cherry on top for later and
not the requirement right now"; "no PII goes on github but let me decide, each item we
need to select"; and "the system should be built with the understanding that an LLM will
be parsing the data and so we need to make it as easy as possible and friendly for the
user". No source links were available for the two formats named, so both were taken from
the publishers' own specifications.

**D-24 — Missions domain (BUILT 2026-09-29, see the next entry).** One domain for every mission file, not one per
file type. Every format is read into a single internal mission model and written back
out of it. Writing to a format that cannot hold something produces a conversion report
that names what was dropped. Formats and their sources:

| Format | Source read 2026-09-29 | Holds |
|---|---|---|
| QGroundControl `.plan` | docs.qgroundcontrol.com, "Plan File Format" | mission, geofence, rally points |
| `.waypoints` "QGC WPL 110" | mavlink.io, "File Formats" | mission only |
| Garmin `.fpl` | Garmin's schema, `FlightPlanv1.xsd` | named waypoints and the order to fly them |
| DJI WPML `.kmz` | DJI's `Cloud-API-Doc` repository (MIT), WPML pages | route, heights, speeds, actions |
| KML `.kml` | OGC KML 2.2 schema | points, lines, areas |
| GPX `.gpx` | Topografix GPX 1.1 schema | waypoints, routes, tracks |

Two facts from those sources that correct what was pasted into the conversation:
- **Garmin `.fpl` is a crewed-aircraft format.** A waypoint is an identifier of 1 to 12
  capital letters and digits, a type, a country code, a latitude and a longitude.
  Elevation is optional and "ignored by panel mount devices". There is no height per
  leg, no speed and no command. A drone mission written to `.fpl` loses all three.
- **DJI WPML's product lists name M300 RTK, M350 RTK, M30/M30T, M3E/M3T/M3M and
  M3D/M3TD.** Agras does not appear in them. The pasted text said Agras uses this
  format; DJI's specification does not support that, so the app presents WPML as the
  enterprise route format and makes no claim about Agras.

**D-25 — Parameters domain (BUILT 2026-09-29, see the next entry).** Open QGroundControl `.params` and Mission
Planner `.param` files, compare two, group by prefix, keep notes per parameter, export
the comparison. It says which autopilot a file belongs to and flags ArduPilot names, the
trap recorded in CLAUDE.md. It can write a parameter file. It never sends one to an
aircraft: loading a file in the ground station is a human act, and this project's rule
that every parameter change gets a D-number still applies to the person who does it.

**D-26 — Built to be read by an assistant (BUILT 2026-09-29, see the next entry).** Everything the app knows is
also available as a plain document with units spelled out: a command-line tool
(`NextApp/bin/fc.mjs`) over the same functions the screens use, a "copy for an
assistant" button in each domain, versioned JSON with a named schema, and a guide
written for the assistant (`NextApp/docs/FOR-ASSISTANTS.md`). An assistant running in a
terminal can use the command-line tool today, before any Assistant domain exists.

**D-27 — Assistant domain (DECIDED, deferred, last).** A terminal-style panel that
starts whichever coding assistant the user already has installed and signed in: Claude
Code, Codex or another. The user's own subscription does the work, so the app holds no
API key and bundles no paid service, which keeps D-09 intact. An MCP server over the
D-26 functions ships with it. Rule unchanged: no tool that transmits to a flight
controller. Not started.

**D-28 — What is published is chosen item by item (OPEN, the user decides).** Nothing
is uploaded by this work. `PUBLISHING.md` lists every file that carries a location, a
name or a device identity, with the choices for each: leave out, rename as an example,
or anonymise. The app ships only samples it generated itself at a location that is
already public in the PX4 documentation.

### D-24, D-25, D-26 BUILT; D-28 inventory written (2026-09-29, evening)

Same session, continued. Nothing on the aircraft was touched: no board was connected
and no parameter was changed. This entry is about the companion app only.

**D-24 Missions: BUILT.** `NextApp/lib/mission/` (one model, eight readers and writers,
the checks), `NextApp/domains/missions/`, route `/missions`. Sources are those listed in
the D-24 table, plus two read from source code because the documents did not settle
them:

| Fact | Source |
|---|---|
| QGroundControl's `AltitudeMode` in a plan item: 0 mixed, 1 relative, 2 absolute, 3 calculated above terrain, 4 terrain frame, 5 none. A MAVLink terrain frame is written as 4. | QGroundControl source, `src/QmlControls/QGroundControlQmlGlobal.h`, enum `AltitudeFrame` |
| Names and parameter meanings of 128 MAVLink commands | MAVLink `common.xml`, turned into `lib/mission/mavlinkCommands.ts` by `scripts/generate-mavlink-table.py` |

What the checks found and what was changed because of them:
- Reading an ArduPilot mission and writing it back changed numbers the model has no word
  for: the frame of a return, the kind of speed, a takeoff's empty position. Fixed: each
  item keeps the row it was read from, and the writer overwrites only the slots the model
  owns. Four ArduPilot autotest missions now come back the same in every number of every
  row.
- Five of my own expected values were wrong and the code was right: the file QGroundControl
  calls `100Waypoints.mission` holds 97 waypoints; its Mission Planner sample holds five,
  not three; the route length of the test mission is 392 m with the leg home.

Checked: 312 checks with other projects' files present, 246 without. Files written as
Garmin `.fpl`, GPX and KML pass their owners' schemas (21 files, including every example).
**Not checked: no file written by the app has been opened in DJI Pilot 2, on a Garmin
device or in Mission Planner, and none has been flown.** The app says so on its Settings
page and in the report beside each download.

**D-25 Parameters: BUILT.** `NextApp/lib/params/`, `NextApp/domains/parameters/`, route
`/parameters`. The rule "never guess a parameter name or value" is kept by the app
holding PX4's own reference and writing nothing of its own:

| Fact | Source |
|---|---|
| Description, unit, limits, default, listed values and bitmask of 2,696 parameters | PX4-Autopilot at tag `v1.16.0`, `docs/en/advanced_config/parameter_reference.md`, which PX4 generates from its source. Licence CC BY 4.0. Turned into `NextApp/public/data/px4-v1.16.0-parameters.json` by `scripts/generate-px4-params.py`. |
| Layout of a QGroundControl `.params` file | docs.qgroundcontrol.com, "Parameters File Format" |
| Layout of a Mission Planner `.param` file | **No specification found.** Read from the shape of the files: a name, a comma or white space, a value. Stated as such in the app. |

Cross-check against this aircraft, which is independent of the app: of the 1,116
parameters in `params/2026-09-28-motors.params`, 1,115 are in PX4's reference and the
type agrees for every one. The one that is not is `COM_DLL_EXCEPT`. No value in that file
is outside the limits the reference gives, and none is off a list of values.

All nine files in `params/` were read and written back and came out the same byte for
byte. The comparison of `2026-09-28-switches.params` with `2026-09-28-radio.params`
gives six parameters and no others: `COM_FLTMODE1` 8, `COM_FLTMODE4` 1, `COM_FLTMODE6`
2, `RC_KILLSWITCH_TH` −0.75, `RC_MAP_FLTMODE` 6, `RC_MAP_KILL_SW` 8. That is D-16 as
this log recorded it.

A fault found by the real file and not by invented data: PX4 writes the listed values of
a decimal parameter as `1.0` and `-1.0`; the app looked for `1`, and reported eighteen
`RCn_REV` values as not listed. Fixed, with a check.

What the Parameters domain will not do, by design: send a parameter to an aircraft; say
what a parameter should be set to; offer a PX4 name for an ArduPilot name. An ArduPilot
name in a PX4 set is reported as Stop, with the instruction to look the PX4 parameter up.
Its list of ArduPilot name shapes is a list of patterns, not a reference: a name is
flagged only when it matches one AND PX4's reference does not have it.

**D-26 Built to be read by an assistant: BUILT.** `NextApp/bin/fc.mjs`, thirteen
commands, JSON out; `NextApp/docs/FOR-ASSISTANTS.md`; a "Copy for an assistant" button in
Missions, Parameters and Flight Logs. A log brief holds no latitude or longitude unless
asked for. 76 checks. The planner and the checklists have no such button yet.

**Learn mode: BUILT.** One switch, in the header and in Settings, on by default. Six
example missions and four example parameter sets, all made in code: the missions around
the default home of PX4's simulator, the parameter sets from the defaults in PX4's
reference. None is a recording. `node bin/fc.mjs samples-write <folder>` writes all of
them as files, 63 in all.

**D-27 Assistant: not started**, as decided.

**D-28: `PUBLISHING.md` written, in this folder. Nothing in it is decided.**

**A fact for D-28 that this session found and did not cause.** `NextApp/` is a git
repository with one commit, `2640f44`, made 2026-09-29 14:31 local time and pushed to a
public GitHub repository named `flight-companion`. The commit was not made by this
session, which has not committed or pushed anything. What that commit carries is listed
in `PUBLISHING.md` section 1. In short: no position of the flying site, no log, no
parameter file, no client name; it does carry the commit author's name and email, a
screenshot showing three real log names with flight figures, and the X500 V2 checklist
and aircraft profile. The map in its planner screenshots is a test point this session's
earlier walk-through chose, more than 1,000 km from the takeoff point in the logs.

**One more fact for D-28.** `build-log.md` itself holds the takeoff point of the logs, to
two decimals or better. That was found by comparing in code, without printing it. It
matters only if this file is ever published.

Two layout faults fixed in passing, both found on a phone-width screen: the planner's map
legend lay on top of the map's zoom buttons (moved to the right), and the Missions
header's buttons squeezed the mission's name out (the map tools moved onto the map).

State at the end: `npm run verify` passes every group (25,790 log fields with 0
failures, 58 analysis, 124 planner, 246 mission, 179 parameter, 76 command line).
`typecheck` and `lint` clean. `build` gives nine routes. Missions and Parameters were
each driven in Chrome at four sizes and two themes with no fault.

### D-29 — MCP servers shipped inside `NextApp/` for users' own computers (PROPOSED 2026-09-29, awaiting decision)

The owner confirmed two things on 2026-09-29: the public repository is `NextApp/` only,
never the whole `drone-class` folder; and the MCP work gathered in `MCP-SETUP/` by another
session is meant to go into `NextApp/` so that a user can set it up on their own machine.

**Why this needs a decision and is not just built.** `NextApp/` has one rule above the
others, recorded in D-23: it never connects to an aircraft, "no serial, MAVLink or UDP".
The observer listens on a UDP port for MAVLink. It cannot transmit, and it hears only the
copy QGroundControl forwards, but it is a link to a live aircraft's data, and putting it in
the app's repository changes what that repository is. That is an architecture change, so
it is written down first.

**Proposed shape: two servers, kept apart, neither inside the web app.**

| | Files server | Observer |
|---|---|---|
| Does | reads logs, missions and parameter files; explains PX4 parameters | listens to the copy of MAVLink that QGroundControl forwards |
| Built on | `bin/fc.mjs`, which exists and is checked | `tools/qgc-readonly-mcp/server.py`, 523 lines, which exists and is checked |
| Language | Node, no new dependency beyond an MCP library | Python 3.12, `pymavlink`, `mcp`, `pyulog` |
| Touches a network | never | one UDP port on the same computer, receive only |
| Needs an aircraft | no | yes, through QGroundControl |
| Installed | by default | only by a user who chooses it |

The web app and the command-line tool stay as they are: they open no port. The rule is
reworded, not dropped: "the app and its command-line tool never connect to an aircraft;
the optional observer hears what QGroundControl forwards and cannot send".

**What has to change in the kit before it can be public**, found by reading it:

1. `MCP-SETUP/mcp.example.json` is not valid JSON: its paths have single backslashes. It
   does not parse, and the text `INSTALL.md` says to replace is not the text in the file.
2. Every path assumes this folder's layout (`tools\qgc-readonly-mcp`, `MCP-SETUP`). In
   `NextApp/` the server and its documents would sit together, with paths relative to it.
3. The four documents refer to `build-log.md`, `HANDOFF.md`, `notes.txt`, `CLAUDE.md` and
   to D-numbers thirteen times. None of those files is published. The documents are
   rewritten to stand alone.
4. `server.py` names `build-log.md` and D-11 in a comment and in its refusal message. No
   path, name or position of this project is in it.
5. `autopilot_version` returns the board's identifier. That is right on the user's own
   machine, and the documents should say it is an identity before anyone pastes it.
6. macOS is untested, and the kit says so. The health check is Windows only.
7. The observer's four parameter-file tools overlap with `fc.mjs`, which also explains
   each parameter. One of the two is kept for files; proposed: the files server.

Licences, for D-09: `mcp` MIT, `pyulog` BSD-3-Clause, `pymavlink` LGPL-3.0. All free to
use; none is a subscription. `pymavlink` is installed by the user with pip and not
copied into the repository.

**D-21 stays as it is**: approved, not built, and not part of this. The published
observer has no transmit path.

**Order.** D-27 put the MCP server with the Assistant, last. The files server is small
because the command-line tool exists. Proposed order: files server, then the observer
port, then the Assistant panel.

**Revert.** Both servers are folders. Removing a folder and its entry in the MCP
configuration removes the server. Nothing is installed on an aircraft.

**Waiting on the owner for:** yes or no to the two-server shape; whether the observer is
in the public repository at all; whether the MCP work moves ahead of the Assistant panel.

### D-29 part 1 BUILT, D-30 APPROVED, D-31 PROPOSED (2026-09-29, late evening)

The owner's words: "go with electron and the hosted page, we will be going unsigned",
and, of the MCP work, that the domain in `NextApp/` "can teach a little about MCP and how
it works with respect to what we are doing and also be like a chatgpt/claude web chat App
that the little assistant widget is connected to". Also confirmed: only `NextApp/` is
published, never the `drone-class` folder.

Nothing on the aircraft was touched.

**D-29, the files server: BUILT.** `NextApp/mcp/files/server.mjs`, thirteen tools, each
one a command of `bin/commands.mjs`, which `bin/fc.mjs` now runs too: one set of
functions, two ways in. It speaks over standard input and output and opens no port.
Three tools write a file; none writes over a file that exists. Library:
`@modelcontextprotocol/sdk` 1.31 and `zod` 4.6, both MIT.

| Fact | Source |
|---|---|
| `McpServer`, `registerTool`, `StdioServerTransport`, `Client`, `StdioClientTransport` and their import paths | the SDK's own documents at tag v1.29.0, `docs/server.md`, `docs/client.md`, `docs/protocol.md` |

Checked by a real MCP client that starts the server as an assistant would: 45 checks
(`npm run verify:mcp`). Among them: no tool's name is send, upload, arm, set or connect;
the source imports no network, serial or process module; a refusal is an answer and the
server goes on answering; a thousand-parameter file comes back as a summary under 20,000
characters. **Not checked: the server has not yet been registered in Claude Code, Codex
or any other assistant and used from a conversation.**

The other half of D-29, the observer in the public repository, is still waiting on the
owner's yes or no.

**D-30 — The app is also shipped as a hosted page and as an Electron desktop app,
unsigned (APPROVED by the owner 2026-09-29; not started).**

| Fact | How it is known |
|---|---|
| The app builds as static files with no server: nine routes | tried on 2026-09-29 with `output: "export"` in a temporary config, which was restored afterwards. The exported files were not opened in a browser |
| The app uses no server feature: no route handler, no server action, no `next/image`, no middleware | searched |

Reasons for Electron over Tauri, as given to the owner: it carries its own browser
engine, so it draws what was tested, where Tauri draws with whatever the operating system
has and the client's Intel Mac is of unknown age; Node is built in, so the command-line
tool and the files server need nothing installed; and it can start a program on the
user's computer, which a web page cannot.

Known costs, stated to the owner: unsigned, Windows shows a warning to click through and
macOS blocks the app until the user approves it by hand; a `.dmg` must be built on a Mac
(GitHub's build machines, free for a public repository); data saved in the browser does
not move to the desktop app. **Owed before an installer ships: a read of OpenStreetMap's
tile usage policy as it applies to a desktop app.**

**D-31 — An MCP domain in the app, with a chat (PROPOSED; decided and BUILT in part the same night, see the next entry).**

What is settled by what the owner said: a domain that teaches what MCP is in terms of
this project, guides the setup, and holds a chat; and a small assistant widget, present
in every domain, connected to the same conversation.

What is a fact and shapes the design:

| Fact | Source |
|---|---|
| Claude Code runs from another program with `claude -p`. With `--output-format stream-json --verbose --include-partial-messages` it streams its answer as lines of JSON. `--resume <session id>` continues a conversation. `--mcp-config <file>` names the MCP servers. `--allowedTools` and `--permission-mode` say what it may do without asking. | code.claude.com/docs/en/headless, read 2026-09-29 |
| Run that way **without** `--bare`, it uses the login the user already has. With `--bare` it does not, and needs an API key. The same page says `--bare` "will become the default for `-p` in a future release". | the same page |
| A web page cannot start a program on the user's computer. | how browsers work |

What follows:
- The chat can only be connected to a real assistant **inside the desktop app**. In the
  hosted page the teaching, the setup guide and the tool list work, and the chat says
  that it needs the desktop app.
- The owner's requirement that the user's own subscription does the work is met today by
  `claude -p`. The note about `--bare` becoming the default is a risk to that, outside
  this project's control. It is recorded here so that nobody is surprised.
- **Not looked up yet, and needed before the chat is built:** the equivalent way to run
  Codex and any other assistant from a program; and whether each vendor's terms allow an
  app to drive its command-line tool under the user's login.
- The assistant gets the files server's tools and nothing else by default: it can read
  the user's files through them, and cannot run commands or edit files unless the user
  turns that on.

Proposed order: (1) the MCP domain's teaching, setup guide and tool list, which work
everywhere; (2) the chat's screens and the widget, against a bridge that is not there
yet; (3) the Electron app, which is the bridge; (4) the hosted page.

**Waiting on the owner for:** which assistants the chat must support at first; whether
the chat may be absent from the hosted page; and the observer question left from D-29.

### D-31 BUILT in part: the Assistant domain, the adapter layer, the widget (2026-09-29, night)

The owner's decisions, in their words: "claude code only for now but built as like our
own llm adapter where claude code is 1 of many that may be slotted"; "the API key for the
hosted page could be an alternative if the user wanted to do that as well or even if they
own their own custom API model"; and "chat is the domain's main screen with support for
showing images/videos in chat as well ... as well as file uploads from the chat input
box". On the observer: "not sure", with a request to have it explained. It stays
undecided and nothing of it was moved.

Nothing on the aircraft was touched.

**Built.**

| Piece | Where | State |
|---|---|---|
| The adapter contract | `NextApp/lib/assistant/types.ts` | built |
| Practice adapter: not an AI, answers from the tools | `lib/assistant/adapters.ts` | built, checked |
| Claude Code adapter: the command line and the reader of its output | `lib/assistant/claudeCode.ts` | built, checked against the real program |
| Nine tools the app runs in the browser | `lib/assistant/tools.ts` | built, checked |
| The chat: text, tool cards, pictures, video, attached files, drop, paste, Stop | `components/chat/` | built, checked in a browser |
| The Assistant domain: Chat, How it works, Set up, Tools | `domains/assistant/`, route `/assistant` | built |
| The widget, in every other screen, on the same conversation | `globals/assistant/` | built |

**Not built:** the desktop app that starts Claude Code from the chat (D-30); an adapter
for an API key of the user's own; an adapter for a model at an address the user gives.
In a browser, choosing Claude Code gives an answer that says why it cannot answer there.

**Facts, and where each is from.**

| Fact | Source |
|---|---|
| Flags used: `--print`, `--output-format stream-json`, `--verbose`, `--include-partial-messages`, `--mcp-config`, `--strict-mcp-config`, `--tools`, `--allowedTools`, `--permission-mode dontAsk`, `--add-dir`, `--append-system-prompt`, `--resume` | `claude --help`, version 2.1.285, and code.claude.com/docs/en/headless, both read 2026-09-29 |
| `--tools ""` switches every built-in tool off | `claude --help`: 'Use "" to disable all tools' |
| The prompt can be given on standard input, and `--resume <session id>` continues a conversation | tried on 2026-09-29: answered "pong", then recalled it |
| Run without `--bare`, Claude Code used the login it had (`apiKeySource: none`) | the `system/init` line of a real run |
| `claude mcp add --scope project <name> -- <command> [args]` | `claude mcp add --help` |
| The shape of a `tools/call` request and response | the MCP specification; the real server's answers are read by a real client in `verify:mcp` |

**What the live check found.** Started through a shell on Windows, the empty argument
after `--tools` is dropped, `--allowedTools` is read as its value, and no tool is
allowed. Claude Code was refused the tool and said, in its answer, that it would not
quote the default from memory. That is the behaviour this project wants, met by
accident. The fault was in the check's way of starting the program; the program is now
started directly. The rule is in `CLAUDE.md`.

**Three real runs of Claude Code were made for this**, each a short question, on the
account Claude Code is signed in to on this computer. The recording kept in the
repository (`scripts/fixtures/claude-code-stream.jsonl`) has the session id, the folder
and every other field of this computer taken out, and a check that fails if one returns.

**Decisions taken in the building, for the owner to overrule.**

1. **An assistant in the app has no tool that writes.** The MCP server has three that
   make a new file; the chat's tools have none. A chat is where a student types.
2. **Where a flight took off is left out of what an assistant is given**, unless the user
   ticks a box in the Sees page. A mission cannot be read without its positions, and the
   page says so.
3. **No picture is fetched from the internet to draw an answer.** An address in an answer
   is chosen by whatever wrote it. It is shown as a link.
4. **Claude Code is given the MCP server's tools and no built-in tool**: it cannot run a
   command or read a file of its own accord.
5. **The practice assistant exists** so that the chat works in a browser with no account,
   and so that the checks have something to drive. It says it is not an AI on every
   answer.
6. **Learn mode does not hide the Assistant's teaching views.** They are the domain.

**Owed before the API-key adapter is built:** D-09 says no subscription-licensed software
in the handoff. A key is the user's own and is paid by use, and the owner asked for it as
an option; it is noted here so the choice is on the record. A key typed into a web page
is kept by that page's browser storage, and the screen that asks for one has to say so.

Checked: `npm run verify` passes every group (the assistant's is 90 checks, 95 with
`--live`; the MCP server's is 45). `typecheck` and `lint` clean. `build` gives ten
routes. The Assistant was driven in Chrome at four sizes and two themes, 48 checks each,
with no fault; the only other computer the page spoke to was the map's.

### D-29 part 2 BUILT: the observer has a public copy in the app (2026-09-29, night; the owner's yes the same night)

The owner's words: "yes the observer i think should definitely be part of the features of
the app". That answers the question D-29 left open.

Nothing on the aircraft was touched, and **this project's own observer was not changed**:
`tools/qgc-readonly-mcp/server.py` is as it was, `.mcp.json` still points at it, and its
self-test still gives 21 of 21. What was made is a copy, in
`NextApp/mcp/observer/`.

**This changes the app's first rule, and the change is written here before anything
else.** D-23 said the app "never connects to the aircraft: no serial, MAVLink or UDP".
It now reads: the web app, the command-line tool and the files server open no link of
any kind and read files; the observer, an optional and separate program, hears a copy of
what the aircraft tells QGroundControl and cannot send. The reason is the owner's
decision that users of the app should be able to ask an assistant about the aircraft on
their bench, as this project has done since D-11. Revert: delete `NextApp/mcp/observer/`
and the entries that name it.

**What differs between the copy and the original, and why.**

| Change | Reason |
|---|---|
| Listens on `127.0.0.1`. The original listens on `0.0.0.0`, every address. | On every address, anything on the same network can send it made-up MAVLink and have it reported as the aircraft's. QGroundControl forwards to `localhost`, so nothing is lost. `QGC_FWD_HOST` still overrides it. |
| Latitude and longitude are left out of `sensors` and `latest` unless `FC_OBSERVER_PLACE=1`. Height is always given. | The rule the app already keeps for flight logs. An assistant passes on what it is given. |
| Three tools taken out: `read_params_file`, `diff_params_files`, `list_params_files`. `diff_live_against_file` stays. | The files server does the same and says what each parameter is. Nine tools, not twelve. |
| Its name is `flight-companion-observer`; its comments and its refusal message name no file of this project. | It is published; `build-log.md` and the D-numbers are not. |

**Unchanged, and checked to be**: `conn.write = _forbidden`, the socket wrapper that
refuses `send`, `sendto`, `sendall` and `sendmsg`, and `source_system=0,
source_component=0`. The script that made the copy stops if any of those lines is not
found exactly once in both files.

**A point for this project's own observer, for the owner to decide, not acted on.** The
original still listens on every address. On the home network that is a small risk; on a
classroom or a field network it is a real one: a device there could make the observer
report a vehicle that is not the aircraft. Changing it is one word in one line, and it is
a change to a tool this project relies on, so it waits for a yes.

**Found in the kit and corrected in the copy.** `MCP-SETUP/mcp.example.json` does not
parse as JSON: its paths have single backslashes. The app's two examples use relative
paths with forward slashes, parse, and a check reads them. The kit's own file was left
as it is, since it belongs to another session's work.

**Checked, 2026-09-29, Windows 11, Python 3.12.10.**

- The copy's self-test, 41 of 41, in the working environment and in a fresh one made
  from the copy's `requirements.txt`.
- A loopback: a real MCP client started the copy on a port nothing else used; a stand-in
  for QGroundControl's forwarding, which can only reach `127.0.0.1` and refuses the
  ports a ground station listens on, sent it made-up messages; the client was told of a
  quadrotor in `AUTO:LOITER`, a parameter and a board message. Run with the position
  left out and with it allowed.
- The health check, ported to the app's layout, runs and reports correctly that the app
  folder has no environment and no `.mcp.json` yet.
- `npm run verify:observer`: 40 checks.

**Not checked: the copy has not been connected to a real aircraft.** Nothing here
claims it has. The first person to do so should do it props off, and write the result
down.

The Assistant domain now teaches the observer (How it works), guides its setup (Set
up) and lists its tools (Tools). The command line the app builds for Claude Code can
name more than one server; an assistant started by the desktop app is allowed every
tool that reads or listens and none of the three that write a file.

State at the end: `npm run verify` passes every group. `typecheck` and `lint` clean.
The Assistant was driven in Chrome at four sizes and two themes, 52 checks each, no
fault; the Missions, Parameters and original walk-throughs still pass.

### D-32 — This project's observer listens on this computer only (DONE 2026-09-29, the owner's yes the same night)

**What.** One line of `tools/qgc-readonly-mcp/server.py`: the default of `QGC_FWD_HOST`
went from `0.0.0.0` to `127.0.0.1`. Nothing else in the file changed.

**Why.** On `0.0.0.0` the observer takes MAVLink from any device that can reach the
computer. It cannot be made to send, but it can be made to BELIEVE: a device on the
same network could have it report a vehicle, a mode or a parameter value that is not the
aircraft's, and a session diffing "live" against a snapshot would be reading made-up
values. At home the risk is small. On a classroom or a field network it is real.
QGroundControl forwards to `localhost:14445`, so nothing the project uses is lost.

**Source.** No parameter of the aircraft is involved and nothing on the board changed.
The address is the observer's own setting.

**Revert.** Set `QGC_FWD_HOST` to `0.0.0.0` in the `env` of `.mcp.json`, or put the
line back. Needed only if QGroundControl ever runs on a different computer from the
observer.

**Checked.**
- The guard against sending is untouched: `conn.write = _forbidden`, the socket
  wrapper and its four refused methods are on the same lines' text as before.
- `MCP-SETUP/selftest.py`: 21 of 21.
- Started by hand on a spare port with `--watch`, and sent made-up messages from this
  computer by `NextApp/mcp/observer/loopback_sender.py`: it reported
  `rx=True ... vehicle=MAV_TYPE_QUADROTOR MAV_AUTOPILOT_PX4 mode=AUTO:LOITER armed=False`.

**Not checked: the live link to the real board with this change.** QGroundControl and
the aircraft were not connected tonight. **The observer this session is running was
started before the change and still listens on every address**; the change takes effect
when Claude Code is next started in this folder. At the start of the next bench session:
ask for `status`, and expect `listening_on` to read `127.0.0.1:14445` and a
`MAV_TYPE_QUADROTOR` heartbeat. If data does not arrive, QGroundControl's forwarding
host is the first thing to look at: it must be `localhost` or `127.0.0.1`, not the
computer's network address.

`MCP-SETUP/README.md`'s settings table was brought in step.

### D-30 BUILT: the desktop app and the hosted page (2026-09-29, late night)

The owner's words: "yes change it, then start on the electron app". The first half is
D-32, above. This is the second.

Nothing on the aircraft was touched. The app still sends nothing to one.

**Built.**

| Piece | Where | State |
|---|---|---|
| The pages as files | `NextApp/out/`, by `npm run desktop:build` | built |
| The main process, the bridge, the launcher for Claude Code | `NextApp/desktop/main.ts`, `preload.ts`, `claude.ts` | built, checked |
| The tools server as one file | `desktop/dist/files-server.mjs`, 2 MB | built, checked |
| The Windows installer | `NextApp/release/Flight-Companion-Setup-0.1.0.exe`, 107 MB, unsigned | built, **not run** |
| The macOS `.dmg` | none | **not built**: it can only be made on a Mac |
| The hosted page | `NextApp/out-hosted/`, by `npm run hosted:build` | built, checked, **not published** |
| Two GitHub workflows | `NextApp/.github/workflows/` | written, **never run** |

**Facts, and where each is from.**

| Fact | Source |
|---|---|
| Electron 44.5.0 carries Node 24.21.0 and Chrome 152, and runs a `.ts` file as it is | asked of the program: `process.versions`, and a `.ts` file run with `ELECTRON_RUN_AS_NODE=1` |
| The app uses no feature of Next.js that needs a server | searched the source; the export builds ten routes |
| `--append-system-prompt-file` exists | `claude --help`, 2.1.285 |
| OpenStreetMap's rules for an app that shows its tiles | operations.osmfoundation.org/policies/tiles, read 2026-09-29; `desktop/README.md` sets each rule beside what the app does |
| `identity: "-"` makes an ad-hoc signature on macOS | **from memory of electron-builder's documentation, not looked up and not tried.** A Mac was not available. It is the first thing to check when a Mac is |

**End to end, on this computer.** In the desktop app, run from the folder and again
packed, a message typed in the chat ("What is the firmware default of BAT_LOW_THR, and
its unit?") was answered by Claude Code 2.1.285, under the login it already had. It
called `rules`, then `explain_parameter`, and answered 0.15 and "norm", adding that this
is the firmware's default and that an airframe changes many. Four more real runs of
Claude Code were made for this, each a short question.

**What Claude Code is given, decided in the building and open to the owner to change.**
The files server's ten tools that read; the built-in Read, for pictures; one folder, the
conversation's own. Not a shell, not a tool that writes or edits, not the web, not
another folder. What it asks for beyond that is refused rather than asked about, since a
student may be the one at the keyboard.

**What is open in the app reaches it as files**, written into the conversation's folder
before each answer: the mission as the app's own lossless document, the parameters as a
QGroundControl file, the log as its summary. The log goes as a summary and not as the
`.ulg` so that where it flew stays out unless the user has allowed it.

**Faults found by running it, and fixed.**

1. Started through a shell on Windows, the empty argument in `--tools ""` is dropped
   (recorded under D-31). The desktop app starts the program directly.
2. The main process fetched its own pages through its own guard, which lets no
   `file://` through. Nothing loaded. It reads the files now.
3. The page said "Claude Code" the first time it was drawn in the desktop app, while
   the built page said "Practice assistant". React reports that. Who answers is now
   read after the page has loaded, and also reflects whether Claude Code was found.
4. The packed app carried an empty `tools` folder: the rule that copies one file was
   written in a form electron-builder did not take. Written as a folder with a filter.
5. **A fault in Next.js 16.3.7 on Windows**, not in this project: the export writes
   `planner/__next.!KG1haW4p/planner/__PAGE__.txt` where the page asks for
   `planner/__next.!KG1haW4p.planner.__PAGE__.txt`. `next/dist/export/index.js` passes
   a path with backslashes to `convertSegmentPathToStaticExportFilename`, which
   replaces only forward slashes. Pages load; moving between them is slower.
   `NextApp/scripts/fix-export.mjs` corrects the output after each build and does
   nothing where the export is right. Next.js was not edited. **It has not been
   reported to the Next.js project**; that is the owner's to do or to ask for.

**Checked.** `npm run verify:desktop` 39 checks in the folder, 45 with `--live`, 33
against the packed app. `npm run verify:hosted` 47 checks, and the hosted build driven in
Chrome under its base path. `npm run verify` passes every group. `typecheck` and `lint`
clean.

**Not checked, and said in the app's own guide:** the installer has not been run;
nothing on macOS or Linux; neither workflow has run; Claude Code installed as a `.cmd`
script; a computer with no Claude Code; the hosted page on GitHub Pages.

**Not in the desktop app yet: the live observer.** It needs Python, which the installer
does not carry. It works today with Claude Code in a terminal
(`NextApp/mcp/observer/README.md`). Putting it in the desktop app is its own piece of
work: either the app sets up a Python environment when the user asks, or the decoder is
written again in JavaScript, which would need its own checking against the Python one.

**For the owner.**

- The two workflow files become able to run once they are pushed. `desktop.yml` runs on
  a tag beginning with `v` and makes a DRAFT release; `pages.yml` runs only when started
  by hand. `PUBLISHING.md` 2.10.
- The installer is a file on this computer and in no repository. Running it installs the
  app for the current user; nothing else was installed by this session.
- The User-Agent the app sends to OpenStreetMap names the app and no contact. The policy
  allows a contact and does not require one. Adding the repository's address would name
  the owner's account.

### D-33 and D-34 — The observer in JavaScript, the desktop app listening, and a contact for OpenStreetMap (APPROVED 2026-09-29, late night; the owner: "1. yes, 2. yes, 3. its ok to name my account")

Three questions were put to the owner after D-30 and answered in one message. This entry
records what was asked, what was approved and what it changes, before any of it is built.

**D-33, part 1: the MAVLink reader and the observer are written again in JavaScript.**
The owner: "i am liking the idea of the users not having to download python". The
public observer (`NextApp/mcp/observer/server.py`) needs Python 3.12, `pymavlink` and
`mcp`. The desktop app carries Node inside Electron and carries no Python. A reader in
JavaScript lets the desktop app and a plain Node install hear the aircraft with nothing
more installed.

- The message tables are GENERATED from MAVLink's own definitions (`common.xml`,
  `standard.xml`, `minimal.xml`, github.com/mavlink/mavlink, revision `87da370c02e4`),
  not typed by hand. MAVLink's COPYING file puts what is generated from its definitions
  under the MIT licence. No subscription is involved (D-09).
- What the generator works out is what MAVLink's documentation says a reader must work
  out: the order of fields on the wire and each message's CRC_EXTRA (mavlink.io,
  "Serialization").
- The reader is checked against `pymavlink`, the MAVLink project's own library, message
  by message, and the JavaScript observer against the Python one, tool by tool. It is not
  called done until both comparisons are clean.
- The reader reads. There is no function in it that makes a packet.

**D-33, part 2: the desktop app may open a listening port on this computer.** Until now
the desktop app "opens no port" (D-30). This changes that, so it is an architecture
change and is written down as one:

- One UDP socket, bound to `127.0.0.1`, port 14445 by default: the address
  QGroundControl forwards to. Not reachable from another computer.
- It is opened only when the user switches listening on in the app. It is off when the
  app starts. Reason: one port has one listener. An app that took the port at every
  start would starve an observer that an assistant's session had started, and the other
  way round.
- The socket's way of sending is replaced with a function that raises, as in the Python
  observers, and the checks try to send and must fail.
- The app still holds no link to the aircraft. It hears a copy of what QGroundControl
  hears, when QGroundControl is told to forward it.

**What D-33 does not change.**

- `tools/qgc-readonly-mcp/server.py`, this project's own observer, stays as it is, in
  Python. It is the one the bench sessions rely on.
- Nothing may transmit. D-21 (log download) stays approved, unbuilt and blocked; nothing
  here is a step towards it.
- The flight controller is not put under agentic control. An assistant is told what the
  aircraft reports. It cannot change a parameter, arm, or command anything.
- The Python copy in `NextApp/mcp/observer/` stays, as the reference the JavaScript one
  is checked against and for anyone who prefers it.

**Revert.** Remove `NextApp/lib/mavlink/`, `NextApp/lib/observer/`, the Node server and
the desktop app's listening; the Python observer is untouched by all of it.

**D-34: the app names a contact to OpenStreetMap.** The desktop app's map tiles come
from OpenStreetMap, whose tile usage policy asks for a User-Agent that identifies the
application, and allows a contact
(operations.osmfoundation.org/policies/tiles/). Until now the app sent
`FlightCompanion/<version> (desktop)`. The owner allowed the public repository's address
to be added, which names the owner's GitHub account. The email address is not used.
Revert: take the address out of the one line in `NextApp/desktop/main.ts`.

### D-33 and D-34 BUILT: the observer in JavaScript, the Live screen, the desktop app listening (2026-09-29, late night, into 2026-09-30)

Everything approved in the entry above is built, checked and documented. Nothing on the
aircraft changed. Neither observer copy, nor the desktop app, has heard the real aircraft
through the new code; that is the first thing to do at the next bench session.

**What was built, in `NextApp/`.**

1. `lib/mavlink/`: a MAVLink reader. `messages.ts` is generated by
   `scripts/generate-mavlink-messages.py` from MAVLink's `common.xml`, `standard.xml` and
   `minimal.xml` at revision `87da370c02e4` (235 messages, 160 enums, MIT for what is
   generated). The generator works out the field order on the wire and CRC_EXTRA as
   MAVLink's "Serialization" page says a reader must. `decode.ts` reads MAVLink 1 and 2,
   restores the zeros MAVLink 2 leaves off, steps over signatures, and has no function
   that makes a packet.
2. `lib/observer/state.ts`: the Python observer's cache and nine tools, tool for tool,
   plus a snapshot form for passing between two programs. `view.ts` makes the Live
   screen's summary from the same answers, so screen and assistant cannot disagree.
3. `mcp/observer/listener.ts` and `server.mjs`: the Node MCP observer. The socket's six
   ways of sending (`send`, `connect`, `setBroadcast`, `setMulticastTTL`, `setTTL`,
   `addMembership`) are replaced, before binding, with a function that raises, and the
   properties cannot be written or redefined. `mcp.example.node.json` is its setup. With
   `FC_OBSERVER_SNAPSHOT` set it opens no port and answers from a file.
4. The Live domain (`domains/live/`, `stores/domains/liveStore.ts`): horizon, armed, mode,
   height, speed, battery, GPS, sensors, the board's messages, traffic; a practice flight
   (`public/data/practice-telemetry.json`, one made-up minute built by
   `scripts/observer_practice.py`, every message prefixed "Practice:") for browsers; and
   "Listen for the aircraft", desktop app only. No position on the screen or in the report.
5. The desktop app: listening on `127.0.0.1:14445` (port from `QGC_FWD_PORT`, address
   fixed) only after the user switches it on, off at every start; what is heard written
   once a second to `userData/observer/heard.json` (written beside, then moved into place)
   and removed on stop and at quit. Claude Code, when the app starts it, is given the
   observer's nine tools through that file; its instructions say to call `status` and
   never to make up what an aircraft is doing.
6. D-34: the User-Agent for OpenStreetMap tiles is now
   `FlightCompanion/<version> (desktop; +https://github.com/jacob-the-parson/flight-companion)`.

**Found on the way, and fixed.** The public Python observer masked `lat`, `lon`,
`latitude`, `longitude`, `lat_int`, `lon_int` only. A mission's waypoints travel from
the aircraft in `MISSION_ITEM_INT` as `x` and `y`, and eight other fields hold a position
under other names (`next_lat`, `operator_latitude`, `lat_camera`...). The JavaScript
observer masks every field MAVLink gives in `degE7`, every name with lat or lon in it,
and `x`/`y` (`param5`/`param6`) of the six messages that carry a position without a
unit; the public Python copy was given the same list (self-test 41 → 43). This project's
own observer in `tools/` masks nothing and was not touched: it is the project's own.

**Checked** (`npm run verify`, every group green; `typecheck` and `lint` clean):
- `verify:mavlink`, 14,797 checks: the reader against pymavlink 2.4.50's recorded
  answers, `scripts/fixtures/mavlink-reference.json` written by
  `scripts/mavlink_reference.py`. Every message pymavlink has (210 of the 235): name,
  CRC_EXTRA, wire and written order, types, lengths; 1,400 packets, 11,300 fields read the
  same in MAVLink 1 and 2; signed packets read; 60 damaged packets refused; a stream read
  whole and in pieces of 1, 7, 64 and 1500 bytes. The comparison was made to fail on
  purpose first (my own test paired pymavlink's array lengths with the wrong field order,
  which the check caught).
- `verify:observer-js`, 204 checks: the nine tools against the Python observer's answers
  to a 39-packet made-up session at six points, 174 answers compared key by key
  (`observer-reference.json`, written by `scripts/observer_reference.py` with a clock the
  script moves). One difference on purpose, named in the check: the Python one calls two
  values within a millionth the same; this one uses the app's comparison. Three values
  altered in the reference gave exactly three failures.
- `verify:observer-node`, 105 checks: the guard; the listener over a loopback on a port
  asked of the system; a second listener told of the clash and taking over; the server
  started by a real MCP client, nine tools all marked read-only, the session played to it,
  the position left out and given when allowed, a file compared and left as it was;
  answering from a snapshot with no port opened; `--watch` prints.
- `verify:desktop`, 55 checks, 64 with `--live`: the real Electron app, on a test port,
  not listening at start; switched on from the Live screen, held the port, heard the
  reference, showed it, wrote the file; the observer given to Claude Code answered from it
  (`SYS_AUTOSTART` 4019, `HOME_POSITION` latitude "left out"); stopped, port free, file
  gone. With `--live`, Claude Code called `status` and answered: "No aircraft is being
  heard right now: the observer's last packet came about 10 seconds ago ... but that last
  heartbeat was from a PX4 quadcopter, armed, in Position mode (POSCTL)." That is the
  right answer: the check's burst of packets had ended ten seconds before.
- `verify:hosted`, 54: the Live page and the practice flight under the base path.
- Walk-throughs in Chrome (`scratchpad/drive-live.mjs`, 37 checks each) at wide, dark,
  tablet and phone: the practice flight arms, climbs, the horizon moves, messages and
  traffic show, the report downloads without a position, the dashboard has a line.
  Screenshots in `NextApp/docs/screens/live-*.png`.
- The self-checks are all made-up data on `127.0.0.1`; every test sender refuses 14445
  (this session's own observer holds it) and the ground-station ports.

**Two faults of my own tooling, for the record.** A regex `\b` written through a shell
heredoc became a backspace character (0x08) in `lib/observer/view.ts`; the walk-through
caught it as "Px4" on screen. And pymavlink lists array lengths in wire order and types
in written order; my first reference paired them wrongly and the check said so.

**Not checked.** The real aircraft through any of the new code; the desktop app on
macOS or Linux; the installer (not rebuilt tonight: `npm run desktop:dist` is owed
before the next release); the workflows, still never run.

**Docs brought in step:** `NextApp/docs/README.md`, `DOMAINS.md` (Live section, footer
row), `VERIFICATION.md` (sections 12 to 14), `README.md`, `desktop/README.md`,
`mcp/observer/README.md` (two forms, one table), this folder's `CLAUDE.md` and `HANDOFF.md`.

### D-35 and D-36 — PROPOSED, not decided: a 3D view, and live pictures and LiDAR from the Pi (2026-09-30)

The owner asked: "do you think it possible to also build a virtual sim using like three
js or something that pairs with the map data and live fed data? we also will be building
with raspberry pi and its cameras and its imx500 sony smart cam as well as lidars like
the yahboom tmini 25m and we eventually want to be able to have the drone feeding back
live images/lidar data to our ground station that then our MCP and live views can see".
Both are architecture changes and need the owner's yes before any of it is built. The Pi
side stays parked until then.

**D-35, a 3D view (three.js), proposed.** Possible, and mostly cheap, because the Live
screen already has what a 3D view needs: `LiveView` carries roll, pitch, yaw, height,
speed and heading at 10 Hz, and the practice flight drives it with no aircraft. A first
version would be a model of a quadrotor over a flat ground with a compass rose and the
mission's waypoints as posts, turning with the attitude and rising with the height,
beside (not instead of) the map. What it is NOT: a simulator. It shows what the aircraft
reports; it does not compute what an aircraft would do. A real simulator is PX4 SITL
(the firmware itself, on a computer), which QGroundControl connects to like an aircraft,
which means the Live screen and the observer already work with it unchanged; a 3D view
of SITL's telemetry is the same view. Three.js is MIT (D-09 satisfied). Position on the
view: the same rule as the map, off unless the user allows it, and never to an assistant.
Cost: a domain view and about a day; the model is a few boxes and cylinders, no assets.
Not proposed: physics, wind, collisions, or anything that would tempt a student to trust
the screen over their eyes.

**D-36, live pictures and LiDAR from the Pi to the ground station, proposed as a
direction only.** What must be true for it, in order, and what is not known:

1. *A link with room for it.* The SiK radio (D-17) is a 915 MHz telemetry link of a few
   tens of kilobits; it cannot carry video. The SIYI HM30 (D-15, approved, on hold) is
   the intended link, and its manual (`docs/SIYI-HM30-User-Manual-v1.3.pdf`) says the
   path exists: the air unit has an Ethernet port (LAN, GH1.25 4-pin, p17); third-party
   IP cameras are supported as RTSP streams on addresses `192.168.144.X` (section 6.2,
   p62, with some addresses taken by the two units and the UDP link); video comes out of
   the ground unit's LAN port to a Windows PC (6.6.4, p64) and dual streams only through
   LAN (p64); the datalink can be UDP on port 19856 (4.2, p53). Its own reference figure
   for video is 720p 30 fps at 1.57 Mbit/s in H.265 (p18). So a Pi on the air unit's
   LAN port, presenting itself as an IP camera, is the manufacturer's own use of the
   link, not a trick. What the manual does not say is what else may use that Ethernet
   (a plain UDP stream of detections and scans beside the video); that is the bench test.
2. *The Pi as a second talker.* Today one program talks to the aircraft (QGroundControl)
   and the observer only listens. A Pi on the aircraft that sends pictures to the ground
   is a second stream, beside MAVLink, not inside it; it must not be given a MAVLink
   route to the flight controller without its own D-number, or the "no agentic control"
   rule is broken by the back door.
3. *What the Pi sends.* For the IMX500 (an AI camera that runs a network on the sensor
   and gives detections as metadata), the useful stream to the ground is small: the
   detections (what, where in the frame, how sure) plus a low-rate JPEG, not raw video.
   For the LiDAR, the datasheet in `docs/` (`YDLIDAR-T-mini-Plus-Data-Sheet-V1.1`; the
   Yahboom unit is a YDLIDAR T-mini Plus) gives a 360-degree 2D scan at 6 to 12 Hz (6 by
   default), ranging at up to 4000 Hz, over a 3.3 V UART at 230400 baud on a GH1.25-4P
   connector (pp3 to 6). Its ranging distance is 0.05 to 12 m against an 80 %
   reflective surface and 0.05 to 4 m against a 10 % one (Chart 1, p4), with 0.54-degree
   angle resolution. **The "25 m" in the owner's message is not what this datasheet
   says**; if the unit in hand is a different model, its own datasheet goes in `docs/`
   before anything is planned around its range. At 4000 ranges a second a scan is a few
   hundred distances per turn, also small. Both fit a plain UDP or WebSocket stream of JSON with a picture now and
   then, on the Pi's own port, which the desktop app would listen for in the same way it
   listens for MAVLink: a second listener, read-only, this computer only.
4. *What the app and the MCP would do with it.* The Live screen gets a picture panel and
   a LiDAR ring (a polar plot of the scan around the aircraft); the observer's snapshot
   gains a `pi` section; the assistant gets `latest_picture` (the file) and `latest_scan`
   (the distances) tools, reading only. The 3D view of D-35 would draw the scan as points
   around the model. Nothing here sends anything to the Pi or the aircraft.
5. *Order of work.* HM30 manual read and its Ethernet passthrough tested on the bench with
   nothing but two computers (no flight); the Pi test bench (`drone-pi/`) brought up on
   its own; a stream from the Pi to a laptop over a cable; only then the app's second
   listener. Each step is its own session and its own entry.

Neither is started. D-35 can go first, since it needs no hardware and the practice
flight already feeds it.

### Pushed to GitHub for the client (2026-09-30)

The owner: "i want to go ahead and push to github so my client can take a look at what we
have, he is on mac". `NextApp/` commit `e4b98c7` (132 files, every domain to D-34) is on
`github.com/jacob-the-parson/flight-companion`. Before it: the scan `PUBLISHING.md`
section 5 asks for (every decimal outside the random fixtures is a constant or the
simulator's home; no name, path or email of this computer in any file; the thirteen
images looked at). The commit's author is the owner, as git is set up here.

The two workflow files are committed locally (`a93e6b6`) and not pushed: GitHub refused
them because the stored credential (Git Credential Manager) has no `workflow` scope. The
owner re-logs in once (`git credential-manager github logout`, then any push) and pushes.
Until then no `.dmg` can be built here (there is no Mac), so the client's choices are the
web version from source (`npm install`, `npm run dev`, Node 22.18 or newer) or building
the disk image himself (`npm run desktop:dist` on his Mac). Neither has been tried on a
Mac by anyone yet; the client's run is the first.

**Later the same night: the workflows are up and the first release is built.** The
credential for github.com was the GitHub CLI's, not Git Credential Manager's;
`gh auth refresh -s workflow` added the scope and `a93e6b6` went up. Tag `v0.1.0` was
pushed; the `desktop.yml` workflow ran for the first time (run 36660177756) and passed on
every machine: Windows in 3 m 13 s, macOS in 3 m 31 s. A DRAFT release holds
`Flight-Companion-0.1.0-arm64.dmg` (122 MB), `Flight-Companion-0.1.0-x64.dmg` (129 MB)
and `Flight-Companion-Setup-0.1.0.exe` (107 MB). Nobody has opened either disk image
yet; the client's Mac is the first. The draft is visible to the owner only until it is
published, or a file from it is sent by hand. `PUBLISHING.md` 2.10 and 2.11 are decided
by this.

**Correction to the paragraph above: the release is public, and the client has it running
on a Mac** (2026-09-30, same night, recorded 2026-10-14). The draft was published with
`gh release edit v0.1.0 --draft=false` and is at
`github.com/jacob-the-parson/flight-companion/releases/tag/v0.1.0`. The client installed a
disk image on **macOS Tahoe 26.6.2** and the owner reported it running. That is the
owner's report, not a check made here: which image (arm64 or x64) and which way past
Gatekeeper he used (System Settings, Privacy & Security, Open Anyway; or removing the
quarantine attribute with `xattr`) are not known. Right-click, Open no longer gets past
Gatekeeper on macOS 15 and later. So the ad-hoc signature (`identity: "-"` in
`desktop/electron-builder.yml`) has now been opened on one Mac, where before it was from
memory.

**Suspected defect, not verified, owed for 0.1.1.** `desktop/claude.ts` finds Claude Code
with `which claude`. An app started from Finder on macOS gets a short PATH that has
neither `~/.local/bin` (where Claude Code's own installer puts it) nor
`/opt/homebrew/bin`. With Claude Code installed, the Assistant screen may still say "not
found". Starting the app from Terminal
(`"/Applications/Flight Companion.app/Contents/MacOS/Flight Companion"`) inherits the
shell's PATH and should get round it. The fix is to look in those folders as well; it
waits for the client's report of what the Assistant screen says.

**The public docs are now stale in three places**, owed for a 0.1.1 commit and not
edited here, since `NextApp/` is the public repository and no push was asked for:
`desktop/README.md` and `docs/VERIFICATION.md` still list "neither workflow has run",
"nothing on macOS" and "the installer has not been run" under what was not checked. The
hosted page is still genuinely unpublished: `pages.yml` runs only when started by hand
and has not been. The Windows installer itself has still not been run on any computer.

### Session 2026-10-14 — the Pi and the app. Decisions recorded; D-37, D-38, D-39 PROPOSED

The owner opened the Pi side (parked since 2026-09-28): "today we are going to focus on
the pi and getting its contents/apps/ modules as a possible live connection to the flight
companion app on a new micro app domain". Then, mid-session: "the goal would be to get
them wired up, so the pi can communicate to the app, then also build a module that
combines template use cases for the imx500 and yahboom lidar together with the
understanding it can be attached to a RC device, like the pixihawk6c and others to pass
telemetry data/commands and things to the autopilot. pi is not connected currently but
will be after we talk".

**Decided by the owner today.**
- `PUBLISHING.md` 1.1: the commit author email stays ("yes my email").
- Bugs are filed in this project, not reported upstream ("no reports on bugs, just file
  those here in the project"). New file `KNOWN-ISSUES.md` at the root: six app issues,
  six Pi issues, four tooling issues, each with a status and where it is tracked. The
  Next.js export bug is A1 there.
- The LiDAR: the owner says "we do have the 25 m lidar". **Not adopted as a figure.** The
  three records disagree with it and with each other: the datasheet in `docs/` is the
  standard T-mini Plus (0.05 to 12 m at 80 % reflectivity, Chart 1 p4); the unit on the
  Pi is the SH ("森合") variant, driven with `TYPE_TOF` (Pi inventory 2026-09-28); the
  working `lidar_radar.py` sets `MaxRange` 16 m. The SH variant's own datasheet, or
  Yahboom's product page, is to be saved into `docs/`. Nothing below depends on the
  number: the app's display range is a setting. `KNOWN-ISSUES.md` P5.

**State found.** The Pi did not answer at the start of the session (`drone-pi-student.local`
did not resolve; `192.168.0.130` port 22 closed). The owner says it is off and will be
connected after the plan is agreed. On the board, from `params/2026-09-28-motors.params`:
`MAV_0_CONFIG=101` (TELEM1, the SiK radio, D-17), `MAV_1_CONFIG=0` and `MAV_2_CONFIG=0`
(the second and third MAVLink instances unused), `UXRCE_DDS_CFG=0`, `CP_DIST=-1`
(collision prevention off). Looked up in PX4 v1.16.0's reference with
`node bin/fc.mjs explain`: `MAV_1_CONFIG` takes 102 for TELEM 2; `MAV_1_MODE` takes
2 for Onboard; `SER_TEL2_BAUD` takes 57600 to 3000000 among others; `CP_DIST` is
"Minimum distance the vehicle should keep to all obstacles", only in Position mode,
negative disables it; `CP_GO_NO_DATA` allows moving where there is no sensor data. There
is no `COM_OBS_AVOID` in v1.16.0. Those value lists are PX4's general lists for every
board: **which TELEM ports the Pixhawk 6C has, and its TELEM2 pinout, are not read yet.**

The owner's message bundles three changes of very different risk. They are proposed
separately, so the one that is cheap and safe does not wait on the one that is not.

### D-37 — The app and the Pi: a read-only link and a Pi domain (PROPOSED 2026-10-14)

**What.** A small program on the Pi, the *bridge*, that reads the Pi's own sensors and
tells the app what it sees; and a new domain in the app, beside Live, that shows it.

- **What the bridge offers.** An inventory (the Pi's name and OS, the camera found or
  not, the 23 IMX500 models, the LiDAR found or not, the desktop apps); the LiDAR's scan
  (about 400 distances a turn, 10 turns a second, with the working SH settings copied
  from `lidar_radar.py` unchanged: `TYPE_TOF`, 230400 baud, `MinRange` 0.05,
  `IntenstiyBit` 16, the first 10 scans dropped); the camera's detections (what, where in
  the frame, how sure); and, only when switched on, a still picture now and then.
- **How.** HTTP on the Pi's network, with GET requests only, and a live stream of JSON as
  Server-Sent Events. Python's standard library does all of it: nothing to install on a
  Pi that refuses `pip` (`http.server`, `json`; the LiDAR through the YDLidar SDK already
  installed; the camera through Picamera2, already installed). **The bridge has no handler
  for anything but GET**, so it cannot be told to do anything: a check sends it a POST
  and expects it refused, and a check reads its source for a handler that is not there.
  The same shape of guarantee as the observer's.
- **The rule that matters most, once D-38 exists:** the app's link to the Pi carries
  nothing toward the Pi. So there is no path from the app, its MCP tools or an assistant,
  through the Pi, to the autopilot. Whatever the Pi later sends to the autopilot is a
  program a person started on the Pi, not something an assistant can reach. This is what
  keeps "do not put the flight controller under agentic control" true.
- **Sensors are held by one program at a time.** While the bridge runs, the LiDAR Radar
  icon and the camera icons on the Pi cannot run, and the other way round. The bridge
  says so when it cannot open one, and the domain shows it.
- **Privacy.** The camera sees children. By default the bridge sends detections and no
  picture; a picture is sent only when switched on at the Pi. A LiDAR scan of a real room
  is a floor plan of it: no recorded scan of a real place goes into the public repository.
  The app's practice data is made up, as the practice flight is.
- **The app's side.** A new domain, "Pi" (or the owner's name for it), built as every
  domain is: folder, manifest, thin route, its own store. Practice data in a browser,
  the real Pi in the desktop app. An MCP tool or two for the assistant (`pi_status`,
  `latest_scan`), reading only.
- **Network.** At the bench over Wi-Fi, at the Pi's address (`192.168.0.130` today, a
  DHCP address, `KNOWN-ISSUES.md` P3). On the aircraft, later, over the HM30's Ethernet
  (`192.168.144.x`, D-36).
- **Order.** Inventory and LiDAR first (both verified on the Pi on 2026-09-28). Camera
  detections second; their code is in Raspberry Pi's `imx500_object_detection_demo.py`,
  which has not been read yet and is the harder part. Pictures last.

**Two choices for the owner.**
1. *Read-only.* "contents/apps/modules" can mean seeing them, or starting them from the
   app. Recommended: seeing them now; starting a model or app from the app is a later
   D-number, since it makes the app able to drive a computer that will sit on the
   aircraft.
2. *How the desktop app reaches the Pi.* Today the desktop app's page may load nothing
   from the network but map tiles. Either (a) the main process fetches from the one Pi
   address the user types and passes it to the page, as the Live screen does; the page
   stays boxed; a browser shows practice data. Or (b) the page connects to the Pi itself:
   it also works in `npm run dev` against the real Pi, but the page's policy and the
   guard are loosened in both. Recommended: (a). Either way, only a private-network
   address and only GET.

**Where the code lives.** The bridge holds no address and nothing of this project: it can
be public, in `NextApp/pi/`, so that anyone with the app and a Pi can use it, with this
project's deploy notes in `drone-pi/`. A `PUBLISHING.md` item either way.

**Revert.** Stop the bridge and remove the domain. Nothing on the Pi is reconfigured.

### D-38 — The Pi and the autopilot: staged, each stage its own yes (PROPOSED 2026-10-14)

**What.** The owner: the module should be able "to pass telemetry data/commands and
things to the autopilot". That is PX4's "companion computer": a computer on the aircraft
on a serial port of the flight controller, speaking MAVLink. It is in the client's brief
("a Raspberry Pi companion computer, AI object detection, tracking"). It is also the
thing this project's hard rules exist to keep under control, so it goes in stages, and
each stage is its own decision.

- **Stage A, listen.** The Pi reads the autopilot's MAVLink on a TELEM port: attitude,
  position, mode, battery, to combine with what its camera and LiDAR see. Nothing goes
  back. Needs a wire and three parameters (`MAV_1_CONFIG=102`, `MAV_1_MODE=2` Onboard,
  `SER_TEL2_BAUD`, value to be chosen), each changed by the owner in QGroundControl with
  the usual snapshot after the reboot and diff.
- **Stage B, sensor data in.** The Pi sends the LiDAR's scan as `OBSTACLE_DISTANCE`
  (MAVLink message 330). PX4's collision prevention (`CP_DIST`, now −1, off) uses it to
  slow the aircraft down before an obstacle, **only in Position mode**, and does not fly
  the aircraft itself. This is data to the autopilot, not a command, and it is the
  natural first lesson for the LiDAR.
- **Stage C, commands.** Offboard setpoints, follow a detected person, land on a marker
  (`LANDING_TARGET`, message 149). Not before: all of it run first against PX4 SITL
  (the real firmware, simulated, on a laptop; QGroundControl, the Live screen and the
  observer connect to it as to an aircraft); the kill switch on the Pocket (D-16) shown
  to stop it; taking control back on the sticks shown; a written flight plan; an
  instructor's hand on the radio.

**Not guessed, and to be read before a wire is cut:** the Pixhawk 6C's TELEM2 pinout,
connector and voltage (Holybro's documentation, saved into `docs/`); which of the Pi 5's
UARTs to use and its pins (Raspberry Pi's documentation); the logic levels of both. The
SiK radio stays on TELEM1 (D-17). Whether `pymavlink` is packaged for Trixie
(`python3-pymavlink`) is to be checked with `apt-cache` on the Pi, not assumed.

**"and others".** The Pi's code would speak MAVLink's common set, which PX4 and ArduPilot
both speak. This project is PX4 only: nothing is promised for another autopilot, and the
ArduPilot parameter trap applies to any setup notes.

**The question for the owner:** which stage does the first lesson need?

**Revert.** Each stage: the cable out and the parameters back to the baseline.

### D-39 — The Pi on the aircraft (PROPOSED 2026-10-14, for later)

Mount, weight, vibration, and power: the Pi 5 asks its supply for 5 V 5 A and the LiDAR
draws 840 mA typical at start-up (Pi inventory Addendum 2, datasheet). Already named as a
future D-number in the Pi inventory. Separate from D-37 and D-38 because it gates flight,
not the bench: everything in D-37 and stages A and B of D-38 can be done with the Pi on
the desk and the aircraft on the bench, props off.

### D-37 and D-38 APPROVED, with the owner's choices; the safety gate (2026-10-14)

The owner answered the four questions: the app may **see and start** the Pi's apps (not
the recommendation); **the page connects to the Pi directly** (not the recommendation);
for the autopilot, **"all 4 of these planned out with a test suite at end for each stage
but all full built"**; the bridge lives **in the public app repository**. And on the
gate: "yes the safety gate is to be a guardrail for the students, but the teacher and us
as the developers will be trying experimental new use cases to test the capabilities of
the systems in play".

**Correction to D-37 above.** ~~The rule that matters most, once D-38 exists: the app's
link to the Pi carries nothing toward the Pi.~~ The owner chose otherwise: a person using
the app may start and stop the Pi's apps. What replaces it, and what must stay true:

1. **No path from an assistant, an MCP tool or Claude Code to the Pi's controls or to
   the autopilot.** The assistant's tools and any Pi MCP tools read only (GET). A check
   reads their source for anything that starts, stops or posts.
2. **The app makes no MAVLink.** `lib/mavlink/decode.ts` stays a reader with no function
   that makes a packet. What talks to the autopilot is a program on the Pi.
3. **Claude Code does not run anything that sends to the real flight controller**: not
   stage B, not stage C, and not by starting the Pi's sender over SSH while the aircraft
   is wired to it. That would be Claude Code driving the board by proxy. Stages B and C
   are tested here against a stand-in autopilot and, before the aircraft, against PX4's
   simulator. A person starts them on the real aircraft.

**The gate: four layers, three of them outside the app.**

| Layer | Where | What it does |
|---|---|---|
| 1. The level | a file on the Pi, written by `teacher-admin` | `student`, `instructor` or `developer`. The app shows it and cannot change it. Student: see everything, start and stop the camera and LiDAR lesson apps; nothing that talks to the autopilot. Instructor: also stage B and the stage C templates. Developer: also experimental scripts and mode changes, for the teacher and the developers' own tests. |
| 2. The token | printed by the bridge when it starts | sent with every request that starts or stops something. Without it nothing on the classroom network can start the camera. |
| 3. The Pi never arms the aircraft | hard-coded, at every level | no arm command exists in the Pi's code. Taking off stays a person's act on the radio. |
| 4. PX4's own | the flight controller | setpoints from the Pi do nothing until a person selects Offboard; moving the sticks takes control back, if `COM_RC_OVERRIDE` allows it (below); the kill switch (D-16). |

**Found on the board, and owed before stage C on the aircraft.** `COM_RC_OVERRIDE` is 1.
PX4 v1.16.0's reference: bit 0 "Enable override during auto modes (except for in critical
battery reaction)", bit 1 "Enable override during offboard mode". **So today the sticks do
not take control back from the Pi in Offboard.** It must be 3 before any stage C flight,
changed by the owner in QGroundControl under its own D-number. Also from the baseline:
`COM_OF_LOSS_T` 1 s and `COM_OBL_RC_ACT` 0 (Position mode): one second after the Pi stops
sending, PX4 goes to Position mode. `COM_OBC_LOSS_T` 5 s. `COM_RC_IN_MODE` 3 ("RC or
Joystick keep first"). Nothing was changed.

**Sources read today, for stages A to C.**
- Holybro, Pixhawk 6C ports (docs.holybro.com/autopilot/pixhawk-6c/pixhawk-6c-ports):
  three TELEM ports. TELEM2 pins 1 VCC +5 V, 2 UART5_TX (out) +3.3 V, 3 UART5_RX (in)
  +3.3 V, 4 UART5_CTS, 5 UART5_RTS, 6 GND. TELEM1 is UART7 (the SiK radio, D-17). TELEM3
  pins 4 and 5 are I2C on some serial numbers: nothing but I2C goes there. **The page does
  not name the connector type.** The PDF is to be saved into `docs/`.
- PX4, "Raspberry Pi Companion with Pixhawk" (docs.px4.io/v1.16/en/companion_computer/
  pixhawk_rpi.html): TELEM2 pin 2 to the Pi's RXD (GPIO 15, pin 10), pin 3 to TXD
  (GPIO 14, pin 8), pin 6 to the Pi's ground (pin 6). **The Pi is not powered from
  TELEM2**; it needs its own supply. For MAVLink: `MAV_1_CONFIG` TELEM2,
  `UXRCE_DDS_CFG` 0, `SER_TEL2_BAUD` 57600, reboot. On the Pi: `raspi-config` serial
  login shell no, serial interface yes; `enable_uart=1` and `dtoverlay=disable-bt` in
  `/boot/firmware/config.txt`; the port is `/dev/ttyAMA0` (`/dev/serial0`). **No Pi 5
  note on the page**, and the Pi inventory shows only `/dev/ttyAMA10` today: which device
  the Pi 5's GPIO UART appears as is to be checked on the Pi, not assumed. **The page's
  MAVProxy install uses `sudo pip3`, which this Pi refuses** (it enforces virtual
  environments): `python3-pymavlink` from apt, or a virtual environment, to be checked
  with `apt-cache` on the Pi. A USB-to-serial adapter on TELEM2 avoids the Pi's GPIO
  altogether; which cable exists is to be asked.
- PX4, "Collision Prevention" (docs.px4.io/v1.16/en/computer_vision/
  collision_prevention.html): obstacle data from a companion computer is a stream of
  `OBSTACLE_DISTANCE`. Tested at 10 Hz. **More than 0.5 s without data: "No range data
  received, no movement allowed" and sideways speed forced to zero; after 5 s, Hold
  mode.** `CP_DIST` is measured to the sensor, not the propellers. `CP_DELAY` up to
  0.2 s for an external vision system plus 0.1 to 0.5 s tracking. `CP_GUIDE_ANG` 30° "a
  good balance". `MPC_POS_MODE` must be one of the velocity-based settings. **The page
  contradicts itself**: the internal map has 72 sectors in one place and 36 in another,
  and it says both "acceleration-based Position mode" and that the velocity-based modes
  are needed. Both are recorded; neither is picked; the simulator settles it. The
  companion-computer route is marked on that page as "currently untested", since the
  project it came from is archived.
- MAVLink, from the app's own tables (`lib/mavlink/messages.ts`): `OBSTACLE_DISTANCE`
  (330) holds `time_usec`, `sensor_type`, `distances` (72 × uint16, cm), `increment`
  (deg), `min_distance` and `max_distance` (cm), and, as extensions, `increment_f`,
  `angle_offset`, `frame`.
- Raspberry Pi, `imx500_object_detection_demo.py` (github.com/raspberrypi/
  picamera2-examples, commit `d25baef`, 2026-10-12; the Pi has `28c016d` of 2026-09-03):
  the model is loaded with `IMX500(path)` before Picamera2 is made; each frame's metadata
  gives boxes, scores and classes through `imx500.get_outputs`, and
  `imx500.convert_inference_coords` turns a box into picture coordinates.

**How it is tested, since there is no PX4 here.** No WSL (broken on this computer) and no
Docker, so PX4's simulator cannot run here. Each stage gets a test suite against a
**stand-in autopilot**, a small program that does only what PX4's documentation says
PX4 does for that stage: send a heartbeat, take setpoints only in Offboard, answer a
command, take `OBSTACLE_DISTANCE`. **It is not PX4, and every check that uses it says so
in its name.** Owed before any of stage B or C reaches the aircraft: the same suites
against PX4's own simulator, on a GitHub Actions Ubuntu machine, the client's Mac, or
this computer once WSL is repaired (the owner's choice; repairing WSL changes this
computer and is not done without asking).

**Order of work.** The Pi is off, so: the bridge, runnable on this computer with made-up
sensors; the app's Pi domain; the stand-in autopilot; stages A, B and C on the Pi's side,
each with its suite; the templates that combine the camera and the LiDAR. When the Pi is
on: copy over with `scp` and check the digest, compile, the `apt-cache` checks, the real
LiDAR and camera over Wi-Fi. Stage A on the real board only after the wire and the three
parameters, and Stage B and C on the real aircraft only after the simulator.

### D-37 and D-38 BUILT, checked against made-up sensors and a stand-in autopilot (2026-10-14)

Everything in the approved design is built. **Nothing has run on the Pi, and nothing has
run against PX4.** The Pi was off all session; the autopilot in every check is the
stand-in, which is not PX4.

**What was built, in `NextApp/` (public repository, not committed).**
- `pi/`: the bridge. `bridge.py` (HTTP: GET to read, POST with the token to start and
  stop, OPTIONS for pages; nothing else answered); `fcpi/` with the settings and level
  (`config.py`, `/etc/flight-companion/pi.json`, root-owned), the gate (`gate.py`), the
  hub, the sensors (`sensors.py`: the real LiDAR with the SH variant's settings copied
  from the Pi inventory, the real AI camera following Raspberry Pi's demo, and a made-up
  room), the arithmetic (`templates.py`), the link (`mav.py`: listening is guarded as the
  observer is; talking sends exactly HEARTBEAT, OBSTACLE_DISTANCE,
  SET_POSITION_TARGET_LOCAL_NED and DO_SET_MODE; **no arm command**), the three stages
  (`autopilot.py`), the modules and their checks (`modules.py`), and the stand-in
  (`standin.py`). `pi.example.json`, `run-tests.py`, `README.md`.
- The Pi domain in the app (`domains/pi/`, `lib/pi/`, `stores/domains/piStore.ts`):
  Overview, LiDAR (a radar), Camera (the boxes, with the LiDAR's distance), Modules (by
  stage, each with why it cannot start now, and a confirmation before anything that
  sends to the autopilot), Autopilot. Practice data recorded from the bridge's own
  made-up room (`public/data/practice-pi.json`, `scripts/pi_practice.py`).
- The desktop app: `pi:allow` lets the page reach one address on this network; the guard
  refuses every other http address. **Found by testing, not by reasoning: the app's
  pages are a secure context, and Chromium blocks http from them as mixed content.** The
  window now allows it (`allowRunningInsecureContent`), and the guard is what narrows it
  to the one Pi. The owner chose "the page connects directly" knowing it loosens the
  policy; this is that loosening, written down.
- The assistant's tenth tool, `what_the_pi_sees`, reads the store. No tool reaches the Pi.
- `drone-pi/DEPLOY-BRIDGE.md`: the steps for this Pi, including the hand test written
  out and checked against the bridge's own angle function.

**The templates that combine the camera and the LiDAR** (the owner's "module that
combines template use cases"): Look and measure (what the camera sees, and how far the
LiDAR says it is); and, at stage C, Hold, Face person, Keep distance, Follow person. Each
falls back to "stay still" when its inputs are older than half a second.

**Faults found and fixed while building.**
1. On Windows, pymavlink's `udpout` binds `0.0.0.0` on the destination port, so the
   stand-in was listening on every address of this computer while tests ran. It now has
   its own socket bound to `127.0.0.1` (`standin.py`, `LocalUdp`).
2. The bridge answered a refused POST without reading its body. On a kept-alive
   connection the leftover bytes became the start of the next request, which then failed
   without CORS headers. Found by the desktop check; every body is now read first, and a
   test sends a refused POST and a GET on one connection.
3. Three of my own test expectations were wrong (a box centred at 0.95 called 1.0, twice;
   a pattern that matched an HTTP status). The code was right each time; the tests were
   corrected after computing the values, not adjusting them to pass.

**Checked** (`npm run verify:pi`, `npm run verify:desktop`, `npm run verify:assistant`):
the Pi suites 53 (D-37 21, stage A 6, stage B 9, stage C 17); the app's Pi check 47; the
desktop app 68 (the page reaching a made-up bridge on this computer's own network address
`192.168.0.70`, which a loopback address would not have proved, and refusing a public
address, https, another address on the network and plain http to the internet); the
assistant 104. The Pi screen in Chrome at wide, dark, tablet and phone, 24 checks each.
The test bridge on `192.168.0.70` was confirmed gone afterwards.

**Found in review, before the Pi was wired to anything, and fixed.** `--made-up`, the one
mode that takes a settings file of the caller's choosing, swapped only the sensors: the
autopilot link would still have opened `/dev/serial0`. A student could have started it
with their own file claiming the developer level and streamed real setpoints. In made-up
mode every module that uses the link now refuses anything but a network address on this
computer, and a test tries six real-looking ports at the developer level
(`KNOWN-ISSUES.md` P11).

**The arming claim, stated exactly.** The bridge's own modules have no arm command, at
any level. An experiment (developer level) is the developer's own Python and is outside
that guarantee.

**Owed, in order.**
1. The Pi: copy, digest check, compile, the read-only checks, `--made-up` on the Pi, then
   the real sensors (`drone-pi/DEPLOY-BRIDGE.md`). Compare the LiDAR settings with
   `lidar_radar.py` itself.
2. The hand test (LiDAR mount) and the camera's field of view, into the settings.
3. Stage A: the cable (which exists is not known), Holybro's pinout PDF into `docs/`,
   the Pi 5's GPIO UART device, `pymavlink` on Trixie, and three parameters under their
   own entry.
4. Stages B and C against PX4's simulator (GitHub Actions, the client's Mac, or this
   computer once WSL is repaired: the owner's choice).
5. Before stage C flies: `COM_RC_OVERRIDE` 3 (it is 1), under its own entry.
