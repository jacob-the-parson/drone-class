# Handoff: deploy and test `ai_camera_lab.py` on the drone Pi

You are picking up part of an educational drone build (Holybro X500 V2, students
aged 9–15). This task is only about the Raspberry Pi "smart package" — the
flight controller is not involved. Nothing here touches the aircraft.

## The machine

| Item | Value |
|---|---|
| Hostname | `drone-pi-student` (try `drone-pi-student.local`) |
| Last known IP | `192.168.0.130` (DHCP — may have changed) |
| User | `teacher-admin` |
| Auth | SSH **password**, not keys (deliberate — client handoff) |
| OS | Raspberry Pi OS 64-bit **Desktop**, Debian 13 "Trixie" |
| Python | 3.13, with pip venv enforcement — use `apt`, not `pip install` |
| Board | Raspberry Pi 5 (4GB) + Active Cooler |
| Camera | Raspberry Pi AI Camera, Sony IMX500. Verified working. |

`imx500-all` is installed. 23 models in `/usr/share/imx500-models/`.
Picamera2 imports fine (it ships with the Desktop image).

## The file

`ai_camera_lab.py` — a Tkinter test bench that lists every IMX500 model,
describes what it does, and launches it. The human will have downloaded it to
the desktop machine. Ask where it is rather than searching the whole disk.

It replaces an earlier `camera_launcher.py` on the Pi that swallowed its errors
and closed instantly. That old file can stay; don't delete it without asking.

## What to do

1. **Get on the Pi.** `ssh teacher-admin@drone-pi-student.local`. If the name
   doesn't resolve, try the IP, then ask the human to check the router.

2. **Copy the file over.** `scp` it to `~/` on the Pi.
   Do *not* paste the file contents into a heredoc over SSH — large multi-line
   pastes to this Pi have silently truncated before. If you must create it
   in place, verify with `python3 -m py_compile ~/ai_camera_lab.py && echo OK`.

3. **Run the system check headlessly.** The app's checks don't need a GUI, so
   verify the same things directly over SSH:

   ```
   ls /usr/share/imx500-models/*.rpk | wc -l          # expect 23
   ls /usr/share/rpi-camera-assets/imx500_*.json
   ls /lib/firmware/imx500*
   python3 -c "import picamera2; print('picamera2 ok')"
   python3 -c "import cv2; print('cv2 ok')"
   python3 -c "import munkres; print('munkres ok')"
   ```

4. **Install what's missing.** Expected gaps are OpenCV, munkres, and the
   Picamera2 example scripts:

   ```
   sudo apt install -y git python3-opencv python3-munkres
   cd ~ && git clone https://github.com/raspberrypi/picamera2-examples
   ```

   **Then report the real path of the imx500 demos.** This is an open question
   in the build log: Raspberry Pi's docs are inconsistent about whether the
   scripts live in `picamera2-examples/examples/imx500/` or elsewhere. Find
   the actual location with `find ~ -name 'imx500_*demo.py'` and tell the
   human. The app looks in three candidate paths; if the real one isn't among
   them, add it to `EXAMPLE_DIRS` near the top of the file.

5. **Hand back for the GUI test.** You cannot test the app yourself. The
   camera preview needs a display, and an SSH session has none. Tell the human
   to open a VNC session (TigerVNC to `drone-pi-student:5900`), open a
   terminal *on that desktop*, and run `python3 ~/ai_camera_lab.py`.

   Suggest this test order:
   - **Object Finders → "The all-rounder"** — should work with no extra
     downloads. Person detection with boxes.
   - **Body Trackers → "Stick figure tracker"** — also needs nothing extra.
   - **The AI's-Eye View → inputtensoronly** — needs nothing extra.
   - Anything in **Name Guessers** — this is what proves step 4 worked.

## Things that will look like bugs and aren't

- **A 10–30 second freeze on first use of a model.** The network is uploading
  into the camera's own chip. Don't kill it. Subsequent runs are fast.
- **Qt/Wayland noise** on stderr — `QStandardPaths: wrong permissions`,
  `qt.qpa.wayland ... requestActivate()`, `GLib-GObject-CRITICAL
  g_object_unref`. All harmless. They'll appear in the app's log pane.

## Hard rules for this build

- **Never toggle Wayland ↔ X11 in `raspi-config`** to troubleshoot anything.
  There are reports of VNC becoming impossible to re-enable afterwards, and
  recovery means reflashing the card.
- **No subscription-licensed software** anywhere in the handoff. This is why
  the project uses TigerVNC rather than RealVNC.
- **Client instruction, verbatim:** do not guess an electrical pinout or
  silently change the architecture. Document any recommended change and the
  reason before implementing it. This applies to software architecture too —
  if you want to restructure the app, say so first.
- Don't touch anything LiDAR-related (`/dev/ttyUSB0`, the YDLidar SDK, or
  `lidar_radar.py`). That subsystem is working and is out of scope here.

## What to report back

- Output of the checks in step 3.
- The real path to the imx500 demo scripts.
- Anything you changed in `ai_camera_lab.py`, and why.
- Whether the Pi's IP is still `192.168.0.130` (there's an open item to set a
  DHCP reservation).
