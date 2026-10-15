#!/usr/bin/env python3
"""The Flight Companion bridge, for a Raspberry Pi.

Tells the app what the Pi's camera and LiDAR see, and starts and stops the modules a
person chooses in the app: sensor lessons, templates, and the three stages that
connect the Pi to an autopilot (fcpi/modules.py has the list).

    python3 bridge.py              on the Pi, with its real sensors
    python3 bridge.py --made-up    anywhere, with a made-up room and nothing plugged in

Then, in Flight Companion, open the Pi screen and type this computer's address and
the token the bridge prints.

HOW IT TALKS. HTTP on port 8765 (settings: http.port). Reading is GET; starting and
stopping is POST, and needs the token. Nothing else is answered.

    GET  /api/v1/hello                 who this is, its level, its settings (never the token)
    GET  /api/v1/inventory             camera, models, LiDAR, autopilot port, desktop apps
    GET  /api/v1/modules               what can be started, and why not
    GET  /api/v1/state                 the newest of everything
    GET  /api/v1/events                the same, as it changes (Server-Sent Events)
    GET  /api/v1/picture.jpg           the newest picture, only if pictures are allowed
    POST /api/v1/modules/<id>/start    with the header X-FC-Token
    POST /api/v1/modules/<id>/stop
    POST /api/v1/stop-all

THE GATE. The level comes from the teacher's settings file, /etc/flight-companion/pi.json
(fcpi/config.py). The app shows it and cannot change it. At the student level nothing
sends to an autopilot. The Pi never arms an aircraft, at any level. Changing the level
needs the admin password; but anyone with the Pi's login can change this program, so
the level is a guardrail for a class, not a lock against its teacher.

THE NETWORK. It listens on every address of the Pi, so the app on another computer can
reach it. It answers pages only from the origins in the settings (the app, run from
this or another computer), and any program that is not a browser. Starting anything
also needs the token. Pictures of the room are sent only if the settings allow them.
"""

import argparse
import glob
import importlib.util
import json
import os
import platform
import signal
import socket
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from fcpi import __version__, config, gate, hub as hubmod, modules  # noqa: E402

API = '/api/v1'
LOCAL_DEV = ('http://localhost:', 'http://127.0.0.1:')


def inventory(cfg, made_up):
    """What is on this computer. Read-only: lists files and asks whether packages import."""
    def can_import(name):
        try:
            return importlib.util.find_spec(name) is not None
        except (ImportError, ValueError):
            return False

    os_name = platform.platform()
    try:
        with open('/etc/os-release', encoding='utf-8') as f:
            for line in f:
                if line.startswith('PRETTY_NAME='):
                    os_name = line.split('=', 1)[1].strip().strip('"')
    except OSError:
        pass
    models = sorted(os.path.basename(p) for p in glob.glob('/usr/share/imx500-models/*.rpk'))
    desktop = []
    for p in sorted(glob.glob(os.path.expanduser('~/Desktop/*.desktop'))):
        try:
            with open(p, encoding='utf-8') as f:
                name = next((ln.split('=', 1)[1].strip() for ln in f if ln.startswith('Name=')), os.path.basename(p))
            desktop.append({'name': name, 'file': os.path.basename(p)})
        except OSError:
            pass
    dev = cfg['autopilot']['device']
    return {
        'made_up': made_up,
        'host': socket.gethostname(),
        'os': os_name,
        'python': platform.python_version(),
        'packages': {n: can_import(n) for n in ('picamera2', 'ydlidar', 'pymavlink', 'cv2', 'numpy')},
        'camera': {'models': models, 'model_count': len(models),
                   'rpicam': any(os.path.exists(os.path.join(d, 'rpicam-hello')) for d in ('/usr/bin', '/usr/local/bin'))},
        'lidar': {'ports': sorted(glob.glob('/dev/ttyUSB*')), 'by_id': sorted(os.path.basename(p) for p in glob.glob('/dev/serial/by-id/*'))},
        'autopilot': {'device': dev, 'present': dev.startswith(('udp', 'tcp')) or os.path.exists(dev),
                      'serial_ports': sorted(glob.glob('/dev/ttyAMA*') + glob.glob('/dev/serial[0-9]'))},
        'desktop_apps': desktop,
        'note': 'The desktop apps are listed; they are started from the Pi\'s own screen, since they open windows on it.',
    }


class Bridge:
    def __init__(self, cfg, made_up):
        self.cfg = cfg
        self.made_up = made_up
        self.hub = hubmod.Hub()
        self.manager = modules.Manager(self.hub, cfg, made_up=made_up)
        self.token = cfg.get('token') or gate.new_token()
        self.started = time.time()

    def hello(self):
        return {
            'app': 'flight-companion-pi', 'version': __version__, 'name': self.cfg.get('name') or socket.gethostname(),
            'level': self.cfg['level'], 'made_up': self.made_up, 'pictures': bool(self.cfg['pictures']),
            'uptime_s': round(time.time() - self.started, 1), 'needs_token_to_start': True,
            'settings': config.public(self.cfg),
        }

    def state(self):
        _, kinds, log = self.hub.since(0)
        kinds.pop('picture', None)
        return {'kinds': kinds, 'log': log[-50:], 'modules': self.manager.status()}


def make_handler(bridge):
    class Handler(BaseHTTPRequestHandler):
        server_version = f'FlightCompanionPi/{__version__}'
        protocol_version = 'HTTP/1.1'

        def log_message(self, fmt, *args):  # one short line per request, on standard error
            sys.stderr.write('%s %s\n' % (self.address_string(), fmt % args))

        # ------------------------------------------------------------ who may ask

        def _origin_ok(self):
            origin = self.headers.get('Origin')
            if origin is None:
                return True, None           # not a browser page: a program, or the same site
            if origin in bridge.cfg['origins'] or origin.startswith(LOCAL_DEV):
                return True, origin
            return False, origin

        def _cors(self, origin):
            if origin:
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')

        def _send(self, code, body, ctype='application/json; charset=utf-8', origin=None, extra=None):
            data = body if isinstance(body, bytes) else json.dumps(body).encode()
            self.send_response(code)
            self.send_header('Content-Type', ctype)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self._cors(origin)
            for k, v in (extra or {}).items():
                self.send_header(k, v)
            self.end_headers()
            self.wfile.write(data)

        # ------------------------------------------------------------ the methods answered

        def do_OPTIONS(self):
            ok, origin = self._origin_ok()
            if not ok:
                return self._send(403, {'error': 'this page is not one the bridge answers'})
            self.send_response(204)
            self._cors(origin)
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-FC-Token')
            # a page on this computer asking a Pi on the local network (Chrome's Private Network Access)
            self.send_header('Access-Control-Allow-Private-Network', 'true')
            self.send_header('Access-Control-Max-Age', '600')
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_GET(self):
            ok, origin = self._origin_ok()
            if not ok:
                return self._send(403, {'error': 'this page is not one the bridge answers'})
            path = urlparse(self.path).path.rstrip('/')
            if path == f'{API}/hello':
                return self._send(200, bridge.hello(), origin=origin)
            if path == f'{API}/inventory':
                return self._send(200, inventory(bridge.cfg, bridge.made_up), origin=origin)
            if path == f'{API}/modules':
                return self._send(200, {'level': bridge.cfg['level'], 'modules': bridge.manager.catalog(),
                                        'status': bridge.manager.status()}, origin=origin)
            if path == f'{API}/state':
                return self._send(200, bridge.state(), origin=origin)
            if path == f'{API}/picture.jpg':
                pic = bridge.hub.get('picture', max_age_s=30) if bridge.cfg['pictures'] else None
                if pic is None:
                    return self._send(404, {'error': 'no picture: pictures are not allowed in the settings, or none yet'}, origin=origin)
                return self._send(200, pic, ctype='image/jpeg', origin=origin)
            if path == f'{API}/events':
                return self._events(origin)
            return self._send(404, {'error': f'nothing at {path}'}, origin=origin)

        def _body(self):
            """The request's body, read whole before any answer. A body left unread would be taken,
            on a kept-alive connection, for the start of the next request."""
            try:
                length = int(self.headers.get('Content-Length') or 0)
            except ValueError:
                length = -1
            if length < 0 or length > 10000:
                self.close_connection = True
                return None
            return self.rfile.read(length) if length else b''

        def do_POST(self):
            raw = self._body()
            ok, origin = self._origin_ok()
            if not ok:
                return self._send(403, {'error': 'this page is not one the bridge answers'})
            if raw is None:
                return self._send(413, {'error': 'too large'}, origin=origin)
            if not gate.token_ok(bridge.token, self.headers.get('X-FC-Token')):
                return self._send(401, {'error': 'the token is missing or wrong. The bridge printed it when it started.'}, origin=origin)
            try:
                body = json.loads(raw) if raw else {}
            except ValueError:
                return self._send(400, {'error': 'the body is not JSON'}, origin=origin)
            if not isinstance(body, dict):
                return self._send(400, {'error': 'the body is not a JSON object'}, origin=origin)
            parts = urlparse(self.path).path.rstrip('/').split('/')
            # /api/v1/modules/<id>/start
            if len(parts) == 6 and '/'.join(parts[:4]) == f'{API}/modules' and parts[5] in ('start', 'stop'):
                mid = parts[4]
                if parts[5] == 'start':
                    options = body.get('options') if isinstance(body.get('options'), dict) else {}
                    r = bridge.manager.start(mid, options)
                else:
                    r = bridge.manager.stop(mid)
                code = 200 if r['ok'] else (404 if r.get('error') == 'no such module' else 403)
                return self._send(code, r, origin=origin)
            if '/'.join(parts) == f'{API}/stop-all':
                bridge.manager.stop_all()
                return self._send(200, {'ok': True}, origin=origin)
            return self._send(404, {'error': 'nothing to do there'}, origin=origin)

        def _refuse(self):
            self._body()
            ok, origin = self._origin_ok()
            self._send(405, {'error': 'the bridge answers GET, and POST with the token, and nothing else'},
                       origin=origin if ok else None, extra={'Allow': 'GET, POST, OPTIONS'})

        do_PUT = do_DELETE = do_PATCH = _refuse

        def _events(self, origin):
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Connection', 'keep-alive')
            self._cors(origin)
            self.end_headers()
            seq = 0
            try:
                self.wfile.write(b': flight-companion-pi\n\n')
                self.wfile.flush()
                last_beat = time.time()
                while not bridge_stopping.is_set():
                    seq_now, kinds, log = bridge.hub.since(seq)
                    seq = seq_now
                    kinds.pop('picture', None)
                    for kind, item in kinds.items():
                        self.wfile.write(f'event: {kind}\ndata: {json.dumps(item)}\n\n'.encode())
                    for line in log:
                        self.wfile.write(f'event: log\ndata: {json.dumps(line)}\n\n'.encode())
                    if kinds or log:
                        self.wfile.flush()
                    if time.time() - last_beat > 10:
                        self.wfile.write(b': still here\n\n')
                        self.wfile.flush()
                        last_beat = time.time()
                    bridge.hub.wait(seq, 1.0)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                pass
            self.close_connection = True

    return Handler


bridge_stopping = threading.Event()


def serve(cfg, made_up, host=None, port=None, ready=None):
    """Run the bridge until stopped. Returns (server, bridge) through `ready` if given."""
    bridge = Bridge(cfg, made_up)
    server = ThreadingHTTPServer((host or cfg['http']['host'], int(port or cfg['http']['port'])), make_handler(bridge))
    server.daemon_threads = True
    if ready:
        ready(server, bridge)
    return server, bridge


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    p.add_argument('--made-up', action='store_true', help='a made-up room: no camera, no LiDAR needed')
    p.add_argument('--port', type=int, help='HTTP port (default: the settings, 8765)')
    p.add_argument('--host', help='address to listen on (default: the settings, every address)')
    args = p.parse_args(argv)
    # the settings file comes from FC_PI_CONFIG only with --made-up: on the real Pi it is always
    # the teacher's file, so that a student cannot point the bridge at a file of their own
    cfg = config.load(None if args.made_up else config.DEFAULT_PATH)
    server, bridge = serve(cfg, args.made_up, args.host, args.port)
    host, port = server.server_address[:2]
    print(f'Flight Companion bridge {__version__}{" (MADE-UP sensors)" if args.made_up else ""}')
    print(f'  listening on {host}:{port}; level: {cfg["level"]}; pictures: {"allowed" if cfg["pictures"] else "off"}')
    if cfg['_note']:
        print(f'  settings: {cfg["_note"]}')
    print(f'  token: {bridge.token}    (type it into the app once, to start and stop things)')
    sys.stdout.flush()

    def shutdown(*_a):
        bridge_stopping.set()
        bridge.manager.stop_all()
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)
    try:
        server.serve_forever(poll_interval=0.5)
    finally:
        bridge.manager.stop_all()
        server.server_close()
        print('bridge stopped')


if __name__ == '__main__':
    main()
