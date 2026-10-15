# Putting the bridge on this project's Pi (D-37)

The bridge is `NextApp/pi/` (public, generic; its guide is `NextApp/pi/README.md`).
This page is the steps for **this** Pi. Written 2026-10-14, before the Pi was on; nothing
here has been run on it yet.

| | |
|---|---|
| Pi | `drone-pi-student` (`drone-pi-student.local`), last seen at `192.168.0.130` (DHCP, `KNOWN-ISSUES.md` P3) |
| User | `teacher-admin`, SSH password (D-07). Ask the owner for it; do not look for it |
| From Windows | use `C:\Windows\System32\OpenSSH\ssh.exe` and `scp.exe`; Git Bash's ssh fails here (`KNOWN-ISSUES.md` T3) |
| Never | paste a file over SSH (truncated before); toggle Wayland/X11 in `raspi-config`; change the LiDAR's settings |

## 1. Copy it over, and check it arrived whole

```powershell
# on this computer, from drone-class\NextApp
Get-ChildItem pi -Recurse -File -Exclude *.pyc | Where-Object { $_.FullName -notmatch '__pycache__' } |
  ForEach-Object { "{0}  {1}" -f (Get-FileHash $_.FullName -Algorithm MD5).Hash.ToLower(), ($_.FullName.Substring((Resolve-Path .).Path.Length + 1) -replace '\\','/') } |
  Set-Content -Encoding ascii pi-md5.txt
C:\Windows\System32\OpenSSH\ssh.exe teacher-admin@drone-pi-student.local "mkdir -p ~/flight-companion"
C:\Windows\System32\OpenSSH\scp.exe -r pi pi-md5.txt teacher-admin@drone-pi-student.local:~/flight-companion/
```

```bash
# on the Pi
cd ~/flight-companion && md5sum -c pi-md5.txt        # every line must say OK
python3 -m py_compile pi/bridge.py pi/fcpi/*.py && echo compiled
```

## 2. What is on the Pi, read only

```bash
python3 -c "import picamera2; print('picamera2 ok')"
python3 -c "import ydlidar; print('ydlidar ok')"
python3 -c "import pymavlink; print('pymavlink ok')" || apt-cache policy python3-pymavlink
ls /dev/ttyUSB* /dev/ttyAMA* /dev/serial* 2>/dev/null
```

Write the answers in the build log. `pymavlink` decides how stages A to C run: from apt if
Trixie has `python3-pymavlink`, else a virtual environment (`python3 -m venv
--system-site-packages`, so that Picamera2 and the YDLidar binding stay visible). It is
not needed for the camera and the LiDAR.

## 3. Made-up first, then the tests, on the Pi

```bash
python3 pi/bridge.py --made-up          # then, in the app's Pi screen: the Pi's address and the token
python3 pi/run-tests.py                 # needs pymavlink; the autopilot is the stand-in, NOT PX4
```

## 4. The teacher's settings, then the real sensors

```bash
sudo mkdir -p /etc/flight-companion
sudo cp pi/pi.example.json /etc/flight-companion/pi.json     # level: student
python3 pi/bridge.py
```

Close the LiDAR Radar and camera icons first: one program per sensor. In the app: start
**LiDAR scan**, then **Camera: what it sees**. The first camera start takes 10 to 30 s
while the model loads into the camera; it is not a fault.

Compare the bridge's LiDAR settings with `~/Desktop/YahboomLidar/ours/lidar_radar.py`
before the first real scan: they were copied from the Pi inventory of 2026-09-28, not
from the file itself. Bring that file back with `scp` and diff the `setlidaropt` lines.

## 5. The hand test: which way the LiDAR points (decides stages B and C)

With **LiDAR scan** running, the LiDAR fixed where it will ride, and the settings still
at `zero_offset_deg: null`, `mirrored: null` (the bridge then shows the LiDAR's own angles):

1. Hold a hand about 0.5 m straight ahead of the nose. Read the nearest point's bearing
   on the LiDAR tab: call it A.
2. Hold it 0.5 m straight out to the aircraft's right. Read the bearing again: call it R.
3. If R is about A + 90 (allowing for the wrap at ±180), the LiDAR counts clockwise like
   the aircraft: `mirrored: false`, `zero_offset_deg` = −A. If R is about A − 90, it
   counts the other way: `mirrored: true`, `zero_offset_deg` = +A. (The bridge turns an
   angle a into `wrap(±a + zero_offset_deg)`, `fcpi/templates.py` `to_body`.)
4. Write both, and `mount_measured: true`, in `/etc/flight-companion/pi.json`; restart
   the bridge; repeat 1 and 2 and see "ahead" and "90° right".

Also measure `camera.horizontal_fov_deg` (or find it in a Raspberry Pi or Sony document)
before the person templates. Not guessed.

## 6. Not yet

- **Stage A (listen)** needs a cable from TELEM2 to the Pi, wired from Holybro's pinout
  (build log, D-38: pins 2 and 3 cross to the Pi's RX and TX, pin 6 to ground, pin 1 not
  used) or a USB-to-serial adapter, and three parameters changed by the owner in
  QGroundControl under its own entry. Which cable exists is not known.
- **Stages B and C** run first against PX4's simulator, and never on the real aircraft
  from Claude Code, over SSH or otherwise. Before stage C flies, `COM_RC_OVERRIDE` must be
  3 on the board (it is 1).
