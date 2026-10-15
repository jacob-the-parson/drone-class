"""Record the practice data the Pi screen plays when no Pi is connected.

    python scripts/pi_practice.py public/data/practice-pi.json

Runs the bridge's own modules with MADE-UP sensors (pi/fcpi/sensors.py: a room of 6 by
4 metres with one person walking in it) for a while, and writes what the hub held five
times a second. Nothing here is from a real room, camera or LiDAR.

The LiDAR's angles are the made-up scan's fixed ones (400 points from -180 degrees), so
only the ranges are written, in centimetres.
"""

import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'pi'))

from fcpi import config, hub, modules  # noqa: E402

if len(sys.argv) != 2:
    print(__doc__)
    sys.exit(2)

SECONDS, HZ = 18.0, 5.0
c = dict(config.DEFAULTS, level='student', _path='(recording)', _note=None)
h = hub.Hub()
m = modules.Manager(h, c, made_up=True)
assert m.start('look-and-measure')['ok']
time.sleep(1.0)

frames = []
angles = None
start = time.time()
while time.time() - start < SECONDS:
    t0 = time.time()
    scan, det, meas = h.get('scan'), h.get('detections'), h.get('measure')
    if scan and det and meas:
        angles = angles or scan['angles']
        frames.append({
            't': round(t0 - start, 2),
            'ranges_cm': [int(round(r * 100)) for r in scan['ranges_m']],
            'detections': det['items'],
            'measure': meas['items'],
        })
    time.sleep(max(0.0, 1.0 / HZ - (time.time() - t0)))
m.stop_all()

out = {
    'schema': 'flight-companion/practice-pi@1',
    'about': 'Made-up Pi data for the Pi screen: a room of 6 by 4 metres with one person walking in it, recorded '
             'from the bridge\'s made-up sensors. No real room, camera or LiDAR is in it.',
    'hz': HZ,
    'seconds': round(frames[-1]['t'], 2),
    'angles_deg': angles,
    'horizontal_fov_deg': 66.0,
    'max_range_m': 16.0,
    'frames': frames,
}
with open(sys.argv[1], 'w', encoding='utf-8', newline='\n') as f:
    json.dump(out, f, separators=(',', ':'))
print(f'{len(frames)} frames over {out["seconds"]} s -> {sys.argv[1]} ({os.path.getsize(sys.argv[1]) // 1024} KB)')
