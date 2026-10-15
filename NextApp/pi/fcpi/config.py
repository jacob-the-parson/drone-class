"""The settings, read from one file that the teacher writes.

The file is JSON, at /etc/flight-companion/pi.json by default. On the Pi that folder
belongs to root, so changing it needs the admin password: a student at the Pi's
desktop cannot raise their own level. FC_PI_CONFIG names another file, for tests.

A missing file, or a missing key, means the default. An unknown level means
"student". The app can read these settings and cannot change them.

Numbers that this project has not measured are None, and what needs them refuses to
run until someone enters them. Nothing is guessed:

    lidar.zero_offset_deg, lidar.mirrored   which way the LiDAR's 0 degrees points on
                                            the aircraft, and whether it turns the other
                                            way. Found by the hand test, and then
                                            lidar.mount_measured is set to true.
    camera.horizontal_fov_deg               the AI camera's horizontal field of view.
                                            Raspberry Pi's AI Camera page does not give
                                            it (read 2026-10-14).
"""

import copy
import json
import os

DEFAULT_PATH = '/etc/flight-companion/pi.json'
LEVELS = ('student', 'instructor', 'developer')

DEFAULTS = {
    'level': 'student',
    # a fixed token, if the teacher wants one that does not change; otherwise a new one each start
    'token': None,
    'name': None,
    'http': {'host': '0.0.0.0', 'port': 8765},
    # pages allowed to talk to the bridge, besides programs that are not browsers
    'origins': ['http://localhost:3000', 'http://127.0.0.1:3000', 'app://flight-companion'],
    # the camera sends pictures only if this is true
    'pictures': False,
    # a folder of the teacher's and developers' own Python files, startable at the developer level
    'experiments_dir': None,
    'lidar': {
        'port': None,
        # what lidar_radar.py uses on this Pi; the SDK's own test uses 64
        'max_range_m': 16.0,
        'min_range_m': 0.05,
        'zero_offset_deg': None,
        'mirrored': None,
        'mount_measured': False,
        # readings closer than this are the aircraft itself (arms, props, legs)
        'ignore_within_m': 0.0,
        # a direction with no return at all: "unknown" (PX4 will not move that way) or "clear"
        'no_return': 'unknown',
    },
    'camera': {
        'model': '/usr/share/imx500-models/imx500_network_ssd_mobilenetv2_fpnlite_320x320_pp.rpk',
        'threshold': 0.55,
        'horizontal_fov_deg': None,
        'labels': None,
        # seconds between pictures, when pictures are allowed
        'picture_every_s': 2.0,
    },
    'autopilot': {
        # the Pi's serial port to TELEM2, or a MAVLink address such as udpin:127.0.0.1:14600
        'device': '/dev/serial0',
        'baud': 57600,
        'target_system': 1,
        'target_component': 1,
        # this Pi's own MAVLink identity. 191 is MAV_COMP_ID_ONBOARD_COMPUTER
        'source_system': 1,
        'source_component': 191,
        # whether the Pi may tell the app where the aircraft is
        'share_position': False,
    },
    'limits': {
        'max_speed_ms': 0.5,
        'max_yaw_rate_dps': 30.0,
        'keep_distance_m': 2.0,
        'setpoint_hz': 10.0,
        # inputs older than this count as lost, and the setpoint goes to "stay still"
        'stale_after_s': 0.5,
    },
}


def _merge(base, extra):
    out = copy.deepcopy(base)
    for k, v in (extra or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        elif k in out:
            out[k] = v
    return out


def load(path=None):
    """The settings, with the file's values over the defaults. Never raises."""
    path = path or os.environ.get('FC_PI_CONFIG') or DEFAULT_PATH
    raw, note = {}, None
    try:
        with open(path, encoding='utf-8') as f:
            raw = json.load(f)
        if not isinstance(raw, dict):
            raw, note = {}, f'{path} is not a JSON object; the defaults are used'
    except FileNotFoundError:
        note = f'{path} not found; the defaults are used (level: student)'
    except (OSError, ValueError) as err:
        note = f'{path} could not be read ({err}); the defaults are used (level: student)'
    cfg = _merge(DEFAULTS, raw)
    if cfg['level'] not in LEVELS:
        note = f'level "{cfg["level"]}" is not one of {", ".join(LEVELS)}; student is used'
        cfg['level'] = 'student'
    cfg['_path'] = path
    cfg['_note'] = note
    return cfg


def public(cfg):
    """What the app may be told about the settings. Never the token."""
    out = {k: copy.deepcopy(v) for k, v in cfg.items() if not k.startswith('_') and k != 'token'}
    out['config_file'] = cfg.get('_path')
    out['config_note'] = cfg.get('_note')
    return out
