#!/usr/bin/env python3
"""
Offline self-test for the qgc-readonly observer.

Needs no aircraft, no QGroundControl and no network. It builds MAVLink messages in
memory, hands them to the observer's own decoder, and checks what the tools report.
Nothing is sent anywhere: the "transmit" side writes into a byte buffer, not a socket.

Run from the project folder:

    tools\\qgc-readonly-mcp\\.venv\\Scripts\\python.exe MCP-SETUP\\selftest.py

What it proves: the Python environment is complete and server.py decodes, caches and
diffs correctly. What it does not prove: that QGC is forwarding, or that UDP 14445 is
free. Use check-observer.ps1 for those.
"""

import os
import socket
import struct
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "tools", "qgc-readonly-mcp"))
os.environ.setdefault("MAVLINK20", "1")

import server  # noqa: E402
from pymavlink import mavutil  # noqa: E402

mav = mavutil.mavlink
_results = []


class _Buffer:
    """Stands in for a socket so the encoder has somewhere to write."""

    def __init__(self):
        self.data = bytearray()

    def write(self, b):
        self.data += b


def feed(src_system, build):
    """Encode messages as system `src_system`, decode them, pass them to the observer."""
    buf = _Buffer()
    build(mav.MAVLink(buf, srcSystem=src_system, srcComponent=1))
    for msg in mav.MAVLink(None).parse_buffer(bytes(buf.data)) or []:
        server._handle(msg)


def check(name, got, want):
    ok = got == want
    _results.append(ok)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + ("" if ok else f"   got {got!r}, want {want!r}"))


def px4_int(value):
    """PX4 puts an int32 parameter's bytes inside the float field."""
    return struct.unpack("<f", struct.pack("<i", value))[0]


def main():
    print("1. Vehicle heartbeat is decoded")
    auto_loiter = (4 << 16) | (3 << 24)          # PX4 custom_mode: main AUTO, sub LOITER
    feed(1, lambda m: m.heartbeat_send(mav.MAV_TYPE_QUADROTOR, mav.MAV_AUTOPILOT_PX4,
                                       0, auto_loiter, mav.MAV_STATE_STANDBY))
    v = server.status()["vehicle"]
    check("type", v["type"], "MAV_TYPE_QUADROTOR")
    check("autopilot", v["autopilot"], "MAV_AUTOPILOT_PX4")
    check("armed", v["armed"], False)
    check("mode", v["mode"]["name"], "AUTO:LOITER")

    print("2. QGroundControl's own heartbeat (system 255) is ignored")
    feed(255, lambda m: m.heartbeat_send(mav.MAV_TYPE_GCS, mav.MAV_AUTOPILOT_INVALID,
                                         mav.MAV_MODE_FLAG_SAFETY_ARMED, 0,
                                         mav.MAV_STATE_ACTIVE))
    v = server.status()["vehicle"]
    check("still the quadrotor", v["type"], "MAV_TYPE_QUADROTOR")
    check("still disarmed", v["armed"], False)

    print("3. Parameters, including PX4's byte-wise integers")

    def params(m):
        m.param_value_send(b"SYS_AUTOSTART", px4_int(4019), mav.MAV_PARAM_TYPE_INT32, 3, 0)
        m.param_value_send(b"RC_MAP_KILL_SW", px4_int(8), mav.MAV_PARAM_TYPE_INT32, 3, 1)
        m.param_value_send(b"BAT_LOW_THR", 0.3, mav.MAV_PARAM_TYPE_REAL32, 3, 2)
    feed(1, params)
    check("SYS_AUTOSTART", server.param("SYS_AUTOSTART").get("value"), 4019)
    check("RC_MAP_KILL_SW", server.param("rc_map_kill_sw").get("value"), 8)
    check("BAT_LOW_THR", round(server.param("BAT_LOW_THR").get("value", 0), 4), 0.3)
    check("prefix filter", sorted(server.params(prefix="rc_")["params"]), ["RC_MAP_KILL_SW"])
    check("counts", (server.status()["params_received"], server.status()["params_expected"]),
          (3, 3))

    print("4. Board text messages")
    feed(1, lambda m: m.statustext_send(mav.MAV_SEVERITY_INFO, b"Armed by Stick gesture"))
    last = server.messages(n=1)["messages"][-1]
    check("text", last["text"], "Armed by Stick gesture")
    check("severity", last["severity"], "MAV_SEVERITY_INFO")

    print("5. .params file parsing and the live diff")
    body = ("# Onboard parameters for Vehicle 1\n"
            "1\t1\tSYS_AUTOSTART\t4019\t6\n"
            "1\t1\tRC_MAP_KILL_SW\t7\t6\n"
            "1\t1\tBAT_LOW_THR\t0.300000011920928955\t9\n"
            "1\t1\tONLY_IN_FILE\t1\t6\n")
    with tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "selftest.params")
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(body)
        check("file count", server.read_params_file(path)["count"], 4)
        d = server.diff_live_against_file(path)
        check("changed", d["changed"], {"RC_MAP_KILL_SW": {"file": "7", "live": 8}})
        check("only_in_file", d["only_in_file"], ["ONLY_IN_FILE"])
        check("only_live", d["only_live"], [])

    print("6. The read-only guard")
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)   # never bound, never used
    try:
        guarded = server._RxOnlySocket(sock)
        for method in ("send", "sendto", "sendall", "sendmsg"):
            try:
                getattr(guarded, method)(b"x", ("127.0.0.1", 9))
                refused = False
            except RuntimeError:
                refused = True
            check(f"{method} refused", refused, True)
    finally:
        sock.close()

    failed = _results.count(False)
    print(f"\n{len(_results) - failed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
