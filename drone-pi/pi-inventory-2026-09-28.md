# Pi inventory — 2026-09-28 (read-only SSH survey)

Surveyed over SSH from the Windows PC. Nothing was installed, changed or run on the Pi
except read-only listing commands. No LiDAR was plugged in at the time.

## Machine

| Item | Found |
|---|---|
| Hostname / IP | `drone-pi-student`, **192.168.0.130** on `wlan0` (DHCP, still the same address). Does not answer ping; SSH port 22 open. |
| OS / kernel | Debian 13 Trixie, kernel 6.18.50+rpt-rpi-2712 (Pi 5), aarch64 |
| Python | 3.13.5 |
| Disk | 58 GB card, 8.2 GB used |
| VNC | **wayvnc** (`wayvnc.service` running), i.e. Pi OS's built-in VNC server on Wayland. The docs say "TigerVNC"; that is the *viewer* on the PC. Not RealVNC, so D-09 holds. |
| Serial | Only `/dev/ttyAMA10`. No `/dev/ttyUSB*`, `lsusb` shows no devices. User is in `dialout`. |

## IMX500 AI camera — complete, every handoff gap already closed

- Camera detected: `imx500 [4056x3040 10-bit RGGB]` on the CSI connector.
- `imx500-all 1.13.0-1`, `imx500-firmware 0.FF23+3`, `imx500-models 1:1.0.0-1`, `imx500-tools`.
- Firmware present: `/lib/firmware/imx500_firmware.fpk`, `imx500_loader.fpk`.
- **23** `.rpk` models in `/usr/share/imx500-models/` (list matches `notes.txt` §7).
- Post-process JSON: `imx500_mobilenet_ssd.json`, `imx500_posenet.json`.
- `python3-picamera2 0.3.37-1`, `python3-opencv 4.10.0`, `python3-munkres 1.1.4`,
  numpy 2.2.4, Pillow 11.1.0, tkinter, matplotlib all import.
- `rpicam-apps 1.13.0-1` with imx500 and opencv post-process plugins.
- **picamera2-examples repo is cloned** at `~/picamera2-examples` (commit 28c016d, 2026-09-03).
  Real path of the demos, answering the open question:
  `~/picamera2-examples/examples/imx500/` — contains `imx500_classification_demo.py`,
  `imx500_object_detection_demo.py`, `_demo_mp.py`, `_injection_demo.py`,
  `imx500_segmentation_demo.py`, `imx500_pose_estimation_higherhrnet_demo.py`.
  This is the **first** entry in `EXAMPLE_DIRS` in `ai_camera_lab.py`, so no code change needed.
- `~/ai_camera_lab.py` on the Pi is byte-identical (md5 39574ef0…) to the copy in this folder.
  Bash history shows `python3 ~/ai_camera_lab.py` was run once (2026-09-23); result not recorded.
- `~/Downloads/start camera` is a one-line note: the `rpicam-hello ... imx500_mobilenet_ssd.json` command.
- `~/Desktop/imx500/` and `~/Desktop/YahboomLidar/` both exist and are **empty**.

## LiDAR — YDLidar SDK, T-mini Plus (SH variant)

- "Yahboom LiDAR" on the Desktop folder name; the unit is driven as a **YDLidar T-mini Plus**
  via the official **YDLidar-SDK** (github YDLIDAR/YDLidar-SDK, commit 42a82ed, 2026-09-21),
  built from source in `~/YDLidar-SDK/build` and installed to `/usr/local`.
- Python binding: `/usr/local/lib/python3/dist-packages/ydlidar.py` + `_ydlidar.so`, made
  importable by `/usr/local/lib/python3.13/dist-packages/ydlidar.pth` (hand-made, see history).
- SDK test tools in `/usr/local/bin`: `tmini_test`, `tmini-sh_test`, `tminiplus_test.py`,
  `plot_ydlidar_test.py`, `etlidar_test.py`. History shows `tmini-sh_test` was the one
  that worked, which is what identified the SH variant.
- `~/lidar_radar.py` (matplotlib polar "radar" display) holds the working settings.
  `~/lidar_radar.py.save` is the pre-fix version (has a stray `d` on line 1).

### The SH-variant settings (the ones "that differ from the datasheet")

Diff of `lidar_radar.py` against YDLidar's own `tminiplus_test.py` / the `.save` copy:

| Setting | tminiplus_test.py | working `lidar_radar.py` |
|---|---|---|
| `LidarPropLidarType` | `TYPE_TRIANGLE` | **`TYPE_TOF`** |
| `LidarPropMinRange` | 0.02 | **0.05** |
| `LidarPropIntenstiyBit` | (absent) | **16** |
| `SKIP_FIRST_SCANS` | 3 | 10 |

Unchanged: serial 230400 baud, `YDLIDAR_TYPE_SERIAL`, 10 Hz scan, sample rate 4,
single-channel False, ±180°, max range 16 m, intensity True. Port found by
`ydlidar.lidarPortList()`, fallback `/dev/ttyUSB0`.

Note: the docstring inside `make_lidar()` still says "TYPE_TRIANGLE ... do not change it";
the code below it says `TYPE_TOF`. The code is what was tested. The comment is stale.

## Still open on the Pi side

- GUI test of `ai_camera_lab.py` over VNC: outcome unknown.
- LiDAR hand test for 0° direction / mirroring (needs the unit plugged in).
- DHCP reservation for 192.168.0.130 (not done; still on DHCP).
- The `~/Desktop/YahboomLidar` and `~/Desktop/imx500` folders are empty; no launchers found.

## Addendum, same day: LiDAR plugged in and verified

- Enumerates as Silicon Labs CP2102 USB-UART bridge (`10c4:ea60`) on `/dev/ttyUSB0`,
  by-id `usb-Silicon_Labs_CP2102_USB_to_UART_Bridge_Controller_0001-if00-port0`.
- Headless scan with the exact `lidar_radar.py` settings: initialize and turnOn True,
  SDK reports 10.00 Hz, sample rate 4.00K, fixed size 430. Scans 11 to 15 delivered
  396 to 398 points each, 316 to 337 valid. Clean stop.
- Start-up prints checksum errors and "intensity automatically adjusted 8 -> 0 -> 16 bit"
  for about a second, then settles. That is what SKIP_FIRST_SCANS=10 covers.
- Camera: headless `rpicam-still` capture over SSH produced a 2.0 MB JPEG. Working.
- `imx500_input_tensor_only.json` is NOT in `/usr/share/rpi-camera-assets/` (only the
  mobilenet_ssd and posenet files are). The "AI's-Eye View" entry in `ai_camera_lab.py`
  will fail with "no known way to run" until this is resolved. Not looked up yet.

## Desktop structure created (2026-09-28)

`~/Desktop/imx500/` and `~/Desktop/YahboomLidar/`, each with `README.md` and the
subfolders `stock/`, `ours/`, `community/`, `launchers/`. README sources are kept in
this repo under `drone-pi/pi-desktop/` and were copied with scp, md5-verified.
Launchers (.desktop files plus icons) are the next step; not built yet.

## Addendum 2: LiDAR power question and the network drop (2026-09-28, ~08:40)

- Pi dropped off the network about 2 min after the LiDAR was plugged in (both adapter
  cables into Pi USB ports: USB_DATA in a USB 3 port, USB_PWR in a USB 2 port). User
  power-cycled it manually at 08:42. Cause of the drop NOT determined: journald had no
  previous-boot log even though /var/log/journal exists and Storage=auto.
- Power evidence after reboot, LiDAR still plugged in and enumerated:
  `usb_max_current_enable=1` with nothing forcing it in config.txt, so the Pi negotiated
  5 V 5 A with its supply and the USB budget is 1.6 A total (Raspberry Pi white paper
  RP-009856, saved in docs/). `get_throttled=0x0`. 5 V rail 5.08 V.
- LiDAR draw per YDLIDAR T-mini Plus datasheet V1.1 (saved in docs/): start-up 840 mA
  typ / 1000 mA max, working 340 / 480 mA, recommended 5 V 1 A supply. Fits in 1.6 A;
  would NOT fit the 600 mA budget of a non-5A supply.
- Adapter board per YDLIDAR user manual: USB_DATA is power+data and normally sufficient;
  USB_PWR is auxiliary power for hosts with weak USB drive. Plugging USB_PWR into a
  second Pi port adds no budget (limit is per Pi, not per port). Port speed irrelevant.
- Working conclusion: the wiring is acceptable on this supply. If the drop repeats with
  the LiDAR attached, move USB_PWR to a separate 5 V 1 A source and see if it stops.
  Aircraft-side LiDAR power is a future D-number.
- Second version of `Desktop/YahboomLidar/README.md` copied and md5-verified after reboot.
- Tooling note: Git Bash ssh + sh askpass began failing to spawn (cygheap error);
  Windows OpenSSH (`C:\Windows\System32\OpenSSH\ssh.exe`) with a `.cmd` askpass works.

## Addendum 3: desktop launchers built (2026-09-28, ~08:52)

- `~/ai_camera_lab.py` moved to `~/Desktop/imx500/ours/`; `~/lidar_radar.py` and its
  `.save` moved to `~/Desktop/YahboomLidar/ours/`. Both compile from the new location.
- Eight `.desktop` launchers on `~/Desktop` (copies of `launchers/*.desktop`), all pass
  `desktop-file-validate`, every Exec and Icon path verified to exist:
  AI Camera Lab, Object Finder, Stick Figure Tracker, Name Guesser, Shape Painter,
  Precise Body Tracker, LiDAR Radar, LiDAR Text Test.
- Each launcher runs a short wrapper script in `stock/` or `ours/` inside a terminal that
  waits for Enter before closing (so errors stay visible; the old camera_launcher problem).
  AI Camera Lab is the exception (Terminal=false, it has its own log pane).
- Icons are 256 px PNGs drawn on the Pi by Pillow. Helper scripts live in
  `~/pi-desktop-setup/` (make-icons.py, install-launchers.sh), off the Desktop.
- Sources in this repo: `drone-pi/pi-desktop/generate.py` writes every wrapper and
  `.desktop` file; edit there, re-run, scp the tree, run the installer on the Pi.
- NOT yet done: clicking each icon on the real desktop (needs VNC). Untested on screen.
