# 360° LiDAR (Yahboom-supplied YDLidar T-mini Plus, "SH" variant)

This folder is the home for everything that runs on the spinning LiDAR.
The LiDAR fires a laser, times the reflection, and reports a distance for
every degree around it, ten times a second. Plugged into a USB port it shows
up as `/dev/ttyUSB0`.

Inventory checked 2026-09-28. Sensor verified the same day over SSH with the
settings below: 15 scans at 10 Hz, about 398 points per scan, clean stop.

USB identity: Silicon Labs **CP2102** USB-to-UART bridge (`10c4:ea60`),
which appears as `/dev/serial/by-id/usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0`.
That is the little adapter board, not the LiDAR itself.

## Folders

| Folder | What goes in it |
|---|---|
| `stock/` | Notes and shortcuts for the samples the YDLidar SDK ships. The originals live in `~/YDLidar-SDK/` and `/usr/local/bin/`; do not edit them there. |
| `ours/` | Apps we write for the class. `lidar_radar.py` lives here. |
| `community/` | Things found online that we want to try. One sub-folder each, with a note saying where it came from. |
| `launchers/` | Desktop icons (`.desktop` files) and their pictures. |

## Do not reconfigure the LiDAR

Bring-up was hard-won. This unit is the **SH variant** of the T-mini Plus and
needs settings that differ from the standard T-mini Plus example. The working
settings are listed below and live in `~/Desktop/YahboomLidar/ours/lidar_radar.py`. Copy them; do not
"fix" them.

## What is installed

| Thing | Where | Notes |
|---|---|---|
| YDLidar-SDK source | `~/YDLidar-SDK/` | github.com/YDLIDAR/YDLidar-SDK, commit 42a82ed (2026-09-21) |
| SDK library and headers | `/usr/local/lib/libydlidar_sdk.a`, `/usr/local/include/` | built with `cmake`, `make -j4`, `sudo make install` |
| Python module `ydlidar` | `/usr/local/lib/python3/dist-packages/ydlidar.py` + `_ydlidar.so` | made importable by a hand-made `/usr/local/lib/python3.13/dist-packages/ydlidar.pth` |
| SDK test programs | `/usr/local/bin/` | see list below |
| `pyserial` | `python3-serial` 3.5 | |
| `matplotlib` | `python3-matplotlib` 3.10 | draws the radar screen |
| Our radar app | `~/Desktop/YahboomLidar/ours/lidar_radar.py` | working. `lidar_radar.py.save` next to it is the pre-fix copy, keep for history |

The user `teacher-admin` is in the `dialout` group, which is what allows
talking to `/dev/ttyUSB0` without `sudo`.

## Running things (command line)

Plug the LiDAR in, wait for it to spin, then check it appeared:

```bash
ls /dev/ttyUSB*        # expect /dev/ttyUSB0
```

**Our radar screen** (needs the desktop or VNC, it opens a window):

```bash
python3 ~/Desktop/YahboomLidar/ours/lidar_radar.py
```

Yellow dots are close, purple are far, red triangle is the LiDAR. The title
shows the closest object and its angle. Close the window to stop; the LiDAR
shuts down cleanly.

**SDK test for this exact unit** (text only, works over SSH). It asks for the
port and baud rate; answer `/dev/ttyUSB0` and `230400`:

```bash
tmini-sh_test
```

This is the one that worked during bring-up. `tmini_test` (no `-sh`) is the
standard T-mini Plus test and is **not** right for this unit.

## SDK samples on this Pi

Installed to `/usr/local/bin/`. Only the `tmini-sh` ones match our sensor;
the rest are for other YDLidar models and are listed so nobody wonders.

| Program | For |
|---|---|
| `tmini-sh_test` | **Ours.** T-mini Plus, SH variant. |
| `tmini_test` | Standard T-mini Plus. Wrong type for our unit. |
| `tminiplus_test.py` | Python, standard T-mini Plus. Wrong type; `lidar_radar.py` was built from it and then corrected. |
| `tof_test`, `tof_test.py`, `plot_tof_test.py` | Generic time-of-flight models. |
| `tri_test`, `tri_test.py`, `plot_ydlidar_test.py`, `test.py` | Triangulation models (X2, X4, G2 and so on). |
| `gs_test`, `gs_test2`, `gs_ota`, `gs_restart`, `gs_test.py` | GS series. |
| `et_test`, `etlidar_test.py` | Ethernet LiDARs. |
| `tea_test`, `tea_test.py`, `tia_test`, `sdm_test`, `sdm18_test`, `scl_test`, `tri_and_gs_test`, `tri_restart` | Other series. |
| `lidar_c_api_test` | C language example. |

Source for all of these: `~/YDLidar-SDK/examples/` (C++) and
`~/YDLidar-SDK/python/examples/` (Python). SDK docs, including the serial
protocol: `~/YDLidar-SDK/doc/`.

## The working settings (SH variant)

From `~/Desktop/YahboomLidar/ours/lidar_radar.py`, which matches the SDK's own `tmini-sh_test.cpp`.
The SDK source has this comment next to the type setting:
`TYPE_TRIANGLE (Tmini Pro / Tmini Plus), TYPE_TOF (Tmini Plus 森合)`. 森合
("Senhe") is the SH variant.

| Setting | Value | Differs from standard T-mini Plus? |
|---|---|---|
| `LidarPropSerialBaudrate` | 230400 | no |
| `LidarPropLidarType` | `TYPE_TOF` | **yes** (standard is `TYPE_TRIANGLE`) |
| `LidarPropDeviceType` | `YDLIDAR_TYPE_SERIAL` | no |
| `LidarPropScanFrequency` | 10.0 Hz | no |
| `LidarPropSampleRate` | 4 | no |
| `LidarPropSingleChannel` | False | no |
| `LidarPropMaxAngle` / `MinAngle` | 180 / -180 | no |
| `LidarPropMaxRange` | 16.0 m (SDK test uses 64) | no |
| `LidarPropMinRange` | 0.05 m | **yes** (Python example used 0.02) |
| `LidarPropIntenstiy` | True | no (the SDK misspells it, keep the misspelling) |
| `LidarPropIntenstiyBit` | 16 | **yes** (standard is 8) |

`lidar_radar.py` also skips the first 10 scans because start-up scans are
messy.

Stale comment to fix one day: the docstring in `make_lidar()` still says
"TYPE_TRIANGLE ... do not change it". The code below it says `TYPE_TOF`,
and the code is what was tested.

## Noise you can ignore

For the first second after start the SDK prints red `Checksum error` lines
and `The intensity has been automatically adjusted to [8]bit ... [0]bit ...
[16]bit`. It is the SDK working out the data format while the motor comes up
to speed. It settles on 16 bit by itself. This is why `lidar_radar.py` throws
away the first 10 scans.

## Still to do

- **Hand test:** hold a hand near the sensor and watch where it appears on
  the radar. This tells us which physical direction is 0° and whether the
  picture is mirrored. It decides how the LiDAR is mounted on the aircraft.

## Desktop icons (built 2026-09-28)

| Icon | Runs | Where the script lives |
|---|---|---|
| LiDAR Radar | our radar screen | `ours/run-lidar-radar.sh` |
| LiDAR Text Test | the SDK test for our unit, `tmini-sh_test` | `stock/run-lidar-text-test.sh` |

Both check that `/dev/ttyUSB0` exists first and say so if the LiDAR is not
plugged in. Both open a terminal window that waits for Enter before closing.
The Text Test asks two questions; answer `/dev/ttyUSB0` then `230400`.

`lidar_radar.py` and its `.save` copy now live in `ours/`. The `.desktop`
files and PNG icons are in `launchers/`; the copies on the Desktop are what
the file manager shows. To add a new app, copy any `.desktop` file, change
`Name`, `Exec` and `Icon`, keep the paths absolute, and `chmod +x` it.

Icons were drawn by `~/pi-desktop-setup/make-icons.py`. The installer is
`~/pi-desktop-setup/install-launchers.sh`; safe to run again.
