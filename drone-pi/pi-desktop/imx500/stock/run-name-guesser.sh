#!/bin/bash
# Name Guesser: one label for the whole picture. Stock Picamera2 example. Change MODEL to race other guessers.
MODEL=/usr/share/imx500-models/imx500_network_mobilenet_v2.rpk
cd /home/teacher-admin/picamera2-examples/examples/imx500 || exit 1
echo "Starting the Name Guesser with $(basename "$MODEL")."
echo "First run takes 10-30 s while the model loads into the camera. Not a crash."
echo "Close the preview window or press Ctrl+C here to stop."
python3 imx500_classification_demo.py --model "$MODEL"
echo; read -r -p "Finished. Press Enter to close this window."
