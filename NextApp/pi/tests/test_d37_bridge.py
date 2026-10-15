"""D-37: the bridge, the gate and the sensors, with a made-up room. No aircraft."""

import json
import math
import time
import unittest

from helpers import Http, cfg, run_bridge, source_of, wait_for

from fcpi import config, gate, sensors, templates


class Bridge(unittest.TestCase):
    def setUp(self):
        self.http, self.bridge, self._stop = run_bridge(cfg('student'))

    def tearDown(self):
        self._stop()

    def test_hello_says_who_it_is_and_never_the_token(self):
        code, _, body = self.http.call('GET', '/api/v1/hello')
        self.assertEqual(code, 200)
        self.assertEqual(body['app'], 'flight-companion-pi')
        self.assertEqual(body['level'], 'student')
        self.assertTrue(body['made_up'])
        self.assertFalse(body['pictures'])
        self.assertNotIn('test-token', json.dumps(body))

    def test_inventory_and_modules(self):
        code, _, inv = self.http.call('GET', '/api/v1/inventory')
        self.assertEqual(code, 200)
        for key in ('host', 'os', 'packages', 'camera', 'lidar', 'autopilot', 'desktop_apps'):
            self.assertIn(key, inv)
        code, _, mods = self.http.call('GET', '/api/v1/modules')
        ids = {m['id'] for m in mods['modules']}
        for mid in ('lidar', 'camera', 'look-and-measure', 'autopilot-listen', 'obstacles',
                    'offboard-hold', 'offboard-face-person', 'offboard-keep-distance', 'offboard-follow-person'):
            self.assertIn(mid, ids)
        by = {m['id']: m for m in mods['modules']}
        self.assertIsNone(by['lidar']['why_not'])
        self.assertIn('instructor', by['obstacles']['why_not'])
        self.assertIn('instructor', by['offboard-hold']['why_not'])

    def test_starting_needs_the_token(self):
        code, _, body = self.http.call('POST', '/api/v1/modules/lidar/start', {})
        self.assertEqual(code, 401)
        code, _, body = self.http.call('POST', '/api/v1/modules/lidar/start', {}, token='wrong-token')
        self.assertEqual(code, 401)
        code, _, body = self.http.call('POST', '/api/v1/modules/lidar/start', {}, token='test-token')
        self.assertEqual(code, 200, body)

    def test_a_page_from_elsewhere_is_refused(self):
        code, _, _ = self.http.call('GET', '/api/v1/hello', origin='https://example.com')
        self.assertEqual(code, 403)
        code, _, _ = self.http.call('POST', '/api/v1/modules/lidar/start', {}, token='test-token', origin='https://example.com')
        self.assertEqual(code, 403)
        # the app's own origins
        for o in ('app://flight-companion', 'http://localhost:3000', 'http://127.0.0.1:3210', None):
            code, headers, _ = self.http.call('GET', '/api/v1/hello', origin=o)
            self.assertEqual(code, 200, o)
            if o:
                self.assertEqual(headers.get('Access-Control-Allow-Origin'), o)

    def test_preflight_allows_the_token_header_and_a_private_network(self):
        code, headers, _ = self.http.call('OPTIONS', '/api/v1/modules/lidar/start')
        self.assertEqual(code, 204)
        self.assertIn('X-FC-Token', headers.get('Access-Control-Allow-Headers', ''))
        self.assertEqual(headers.get('Access-Control-Allow-Private-Network'), 'true')

    def test_a_refused_request_does_not_spoil_the_next_on_the_same_connection(self):
        # a refused POST with a body, then a GET, on one kept-alive connection
        import http.client
        host, port = self.http.base[len('http://'):].split(':')
        c = http.client.HTTPConnection(host, int(port), timeout=5)
        c.request('POST', '/api/v1/modules/lidar/start', body=b'{"options": {}}', headers={'Origin': 'app://flight-companion', 'Content-Type': 'application/json'})
        r = c.getresponse()
        self.assertEqual(r.status, 401)
        r.read()
        c.request('GET', '/api/v1/hello', headers={'Origin': 'app://flight-companion'})
        r = c.getresponse()
        self.assertEqual(r.status, 200)
        self.assertEqual(r.getheader('Access-Control-Allow-Origin'), 'app://flight-companion')
        self.assertEqual(json.loads(r.read())['app'], 'flight-companion-pi')
        c.close()

    def test_other_methods_are_refused(self):
        for m in ('PUT', 'DELETE', 'PATCH'):
            code, headers, _ = self.http.call(m, '/api/v1/modules/lidar/start', {}, token='test-token')
            self.assertEqual(code, 405, m)

    def test_the_student_level_cannot_start_what_talks_to_an_autopilot(self):
        for mid in ('obstacles', 'offboard-hold', 'offboard-follow-person'):
            code, _, body = self.http.call('POST', f'/api/v1/modules/{mid}/start', {}, token='test-token')
            self.assertEqual(code, 403, mid)
            self.assertIn('instructor', body['error'])
        code, _, body = self.http.call('POST', '/api/v1/modules/nothing/start', {}, token='test-token')
        self.assertEqual(code, 404)

    def test_lidar_scan_arrives_and_stops(self):
        self.http.call('POST', '/api/v1/modules/lidar/start', {}, token='test-token')
        scan = wait_for(lambda: self.bridge.hub.get('scan'), 3)
        self.assertTrue(scan)
        self.assertTrue(scan['made_up'])
        self.assertEqual(scan['points'], 400)
        self.assertEqual(len(scan['angles']), len(scan['ranges_m']))
        events = self.http.events(1.2)
        kinds = [e for e, _ in events]
        self.assertGreaterEqual(kinds.count('scan'), 5, kinds)
        self.http.call('POST', '/api/v1/modules/lidar/stop', {}, token='test-token')
        self.assertTrue(wait_for(lambda: self.bridge.hub.get('scan') is None, 3))
        self.assertNotIn('lidar', self.bridge.manager.sensors)

    def test_look_and_measure_finds_the_made_up_person(self):
        code, _, body = self.http.call('POST', '/api/v1/modules/look-and-measure/start', {}, token='test-token')
        self.assertEqual(code, 200, body)
        m = wait_for(lambda: (self.bridge.hub.get('measure') or {}).get('items'), 4)
        self.assertTrue(m)
        p = m[0]
        self.assertEqual(p['label'], 'person')
        # where the made-up person really is, at about this moment
        self.assertIsNotNone(p['distance_m'])
        self.assertGreater(p['distance_m'], 0.8)
        self.assertLess(p['distance_m'], 4.5)
        # both sensors came on for it, and go off with it
        self.assertEqual(set(self.bridge.manager.sensors), {'lidar', 'camera'})
        self.http.call('POST', '/api/v1/modules/look-and-measure/stop', {}, token='test-token')
        self.assertEqual(self.bridge.manager.sensors, {})

    def test_no_picture_unless_the_settings_allow_it(self):
        self.http.call('POST', '/api/v1/modules/camera/start', {}, token='test-token')
        code, _, _ = self.http.call('GET', '/api/v1/picture.jpg')
        self.assertEqual(code, 404)


class MadeUpMode(unittest.TestCase):
    def test_made_up_mode_reaches_no_real_autopilot_port(self):
        from fcpi import hub, modules
        # the one mode that takes a caller's own settings file: whatever level it claims
        for device in ('/dev/serial0', '/dev/ttyAMA0', 'COM3', 'udpin:0.0.0.0:14600', 'udpout:192.168.0.10:14550', 'tcp:10.0.0.2:5760'):
            c = cfg('developer', autopilot={'device': device})
            m = modules.Manager(hub.Hub(), c, made_up=True)
            for mid in ('autopilot-listen', 'obstacles', 'offboard-hold'):
                r = m.start(mid)
                self.assertFalse(r['ok'], (device, mid))
                self.assertIn('no real autopilot port', r['error'])
            self.assertIsNone(m.link)
            with self.assertRaises(Exception):
                m._need_link(talking=True)
        # a network address on this computer is allowed: a stand-in, or a simulator
        self.assertTrue(modules.local_link('udpin:127.0.0.1:14600'))
        self.assertTrue(modules.local_link('tcp:localhost:5760'))
        # the real Pi, not made up, may of course use its serial port
        real = modules.Manager(hub.Hub(), cfg('student', autopilot={'device': '/dev/serial0'}), made_up=False)
        self.assertIsNone(real.why_not('autopilot-listen', {}))


class Gate(unittest.TestCase):
    def test_levels(self):
        self.assertTrue(gate.allows('developer', 'instructor'))
        self.assertTrue(gate.allows('instructor', 'student'))
        self.assertFalse(gate.allows('student', 'instructor'))
        self.assertFalse(gate.allows('nonsense', 'instructor'))

    def test_token(self):
        t = gate.new_token()
        self.assertRegex(t, r'^[0-9a-f]{8}-[0-9a-f]{8}$')
        self.assertTrue(gate.token_ok(t, t))
        self.assertTrue(gate.token_ok(t, f' {t} '))
        self.assertFalse(gate.token_ok(t, t[:-1]))
        self.assertFalse(gate.token_ok(t, None))
        self.assertFalse(gate.token_ok(None, t))

    def test_settings_file(self):
        import os
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = os.path.join(d, 'pi.json')
            self.assertEqual(config.load(p)['level'], 'student')
            with open(p, 'w') as f:
                json.dump({'level': 'superuser', 'lidar': {'zero_offset_deg': 90}}, f)
            c = config.load(p)
            self.assertEqual(c['level'], 'student')
            self.assertIn('not one of', c['_note'])
            self.assertEqual(c['lidar']['zero_offset_deg'], 90)
            self.assertEqual(c['lidar']['max_range_m'], 16.0)
            with open(p, 'w') as f:
                json.dump({'level': 'instructor', 'token': 'secret', 'nonsense': 1}, f)
            c = config.load(p)
            self.assertEqual(c['level'], 'instructor')
            self.assertNotIn('nonsense', c)
            self.assertNotIn('secret', json.dumps(config.public(c)))

    def test_the_real_bridge_reads_only_the_teachers_file(self):
        src = source_of('bridge.py')['bridge.py']
        self.assertIn('config.load(None if args.made_up else config.DEFAULT_PATH)', src)


class Sensors(unittest.TestCase):
    def test_the_lidar_settings_are_the_sh_variants(self):
        src = source_of('fcpi/sensors.py')['fcpi/sensors.py']
        for line in ('LidarPropSerialBaudrate, 230400', 'LidarPropLidarType, ydlidar.TYPE_TOF',
                     'LidarPropScanFrequency, 10.0', 'LidarPropSampleRate, 4', 'LidarPropSingleChannel, False',
                     'LidarPropMaxAngle, 180.0', 'LidarPropMinAngle, -180.0', 'LidarPropIntenstiy, True',
                     'LidarPropIntenstiyBit, 16', 'skipped < 10'):
            self.assertIn(line, src)
        self.assertNotIn('TYPE_TRIANGLE', src)

    def test_made_up_room_is_geometry(self):
        import random
        angles, ranges = sensors.made_up_scan(0.0, random.Random(1))
        # straight behind the aircraft is the back wall, 1.5 m away
        back = [r for a, r in zip(angles, ranges) if abs(abs(a) - 180) < 1 and r > 0]
        self.assertTrue(back and all(abs(r - 1.5) < 0.06 for r in back), back)
        # straight to the left and right, the side walls, 2 m away
        right = [r for a, r in zip(angles, ranges) if abs(a - 90) < 1 and r > 0]
        self.assertTrue(right and all(abs(r - 2.0) < 0.06 for r in right), right)

    def test_to_body(self):
        self.assertEqual(templates.to_body(0, 0, False), 0)
        self.assertEqual(templates.to_body(180, 0, False), 180)
        self.assertEqual(templates.to_body(-180, 0, False), 180)
        self.assertAlmostEqual(templates.to_body(10, 90, False), 100)
        self.assertAlmostEqual(templates.to_body(10, 90, True), 80)
        self.assertAlmostEqual(templates.to_body(170, 20, False), -170)


class Source(unittest.TestCase):
    def test_nothing_starts_another_program_or_a_shell(self):
        srcs = source_of('bridge.py', 'fcpi/modules.py', 'fcpi/sensors.py', 'fcpi/autopilot.py', 'fcpi/mav.py',
                         'fcpi/config.py', 'fcpi/gate.py', 'fcpi/hub.py', 'fcpi/templates.py')
        for name, text in srcs.items():
            for bad in ('subprocess', 'os.system', 'os.popen', 'shell=True', 'eval(', 'exec('):
                self.assertNotIn(bad, text, f'{bad} in {name}')

    def test_the_bridge_has_no_handler_for_anything_but_get_post_options(self):
        src = source_of('bridge.py')['bridge.py']
        self.assertIn('do_PUT = do_DELETE = do_PATCH = _refuse', src)
        self.assertEqual(src.count('def do_'), 3)


if __name__ == '__main__':
    unittest.main()
