"""Stage B: the LiDAR's scan goes to an autopilot as OBSTACLE_DISTANCE.

The arithmetic against MAVLink's definition of the message (common.xml), and the
stream against the stand-in autopilot. THE STAND-IN IS NOT PX4: whether PX4's
collision prevention does the right thing with this stream is for PX4's simulator.
"""

import time
import unittest

from helpers import cfg, free_port, wait_for

from fcpi import hub, modules, templates
from fcpi.standin import StandIn

U = templates.UINT16_MAX


class Sectors(unittest.TestCase):
    def test_72_sectors_of_5_degrees_from_the_nose_clockwise(self):
        d, info = templates.obstacle_sectors([0.0, 5.0, 90.0, -90.0, 180.0], [1.0, 2.0, 3.0, 4.0, 5.0], 0.05, 16.0)
        self.assertEqual(len(d), 72)
        self.assertEqual(info['increment_deg'], 5.0)
        self.assertEqual(info['angle_offset_deg'], 0.0)
        self.assertEqual(d[0], 100)      # the nose
        self.assertEqual(d[1], 200)      # 5 degrees right
        self.assertEqual(d[18], 300)     # straight right
        self.assertEqual(d[54], 400)     # straight left: -90 is 270 clockwise
        self.assertEqual(d[36], 500)     # behind
        self.assertEqual(d[2], U)        # nothing seen there: unknown

    def test_a_sector_holds_its_nearest_return(self):
        d, _ = templates.obstacle_sectors([-2.0, 0.0, 2.4], [3.0, 1.2, 2.0], 0.05, 16.0)
        self.assertEqual(d[0], 120)

    def test_the_edges_of_a_sector(self):
        d, _ = templates.obstacle_sectors([2.4, 2.6], [1, 2], 0.05, 16.0)
        self.assertEqual(d[0], 100)      # 2.4 is in sector 0 (centred on 0, 2.5 either side)
        self.assertEqual(d[1], 200)      # 2.6 is in sector 1
        for a in (357.6, -2.4):          # either way of writing just left of the nose
            self.assertEqual(templates.obstacle_sectors([a], [0.5], 0.05, 16.0)[0][0], 50, a)
        self.assertEqual(templates.obstacle_sectors([357.4], [0.5], 0.05, 16.0)[0][71], 50)

    def test_what_mavlink_says_the_values_mean(self):
        # "A value of max_distance +1 means no obstacle is present. A value of UINT16_MAX for unknown/not used."
        far = templates.obstacle_sectors([0.0], [30.0], 0.05, 16.0)[0]
        self.assertEqual(far[0], 1601)
        none = templates.obstacle_sectors([0.0], [0.0], 0.05, 16.0)[0]
        self.assertEqual(none[0], U)
        clear = templates.obstacle_sectors([0.0], [0.0], 0.05, 16.0, no_return='clear')[0]
        self.assertEqual(clear[0], 1601)
        # closer than the sensor can measure, or the aircraft itself
        self.assertEqual(templates.obstacle_sectors([0.0], [0.03], 0.05, 16.0)[0][0], U)
        self.assertEqual(templates.obstacle_sectors([0.0, 0.0], [0.2, 2.0], 0.05, 16.0, ignore_within_m=0.3)[0][0], 200)


class StageB(unittest.TestCase):
    def make(self, level, **lidar):
        self.port = free_port()
        c = cfg(level, autopilot={'device': f'udpin:127.0.0.1:{self.port}'})
        c['lidar'].update(lidar)
        self.hub = hub.Hub()
        self.m = modules.Manager(self.hub, c, made_up=True)
        self.standin = StandIn(self.port).start()
        # the Pi learns where the stand-in is from its first packet
        self.m.start('autopilot-listen')
        wait_for(lambda: (self.hub.get('autopilot') or {}).get('vehicle'), 5)

    def tearDown(self):
        if hasattr(self, 'standin'):
            self.m.stop_all()
            self.standin.stop()

    def test_the_student_level_cannot(self):
        self.make('student')
        r = self.m.start('obstacles')
        self.assertFalse(r['ok'])
        time.sleep(0.5)
        self.assertEqual(self.standin.count('OBSTACLE_DISTANCE'), 0)

    def test_not_px4_receives_obstacles_ten_times_a_second(self):
        self.make('instructor')
        r = self.m.start('obstacles')
        self.assertTrue(r['ok'], r)
        self.assertTrue(self.m.link.talking)
        wait_for(lambda: self.standin.count('OBSTACLE_DISTANCE') >= 5, 4)
        start = len(self.standin.obstacles_t)
        time.sleep(2.0)
        rate = (len(self.standin.obstacles_t) - start) / 2.0
        self.assertGreater(rate, 7.0, rate)
        self.assertLess(rate, 12.0, rate)
        o = self.standin.obstacles
        self.assertEqual(o.frame, 12)                 # MAV_FRAME_BODY_FRD
        self.assertAlmostEqual(o.increment_f, 5.0)
        self.assertEqual(o.increment, 5)
        self.assertAlmostEqual(o.angle_offset, 0.0)
        self.assertEqual(o.min_distance, 5)
        self.assertEqual(o.max_distance, 1600)
        self.assertEqual(len(o.distances), 72)
        # the made-up room: the back wall 1.5 m behind, the side walls 2 m to each side
        self.assertAlmostEqual(o.distances[36], 150, delta=8)
        self.assertAlmostEqual(o.distances[18], 200, delta=8)
        self.assertAlmostEqual(o.distances[54], 200, delta=8)
        # and the Pi says it is there, as an onboard computer
        self.assertGreater(self.standin.count('HEARTBEAT'), 0)
        self.assertEqual(self.standin.arm_requests, 0)

    def test_an_old_scan_is_not_sent(self):
        self.make('instructor')
        self.m.start('obstacles')
        wait_for(lambda: self.standin.count('OBSTACLE_DISTANCE') >= 3, 4)
        # the LiDAR stops, as if unplugged
        self.m.sensors['lidar'].stop()
        time.sleep(0.8)
        before = self.standin.count('OBSTACLE_DISTANCE')
        time.sleep(1.0)
        self.assertEqual(self.standin.count('OBSTACLE_DISTANCE'), before)

    def test_unmeasured_mount_is_refused_on_the_real_pi(self):
        c = cfg('instructor')
        m = modules.Manager(hub.Hub(), c, made_up=False)
        self.assertIn('hand test', m.why_not('obstacles', {}))
        c['lidar']['mount_measured'] = True
        self.assertIsNone(m.why_not('obstacles', {}))
        # the developer may go ahead without it
        c2 = cfg('developer')
        self.assertIsNone(modules.Manager(hub.Hub(), c2, made_up=False).why_not('obstacles', {}))

    def test_stopping_goes_back_to_listening(self):
        self.make('instructor')
        self.m.start('obstacles')
        self.assertTrue(self.m.link.talking)
        self.m.stop('obstacles')
        self.assertFalse(self.m.link.talking)
        self.assertNotIn('lidar', self.m.sensors)


if __name__ == '__main__':
    unittest.main()
