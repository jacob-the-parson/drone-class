"""What a person can start and stop from the app, and what each one needs.

Every module is something in this program: no other program is started, and nothing
is passed to a shell. A module has an id, a level it needs (gate.py), the sensors and
the link it uses, and settings it cannot run without. Starting one that needs a sensor
starts the sensor too; stopping the last one that needs it stops it.

    id                    level        uses                     stage
    lidar                 student      the LiDAR                 lesson
    camera                student      the camera                lesson
    look-and-measure      student      camera + LiDAR            template
    autopilot-listen      student      the link, listening       A
    obstacles             instructor   LiDAR + the link, talking B
    offboard-<template>   instructor   per template + talking    C
    experiment-<name>     developer    whatever it does          experiments

An experiment is a Python file the teacher or a developer has put in
`experiments_dir` on the Pi. It defines `run(ctx, stopping)`. Files are never sent from
the app: the app can only start one that is already there.
"""

import importlib.util
import os
import threading
import time

from . import autopilot, gate, mav, sensors, templates

MADE_UP_LINK = ('with made-up sensors the bridge talks to no real autopilot port; it takes only a network address '
                'on this computer, such as udpin:127.0.0.1:14600, for a stand-in or a simulator')


def local_link(device):
    """True if an autopilot address is a network address on this computer, not a serial port."""
    d = str(device or '')
    if not d.startswith(('udpin:', 'udpout:', 'udp:', 'tcp:', 'tcpin:')):
        return False
    host = d.split(':', 2)[1] if d.count(':') >= 2 else ''
    return host in ('127.0.0.1', 'localhost')

CATALOG = {
    'lidar': {'name': 'LiDAR scan', 'level': 'student', 'uses': ['lidar'], 'stage': 'lesson',
              'about': 'The LiDAR spins and measures the distance all around, ten times a second.'},
    'camera': {'name': 'Camera: what it sees', 'level': 'student', 'uses': ['camera'], 'stage': 'lesson',
               'about': 'The AI camera runs a model on its own chip and says what it sees, and where in the picture.',
               'options': ['model']},
    'look-and-measure': {'name': 'Look and measure', 'level': 'student', 'uses': ['camera', 'lidar'], 'stage': 'template',
                         'about': 'The camera finds something; the LiDAR says how far away it is.'},
    'autopilot-listen': {'name': 'Stage A: listen to the autopilot', 'level': 'student', 'uses': ['link'], 'stage': 'A',
                         'about': 'The Pi hears the autopilot: mode, armed, attitude, battery. It sends nothing back.'},
    'obstacles': {'name': 'Stage B: obstacle data to the autopilot', 'level': 'instructor', 'uses': ['lidar', 'link'],
                  'stage': 'B', 'talks': True,
                  'about': 'The LiDAR scan goes to the autopilot as OBSTACLE_DISTANCE. PX4 can then stop short of an '
                           'obstacle in Position mode. Data, not commands.'},
}
for _name, _about in templates.TEMPLATES.items():
    _uses = {'hold': [], 'face-person': ['camera'], 'keep-distance': ['lidar'], 'follow-person': ['camera', 'lidar']}[_name]
    CATALOG[f'offboard-{_name}'] = {
        'name': f'Stage C: {_name.replace("-", " ")}', 'level': 'instructor', 'uses': _uses + ['link'], 'stage': 'C',
        'talks': True, 'template': _name, 'options': ['ask_offboard'],
        'about': _about + ' Nothing happens until a person selects Offboard. The Pi never arms.',
    }


class Manager:
    def __init__(self, hub, cfg, made_up=False):
        self.hub = hub
        self.cfg = cfg
        self.made_up = made_up
        self.lock = threading.RLock()
        self.running = {}        # module id -> {'started', 'options', 'parts': [...]}
        self.sensors = {}        # 'lidar' / 'camera' -> Source
        self.link = None
        self.heard = None
        self.link_parts = []

    # ---------------------------------------------------------------- what can be started

    def catalog(self):
        out = []
        for mid, m in CATALOG.items():
            out.append(dict(m, id=mid, running=mid in self.running, why_not=self.why_not(mid, {})))
        for name in self._experiments():
            mid = f'experiment-{name}'
            out.append({'id': mid, 'name': f'Experiment: {name}', 'level': 'developer', 'uses': [], 'stage': 'experiment',
                        'about': f'{name}.py from the experiments folder on the Pi.', 'running': mid in self.running,
                        'why_not': self.why_not(mid, {})})
        return out

    def _experiments(self):
        d = self.cfg.get('experiments_dir') or os.path.expanduser('~/flight-companion-experiments')
        if not os.path.isdir(d):
            return []
        return sorted(f[:-3] for f in os.listdir(d) if f.endswith('.py') and not f.startswith('_'))

    def why_not(self, mid, options):
        """Why this module cannot start now, or None."""
        level = self.cfg['level']
        if mid.startswith('experiment-'):
            if not gate.allows(level, 'developer'):
                return 'experiments need the developer level, set on the Pi by the teacher'
            return None if mid[len('experiment-'):] in self._experiments() else 'no such experiment on the Pi'
        m = CATALOG.get(mid)
        if not m:
            return 'no such module'
        if not gate.allows(level, m['level']):
            return f'needs the {m["level"]} level; the Pi is set to {level}. The teacher sets it on the Pi.'
        if options.get('ask_offboard') and not gate.allows(level, 'developer'):
            return 'asking the autopilot for Offboard needs the developer level'
        # --made-up is the one mode that takes a settings file of the caller's choosing: in it, the
        # bridge must not reach a real flight controller, whatever level that file claims
        if 'link' in m['uses'] and self.made_up and not local_link(self.cfg['autopilot']['device']):
            return MADE_UP_LINK
        lc, cc = self.cfg['lidar'], self.cfg['camera']
        if 'lidar' in m['uses'] and m['stage'] in ('B', 'C') and not self.made_up:
            if not lc['mount_measured'] and not gate.allows(level, 'developer'):
                return ('which way the LiDAR points on the aircraft has not been measured (lidar.mount_measured): '
                        'do the hand test first. The developer level may go ahead without it.')
        if 'camera' in m['uses'] and m['stage'] in ('template', 'C') and not self.made_up and not cc['horizontal_fov_deg']:
            return 'camera.horizontal_fov_deg is not set: the angle of what the camera sees cannot be worked out'
        return None

    # ---------------------------------------------------------------- sensors and the link

    def _need_sensor(self, kind, options):
        s = self.sensors.get(kind)
        if s and s.is_alive():
            return s
        if kind == 'lidar':
            s = sensors.Lidar(self.hub, self.cfg, made_up=self.made_up)
        else:
            s = sensors.Camera(self.hub, self.cfg, made_up=self.made_up, model=options.get('model'))
        s.start()
        self.sensors[kind] = s
        return s

    def _release_sensors(self):
        wanted = set()
        for mid in self.running:
            wanted.update(self._uses(mid))
        for kind in list(self.sensors):
            if kind not in wanted:
                self.sensors.pop(kind).stop()

    def _uses(self, mid):
        return [] if mid.startswith('experiment-') else CATALOG[mid]['uses']

    def _talkers(self):
        return [mid for mid in self.running if CATALOG.get(mid, {}).get('talks')]

    def _close_link(self):
        for p in self.link_parts:
            p.stop()
        self.link_parts = []
        if self.link:
            self.link.close()
        self.link = None

    def _need_link(self, talking):
        if self.link and (self.link.talking or not talking):
            return self.link
        if self.made_up and not local_link(self.cfg['autopilot']['device']):
            raise mav.Refused(MADE_UP_LINK)
        # a listening link cannot be made to talk: it is closed and opened again, talking
        self._close_link()
        self.link = mav.Link(self.cfg, talking=talking)
        self.heard = autopilot.Heard()
        self.link_parts = [autopilot.Reader(self.hub, self.cfg, self.link, self.heard),
                           autopilot.Listen(self.hub, self.cfg, self.link, self.heard)]
        if talking:
            self.link_parts.append(autopilot.Heartbeat(self.hub, self.cfg, self.link))
        for p in self.link_parts:
            p.start()
        self.hub.say(f'autopilot link open on {self.link.device}, {"talking" if talking else "listening: it sends nothing"}')
        return self.link

    def _settle_link(self):
        uses_link = [mid for mid in self.running if 'link' in self._uses(mid)]
        if not uses_link:
            self._close_link()
            self.hub.clear('autopilot')
        elif self.link and self.link.talking and not self._talkers():
            # nobody needs to talk any more: back to listening
            self._close_link()
            self._need_link(talking=False)

    # ---------------------------------------------------------------- start and stop

    def start(self, mid, options=None):
        options = dict(options or {})
        with self.lock:
            if mid in self.running:
                return {'ok': True, 'id': mid, 'note': 'already running'}
            why = self.why_not(mid, options)
            if why:
                return {'ok': False, 'id': mid, 'error': why}
            parts = []
            try:
                if mid.startswith('experiment-'):
                    parts.append(self._start_experiment(mid[len('experiment-'):]))
                else:
                    m = CATALOG[mid]
                    for kind in ('lidar', 'camera'):
                        if kind in m['uses']:
                            self._need_sensor(kind, options)
                    if 'link' in m['uses']:
                        self._need_link(talking=bool(m.get('talks')))
                    if mid == 'look-and-measure':
                        parts.append(_Measure(self.hub, self.cfg))
                    elif mid == 'obstacles':
                        parts.append(autopilot.Obstacles(self.hub, self.cfg, self.link))
                    elif m['stage'] == 'C':
                        parts.append(autopilot.Setpoints(self.hub, self.cfg, self.link, self.heard, m['template'],
                                                         ask_offboard=bool(options.get('ask_offboard'))))
                for p in parts:
                    p.start()
            except Exception as err:  # noqa: BLE001
                for p in parts:
                    p.stop()
                self._release_sensors()
                self._settle_link()
                return {'ok': False, 'id': mid, 'error': f'{type(err).__name__}: {err}'}
            self.running[mid] = {'started': time.time(), 'options': options, 'parts': parts}
            self.hub.say(f'started {mid}')
            self.hub.publish('modules', self.status())
            return {'ok': True, 'id': mid}

    def stop(self, mid):
        with self.lock:
            r = self.running.pop(mid, None)
            if r is None:
                return {'ok': True, 'id': mid, 'note': 'was not running'}
            for p in r['parts']:
                p.stop()
            if mid.startswith('offboard-'):
                self.hub.clear('setpoint')
            if mid == 'obstacles':
                self.hub.clear('obstacles')
            if mid == 'look-and-measure':
                self.hub.clear('measure')
            self._release_sensors()
            self._settle_link()
            self.hub.say(f'stopped {mid}')
            self.hub.publish('modules', self.status())
            return {'ok': True, 'id': mid}

    def stop_all(self):
        for mid in list(self.running):
            self.stop(mid)
        self._close_link()

    def status(self):
        with self.lock:
            out = {}
            for mid, r in self.running.items():
                errors = [p.error for p in r['parts'] if getattr(p, 'error', None)]
                out[mid] = {'since_s': round(time.time() - r['started'], 1), 'error': errors[0] if errors else None}
            sens = {k: {'alive': s.is_alive(), 'error': s.error} for k, s in self.sensors.items()}
            return {'running': out, 'sensors': sens, 'link': None if not self.link else
                    {'device': self.link.device, 'talking': self.link.talking}}

    def _start_experiment(self, name):
        d = self.cfg.get('experiments_dir') or os.path.expanduser('~/flight-companion-experiments')
        path = os.path.join(d, f'{name}.py')
        spec = importlib.util.spec_from_file_location(f'fc_experiment_{name}', path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        if not callable(getattr(mod, 'run', None)):
            raise RuntimeError(f'{name}.py has no run(ctx, stopping)')
        return _Experiment(self, name, mod.run)


class _Measure(threading.Thread):
    """The look-and-measure template: every detection, with its bearing and its LiDAR distance."""

    def __init__(self, hub, cfg):
        super().__init__(daemon=True, name='fcpi-measure')
        self.hub, self.cfg = hub, cfg
        self.stopping = threading.Event()
        self.error = None

    def stop(self, timeout=3.0):
        self.stopping.set()
        if self.is_alive():
            self.join(timeout)

    def run(self):
        stale = float(self.cfg['limits']['stale_after_s'])
        while not self.stopping.wait(0.2):
            det = self.hub.get('detections', max_age_s=stale)
            scan = self.hub.get('scan', max_age_s=stale)
            if det is None:
                continue
            fov = det.get('horizontal_fov_deg') or self.cfg['camera']['horizontal_fov_deg']
            try:
                found = templates.look_and_measure(det['items'], scan['angles'] if scan else [], scan['ranges_m'] if scan else [],
                                                   fov, self.cfg['lidar']['ignore_within_m'])
            except ValueError as err:
                self.error = str(err)
                continue
            self.hub.publish('measure', {'items': found, 'lidar': scan is not None, 'made_up': det.get('made_up', False)})


class _Experiment(threading.Thread):
    def __init__(self, manager, name, fn):
        super().__init__(daemon=True, name=f'fcpi-experiment-{name}')
        self.manager, self.name_, self.fn = manager, name, fn
        self.stopping = threading.Event()
        self.error = None

    def stop(self, timeout=5.0):
        self.stopping.set()
        if self.is_alive():
            self.join(timeout)

    def run(self):
        ctx = {'hub': self.manager.hub, 'cfg': self.manager.cfg, 'manager': self.manager}
        try:
            self.fn(ctx, self.stopping)
        except Exception as err:  # noqa: BLE001
            self.error = f'{type(err).__name__}: {err}'
            self.manager.hub.say(f'experiment {self.name_} stopped: {self.error}', 'error')
