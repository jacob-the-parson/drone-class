# The Pi side: the bridge

A small program for a Raspberry Pi that rides on (or sits beside) the aircraft. It reads
the Pi's own sensors, the **AI camera** (Sony IMX500) and a **LiDAR** (YDLidar T-mini
Plus), tells Flight Companion what they see, and runs the **modules** a person starts
from the app's Pi screen. Some modules talk to the **autopilot**, in three stages.

```
   the Pi                                                       this computer
   ┌───────────────────────────────┐                           ┌──────────────────────┐
   │ AI camera ─┐                  │   http, this network      │ Flight Companion     │
   │ LiDAR ─────┼─ bridge.py ──────┼──────────────────────────▶│ the Pi screen        │
   │            │   modules        │◀── start / stop + token ──│                      │
   └────────────┼──────────────────┘                           └──────────────────────┘
                │ serial (TELEM2), MAVLink
                ▼
         the autopilot (PX4)       stage A: listen · stage B: obstacle data · stage C: setpoints
```

## What it can and cannot do

| | |
|---|---|
| **Reading** | anyone on this network whose page is the app, or any program: what the sensors see, what is running |
| **Starting and stopping** | only with the token the bridge prints when it starts |
| **Which modules may start** | the **level**, set by the teacher in a file on the Pi. The app shows it and cannot change it |
| **Arming the aircraft** | **never, in the bridge's own modules**, at any level. There is no arm command in `fcpi/`; the tests read the code to prove it. An experiment (developer level) is the developer's own Python and sits outside this guarantee |
| **Moving the aircraft** | stage C sends setpoints; PX4 acts on them only in Offboard, which a person selects. Stop them and PX4 goes back to Position mode after a second (`COM_OF_LOSS_T` 1 s, `COM_OBL_RC_ACT` 0 on this build's board) |
| **Pictures** | off unless the teacher's settings allow them. By default the camera sends what it found, not what it saw |
| **An assistant** | can read what the Pi sees, through the app. It cannot start or stop anything |

The level is a **guardrail for a class, not a lock**: anyone with the Pi's login can change
this program. It keeps students within bounds; it does not keep out the teacher, and the
teacher and developers use the developer level for their own experiments.

## The levels

| Level | May start |
|---|---|
| `student` | the LiDAR, the camera, Look and measure, Stage A (listen). Nothing that sends to an autopilot |
| `instructor` | also Stage B (obstacle data) and the Stage C templates, within the limits in the settings |
| `developer` | also experiments (`~/flight-companion-experiments/*.py`), and asking the autopilot for Offboard |

## The modules

| Module | Stage | Uses | What it does |
|---|---|---|---|
| LiDAR scan | lesson | LiDAR | the distance all around, ten times a second |
| Camera: what it sees | lesson | camera | a model on the camera's chip says what it sees and where |
| Look and measure | template | camera + LiDAR | the camera finds something; the LiDAR says how far |
| Stage A: listen | A | the link, listening | mode, armed, attitude, battery. **Sends nothing** |
| Stage B: obstacle data | B | LiDAR + the link | the scan as `OBSTACLE_DISTANCE`, ten a second. PX4's collision prevention uses it in Position mode, with `CP_DIST` set |
| Stage C: hold | C | the link | stay still: the first offboard lesson |
| Stage C: face person | C | camera + the link | turn on the spot to face the nearest person |
| Stage C: keep distance | C | LiDAR + the link | keep a set distance to what is ahead |
| Stage C: follow person | C | camera + LiDAR + the link | face the nearest person, then keep the distance |

Starting a module starts the sensors it needs; stopping the last one that needs a sensor
stops it. **While the bridge holds the LiDAR or the camera, the desktop icons that use them
cannot run**, and the other way round: one program per sensor.

## Before stage B or C goes near the aircraft

1. **Measure the LiDAR's mount** (the hand test): which way its 0° points on the aircraft
   and whether it counts the other way. Write `zero_offset_deg`, `mirrored` and
   `mount_measured: true` in the settings. Stages B and C refuse until then, except at the
   developer level.
2. **The camera's field of view**, `camera.horizontal_fov_deg`. Raspberry Pi's AI Camera
   page does not give it (read 2026-10-14). The person templates refuse until it is set.
3. **Run the stages against PX4's simulator.** The tests here use a stand-in autopilot
   (`fcpi/standin.py`), which is NOT PX4.
4. **For stage C, `COM_RC_OVERRIDE` must be 3** (bit 1: the sticks take over in Offboard).
   This build's board has 1. A parameter change, made by a person in QGroundControl.
5. Props off for every first run. A pilot holding the radio, the kill switch in reach.

## Run it

On the Pi (Raspberry Pi OS, Python 3.13). Copy the folder over with `scp` and check it
arrived whole; never paste it over SSH.

```bash
# the teacher's settings, which only the admin password can change
sudo mkdir -p /etc/flight-companion
sudo cp pi/pi.example.json /etc/flight-companion/pi.json
sudo nano /etc/flight-companion/pi.json        # the level, the mount, the camera

python3 pi/bridge.py
```

It prints where it listens and a **token**. In the app, open the Pi screen and type the
Pi's address (`hostname -I` on the Pi prints it) and the token.

What it needs, all of it from `apt` (the Pi refuses `pip install` into the system):

| Needs | For | On this project's Pi |
|---|---|---|
| Python 3 | everything | 3.13, installed |
| `python3-picamera2` | the camera | installed with the Desktop image |
| the YDLidar SDK's Python binding | the LiDAR | built from source, see `drone-pi/` |
| `python3-pymavlink` (or a virtual environment) | stages A to C | **to be checked**: whether Trixie packages it |

With no sensors at all, anywhere:

```bash
python3 pi/bridge.py --made-up       # a made-up room with one person walking in it
```

## Tests

```bash
python3 pi/run-tests.py              # all four suites, a line each
python3 pi/run-tests.py c            # one stage
```

Needs `pymavlink`. From the app's folder, `npm run verify:pi` runs them too, with the app's
own checks of the Pi screen.

| Suite | Checks |
|---|---|
| D-37 | the bridge's answers, the token, the origins, the levels, the settings file, the made-up room's geometry, that nothing starts a program or a shell |
| Stage A | the stand-in is heard; it receives **zero bytes**; every way of sending raises; a ground station is not taken for the vehicle |
| Stage B | the 72 sectors as MAVLink defines them; ten a second; the made-up walls where they are; an old scan is not sent; an unmeasured mount is refused |
| Stage C | the templates; the student level refused; more than two setpoints a second; **nothing moves until the pilot selects Offboard**; stopping hands back to Position mode; lost inputs mean stay still; the caps hold; only the developer may ask for Offboard; **no arm command anywhere** |

## Files

| File | |
|---|---|
| `bridge.py` | the HTTP server; what the app talks to |
| `fcpi/config.py` | the settings and the level |
| `fcpi/gate.py` | the levels and the token |
| `fcpi/sensors.py` | the LiDAR (the SH variant's settings, unchanged) and the camera, real or made up |
| `fcpi/templates.py` | the arithmetic: sectors, bearings, the setpoint templates |
| `fcpi/mav.py` | the MAVLink link, and the only sending code: four messages, listed |
| `fcpi/autopilot.py` | stages A, B and C |
| `fcpi/modules.py` | what can be started, and why not |
| `fcpi/standin.py` | the stand-in autopilot for the tests. **NOT PX4** |
| `pi.example.json` | the teacher's settings, to copy to `/etc/flight-companion/pi.json` |
| `run-tests.py`, `tests/` | the suites |
