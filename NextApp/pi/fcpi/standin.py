"""A STAND-IN AUTOPILOT, FOR THE TESTS. IT IS NOT PX4.

It does only what PX4's documentation says PX4 does for the three stages, and no
more, so that the Pi's side can be tested on a computer with no aircraft and no
simulator. A check that passes against it says the Pi's code does what it was meant
to; it does not say PX4 will. PX4's own simulator comes before the aircraft.

What it does, and the source of each:
    - a HEARTBEAT once a second as a PX4 quadrotor, ATTITUDE ten times a second,
      SYS_STATUS once a second;
    - starts in POSCTL, disarmed. The test, standing in for the pilot, arms it and
      changes its mode;
    - Offboard: accepted only after setpoints have arrived for more than a second
      ("PX4 enables offboard control only after receiving the signal for more than a
      second"); left for POSCTL when they stop for more than COM_OF_LOSS_T (1 s on this
      project's board) with COM_OBL_RC_ACT 0 (Position mode). PX4 offboard page.
    - setpoints change what it "does" only in Offboard: a velocity moves its made-up
      position, a yaw rate turns it;
    - OBSTACLE_DISTANCE is kept, with when it came;
    - DO_SET_MODE to Offboard is answered ACCEPTED if setpoints are streaming, else DENIED;
    - an arm or disarm command is answered DENIED and written down, so that a test can
      prove the Pi never sent one.

It talks over UDP on this computer only: its socket is bound to 127.0.0.1. (pymavlink's
own "udpout" is not used: on Windows it binds 0.0.0.0, every address of the computer.)
"""

import math
import os
import socket
import threading
import time

os.environ.setdefault('MAVLINK20', '1')

POSCTL = 3 << 16
OFFBOARD = 6 << 16


class LocalUdp:
    """MAVLink over UDP to one address on this computer, from a socket bound to 127.0.0.1.

    pymavlink makes and reads the packets; this holds the socket. Used by the stand-in,
    and by tests that need a second sender (a made-up ground station).
    """

    def __init__(self, port, system, component):
        from pymavlink.dialects.v20 import common

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind(('127.0.0.1', 0))
        self.sock.settimeout(0.2)
        self.dest = ('127.0.0.1', int(port))
        self.mav = common.MAVLink(self, srcSystem=system, srcComponent=component)
        self.mav.robust_parsing = True

    def write(self, buf):
        self.sock.sendto(bytes(buf), self.dest)

    def recv_messages(self):
        try:
            data, _ = self.sock.recvfrom(65535)
        except (socket.timeout, TimeoutError, OSError):
            return []
        return [m for m in (self.mav.parse_buffer(data) or []) if m.get_type() != 'BAD_DATA']

    def close(self):
        self.sock.close()


class StandIn:
    NOT_PX4 = True

    def __init__(self, port, loss_s=1.0):
        from pymavlink import mavutil

        self.m = mavutil.mavlink
        # it sends first, to the Pi's listening end
        self.conn = LocalUdp(port, 1, 1)
        self.loss_s = loss_s
        self.lock = threading.Lock()
        self.custom_mode = POSCTL
        self.armed = False
        self.received = {}
        self.bytes_in = 0
        self.first_setpoint = None
        self.last_setpoint = None
        self.setpoint = None
        self.obstacles = None
        self.obstacles_t = []
        self.arm_requests = 0
        self.mode_requests = []
        self.offboard_entered = 0
        self.offboard_left = 0
        self.x = self.y = self.yaw = 0.0
        self._stop = threading.Event()
        self._threads = [threading.Thread(target=self._send_loop, daemon=True),
                         threading.Thread(target=self._recv_loop, daemon=True)]

    # ---------------------------------------------------------------- what the test does as the pilot

    def start(self):
        for t in self._threads:
            t.start()
        return self

    def stop(self):
        self._stop.set()
        for t in self._threads:
            t.join(2)
        self.conn.close()

    def pilot_arms(self):
        with self.lock:
            self.armed = True

    def pilot_selects(self, mode):
        """The pilot moves the mode switch. 'POSCTL' or 'OFFBOARD'."""
        with self.lock:
            if mode == 'OFFBOARD':
                if self._streaming():
                    self.custom_mode = OFFBOARD
                    self.offboard_entered += 1
                    return True
                return False
            self.custom_mode = POSCTL
            return True

    @property
    def mode(self):
        with self.lock:
            return 'OFFBOARD' if self.custom_mode == OFFBOARD else 'POSCTL'

    def count(self, kind):
        with self.lock:
            return self.received.get(kind, 0)

    # ---------------------------------------------------------------- inside

    def _streaming(self):
        now = time.time()
        return (self.first_setpoint is not None and self.last_setpoint is not None
                and now - self.last_setpoint < 0.5 and now - self.first_setpoint > 1.0)

    def _send_loop(self):
        m = self.m
        n = 0
        last = time.time()
        while not self._stop.wait(0.1):
            now = time.time()
            dt = now - last
            last = now
            with self.lock:
                if self.custom_mode == OFFBOARD:
                    if self.last_setpoint is None or now - self.last_setpoint > self.loss_s:
                        # COM_OBL_RC_ACT 0: Position mode
                        self.custom_mode = POSCTL
                        self.offboard_left += 1
                    elif self.setpoint and self.armed:
                        vx, yaw_rate = self.setpoint
                        self.yaw += yaw_rate * dt
                        self.x += vx * math.cos(self.yaw) * dt
                        self.y += vx * math.sin(self.yaw) * dt
                base = m.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED | (m.MAV_MODE_FLAG_SAFETY_ARMED if self.armed else 0)
                custom, yaw = self.custom_mode, self.yaw
            boot = int((now % 100000) * 1000)
            if n % 10 == 0:
                self.conn.mav.heartbeat_send(m.MAV_TYPE_QUADROTOR, m.MAV_AUTOPILOT_PX4, base, custom, m.MAV_STATE_ACTIVE)
                self.conn.mav.sys_status_send(0, 0, 0, 300, 15800, 120, 88, 0, 0, 0, 0, 0, 0)
            self.conn.mav.attitude_send(boot, 0.0, 0.0, yaw, 0.0, 0.0, 0.0)
            n += 1

    def _recv_loop(self):
        while not self._stop.is_set():
            for msg in self.conn.recv_messages():
                self._take(msg)

    def _take(self, msg):
        m = self.m
        if True:
            t = msg.get_type()
            now = time.time()
            with self.lock:
                self.received[t] = self.received.get(t, 0) + 1
                self.bytes_in += len(msg.get_msgbuf())
                if t == 'SET_POSITION_TARGET_LOCAL_NED':
                    if self.last_setpoint is None or now - self.last_setpoint > 0.5:
                        self.first_setpoint = now
                    self.last_setpoint = now
                    self.setpoint = (msg.vx, msg.yaw_rate)
                elif t == 'OBSTACLE_DISTANCE':
                    self.obstacles = msg
                    self.obstacles_t.append(now)
                elif t == 'COMMAND_LONG':
                    if msg.command == m.MAV_CMD_COMPONENT_ARM_DISARM:
                        self.arm_requests += 1
                        result = m.MAV_RESULT_DENIED
                    elif msg.command == m.MAV_CMD_DO_SET_MODE:
                        self.mode_requests.append(int(msg.param2))
                        if int(msg.param2) == 6 and self._streaming():
                            self.custom_mode = OFFBOARD
                            self.offboard_entered += 1
                            result = m.MAV_RESULT_ACCEPTED
                        else:
                            result = m.MAV_RESULT_DENIED
                    else:
                        result = m.MAV_RESULT_UNSUPPORTED
                    self.conn.mav.command_ack_send(msg.command, result)
