#!/usr/bin/env python3
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
