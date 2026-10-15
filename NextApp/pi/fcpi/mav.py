"""The MAVLink link between the Pi and an autopilot. The only code in fcpi that sends
anything to one, and what it may send is listed here and nowhere else.

A link is opened LISTENING or TALKING:

    listening   stage A. The connection's write is replaced with a function that raises,
                and its socket or serial port is wrapped so that every way of sending
                raises too. The same guard as the observer's.
    talking     stages B and C. The Pi may send exactly these, through the methods below:
                    HEARTBEAT                       saying the Pi is there, once a second
                    OBSTACLE_DISTANCE               the LiDAR's scan (stage B)
                    SET_POSITION_TARGET_LOCAL_NED   a velocity and a turn rate (stage C)
                    COMMAND_LONG, DO_SET_MODE only  asking for Offboard (developer level only)

There is no arm command. There is no way to send any other message: the methods are
the only sending code, and talk_check() in the tests reads this file to prove it. The
Pi never arms an aircraft, at any level; taking off stays a person's act.

Uses pymavlink. On the Pi it comes from apt (`python3-pymavlink`) if Trixie packages it,
or from a virtual environment; the Pi refuses `pip install` into the system.
"""

import os
import threading
import time

os.environ.setdefault('MAVLINK20', '1')

PX4_MAIN = {1: 'MANUAL', 2: 'ALTCTL', 3: 'POSCTL', 4: 'AUTO', 5: 'ACRO', 6: 'OFFBOARD', 7: 'STABILIZED', 8: 'RATTITUDE'}
PX4_AUTO = {1: 'READY', 2: 'TAKEOFF', 3: 'LOITER', 4: 'MISSION', 5: 'RTL', 6: 'LAND', 7: 'RTGS', 8: 'FOLLOW_TARGET', 9: 'PRECLAND'}
OFFBOARD = 6

# MAVLink's numbers, from common.xml. Kept here so that what is sent can be read in one place.
MAV_TYPE_ONBOARD_CONTROLLER = 18
MAV_AUTOPILOT_INVALID = 8
MAV_STATE_ACTIVE = 4
MAV_DISTANCE_SENSOR_LASER = 0
MAV_FRAME_BODY_FRD = 12
MAV_FRAME_BODY_NED = 8
MAV_CMD_DO_SET_MODE = 176
MAV_MODE_FLAG_CUSTOM_MODE_ENABLED = 1
MAV_MODE_FLAG_SAFETY_ARMED = 128


def px4_mode(custom_mode):
    main = (custom_mode >> 16) & 0xFF
    sub = (custom_mode >> 24) & 0xFF
    name = PX4_MAIN.get(main, f'main={main}')
    if main == 4:
        name += ':' + PX4_AUTO.get(sub, f'sub={sub}')
    return {'main': main, 'sub': sub, 'name': name}


class Refused(RuntimeError):
    pass


def _forbidden(*_a, **_k):
    raise Refused('this link is listening: the Pi sends nothing on it')


class _NoSend:
    """Wraps a socket or serial port: every way of sending raises, reading passes through."""

    def __init__(self, inner):
        self._inner = inner

    def __getattr__(self, name):
        if name in ('send', 'sendto', 'sendall', 'sendmsg', 'write', 'writelines'):
            return _forbidden
        return getattr(self._inner, name)


class Link:
    """One MAVLink connection to an autopilot, listening or talking."""

    def __init__(self, cfg, talking, device=None):
        from pymavlink import mavutil

        ac = cfg['autopilot']
        self.cfg = cfg
        self.talking = bool(talking)
        self.device = device or ac['device']
        self.target = (int(ac['target_system']), int(ac['target_component']))
        self._send_lock = threading.Lock()
        self.conn = mavutil.mavlink_connection(
            self.device, baud=int(ac['baud']), dialect='common',
            source_system=int(ac['source_system']), source_component=int(ac['source_component']),
            autoreconnect=True)
        if not self.talking:
            # the listening guarantee
            self.conn.write = _forbidden
            if getattr(self.conn, 'port', None) is not None:
                self.conn.port = _NoSend(self.conn.port)
        self.sent = {}

    def recv(self, timeout=0.5):
        msg = self.conn.recv_match(blocking=True, timeout=timeout)
        if msg is None or msg.get_type() == 'BAD_DATA':
            return None
        return msg

    def close(self):
        try:
            self.conn.close()
        except Exception:  # noqa: BLE001
            pass

    # ---------------------------------------------------------------- the only sending code

    def _talking(self, what):
        if not self.talking:
            raise Refused(f'{what}: this link is listening, and sends nothing')

    def _count(self, name):
        self.sent[name] = self.sent.get(name, 0) + 1

    def heartbeat(self):
        self._talking('HEARTBEAT')
        with self._send_lock:
            self.conn.mav.heartbeat_send(MAV_TYPE_ONBOARD_CONTROLLER, MAV_AUTOPILOT_INVALID, 0, 0, MAV_STATE_ACTIVE)
            self._count('HEARTBEAT')

    def obstacle_distance(self, distances_cm, increment_deg, min_cm, max_cm, angle_offset_deg=0.0):
        """The LiDAR's scan, body-fixed: index 0 is the nose, angles go clockwise."""
        self._talking('OBSTACLE_DISTANCE')
        if len(distances_cm) != 72:
            raise ValueError('OBSTACLE_DISTANCE has 72 distances')
        with self._send_lock:
            self.conn.mav.obstacle_distance_send(
                int(time.time() * 1e6), MAV_DISTANCE_SENSOR_LASER, [int(d) for d in distances_cm],
                int(round(increment_deg)), int(min_cm), int(max_cm),
                float(increment_deg), float(angle_offset_deg), MAV_FRAME_BODY_FRD)
            self._count('OBSTACLE_DISTANCE')

    def velocity(self, vx, vy, vz, yaw_rate_rad, type_mask, boot_ms):
        """A velocity in the aircraft's frame (forward, right, down) and a turn rate."""
        self._talking('SET_POSITION_TARGET_LOCAL_NED')
        with self._send_lock:
            self.conn.mav.set_position_target_local_ned_send(
                int(boot_ms) & 0xFFFFFFFF, self.target[0], self.target[1], MAV_FRAME_BODY_NED, int(type_mask),
                0.0, 0.0, 0.0, float(vx), float(vy), float(vz), 0.0, 0.0, 0.0, 0.0, float(yaw_rate_rad))
            self._count('SET_POSITION_TARGET_LOCAL_NED')

    def ask_for_offboard(self):
        """Ask PX4 for Offboard mode. The developer level only; modules.py checks."""
        self._talking('DO_SET_MODE')
        with self._send_lock:
            self.conn.mav.command_long_send(
                self.target[0], self.target[1], MAV_CMD_DO_SET_MODE, 0,
                float(MAV_MODE_FLAG_CUSTOM_MODE_ENABLED), float(OFFBOARD), 0.0, 0.0, 0.0, 0.0, 0.0)
            self._count('DO_SET_MODE')
