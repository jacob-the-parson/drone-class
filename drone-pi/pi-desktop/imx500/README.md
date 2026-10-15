# AI Camera (Raspberry Pi AI Camera, Sony IMX500)

This folder is the home for everything that runs on the AI camera.
The camera has its own small AI chip. The Pi hands it a "model" (a trained
brain), the chip looks at every frame, and the Pi only gets the answers back.
Run `htop` in a second window while a model is running and watch how little
work the Pi is doing. That is the whole point of this camera.

Inventory checked 2026-09-28. Everything below is installed and verified.

## Folders

| Folder | What goes in it |
|---|---|
| `stock/` | Notes and shortcuts for the samples Raspberry Pi ships. Do not edit the originals, they live in system folders (see below). |
| `ours/` | Apps we write for the class. `ai_camera_lab.py` lives here. |
| `community/` | Things found online that we want to try. Keep each one in its own sub-folder with a note saying where it came from. |
| `launchers/` | Desktop icons (`.desktop` files) and their pictures. One icon per app, so a student can double-click instead of typing. |

Rule of thumb: if you did not write it and Raspberry Pi did not ship it, it goes in `community/`.

## What is installed

| Thing | Where | Version |
|---|---|---|
| Camera driver and firmware | `/lib/firmware/imx500_firmware.fpk`, `imx500_loader.fpk` | `imx500-firmware 0.FF23+3` |
| 23 AI models (`.rpk` files) | `/usr/share/imx500-models/` | `imx500-models 1.0.0` |
| Ready-made camera settings (`.json`) | `/usr/share/rpi-camera-assets/` | part of `rpicam-apps 1.13.0` |
| `rpicam-hello`, `rpicam-still`, `rpicam-vid` | command line camera tools | `rpicam-apps 1.13.0` |
| Picamera2 (Python camera library) | `python3-picamera2` | 0.3.37 |
| Picamera2 example scripts | `~/picamera2-examples/examples/imx500/` | git 2026-09-03 |
| OpenCV (Python) | `python3-opencv` | 4.10.0 |
| munkres (needed by the pose demo) | `python3-munkres` | 1.1.4 |
| Our test bench | `~/Desktop/imx500/ours/ai_camera_lab.py` | 2026-09-23 |

Camera check: `rpicam-hello --list-cameras` shows
`0 : imx500 [4056x3040 10-bit RGGB]`. A headless still capture works over SSH.

## Two ways to run a model

Every model needs a **screen**. Run these from the Pi desktop or through VNC,
not from a plain SSH window. The first run of any model takes 10 to 30 seconds
while the model uploads into the camera chip. That is not a crash. Wait.

### Way 1: `rpicam-hello` with a settings file (needs nothing extra)

```bash
# Object detection, draws boxes and names around things it knows
rpicam-hello -t 0s --post-process-file /usr/share/rpi-camera-assets/imx500_mobilenet_ssd.json

# Stick-figure body tracking
rpicam-hello -t 0s --post-process-file /usr/share/rpi-camera-assets/imx500_posenet.json
```

Add `--viewfinder-width 1280 --viewfinder-height 720 --framerate 30` for a
bigger window. `-t 0s` means "run until I close it". Press Ctrl+C in the
terminal to stop.

Only two IMX500 settings files ship on this Pi: `imx500_mobilenet_ssd.json`
and `imx500_posenet.json`. Everything else uses Way 2.

### Way 2: the Picamera2 example scripts (the other 21 models)

```bash
cd ~/picamera2-examples/examples/imx500

# Object detection, pick any "Object Finder" model
python3 imx500_object_detection_demo.py --model /usr/share/imx500-models/imx500_network_efficientdet_lite0_pp.rpk

# Name guessing (classification), pick any "Name Guesser" model
python3 imx500_classification_demo.py --model /usr/share/imx500-models/imx500_network_resnet18.rpk

# Colour in the exact shape of each object
python3 imx500_segmentation_demo.py --model /usr/share/imx500-models/imx500_network_deeplabv3plus.rpk

# Precise multi-person body tracking (picks its own model)
python3 imx500_pose_estimation_higherhrnet_demo.py
```

Useful extras: `--fps 15` to slow it down, `--threshold 0.4` on the object
detector to show less-certain guesses, `--print-intrinsics` to print what the
model says about itself and quit.

Other scripts in that folder: `imx500_object_detection_demo_mp.py`
(multi-process version), `imx500_object_detection_injection_demo.py` (feeds a
saved picture instead of the live camera), `imx500_get_device_id.py`.

### Way 3: our test bench

```bash
python3 ~/Desktop/imx500/ours/ai_camera_lab.py
```

Pick a group, pick a model, read what it does, press Start. The log at the
bottom shows the exact command it ran, so you can copy it into a terminal.

## The 23 models, by teaching group

Model files are `/usr/share/imx500-models/imx500_network_<name>.rpk`.

**Object Finders** (draw a box, name the object). Run with Way 1 or the
object-detection script.

| Name | Nickname |
|---|---|
| `ssd_mobilenetv2_fpnlite_320x320_pp` | The all-rounder. Start here. Knows 80 everyday things. |
| `efficientdet_lite0_pp` | The careful finder. Better on small or far objects. |
| `nanodet_plus_416x416_pp` | The quick finder. |
| `nanodet_plus_416x416` | The quick finder, but the Pi does the last step. Run next to `htop` and compare. |

**Name Guessers** (one label for the whole picture). Run with the classification
script. Race a small one against a big one on the same object.

`squeezenet1.0` (tiny), `mobilevit_xxs`, `mobilevit_xs`, `regnetx_002`,
`regnety_002`, `regnety_004`, `shufflenet_v2_x1_5`, `mobilenet_v2` (the
classic), `mnasnet1.0`, `efficientnet_lite0`, `efficientnet_bo` (B-zero, the
file really is spelled "bo"), `efficientnetv2_b0`, `efficientnetv2_b1`,
`efficientnetv2_b2`, `resnet18` (biggest).

**Body Trackers**: `posenet` (Way 1, stick figure) and `higherhrnet_coco`
(pose script, several people at once).

**Shape Painter**: `deeplabv3plus` (segmentation script).

**The AI's-Eye View**: `inputtensoronly`. Runs no AI. Shows the small squashed
picture the camera hands to the model. See the known issue below.

`_pp` on the end of a name means the camera chip does the post-processing too.

## Known issues (as of 2026-09-28)

- **`inputtensoronly` has no settings file on this Pi.** `ai_camera_lab.py`
  looks for `/usr/share/rpi-camera-assets/imx500_input_tensor_only.json`,
  which is not installed, so that entry will report "no known way to run".
  How to run this model without that file has not been looked up yet.
- The GUI test of `ai_camera_lab.py` has been started once but the result was
  never written down. Test order: The all-rounder, Stick figure tracker, then
  any Name Guesser.

## Noise you can ignore

Lines on the terminal like `QStandardPaths: wrong permissions`,
`qt.qpa.wayland ... requestActivate()` or `GLib-GObject-CRITICAL` are harmless.

## Desktop icons (built 2026-09-28)

Double-click any of these on the Desktop. Each opens a terminal window that
shows what is happening and waits for Enter before closing, so an error stays
on screen instead of vanishing.

| Icon | Runs | Where the script lives |
|---|---|---|
| AI Camera Lab | our test bench, all 23 models | `ours/run-ai-camera-lab.sh` |
| Object Finder | stock all-rounder detector | `stock/run-object-finder.sh` |
| Stick Figure Tracker | stock posenet | `stock/run-stick-figure.sh` |
| Name Guesser | stock classification demo with `mobilenet_v2` | `stock/run-name-guesser.sh` |
| Shape Painter | stock segmentation demo | `stock/run-shape-painter.sh` |
| Precise Body Tracker | stock higherhrnet pose demo | `stock/run-body-tracker-pro.sh` |

The `.desktop` files and PNG icons are in `launchers/`. The copies on the
Desktop are what the file manager shows; to change an icon, edit the one in
`launchers/` and copy it to `~/Desktop/` again. To add a new app, copy any
`.desktop` file, change `Name`, `Exec` and `Icon`, keep the paths absolute
(no `~`), and `chmod +x` it.

The wrapper scripts are short and meant to be read. To race a different Name
Guesser, change the `MODEL=` line in `stock/run-name-guesser.sh`.

Icons were drawn by `~/pi-desktop-setup/make-icons.py` (Pillow). The
installer that set all this up is `~/pi-desktop-setup/install-launchers.sh`;
it is safe to run again.
