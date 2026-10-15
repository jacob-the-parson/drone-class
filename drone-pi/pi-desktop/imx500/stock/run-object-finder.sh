#!/bin/bash
# Object Finder, the all-rounder. Stock Raspberry Pi sample via rpicam-hello and a settings file.
echo "Starting the Object Finder."
echo "First run takes 10-30 s while the model loads into the camera. Not a crash."
echo "Close the preview window or press Ctrl+C here to stop."
rpicam-hello -t 0s --post-process-file /usr/share/rpi-camera-assets/imx500_mobilenet_ssd.json --viewfinder-width 1280 --viewfinder-height 720 --framerate 30
echo; read -r -p "Finished. Press Enter to close this window."
