"""The three stages that connect the Pi to an autopilot (D-38).

    Stage A  Listen      the Pi hears the autopilot: mode, armed, attitude, battery.
                         Nothing goes back: the link is opened listening (mav.py).
    Stage B  Obstacles   the Pi sends the LiDAR's scan as OBSTACLE_DISTANCE, ten times
                         a second. PX4's collision prevention (CP_DIST) uses it to stop
                         short of an obstacle, in Position mode only. Data, not commands.
    Stage C  Setpoints   the Pi streams a velocity and a turn rate from a template
                         (templates.py). PX4 ignores them until a person selects
                         Offboard; it leaves Offboard if they stop (COM_OF_LOSS_T).

What PX4's documentation says each stage must respect, read 2026-10-14:
    - Offboard: "a continuous 2Hz 'proof of life' signal"; PX4 enters Offboard only after
      receiving it "for more than a second". This sends ten a second.
    - Collision prevention: more than 0.5 s without obstacle data and PX4 allows no
      sideways movement; after 5 s it goes to Hold. This sends nothing from a scan older
      than limits.stale_after_s, so PX4 sees the gap and acts on it.

None of this has run against PX4 itself yet: only against the stand-in (standin.py),
which is NOT PX4. PX4's simulator comes before the aircraft.
"""

import math
import threading
import time

from . import mav, templates


class Stage(threading.Thread):
    uses = ()

    def __init__(self, hub, cfg, link):
        super().__init__(daemon=True, name=f'fcpi-{self.__class__.__name__.lower()}')
        self.hub = hub
        self.cfg = cfg
        self.link = link
        self.stopping = threading.Event()
        self.error = None

    def stop(self, timeout=5.0):
        self.stopping.set()
        if self.is_alive() and threading.current_thread() is not self:
            self.join(timeout)

    def run(self):
        try:
            self.loop()
        except Exception as err:  # noqa: BLE001
            self.error = f'{type(err).__name__}: {err}'
            self.hub.say(f'{self.name} stopped: {self.error}', 'error')

    def loop(self):
        raise NotImplementedError


class Heard:
    """What the Pi has heard from the autopilot. Filled by the reader thread."""

    def __init__(self):
        self.lock = threading.Lock()
        self.heartbeat = None
        self.last_rx = None
        self.boot_ms = 0
        self.attitude = None
        self.battery = None
        self.position = None
        self.acks = []
        self.messages = {}

    def summary(self, share_position):
        with self.lock:
            hb = self.heartbeat
            out = {
                'heard': self.last_rx is not None and time.time() - self.last_rx < 3.0,
                'last_rx_age_s': None if self.last_rx is None else round(time.time() - self.last_rx, 1),
                'message_kinds': len(self.messages),
                'vehicle': None,
            }
            if hb:
                out['vehicle'] = {
                    'type': hb['type'], 'autopilot': hb['autopilot'],
                    'armed': bool(hb['base_mode'] & mav.MAV_MODE_FLAG_SAFETY_ARMED),
                    'mode': mav.px4_mode(hb['custom_mode'])['name'],
                    'offboard': mav.px4_mode(hb['custom_mode'])['main'] == mav.OFFBOARD,
                }
            if self.attitude:
                out['attitude'] = dict(self.attitude)
            if self.battery:
                out['battery'] = dict(self.battery)
            if self.position:
                out['height_m'] = self.position['height_m']
                if share_position:
                    out['lat'], out['lon'] = self.position['lat'], self.position['lon']
            return out


class Reader(Stage):
    """Reads everything the autopilot sends and keeps the newest. Part of every stage."""

    def __init__(self, hub, cfg, link, heard):
        super().__init__(hub, cfg, link)
        self.heard = heard

    def loop(self):
        target = self.link.target[0]
        while not self.stopping.is_set():
            msg = self.link.recv(timeout=0.3)
            if msg is None:
                continue
            # only the autopilot we are pointed at; not a ground station (255) or ourselves
            if msg.get_srcSystem() != target or msg.get_srcComponent() not in (self.link.target[1], 0):
                continue
            t = msg.get_type()
            with self.heard.lock:
                self.heard.last_rx = time.time()
                self.heard.messages[t] = self.heard.messages.get(t, 0) + 1
                if t == 'HEARTBEAT':
                    self.heard.heartbeat = {'type': msg.type, 'autopilot': msg.autopilot, 'base_mode': msg.base_mode,
                                            'custom_mode': msg.custom_mode}
                elif t == 'ATTITUDE':
                    self.heard.boot_ms = msg.time_boot_ms
                    self.heard.attitude = {'roll_deg': round(math.degrees(msg.roll), 1),
                                           'pitch_deg': round(math.degrees(msg.pitch), 1),
                                           'yaw_deg': round(math.degrees(msg.yaw) % 360, 1)}
                elif t == 'SYS_STATUS':
                    self.heard.battery = {'volts': None if msg.voltage_battery == 65535 else msg.voltage_battery / 1000,
                                          'percent': None if msg.battery_remaining == -1 else msg.battery_remaining}
                elif t == 'GLOBAL_POSITION_INT':
                    self.heard.position = {'height_m': round(msg.relative_alt / 1000, 2),
                                           'lat': msg.lat / 1e7, 'lon': msg.lon / 1e7}
                elif t == 'COMMAND_ACK':
                    self.heard.acks.append({'command': msg.command, 'result': msg.result, 't': time.time()})
                    del self.heard.acks[:-20]


class Listen(Stage):
    """Stage A. Publishes what is heard, once a second. Sends nothing."""

    def __init__(self, hub, cfg, link, heard):
        super().__init__(hub, cfg, link)
        self.heard = heard

    def loop(self):
        share = bool(self.cfg['autopilot']['share_position'])
        while not self.stopping.wait(0.5):
            self.hub.publish('autopilot', dict(self.heard.summary(share), link=self.link.device,
                                               talking=self.link.talking, sent=dict(self.link.sent)))


class Heartbeat(Stage):
    """Once a second while talking: tells PX4 the onboard computer is there (COM_OBC_LOSS_T)."""

    def loop(self):
        while not self.stopping.is_set():
            self.link.heartbeat()
            self.stopping.wait(1.0)


class Obstacles(Stage):
    """Stage B. The LiDAR's scan as OBSTACLE_DISTANCE, ten times a second."""

    hz = 10.0

    def loop(self):
        lc = self.cfg['lidar']
        stale = float(self.cfg['limits']['stale_after_s'])
        sent_from = None
        while not self.stopping.wait(1.0 / self.hz):
            scan = self.hub.get('scan', max_age_s=stale)
            if scan is None:
                # nothing fresh: send nothing, so PX4 sees the gap (0.5 s: no movement; 5 s: Hold)
                if sent_from is not None:
                    self.hub.say('obstacle data stopped: the LiDAR scan is old or missing', 'warning')
                    sent_from = None
                continue
            distances, info = templates.obstacle_sectors(
                scan['angles'], scan['ranges_m'], lc['min_range_m'], lc['max_range_m'],
                lc['ignore_within_m'], lc['no_return'])
            self.link.obstacle_distance(distances, info['increment_deg'], info['min_cm'], info['max_cm'])
            if sent_from is None:
                sent_from = time.time()
                self.hub.say('obstacle data is being sent to the autopilot')
            self.hub.publish('obstacles', {'distances_cm': distances, **info, 'made_up': scan.get('made_up', False)})


class Setpoints(Stage):
    """Stage C. A template's velocity and turn rate, ten times a second.

    The Pi never arms. Whether PX4 does anything with these is the pilot's choice of
    mode: they take effect only in Offboard. At the developer level, and only if asked,
    the Pi asks PX4 for Offboard once, after streaming for more than a second.
    """

    def __init__(self, hub, cfg, link, heard, template, ask_offboard=False):
        super().__init__(hub, cfg, link)
        if template not in templates.TEMPLATES:
            raise ValueError(f'no template called {template}')
        self.heard = heard
        self.template = template
        self.ask_offboard = ask_offboard

    def _inputs(self):
        lim = self.cfg['limits']
        stale = float(lim['stale_after_s'])
        lc, cc = self.cfg['lidar'], self.cfg['camera']
        needs_camera = self.template in ('face-person', 'follow-person')
        needs_lidar = self.template in ('keep-distance', 'follow-person')
        scan = self.hub.get('scan', max_age_s=stale) if needs_lidar else None
        det = self.hub.get('detections', max_age_s=stale) if needs_camera else None
        fresh = (not needs_lidar or scan is not None) and (not needs_camera or det is not None)
        target, ahead = None, None
        if fresh and needs_camera:
            fov = det.get('horizontal_fov_deg') or cc['horizontal_fov_deg']
            if not fov:
                raise RuntimeError('camera.horizontal_fov_deg is not set: which way a person is cannot be worked out')
            people = [d for d in det['items'] if d['label'] == 'person']
            angles = scan['angles'] if scan else []
            ranges = scan['ranges_m'] if scan else []
            target = templates.nearest_of(templates.look_and_measure(people, angles, ranges, fov, lc['ignore_within_m']), 'person')
        if fresh and needs_lidar and scan:
            ahead = templates.range_toward(scan['angles'], scan['ranges_m'], 0.0, 5.0, lc['ignore_within_m'])
        return {'fresh': fresh, 'target': target, 'ahead_m': ahead}

    def loop(self):
        lim = self.cfg['limits']
        hz = max(2.5, float(lim['setpoint_hz']))
        started = time.time()
        asked = False
        while not self.stopping.wait(1.0 / hz):
            sp = templates.template_setpoint(self.template, self._inputs(), lim)
            # the settings' caps, applied again here whatever the template returned
            vx = templates.clamp(sp['vx'], float(lim['max_speed_ms']))
            rate = templates.clamp(sp['yaw_rate_dps'], float(lim['max_yaw_rate_dps']))
            with self.heard.lock:
                boot = self.heard.boot_ms
            self.link.velocity(vx, 0.0, 0.0, math.radians(rate), templates.VELOCITY_AND_YAW_RATE, boot)
            if self.ask_offboard and not asked and time.time() - started > 1.2:
                asked = True
                self.link.ask_for_offboard()
                self.hub.say('asked the autopilot for Offboard (developer level)', 'warning')
            self.hub.publish('setpoint', {'template': self.template, 'vx': round(vx, 3), 'yaw_rate_dps': round(rate, 2),
                                          'why': sp['why']})
