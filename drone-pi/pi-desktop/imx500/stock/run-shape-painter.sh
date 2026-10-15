#!/bin/bash
# Shape Painter: colours in the exact outline of each object (deeplabv3plus). Stock Picamera2 example.
MODEL=/usr/share/imx500-models/imx500_network_deeplabv3plus.rpk
cd /home/teacher-admin/picamera2-examples/examples/imx500 || exit 1
echo "Starting the Shape Painter."
echo "First run takes 10-30 s while the model loads into the camera. Not a crash."
echo "Close the preview window or press Ctrl+C here to stop."
python3 imx500_segmentation_demo.py --model "$MODEL"
echo; read -r -p "Finished. Press Enter to close this window."
