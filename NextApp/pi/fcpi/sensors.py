"""The LiDAR and the AI camera, real or made up.

Each source is a thread that publishes to the hub:

    'scan'        {'angles': [...], 'ranges_m': [...], 'hz', 'points', 'made_up', 'mount_measured'}
                  angles in degrees clockwise from the aircraft's nose (templates.to_body)
    'detections'  {'items': [{'label', 'score', 'box': [x, y, w, h]}], 'model', 'made_up'}
                  boxes as fractions of the picture
    'picture'     JPEG bytes, only when the teacher's settings allow pictures

THE REAL LIDAR is the YDLidar T-mini Plus, "SH" variant, that Yahboom supplied. Its
settings are copied from `lidar_radar.py` on this project's Pi, which the Pi's
inventory of 2026-09-28 records. DO NOT CHANGE THEM: bring-up was hard, and this
variant needs TYPE_TOF where the standard T-mini Plus needs TYPE_TRIANGLE. The SDK
spells "intensity" wrongly in two property names; the misspelling is kept.

THE REAL CAMERA is the Raspberry Pi AI Camera (Sony IMX500), driven as Raspberry Pi's
`imx500_object_detection_demo.py` drives it (picamera2-examples). The model is loaded
into the camera before Picamera2 is made; the first time a model is used that takes 10
to 30 seconds, and it is not a fault.

MADE-UP SOURCES draw a room of 6 by 4 metres with one person walking in it. They are
for running everything on a computer that has neither sensor. Everything they publish
is marked made_up.

Only one program can hold the LiDAR's serial port, and only one the camera. While the
bridge holds them, the LiDAR Radar and camera icons on the Pi's desktop cannot run.
"""

import io
import math
import os
import random
import threading
import time

from . import templates


class Source(threading.Thread):
    """A sensor thread that can be stopped, and says why it stopped."""

    uses = ''

    def __init__(self, hub, cfg):
        super().__init__(daemon=True, name=f'fcpi-{self.uses}')
        self.hub = hub
        self.cfg = cfg
        self.stopping = threading.Event()
        self.error = None

    def stop(self, timeout=5.0):
        self.stopping.set()
        if self.is_alive() and threading.current_thread() is not self:
            self.join(timeout)

    def run(self):
        try:
            self.loop()
        except Exception as err:  # noqa: BLE001  the hub is told; the bridge keeps running
            self.error = f'{type(err).__name__}: {err}'
            self.hub.say(f'{self.uses} stopped: {self.error}', 'error')
        finally:
            self.hub.clear(self.kind)

    kind = ''

    def loop(self):
        raise NotImplementedError


# ---------------------------------------------------------------- the made-up room

ROOM = (6.0, 4.0)          # metres, x along the nose, y to the right
AIRCRAFT = (1.5, 2.0)      # where the aircraft stands in it


def made_up_person(t):
    """Where the made-up person is at time t: walking a slow oval in front of the aircraft."""
    return (3.6 + 0.9 * math.cos(t * 0.35), 2.0 + 1.1 * math.sin(t * 0.35))


def _ray_to_walls(ox, oy, ang):
    dx, dy = math.cos(ang), math.sin(ang)
    best = None
    for wall, (ax, axis) in enumerate(((0.0, 'x'), (ROOM[0], 'x'), (0.0, 'y'), (ROOM[1], 'y'))):
        d = dx if axis == 'x' else dy
        o = ox if axis == 'x' else oy
        if abs(d) < 1e-9:
            continue
        s = (ax - o) / d
        if s > 0 and (best is None or s < best):
            best = s
    return best


def _ray_to_circle(ox, oy, ang, cx, cy, radius):
    dx, dy = math.cos(ang), math.sin(ang)
    fx, fy = ox - cx, oy - cy
    b = fx * dx + fy * dy
    c = fx * fx + fy * fy - radius * radius
    disc = b * b - c
    if disc < 0:
        return None
    s = -b - math.sqrt(disc)
    return s if s > 0 else None


def made_up_scan(t, rng, points=400):
    """One turn of the made-up LiDAR: (angles clockwise from the nose, ranges in metres)."""
    px, py = made_up_person(t)
    angles, ranges = [], []
    for i in range(points):
        a = -180.0 + i * 360.0 / points
        # clockwise from the nose, with y to the right: the same as the room's angle
        ang = math.radians(a)
        r = _ray_to_walls(AIRCRAFT[0], AIRCRAFT[1], ang)
        p = _ray_to_circle(AIRCRAFT[0], AIRCRAFT[1], ang, px, py, 0.22)
        if p is not None and (r is None or p < r):
            r = p
        # about one point in thirty comes back with nothing, as a real one does
        if r is None or rng.random() < 0.035:
            r = 0.0
        else:
            r = max(0.05, r + rng.gauss(0, 0.012))
        angles.append(round(a, 2))
        ranges.append(round(r, 3))
    return angles, ranges


# the made-up camera's field of view. Made up, like everything it sees; NOT the AI camera's
MADE_UP_FOV_DEG = 66.0


def made_up_detections(t):
    px, py = made_up_person(t)
    bearing = math.degrees(math.atan2(py - AIRCRAFT[1], px - AIRCRAFT[0]))
    distance = math.hypot(px - AIRCRAFT[0], py - AIRCRAFT[1])
    half = math.radians(MADE_UP_FOV_DEG) / 2
    if abs(math.radians(bearing)) >= half:
        return []
    cx = 0.5 + math.tan(math.radians(bearing)) / (2 * math.tan(half))
    w = min(0.5, 0.5 / distance)
    h = min(0.95, 1.6 / distance)
    return [{'label': 'person', 'score': round(0.78 + 0.1 * math.sin(t), 2),
             'box': [round(cx - w / 2, 4), round(0.5 - h / 2, 4), round(w, 4), round(h, 4)]}]


# ---------------------------------------------------------------- the LiDAR

class Lidar(Source):
    uses = 'lidar'
    kind = 'scan'

    def __init__(self, hub, cfg, made_up=False, hz=10.0):
        super().__init__(hub, cfg)
        self.made_up = made_up
        self.hz = hz

    def _publish(self, angles, ranges, hz):
        lc = self.cfg['lidar']
        measured = bool(lc['mount_measured'])
        off = lc['zero_offset_deg'] if lc['zero_offset_deg'] is not None else 0.0
        mir = bool(lc['mirrored'])
        if not self.made_up:
            angles = [templates.to_body(a, off, mir) for a in angles]
        self.hub.publish('scan', {
            'angles': angles, 'ranges_m': ranges, 'hz': hz, 'points': len(angles),
            'made_up': self.made_up, 'mount_measured': measured or self.made_up,
            'max_range_m': lc['max_range_m'], 'min_range_m': lc['min_range_m'],
        })

    def loop(self):
        if self.made_up:
            rng = random.Random(20261014)
            start = time.time()
            while not self.stopping.wait(1.0 / self.hz):
                angles, ranges = made_up_scan(time.time() - start, rng)
                self._publish(angles, ranges, self.hz)
            return
        self._real()

    def _real(self):
        import ydlidar  # the YDLidar SDK's Python binding, built on the Pi

        lc = self.cfg['lidar']
        port = lc['port']
        if not port:
            ports = ydlidar.lidarPortList()
            port = next(iter(ports.values()), None) if ports else None
        port = port or '/dev/ttyUSB0'
        if not os.path.exists(port):
            raise RuntimeError(f'no LiDAR at {port}. Is it plugged in, and spinning?')

        laser = ydlidar.CYdLidar()
        # ---- the working settings for the SH variant. Do not "fix" them.
        laser.setlidaropt(ydlidar.LidarPropSerialPort, port)
        laser.setlidaropt(ydlidar.LidarPropSerialBaudrate, 230400)
        laser.setlidaropt(ydlidar.LidarPropLidarType, ydlidar.TYPE_TOF)
        laser.setlidaropt(ydlidar.LidarPropDeviceType, ydlidar.YDLIDAR_TYPE_SERIAL)
        laser.setlidaropt(ydlidar.LidarPropScanFrequency, 10.0)
        laser.setlidaropt(ydlidar.LidarPropSampleRate, 4)
        laser.setlidaropt(ydlidar.LidarPropSingleChannel, False)
        laser.setlidaropt(ydlidar.LidarPropMaxAngle, 180.0)
        laser.setlidaropt(ydlidar.LidarPropMinAngle, -180.0)
        laser.setlidaropt(ydlidar.LidarPropMaxRange, float(lc['max_range_m']))
        laser.setlidaropt(ydlidar.LidarPropMinRange, float(lc['min_range_m']))
        laser.setlidaropt(ydlidar.LidarPropIntenstiy, True)
        laser.setlidaropt(ydlidar.LidarPropIntenstiyBit, 16)
        # ----
        if not laser.initialize():
            raise RuntimeError(f'the LiDAR at {port} did not start (initialize failed). Is another program using it?')
        try:
            if not laser.turnOn():
                raise RuntimeError('the LiDAR did not turn on')
            scan = ydlidar.LaserScan()
            skipped = 0
            while not self.stopping.is_set():
                if not laser.doProcessSimple(scan):
                    continue
                # the first scans after start-up are messy; lidar_radar.py drops ten
                if skipped < 10:
                    skipped += 1
                    continue
                angles = [round(math.degrees(p.angle), 2) for p in scan.points]
                ranges = [round(p.range, 3) for p in scan.points]
                hz = round(1.0 / scan.config.scan_time, 2) if scan.config.scan_time else None
                self._publish(angles, ranges, hz)
        finally:
            laser.turnOff()
            laser.disconnecting()


# ---------------------------------------------------------------- the camera

class Camera(Source):
    uses = 'camera'
    kind = 'detections'

    def __init__(self, hub, cfg, made_up=False, model=None, hz=10.0):
        super().__init__(hub, cfg)
        self.made_up = made_up
        self.model = model or cfg['camera']['model']
        self.hz = hz

    def loop(self):
        if self.made_up:
            start = time.time()
            while not self.stopping.wait(1.0 / self.hz):
                self.hub.publish('detections', {'items': made_up_detections(time.time() - start),
                                                'model': 'made-up', 'made_up': True,
                                                'horizontal_fov_deg': MADE_UP_FOV_DEG})
            return
        self._real()

    def _labels(self, intrinsics):
        cc = self.cfg['camera']
        if cc.get('labels'):
            with open(cc['labels'], encoding='utf-8') as f:
                return f.read().splitlines()
        if intrinsics.labels:
            labels = intrinsics.labels
        else:
            # where picamera2-examples keeps the COCO names on this project's Pi
            path = os.path.expanduser('~/picamera2-examples/examples/imx500/assets/coco_labels.txt')
            with open(path, encoding='utf-8') as f:
                labels = f.read().splitlines()
        if intrinsics.ignore_dash_labels:
            labels = [x for x in labels if x and x != '-']
        return labels

    def _real(self):
        from picamera2 import Picamera2
        from picamera2.devices import IMX500
        from picamera2.devices.imx500 import NetworkIntrinsics, postprocess_nanodet_detection

        cc = self.cfg['camera']
        if not os.path.exists(self.model):
            raise RuntimeError(f'no model at {self.model}')
        # must be made before Picamera2 (Raspberry Pi's demo)
        imx500 = IMX500(self.model)
        intrinsics = imx500.network_intrinsics or NetworkIntrinsics()
        if not imx500.network_intrinsics:
            intrinsics.task = 'object detection'
        if intrinsics.task != 'object detection':
            raise RuntimeError(f'{os.path.basename(self.model)} is not an object-detection model ({intrinsics.task})')
        intrinsics.update_with_defaults()
        labels = self._labels(intrinsics)

        picam2 = Picamera2(imx500.camera_num)
        config = picam2.create_preview_configuration(controls={'FrameRate': intrinsics.inference_rate}, buffer_count=12)
        self.hub.say(f'loading {os.path.basename(self.model)} into the camera: the first time takes 10 to 30 seconds')
        picam2.start(config, show_preview=False)
        width, height = picam2.camera_configuration()['main']['size']
        last_picture = 0.0
        try:
            while not self.stopping.is_set():
                metadata = picam2.capture_metadata()
                outputs = imx500.get_outputs(metadata, add_batch=True)
                if outputs is None:
                    continue
                input_w, input_h = imx500.get_input_size()
                if intrinsics.postprocess == 'nanodet':
                    from picamera2.devices.imx500.postprocess import scale_boxes
                    boxes, scores, classes = postprocess_nanodet_detection(
                        outputs=outputs[0], conf=cc['threshold'], iou_thres=0.65, max_out_dets=10)[0]
                    boxes = scale_boxes(boxes, 1, 1, input_h, input_w, False, False)
                else:
                    boxes, scores, classes = outputs[0][0], outputs[1][0], outputs[2][0]
                    if intrinsics.bbox_normalization:
                        boxes = boxes / input_h
                    if intrinsics.bbox_order == 'xy':
                        boxes = boxes[:, [1, 0, 3, 2]]
                items = []
                for box, score, cls in zip(boxes, scores, classes):
                    if float(score) <= cc['threshold']:
                        continue
                    x, y, w, h = imx500.convert_inference_coords(box, metadata, picam2)
                    name = labels[int(cls)] if 0 <= int(cls) < len(labels) else str(int(cls))
                    items.append({'label': name, 'score': round(float(score), 3),
                                  'box': [round(x / width, 4), round(y / height, 4), round(w / width, 4), round(h / height, 4)]})
                self.hub.publish('detections', {'items': items, 'model': os.path.basename(self.model), 'made_up': False,
                                                'horizontal_fov_deg': cc['horizontal_fov_deg']})
                if self.cfg['pictures'] and time.time() - last_picture >= float(cc['picture_every_s']):
                    last_picture = time.time()
                    buf = io.BytesIO()
                    picam2.capture_file(buf, format='jpeg')
                    self.hub.publish('picture', buf.getvalue())
        finally:
            picam2.stop()
            picam2.close()
