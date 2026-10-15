#!/usr/bin/env python3
"""
AI Camera Lab
=============

A test bench for the Raspberry Pi AI Camera (Sony IMX500).

Pick any model the camera has, read what it does, press Start, and watch
it run. Everything the program does is printed in the log at the bottom,
so when something goes wrong you can see why instead of guessing.

RUN THIS FROM THE PI'S DESKTOP -- directly, or through VNC.
The camera preview needs a screen to draw on, so it will not work over
plain SSH.

    python3 ai_camera_lab.py

Written to be read. Start at the bottom of the file and work upward.
"""

import glob
import os
import queue
import signal
import subprocess
import threading
import tkinter as tk
from tkinter import ttk

# --------------------------------------------------------------------
# Where things live on the Pi
# --------------------------------------------------------------------

MODEL_DIR = "/usr/share/imx500-models"        # the models themselves (.rpk)
ASSET_DIR = "/usr/share/rpi-camera-assets"    # ready-made settings (.json)

# The Picamera2 example scripts. We look in a few likely places, because
# the Raspberry Pi documentation has moved this repository around.
EXAMPLE_DIRS = [
    os.path.expanduser("~/picamera2-examples/examples/imx500"),
    os.path.expanduser("~/picamera2/examples/imx500"),
    os.path.expanduser("~/picamera2-examples"),
]


def find_examples():
    """Return the folder holding the imx500 Python demos, or None."""
    for d in EXAMPLE_DIRS:
        if os.path.isdir(d) and glob.glob(os.path.join(d, "imx500_*demo.py")):
            return d
    return None


# --------------------------------------------------------------------
# The catalog
# --------------------------------------------------------------------
# Each entry: (model file stem, friendly name, what it does, how to run it)
#
# "how to run it" is one of:
#   "asset"   -> rpicam-hello with a .json settings file. Needs nothing extra.
#   "detect"  -> imx500_object_detection_demo.py   (needs the examples repo)
#   "classify"-> imx500_classification_demo.py     (needs the examples repo)
#   "pose"    -> imx500_pose_estimation_higherhrnet_demo.py
#   "segment" -> imx500_segmentation_demo.py

CATALOG = [
    # ---- Object Finders -------------------------------------------
    ("Object Finders", [
        ("ssd_mobilenetv2_fpnlite_320x320_pp", "The all-rounder",
         "Draws a box around every object it knows and names it. Knows 80 "
         "everyday things: people, cars, dogs, cups, phones, chairs. This is "
         "the one we tested first and the best place to start.", "detect"),
        ("efficientdet_lite0_pp", "The careful finder",
         "Same job, but better at small or far-away objects. A little slower.",
         "detect"),
        ("nanodet_plus_416x416_pp", "The quick finder",
         "A lightweight finder built for speed. Good for tracking something "
         "that is moving.", "detect"),
        ("nanodet_plus_416x416", "The quick finder (Pi does the work)",
         "The same model, except the Pi finishes the job instead of the "
         "camera. Run this one alongside htop and compare -- it shows exactly "
         "what the camera's own chip is saving you.", "detect"),
    ]),

    # ---- Name Guessers --------------------------------------------
    ("Name Guessers", [
        ("squeezenet1.0", "Tiny brain",
         "One of the smallest models here. Very quick, and wrong more often. "
         "Race it against a big one on the same object.", "classify"),
        ("mobilevit_xxs", "Tiny brain, new style",
         "A newer kind of AI that looks at how parts of a picture relate to "
         "each other rather than just at shapes and edges.", "classify"),
        ("mobilevit_xs", "Small brain, new style",
         "The slightly bigger version of the one above.", "classify"),
        ("regnetx_002", "Computer-designed brain",
         "Its shape was chosen by a computer searching for an efficient "
         "design, rather than by a person.", "classify"),
        ("regnety_002", "Computer-designed brain, with focus",
         "Same family, plus a trick that lets it pay more attention to the "
         "important parts of a picture.", "classify"),
        ("regnety_004", "Computer-designed brain, bigger",
         "The larger version of the one above.", "classify"),
        ("shufflenet_v2_x1_5", "Phone brain",
         "Built to run on phones, so it wastes very little effort.",
         "classify"),
        ("mobilenet_v2", "The classic",
         "A well-known phone-sized model and a sensible default.", "classify"),
        ("mnasnet1.0", "Speed-tuned brain",
         "Also designed by an automated search, tuned specifically to be "
         "fast.", "classify"),
        ("efficientnet_lite0", "Balanced brain",
         "A good middle ground, simplified to run on small devices.",
         "classify"),
        ("efficientnet_bo", "The original EfficientNet",
         "The file really is spelled 'bo'. It means B-zero, not a typo.",
         "classify"),
        ("efficientnetv2_b0", "EfficientNet, improved",
         "The newer version of the design above.", "classify"),
        ("efficientnetv2_b1", "EfficientNet, improved and bigger",
         "A step up in size and usually in accuracy.", "classify"),
        ("efficientnetv2_b2", "EfficientNet, biggest",
         "The largest EfficientNet on the camera, and usually the most "
         "accurate of the family.", "classify"),
        ("resnet18", "Big brain",
         "The largest name guesser here. An older, famous design from AI "
         "history. Slower, but confident.", "classify"),
    ]),

    # ---- Body Trackers --------------------------------------------
    ("Body Trackers", [
        ("posenet", "Stick figure tracker",
         "Finds shoulders, elbows, knees and wrists and joins them into a "
         "stick figure. Fast and simple. Good for counting jumping jacks.",
         "asset"),
        ("higherhrnet_coco", "Precise body tracker",
         "A more accurate tracker that handles several people at once. Good "
         "for arm-signal ideas: wave both arms and something happens.",
         "pose"),
    ]),

    # ---- Shape Painters -------------------------------------------
    ("Shape Painters", [
        ("deeplabv3plus", "Shape painter",
         "Instead of a rough box, it colors in the exact outline of each "
         "object, pixel by pixel. The clearest way to show the difference "
         "between 'roughly here' and 'exactly this shape'.", "segment"),
    ]),

    # ---- Diagnostic -----------------------------------------------
    ("The AI's-Eye View", [
        ("inputtensoronly", "What the AI actually sees",
         "Runs no AI at all. It shows the small, squashed picture the camera "
         "hands to the model. Surprising how blurry it is -- and a good "
         "reminder that the AI is not seeing what you see.", "asset"),
    ]),
]


# --------------------------------------------------------------------
# Working out how to launch each model
# --------------------------------------------------------------------

def model_path(stem):
    return os.path.join(MODEL_DIR, f"imx500_network_{stem}.rpk")


def asset_for(stem):
    """Find a ready-made .json settings file that matches this model."""
    candidates = {
        "posenet": "imx500_posenet.json",
        "ssd_mobilenetv2_fpnlite_320x320_pp": "imx500_mobilenet_ssd.json",
        "inputtensoronly": "imx500_input_tensor_only.json",
    }
    name = candidates.get(stem)
    if name:
        path = os.path.join(ASSET_DIR, name)
        if os.path.isfile(path):
            return path
    return None


SCRIPTS = {
    "detect": "imx500_object_detection_demo.py",
    "classify": "imx500_classification_demo.py",
    "pose": "imx500_pose_estimation_higherhrnet_demo.py",
    "segment": "imx500_segmentation_demo.py",
}


def build_command(stem, how, examples):
    """Return (command list, working folder, note) or (None, None, reason)."""
    rpk = model_path(stem)
    if not os.path.isfile(rpk):
        return None, None, f"Model file not installed: {rpk}"

    # Prefer a ready-made settings file -- it needs nothing downloaded.
    asset = asset_for(stem)
    if how == "asset" or (asset and how == "detect"):
        if asset:
            return ([
                "rpicam-hello", "-t", "0s",
                "--post-process-file", asset,
                "--viewfinder-width", "1280",
                "--viewfinder-height", "720",
                "--framerate", "30",
            ], None, f"Using settings file {os.path.basename(asset)}")

    # Otherwise we need the Python examples.
    script = SCRIPTS.get(how)
    if script is None:
        return None, None, f"No known way to run this model ({how})."
    if examples is None:
        return None, None, (
            "This model needs the Picamera2 example scripts, which are not "
            "on this Pi yet. Press 'System check' for the install commands."
        )
    path = os.path.join(examples, script)
    if not os.path.isfile(path):
        return None, None, f"Missing script: {path}"

    cmd = ["python3", path, "--model", rpk]
    if how == "pose":
        cmd = ["python3", path]          # this one picks its own model
    return cmd, examples, f"Using {script}"


# --------------------------------------------------------------------
# The application
# --------------------------------------------------------------------

class CameraLab:

    def __init__(self, root):
        self.root = root
        self.process = None
        self.reader = None
        self.lines = queue.Queue()
        self.examples = find_examples()
        self.entries = {}          # display label -> (stem, how, blurb)

        root.title("AI Camera Lab")
        root.geometry("760x620")

        outer = ttk.Frame(root, padding=14)
        outer.pack(fill="both", expand=True)

        ttk.Label(outer, text="AI Camera Lab",
                  font=("Helvetica", 18, "bold")).pack(anchor="w")
        ttk.Label(outer,
                  text="Pick a model, read what it does, then press Start."
                  ).pack(anchor="w", pady=(0, 12))

        # --- Group and model pickers --------------------------------
        picker = ttk.Frame(outer)
        picker.pack(fill="x")

        ttk.Label(picker, text="Group:").grid(row=0, column=0, sticky="w")
        self.group = tk.StringVar()
        self.group_box = ttk.Combobox(
            picker, textvariable=self.group, state="readonly", width=24,
            values=[g for g, _ in CATALOG])
        self.group_box.grid(row=0, column=1, sticky="w", padx=(8, 20))
        self.group_box.bind("<<ComboboxSelected>>", self.group_changed)

        ttk.Label(picker, text="Model:").grid(row=0, column=2, sticky="w")
        self.model = tk.StringVar()
        self.model_box = ttk.Combobox(
            picker, textvariable=self.model, state="readonly", width=34)
        self.model_box.grid(row=0, column=3, sticky="w", padx=(8, 0))
        self.model_box.bind("<<ComboboxSelected>>", self.model_changed)

        # --- Description --------------------------------------------
        self.blurb = tk.Text(outer, height=5, wrap="word", relief="flat",
                             background="#f4f4f4", padx=10, pady=8)
        self.blurb.pack(fill="x", pady=12)
        self.blurb.configure(state="disabled")

        # --- Buttons -------------------------------------------------
        buttons = ttk.Frame(outer)
        buttons.pack(fill="x")

        self.start_button = ttk.Button(buttons, text="Start", width=12,
                                       command=self.start)
        self.start_button.pack(side="left")

        self.stop_button = ttk.Button(buttons, text="Stop", width=12,
                                      command=self.stop, state="disabled")
        self.stop_button.pack(side="left", padx=8)

        ttk.Button(buttons, text="System check", width=14,
                   command=self.system_check).pack(side="left", padx=8)

        ttk.Button(buttons, text="Clear log", width=12,
                   command=self.clear_log).pack(side="left")

        self.status = ttk.Label(outer, text="Ready", foreground="grey")
        self.status.pack(anchor="w", pady=(12, 4))

        # --- Log ------------------------------------------------------
        ttk.Label(outer, text="Log").pack(anchor="w")
        log_frame = ttk.Frame(outer)
        log_frame.pack(fill="both", expand=True)

        self.log = tk.Text(log_frame, wrap="word", height=14,
                           background="#1e1e1e", foreground="#d4d4d4",
                           insertbackground="#d4d4d4", padx=8, pady=6)
        scroll = ttk.Scrollbar(log_frame, command=self.log.yview)
        self.log.configure(yscrollcommand=scroll.set)
        self.log.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")

        root.protocol("WM_DELETE_WINDOW", self.on_close)

        # Start on the first group, and warn early about common problems.
        self.group_box.current(0)
        self.group_changed()
        self.first_warnings()
        self.pump()

    # --- Setting up ---------------------------------------------------

    def first_warnings(self):
        self.say("AI Camera Lab ready.")
        if not os.environ.get("WAYLAND_DISPLAY") and not os.environ.get("DISPLAY"):
            self.say("WARNING: no display found in this session. The preview "
                     "window will not open. Run this from the Pi's desktop "
                     "or through VNC, not over plain SSH.")
        if self.examples:
            self.say(f"Picamera2 examples found: {self.examples}")
        else:
            self.say("Picamera2 examples not found. Models that need them "
                     "will say so. Press 'System check' for the fix.")

    def group_changed(self, event=None):
        group = self.group.get()
        models = dict(CATALOG)[group]
        self.entries = {}
        labels = []
        for stem, friendly, blurb, how in models:
            label = f"{friendly}  ({stem})"
            self.entries[label] = (stem, how, blurb)
            labels.append(label)
        self.model_box.configure(values=labels)
        self.model_box.current(0)
        self.model_changed()

    def model_changed(self, event=None):
        stem, how, blurb = self.entries[self.model.get()]
        installed = os.path.isfile(model_path(stem))
        text = blurb
        if not installed:
            text += "\n\nNOT INSTALLED on this Pi."
        self.blurb.configure(state="normal")
        self.blurb.delete("1.0", "end")
        self.blurb.insert("1.0", text)
        self.blurb.configure(state="disabled")

    # --- Running ------------------------------------------------------

    def start(self):
        if self.process is not None:
            return

        stem, how, _ = self.entries[self.model.get()]
        cmd, cwd, note = build_command(stem, how, self.examples)

        if cmd is None:
            self.say(f"Cannot run this one: {note}")
            self.set_status(note[:70], "red")
            return

        self.say("")
        self.say(f"--- {stem} ---")
        self.say(note)
        self.say(" ".join(cmd))

        try:
            self.process = subprocess.Popen(
                cmd, cwd=cwd, start_new_session=True,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, bufsize=1)
        except FileNotFoundError as err:
            self.say(f"Could not start: {err}")
            self.set_status("Could not start", "red")
            self.process = None
            return

        # Read its output on a background thread so the window stays alive.
        self.reader = threading.Thread(
            target=self.read_output, args=(self.process,), daemon=True)
        self.reader.start()

        self.start_button.config(state="disabled")
        self.stop_button.config(state="normal")
        self.group_box.config(state="disabled")
        self.model_box.config(state="disabled")
        self.set_status("Loading the model into the camera...", "orange")

    def read_output(self, proc):
        for line in proc.stdout:
            self.lines.put(line.rstrip())
        proc.stdout.close()

    def stop(self):
        if self.process is None:
            return
        try:
            os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            self.process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(os.getpgid(self.process.pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
        self.process = None
        self.reset_buttons()
        self.set_status("Stopped", "grey")

    def pump(self):
        """Runs ten times a second: moves log lines across, watches the child."""
        while not self.lines.empty():
            self.say(self.lines.get())

        if self.process is not None and self.process.poll() is not None:
            code = self.process.returncode
            self.process = None
            self.reset_buttons()
            if code == 0:
                self.set_status("Finished", "grey")
            else:
                self.set_status(f"Exited with code {code} -- see the log", "red")
                self.say(f"--- exited with code {code} ---")
        elif self.process is not None and "Loading" in self.status.cget("text"):
            self.set_status("Running -- point the camera at something", "green")

        self.root.after(100, self.pump)

    # --- Checks -------------------------------------------------------

    def system_check(self):
        self.say("")
        self.say("=== System check ===")

        models = sorted(glob.glob(os.path.join(MODEL_DIR, "*.rpk")))
        self.say(f"Models installed: {len(models)} in {MODEL_DIR}")

        assets = sorted(glob.glob(os.path.join(ASSET_DIR, "imx500_*.json")))
        self.say(f"Settings files:   {len(assets)}")
        for a in assets:
            self.say(f"    {os.path.basename(a)}")

        firmware = sorted(glob.glob("/lib/firmware/imx500*"))
        self.say(f"Camera firmware:  {len(firmware)} file(s)")

        try:
            import picamera2  # noqa: F401
            self.say("Picamera2:        installed")
        except ImportError:
            self.say("Picamera2:        MISSING -- "
                     "sudo apt install python3-picamera2")

        for mod, pkg in (("cv2", "python3-opencv"), ("munkres", "python3-munkres")):
            try:
                __import__(mod)
                self.say(f"{mod + ':':18}installed")
            except ImportError:
                self.say(f"{mod + ':':18}MISSING -- sudo apt install {pkg}")

        if self.examples:
            self.say(f"Example scripts:  {self.examples}")
        else:
            self.say("Example scripts:  NOT FOUND. To install them:")
            self.say("    sudo apt install git python3-opencv python3-munkres")
            self.say("    cd ~ && git clone "
                     "https://github.com/raspberrypi/picamera2-examples")

        session = os.environ.get("WAYLAND_DISPLAY") or os.environ.get("DISPLAY")
        self.say(f"Display:          {session or 'NONE -- preview will fail'}")
        self.say("=== end ===")

    # --- Small helpers ------------------------------------------------

    def say(self, text):
        self.log.insert("end", text + "\n")
        self.log.see("end")

    def clear_log(self):
        self.log.delete("1.0", "end")

    def reset_buttons(self):
        self.start_button.config(state="normal")
        self.stop_button.config(state="disabled")
        self.group_box.config(state="readonly")
        self.model_box.config(state="readonly")

    def set_status(self, text, colour):
        self.status.config(text=text, foreground=colour)

    def on_close(self):
        self.stop()
        self.root.destroy()


# This is where the program actually begins.
if __name__ == "__main__":
    window = tk.Tk()
    CameraLab(window)
    window.mainloop()
