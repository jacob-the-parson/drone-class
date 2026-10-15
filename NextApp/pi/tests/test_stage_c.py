"""Stage C: the Pi streams setpoints from a template; PX4 acts on them only in Offboard.

The templates' arithmetic, and the stream against the stand-in autopilot. THE STAND-IN
IS NOT PX4. These checks say the Pi's side does what it was written to do. They do not
say the aircraft will fly so: PX4's simulator comes before the aircraft, and before any
flight COM_RC_OVERRIDE must allow the sticks to take over in Offboard (build log, D-38).
"""

import math
import re
import time
import unittest

from helpers import cfg, free_port, source_of, wait_for

from fcpi import hub, modules, templates
from fcpi.standin import StandIn

LIMITS = {'max_speed_ms': 0.5, 'max_yaw_rate_dps': 30.0, 'keep_distance_m': 2.0}


class Templates(unittest.TestCase):
    def test_lost_inputs_mean_stay_still(self):
        for name in templates.TEMPLATES:
            sp = templates.template_setpoint(name, {'fresh': False}, LIMITS)
            self.assertEqual((sp['vx'], sp['yaw_rate_dps']), (0.0, 0.0), name)

    def test_face(self):
        self.assertEqual(templates.face(None, 30), 0.0)
        self.assertEqual(templates.face(2.0, 30), 0.0)         # inside the dead band
        self.assertEqual(templates.face(10.0, 30), 10.0)
        self.assertEqual(templates.face(-80.0, 30), -30.0)     # capped

    def test_keep_distance(self):
        self.assertEqual(templates.keep_distance(None, 2, 0.5), 0.0)
        self.assertEqual(templates.keep_distance(2.1, 2, 0.5), 0.0)
        self.assertGreater(templates.keep_distance(3.0, 2, 0.5), 0)
        self.assertLess(templates.keep_distance(1.0, 2, 0.5), 0)        # too close: back away
        self.assertEqual(templates.keep_distance(10.0, 2, 0.5), 0.5)    # capped

    def test_follow_turns_before_it_moves(self):
        far_right = templates.template_setpoint('follow-person', {'fresh': True, 'target': {'bearing_deg': 40, 'distance_m': 5}}, LIMITS)
        self.assertEqual(far_right['vx'], 0.0)
        self.assertGreater(far_right['yaw_rate_dps'], 0)
        ahead = templates.template_setpoint('follow-person', {'fresh': True, 'target': {'bearing_deg': 4, 'distance_m': 5}}, LIMITS)
        self.assertGreater(ahead['vx'], 0)
        nobody = templates.template_setpoint('follow-person', {'fresh': True, 'target': None}, LIMITS)
        self.assertEqual((nobody['vx'], nobody['yaw_rate_dps']), (0.0, 0.0))

    def test_bearing_of_box(self):
        self.assertAlmostEqual(templates.bearing_of_box((0.45, 0.2, 0.1, 0.5), 66), 0.0)
        right = templates.bearing_of_box((0.9, 0.2, 0.2, 0.5), 66)
        self.assertAlmostEqual(right, 33.0, places=4)           # centred on the right edge: half the field of view
        self.assertLess(templates.bearing_of_box((0.0, 0.2, 0.1, 0.5), 66), 0)
        with self.assertRaises(ValueError):
            templates.bearing_of_box((0.45, 0.2, 0.1, 0.5), None)

    def test_type_mask_is_velocity_and_yaw_rate(self):
        # POSITION_TARGET_TYPEMASK (MAVLink common.xml): ignore x y z (1 2 4), ax ay az (64 128 256), yaw (1024)
        self.assertEqual(templates.VELOCITY_AND_YAW_RATE, 1479)


class StageC(unittest.TestCase):
    def make(self, level, **limits):
        self.port = free_port()
        c = cfg(level, autopilot={'device': f'udpin:127.0.0.1:{self.port}'})
        c['limits'].update(limits)
        self.hub = hub.Hub()
        self.m = modules.Manager(self.hub, c, made_up=True)
        self.standin = StandIn(self.port).start()
        self.m.start('autopilot-listen')
        wait_for(lambda: (self.hub.get('autopilot') or {}).get('vehicle'), 5)
        self.standin.pilot_arms()   # the pilot armed it, on the radio

    def tearDown(self):
        if hasattr(self, 'standin'):
            self.m.stop_all()
            self.standin.stop()
            # whatever the test did, the Pi never asked to arm or disarm
            self.assertEqual(self.standin.arm_requests, 0)

    def test_the_student_level_cannot(self):
        self.make('student')
        for t in templates.TEMPLATES:
            self.assertFalse(self.m.start(f'offboard-{t}')['ok'])
        time.sleep(0.4)
        self.assertEqual(self.standin.count('SET_POSITION_TARGET_LOCAL_NED'), 0)

    def test_setpoints_ten_a_second_in_the_frame_px4_takes(self):
        self.make('instructor')
        self.assertTrue(self.m.start('offboard-hold')['ok'])
        wait_for(lambda: self.standin.count('SET_POSITION_TARGET_LOCAL_NED') > 3, 3)
        n0 = self.standin.count('SET_POSITION_TARGET_LOCAL_NED')
        time.sleep(2.0)
        rate = (self.standin.count('SET_POSITION_TARGET_LOCAL_NED') - n0) / 2.0
        # PX4 needs more than 2 a second
        self.assertGreater(rate, 7.0, rate)
        self.assertEqual(self.m.link.sent.get('DO_SET_MODE', 0), 0)

    def test_nothing_moves_until_the_pilot_selects_offboard(self):
        self.make('instructor')
        self.m.start('offboard-follow-person')
        time.sleep(1.5)
        self.assertEqual(self.standin.mode, 'POSCTL')
        self.assertEqual((self.standin.x, self.standin.y, self.standin.yaw), (0.0, 0.0, 0.0))
        # the pilot moves the switch: accepted, since setpoints have streamed for more than a second
        self.assertTrue(self.standin.pilot_selects('OFFBOARD'))
        self.assertEqual(self.standin.mode, 'OFFBOARD')
        # the made-up person walks an oval to the right of the nose first: the aircraft turns right
        self.assertTrue(wait_for(lambda: abs(self.standin.yaw) > 0.01, 4), self.hub.get('setpoint'))

    def test_offboard_before_the_stream_is_refused(self):
        self.make('instructor')
        self.assertFalse(self.standin.pilot_selects('OFFBOARD'))
        self.m.start('offboard-hold')
        time.sleep(0.4)
        self.assertFalse(self.standin.pilot_selects('OFFBOARD'))     # streaming, but not for a second yet
        time.sleep(1.0)
        self.assertTrue(self.standin.pilot_selects('OFFBOARD'))

    def test_stopping_hands_back_to_position_mode(self):
        self.make('instructor')
        self.m.start('offboard-hold')
        time.sleep(1.3)
        self.standin.pilot_selects('OFFBOARD')
        self.m.stop('offboard-hold')
        # COM_OF_LOSS_T 1 s on this project's board, then COM_OBL_RC_ACT 0: Position mode
        self.assertTrue(wait_for(lambda: self.standin.mode == 'POSCTL', 3))
        self.assertEqual(self.standin.offboard_left, 1)

    def test_lost_camera_means_stay_still(self):
        self.make('instructor')
        self.m.start('offboard-follow-person')
        wait_for(lambda: self.hub.get('setpoint'), 3)
        self.m.sensors['camera'].stop()
        sp = wait_for(lambda: (self.hub.get('setpoint') or {}).get('why', '').startswith('inputs lost') and self.hub.get('setpoint'), 3)
        self.assertTrue(sp, self.hub.get('setpoint'))
        self.assertEqual((sp['vx'], sp['yaw_rate_dps']), (0.0, 0.0))

    def test_the_settings_cap_the_speed(self):
        self.make('instructor', max_speed_ms=0.2, keep_distance_m=0.5)
        self.m.start('offboard-keep-distance')
        sp = wait_for(lambda: (self.hub.get('setpoint') or {}).get('vx'), 3)
        self.assertTrue(sp)
        self.assertAlmostEqual(sp, 0.2, places=3)
        self.assertTrue(wait_for(lambda: self.standin.setpoint and abs(self.standin.setpoint[0] - 0.2) < 1e-3, 3), self.standin.setpoint)

    def test_asking_for_offboard_is_the_developers_alone(self):
        self.make('instructor')
        r = self.m.start('offboard-hold', {'ask_offboard': True})
        self.assertFalse(r['ok'])
        self.assertIn('developer', r['error'])

    def test_the_developer_may_ask_for_offboard(self):
        self.make('developer')
        self.assertTrue(self.m.start('offboard-hold', {'ask_offboard': True})['ok'])
        self.assertTrue(wait_for(lambda: self.standin.mode == 'OFFBOARD', 4))
        self.assertEqual(self.standin.mode_requests, [6])


class Source(unittest.TestCase):
    def test_there_is_no_arm_command_anywhere(self):
        srcs = source_of('bridge.py', 'fcpi/modules.py', 'fcpi/autopilot.py', 'fcpi/mav.py', 'fcpi/templates.py',
                         'fcpi/sensors.py', 'fcpi/config.py', 'fcpi/gate.py', 'fcpi/hub.py')
        for name, text in srcs.items():
            # MAV_CMD_COMPONENT_ARM_DISARM, by name; pymavlink's arming helpers; the command's number (400) as a command
            for bad in ('ARM_DISARM', 'arducopter_arm', '.arm(', 'motors_armed_wait', 'command_long_send(400', ', 400, 0'):
                self.assertNotIn(bad, text, f'{bad} in {name}')

    def test_mav_sends_only_its_four_messages(self):
        text = source_of('fcpi/mav.py')['fcpi/mav.py']
        sends = sorted(set(re.findall(r'\.mav\.([a-z_]+)_send\(', text)))
        self.assertEqual(sends, ['command_long', 'heartbeat', 'obstacle_distance', 'set_position_target_local_ned'])
        # and the one command it sends is DO_SET_MODE
        self.assertEqual(re.findall(r'command_long_send\(\s*self\.target\[0\], self\.target\[1\], (\w+)', text), ['MAV_CMD_DO_SET_MODE'])
        self.assertEqual(text.count('conn.write('), 0)


if __name__ == '__main__':
    unittest.main()
