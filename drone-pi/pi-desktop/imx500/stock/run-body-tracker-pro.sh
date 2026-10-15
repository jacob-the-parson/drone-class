#!/bin/bash
# Precise Body Tracker: several people at once (higherhrnet). Stock Picamera2 example.
cd /home/teacher-admin/picamera2-examples/examples/imx500 || exit 1
echo "Starting the Precise Body Tracker."
echo "First run takes 10-30 s while the model loads into the camera. Not a crash."
echo "Close the preview window or press Ctrl+C here to stop."
python3 imx500_pose_estimation_higherhrnet_demo.py
echo; read -r -p "Finished. Press Enter to close this window."
