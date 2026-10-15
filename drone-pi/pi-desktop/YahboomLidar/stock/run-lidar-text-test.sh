#!/bin/bash
# LiDAR Text Test: the YDLidar SDK test for our exact unit (T-mini Plus, SH variant). Text output.
if ! ls /dev/ttyUSB* >/dev/null 2>&1; then
  echo "No LiDAR found on USB. Plug in the data cable (USB_DATA), wait for it to spin, try again."
  echo; read -r -p "Press Enter to close this window."; exit 1
fi
echo "When asked, type  /dev/ttyUSB0  then Enter, then  230400  then Enter. Ctrl+C stops it."
tmini-sh_test
echo; read -r -p "Finished. Press Enter to close this window."
