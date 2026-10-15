"""Shared by the test suites. Nothing here touches an aircraft: sensors are made up and
the autopilot is the stand-in (fcpi/standin.py), which is NOT PX4, on 127.0.0.1."""

import copy
import json
import os
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.request

PI = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PI)

from fcpi import config  # noqa: E402

# ports a ground station, a simulator or this project's observer may be using
NOT_THESE = {14445, 14550, 14540, 14556, 14557, 14580, 18570, 8765}


def free_port(kind=socket.SOCK_DGRAM):
    while True:
        s = socket.socket(socket.AF_INET, kind)
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        if port not in NOT_THESE:
            return port


def cfg(level='student', **over):
    """A settings dict as config.load makes one, with the autopilot on this computer."""
    c = copy.deepcopy(config.DEFAULTS)
    c['level'] = level
    c['token'] = 'test-token'
    c['_path'] = '(tests)'
    c['_note'] = None
    for k, v in over.items():
        if isinstance(v, dict):
            c[k].update(v)
        else:
            c[k] = v
    return c


def wait_for(cond, timeout=5.0, step=0.05):
    end = time.time() + timeout
    while time.time() < end:
        v = cond()
        if v:
            return v
        time.sleep(step)
    return cond()


def source_of(*names):
    """The code of fcpi files, with comments and docstrings taken out."""
    out = {}
    for n in names:
        path = os.path.join(PI, n)
        with open(path, encoding='utf-8') as f:
            text = f.read()
        text = re.sub(r'(?s)("""|\'\'\').*?\1', '', text)
        text = '\n'.join(line.split('#', 1)[0] if not line.strip().startswith(('"', "'")) else line for line in text.splitlines())
        out[n] = text
    return out


class Http:
    """A tiny client for the bridge, as a page or as a program would ask."""

    def __init__(self, base, origin='http://localhost:3000'):
        self.base = base
        self.origin = origin

    def call(self, method, path, body=None, token=None, origin='default'):
        headers = {}
        o = self.origin if origin == 'default' else origin
        if o:
            headers['Origin'] = o
        if token:
            headers['X-FC-Token'] = token
        data = None
        if body is not None:
            data = json.dumps(body).encode()
            headers['Content-Type'] = 'application/json'
        req = urllib.request.Request(self.base + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=5) as r:
                raw = r.read()
                return r.status, dict(r.headers), (json.loads(raw) if r.headers.get('Content-Type', '').startswith('application/json') else raw)
        except urllib.error.HTTPError as e:
            raw = e.read()
            try:
                return e.code, dict(e.headers), json.loads(raw)
            except ValueError:
                return e.code, dict(e.headers), raw

    def events(self, seconds):
        """Read the event stream for some seconds: [(event, data)]."""
        req = urllib.request.Request(self.base + '/api/v1/events', headers={'Origin': self.origin})
        got = []
        r = urllib.request.urlopen(req, timeout=5)
        end = time.time() + seconds
        event = None
        sock = r.fp.raw._sock if hasattr(r.fp, 'raw') else None
        if sock:
            sock.settimeout(0.5)
        while time.time() < end:
            try:
                line = r.readline()
            except (socket.timeout, TimeoutError):
                continue
            if not line:
                break
            line = line.decode().rstrip('\n')
            if line.startswith('event: '):
                event = line[7:]
            elif line.startswith('data: ') and event:
                got.append((event, json.loads(line[6:])))
                event = None
        r.close()
        return got


def run_bridge(c, made_up=True):
    """Start the bridge on a free port in this process. Returns (http client, bridge, stop)."""
    import bridge as bridgemod

    port = free_port(socket.SOCK_STREAM)
    bridgemod.bridge_stopping.clear()
    server, b = bridgemod.serve(c, made_up, host='127.0.0.1', port=port)
    t = threading.Thread(target=server.serve_forever, kwargs={'poll_interval': 0.1}, daemon=True)
    t.start()

    def stop():
        bridgemod.bridge_stopping.set()
        b.manager.stop_all()
        server.shutdown()
        server.server_close()

    return Http(f'http://127.0.0.1:{port}'), b, stop
