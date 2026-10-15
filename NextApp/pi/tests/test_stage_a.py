"""Stage A: the Pi listens to an autopilot and sends nothing.

Against the stand-in autopilot, on this computer. THE STAND-IN IS NOT PX4.
"""

import unittest

from helpers import cfg, free_port, source_of, wait_for

from fcpi import hub, mav, modules
from fcpi.standin import StandIn


class StageA(unittest.TestCase):
    def setUp(self):
        self.port = free_port()
        self.c = cfg('student', autopilot={'device': f'udpin:127.0.0.1:{self.port}'})
        self.hub = hub.Hub()
        self.m = modules.Manager(self.hub, self.c, made_up=True)
        r = self.m.start('autopilot-listen')
        self.assertTrue(r['ok'], r)
        self.standin = StandIn(self.port).start()

    def tearDown(self):
        self.m.stop_all()
        self.standin.stop()

    def test_not_px4_hears_the_vehicle(self):
        heard = wait_for(lambda: (self.hub.get('autopilot') or {}).get('vehicle'), 5)
        self.assertTrue(heard, self.hub.get('autopilot'))
        self.assertEqual(heard['mode'], 'POSCTL')
        self.assertFalse(heard['armed'])
        self.standin.pilot_arms()
        self.assertTrue(wait_for(lambda: self.hub.get('autopilot')['vehicle']['armed'], 3))
        a = self.hub.get('autopilot')
        self.assertTrue(a['heard'])
        self.assertIn('attitude', a)
        self.assertEqual(a['battery']['volts'], 15.8)
        self.assertFalse(a['talking'])

    def test_not_px4_receives_nothing_from_the_pi(self):
        wait_for(lambda: (self.hub.get('autopilot') or {}).get('vehicle'), 5)
        import time
        time.sleep(1.5)
        self.assertEqual(self.standin.bytes_in, 0, self.standin.received)
        self.assertEqual(self.m.link.sent, {})

    def test_the_listening_link_refuses_to_send(self):
        link = self.m.link
        self.assertFalse(link.talking)
        for attempt in (link.heartbeat, lambda: link.obstacle_distance([0] * 72, 5, 5, 1600),
                        lambda: link.velocity(0, 0, 0, 0, 0, 0), link.ask_for_offboard):
            with self.assertRaises(mav.Refused):
                attempt()
        with self.assertRaises(mav.Refused):
            link.conn.write(b'\xfd')
        with self.assertRaises(mav.Refused):
            link.conn.mav.heartbeat_send(18, 8, 0, 0, 4)
        with self.assertRaises(mav.Refused):
            link.conn.port.sendto(b'x', ('127.0.0.1', self.port))

    def test_a_ground_station_is_not_the_vehicle(self):
        # system 255 talking on the same link must not be taken for the autopilot
        from fcpi.standin import LocalUdp
        gcs = LocalUdp(self.port, 255, 190)
        for _ in range(5):
            gcs.mav.heartbeat_send(6, 8, 0, 0, 4)
        gcs.close()
        heard = wait_for(lambda: (self.hub.get('autopilot') or {}).get('vehicle'), 5)
        self.assertEqual(heard['type'], 2)

    def test_stopping_closes_the_link(self):
        self.m.stop('autopilot-listen')
        self.assertIsNone(self.m.link)
        self.assertIsNone(self.hub.get('autopilot'))


class Source(unittest.TestCase):
    def test_listening_is_guarded_as_the_observer_is(self):
        src = source_of('fcpi/mav.py')['fcpi/mav.py']
        self.assertIn('self.conn.write = _forbidden', src)
        self.assertIn('self.conn.port = _NoSend(self.conn.port)', src)
        for name in ('send', 'sendto', 'sendall', 'sendmsg', 'write', 'writelines'):
            self.assertIn(f"'{name}'", src)


if __name__ == '__main__':
    unittest.main()
