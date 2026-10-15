#!/bin/bash
# LiDAR Radar: our radar-screen display of what the 360-degree LiDAR sees.
cd /home/teacher-admin/Desktop/YahboomLidar/ours || exit 1
if ! ls /dev/ttyUSB* >/dev/null 2>&1; then
  echo "No LiDAR found on USB. Plug in the data cable (USB_DATA), wait for it to spin, try again."
  echo; read -r -p "Press Enter to close this window."; exit 1
fi
echo "Starting the LiDAR Radar. Ignore the red checksum lines for the first second."
python3 lidar_radar.py
echo; read -r -p "Finished. Press Enter to close this window."
