#!/bin/bash
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
