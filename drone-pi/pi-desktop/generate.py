#!/usr/bin/env python3
"""Generates the Pi desktop launcher files into this folder (run on the PC, then scp).

Produces, under pi-desktop/:
  imx500/stock/*.sh        wrappers around the stock Raspberry Pi samples
  imx500/ours/*.sh         wrapper for our AI Camera Lab
  imx500/launchers/*.desktop
  YahboomLidar/stock/*.sh, ours/*.sh, launchers/*.desktop
  make-icons.py            run ON THE PI to draw the PNG icons with Pillow
  install-launchers.sh     run ON THE PI to move scripts, chmod, draw icons, copy launchers
"""
import os

B = os.path.dirname(os.path.abspath(__file__))
H = "/home/teacher-admin/Desktop"          # absolute paths on the Pi; .desktop files need them

TAIL = 'echo; read -r -p "Finished. Press Enter to close this window."\n'
NO_LIDAR = (
    'if ! ls /dev/ttyUSB* >/dev/null 2>&1; then\n'
    '  echo "No LiDAR found on USB. Plug in the data cable (USB_DATA), wait for it to spin, try again."\n'
    '  echo; read -r -p "Press Enter to close this window."; exit 1\n'
    'fi\n'
)
FIRST_RUN = 'echo "First run takes 10-30 s while the model loads into the camera. Not a crash."\n' \
            'echo "Close the preview window or press Ctrl+C here to stop."\n'


def write(rel, text, executable=False):
    p = os.path.join(B, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", newline="\n", encoding="utf-8") as f:
        f.write(text)
    print("wrote", rel)


def sh(comment, body):
    return "#!/bin/bash\n# " + comment + "\n" + body + TAIL


def desktop(name, comment, exec_path, icon_path, terminal):
    return (
        "[Desktop Entry]\nType=Application\nVersion=1.0\n"
        f"Name={name}\nComment={comment}\nExec={exec_path}\nIcon={icon_path}\n"
        f"Terminal={'true' if terminal else 'false'}\nCategories=Education;\nStartupNotify=false\n"
    )


# ---------------- IMX500 ----------------
EX = "/home/teacher-admin/picamera2-examples/examples/imx500"
write("imx500/stock/run-object-finder.sh", sh(
    "Object Finder, the all-rounder. Stock Raspberry Pi sample via rpicam-hello and a settings file.",
    'echo "Starting the Object Finder."\n' + FIRST_RUN +
    "rpicam-hello -t 0s --post-process-file /usr/share/rpi-camera-assets/imx500_mobilenet_ssd.json "
    "--viewfinder-width 1280 --viewfinder-height 720 --framerate 30\n"))
write("imx500/stock/run-stick-figure.sh", sh(
    "Stick Figure Tracker (posenet). Stock Raspberry Pi sample via rpicam-hello and a settings file.",
    'echo "Starting the Stick Figure Tracker."\n' + FIRST_RUN +
    "rpicam-hello -t 0s --post-process-file /usr/share/rpi-camera-assets/imx500_posenet.json "
    "--viewfinder-width 1280 --viewfinder-height 720 --framerate 30\n"))
write("imx500/stock/run-name-guesser.sh", sh(
    "Name Guesser: one label for the whole picture. Stock Picamera2 example. Change MODEL to race other guessers.",
    "MODEL=/usr/share/imx500-models/imx500_network_mobilenet_v2.rpk\n"
    f"cd {EX} || exit 1\n"
    'echo "Starting the Name Guesser with $(basename "$MODEL")."\n' + FIRST_RUN +
    'python3 imx500_classification_demo.py --model "$MODEL"\n'))
write("imx500/stock/run-shape-painter.sh", sh(
    "Shape Painter: colours in the exact outline of each object (deeplabv3plus). Stock Picamera2 example.",
    "MODEL=/usr/share/imx500-models/imx500_network_deeplabv3plus.rpk\n"
    f"cd {EX} || exit 1\n"
    'echo "Starting the Shape Painter."\n' + FIRST_RUN +
    'python3 imx500_segmentation_demo.py --model "$MODEL"\n'))
write("imx500/stock/run-body-tracker-pro.sh", sh(
    "Precise Body Tracker: several people at once (higherhrnet). Stock Picamera2 example.",
    f"cd {EX} || exit 1\n"
    'echo "Starting the Precise Body Tracker."\n' + FIRST_RUN +
    "python3 imx500_pose_estimation_higherhrnet_demo.py\n"))
write("imx500/ours/run-ai-camera-lab.sh",
    "#!/bin/bash\n# AI Camera Lab: our own test bench. Pick any of the 23 models and run it.\n"
    f"cd {H}/imx500/ours || exit 1\npython3 ai_camera_lab.py\n")

cam = [
    ("ai-camera-lab", "AI Camera Lab", "Pick any AI model and watch the camera run it", "ours/run-ai-camera-lab.sh", False),
    ("object-finder", "Object Finder", "Boxes and names around things the camera knows", "stock/run-object-finder.sh", True),
    ("stick-figure", "Stick Figure Tracker", "Turns people into stick figures", "stock/run-stick-figure.sh", True),
    ("name-guesser", "Name Guesser", "One guess at what the whole picture is", "stock/run-name-guesser.sh", True),
    ("shape-painter", "Shape Painter", "Colours in the exact shape of each object", "stock/run-shape-painter.sh", True),
    ("body-tracker-pro", "Precise Body Tracker", "Tracks several people at once", "stock/run-body-tracker-pro.sh", True),
]
for slug, name, comment, script, term in cam:
    write(f"imx500/launchers/{slug}.desktop",
          desktop(name, comment, f"{H}/imx500/{script}", f"{H}/imx500/launchers/{slug}.png", term))

# ---------------- LiDAR ----------------
write("YahboomLidar/ours/run-lidar-radar.sh", sh(
    "LiDAR Radar: our radar-screen display of what the 360-degree LiDAR sees.",
    f"cd {H}/YahboomLidar/ours || exit 1\n" + NO_LIDAR +
    'echo "Starting the LiDAR Radar. Ignore the red checksum lines for the first second."\n'
    "python3 lidar_radar.py\n"))
write("YahboomLidar/stock/run-lidar-text-test.sh", sh(
    "LiDAR Text Test: the YDLidar SDK test for our exact unit (T-mini Plus, SH variant). Text output.",
    NO_LIDAR +
    'echo "When asked, type  /dev/ttyUSB0  then Enter, then  230400  then Enter. Ctrl+C stops it."\n'
    "tmini-sh_test\n"))
lid = [
    ("lidar-radar", "LiDAR Radar", "See what the 360-degree LiDAR sees", "ours/run-lidar-radar.sh", True),
    ("lidar-text-test", "LiDAR Text Test", "The makers own test program, text only", "stock/run-lidar-text-test.sh", True),
]
for slug, name, comment, script, term in lid:
    write(f"YahboomLidar/launchers/{slug}.desktop",
          desktop(name, comment, f"{H}/YahboomLidar/{script}", f"{H}/YahboomLidar/launchers/{slug}.png", term))

# ---------------- icon drawer (runs on the Pi) ----------------
write("make-icons.py", r'''#!/usr/bin/env python3
"""Draws simple PNG icons for the desktop launchers. Run on the Pi: python3 make-icons.py"""
import math, os
from PIL import Image, ImageDraw

S = 256
H = os.path.expanduser("~/Desktop")
W = (255, 255, 255, 255)

def tile(color):
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((8, 8, S - 8, S - 8), radius=48, fill=color)
    return im, d

def save(im, folder, name):
    p = os.path.join(H, folder, "launchers", name + ".png")
    im.save(p); print("wrote", p)

# AI Camera Lab: camera body and lens
im, d = tile((36, 99, 235, 255))
d.rounded_rectangle((48, 84, 208, 196), radius=18, fill=W)
d.rectangle((96, 62, 160, 90), fill=W)
d.ellipse((98, 106, 158, 166), fill=(36, 99, 235, 255))
d.ellipse((114, 122, 142, 150), fill=W)
save(im, "imx500", "ai-camera-lab")

# Object Finder: corner brackets around a dot
im, d = tile((16, 150, 100, 255))
for (x, y) in [(56, 56), (200, 56), (56, 200), (200, 200)]:
    sx = 1 if x == 56 else -1; sy = 1 if y == 56 else -1
    d.line((x, y, x + sx * 40, y), fill=W, width=12)
    d.line((x, y, x, y + sy * 40), fill=W, width=12)
d.ellipse((104, 104, 152, 152), fill=W)
save(im, "imx500", "object-finder")

# Stick Figure
im, d = tile((234, 88, 12, 255))
d.ellipse((108, 40, 148, 80), fill=W)
d.line((128, 80, 128, 150), fill=W, width=12)
d.line((128, 100, 80, 130), fill=W, width=12); d.line((128, 100, 176, 130), fill=W, width=12)
d.line((128, 150, 92, 212), fill=W, width=12); d.line((128, 150, 164, 212), fill=W, width=12)
save(im, "imx500", "stick-figure")

# Name Guesser: question mark
im, d = tile((124, 58, 237, 255))
d.arc((78, 48, 178, 148), start=200, end=90, fill=W, width=16)
d.line((128, 148, 128, 178), fill=W, width=16)
d.ellipse((116, 194, 140, 218), fill=W)
save(im, "imx500", "name-guesser")

# Shape Painter: paint blob
im, d = tile((219, 39, 119, 255))
d.ellipse((60, 70, 196, 190), fill=W)
d.ellipse((150, 50, 210, 110), fill=W)
d.ellipse((50, 150, 100, 200), fill=W)
d.ellipse((110, 110, 146, 146), fill=(219, 39, 119, 255))
save(im, "imx500", "shape-painter")

# Precise Body Tracker: two stick figures
im, d = tile((202, 138, 4, 255))
for cx in (88, 168):
    d.ellipse((cx - 16, 52, cx + 16, 84), fill=W)
    d.line((cx, 84, cx, 140), fill=W, width=10)
    d.line((cx, 100, cx - 30, 124), fill=W, width=10); d.line((cx, 100, cx + 30, 124), fill=W, width=10)
    d.line((cx, 140, cx - 24, 200), fill=W, width=10); d.line((cx, 140, cx + 24, 200), fill=W, width=10)
save(im, "imx500", "body-tracker-pro")

# LiDAR Radar: rings and a sweep
im, d = tile((15, 118, 110, 255))
for r in (36, 68, 100):
    d.ellipse((128 - r, 128 - r, 128 + r, 128 + r), outline=W, width=6)
d.pieslice((28, 28, 228, 228), start=270, end=330, fill=(255, 255, 255, 120))
d.line((128, 128, 128 + 100 * math.cos(math.radians(-30)), 128 + 100 * math.sin(math.radians(-30))), fill=W, width=8)
d.ellipse((118, 118, 138, 138), fill=W)
save(im, "YahboomLidar", "lidar-radar")

# LiDAR Text Test: terminal prompt
im, d = tile((55, 65, 81, 255))
d.rounded_rectangle((40, 56, 216, 200), radius=14, fill=(17, 24, 39, 255))
d.line((64, 96, 96, 122), fill=W, width=10); d.line((96, 122, 64, 148), fill=W, width=10)
d.line((112, 150, 176, 150), fill=W, width=10)
save(im, "YahboomLidar", "lidar-text-test")
''')

# ---------------- installer (runs on the Pi) ----------------
write("install-launchers.sh", r'''#!/bin/bash
# Installs the desktop launchers. Safe to re-run.
set -e
D=~/Desktop
# 1. move our scripts into ours/ (only if still in the home folder)
[ -f ~/ai_camera_lab.py ] && mv -v ~/ai_camera_lab.py "$D/imx500/ours/"
[ -f ~/lidar_radar.py ] && mv -v ~/lidar_radar.py "$D/YahboomLidar/ours/"
[ -f ~/lidar_radar.py.save ] && mv -v ~/lidar_radar.py.save "$D/YahboomLidar/ours/"
# 2. make scripts runnable
chmod +x "$D"/imx500/stock/*.sh "$D"/imx500/ours/*.sh "$D"/YahboomLidar/stock/*.sh "$D"/YahboomLidar/ours/*.sh
# 3. icons
python3 "$D/make-icons.py"
# 4. launchers onto the Desktop, marked executable so the file manager trusts them
for f in "$D"/imx500/launchers/*.desktop "$D"/YahboomLidar/launchers/*.desktop; do
  chmod +x "$f"; cp "$f" "$D/"; chmod +x "$D/$(basename "$f")"
done
# 5. check every Exec and Icon path really exists
if command -v desktop-file-validate >/dev/null; then desktop-file-validate "$D"/*.desktop && echo "desktop files valid"; fi
for f in "$D"/*.desktop; do
  ex=$(grep '^Exec=' "$f" | cut -d= -f2-); ic=$(grep '^Icon=' "$f" | cut -d= -f2-)
  [ -x "$ex" ] || echo "MISSING exec: $ex"; [ -f "$ic" ] || echo "MISSING icon: $ic"
done
ls -la "$D"
echo "install done"
''')
