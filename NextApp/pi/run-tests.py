#!/usr/bin/env python3
"""Every test of the Pi side, stage by stage, with a line for each.

    python3 run-tests.py            all four
    python3 run-tests.py b c        stages B and C only

Runs here, on any computer with pymavlink, and on the Pi. Nothing touches an aircraft:
the sensors are made up and the autopilot is the stand-in (fcpi/standin.py), which is
NOT PX4. Passing says the Pi's code does what it was written to do; it does not say PX4
will. PX4's own simulator comes before the aircraft.
"""

import io
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, 'tests'))

SUITES = [
    ('d37', 'test_d37_bridge', 'D-37  the bridge, the gate, the sensors (made-up room)'),
    ('a', 'test_stage_a', 'Stage A  listen to the autopilot (stand-in, NOT PX4)'),
    ('b', 'test_stage_b', 'Stage B  obstacle data to the autopilot (stand-in, NOT PX4)'),
    ('c', 'test_stage_c', 'Stage C  setpoints to the autopilot (stand-in, NOT PX4)'),
]


def main(argv):
    want = {a.lower() for a in argv} or {k for k, _, _ in SUITES}
    total_fail = 0
    for key, module, label in SUITES:
        if key not in want:
            continue
        suite = unittest.defaultTestLoader.loadTestsFromName(module)
        out = io.StringIO()
        # the bridge writes a line per request to standard error; keep it out of the summary
        err, sys.stderr = sys.stderr, io.StringIO()
        try:
            result = unittest.TextTestRunner(stream=out, verbosity=0).run(suite)
        finally:
            sys.stderr = err
        bad = len(result.failures) + len(result.errors)
        total_fail += bad
        print(f'{"PASS" if bad == 0 else "FAIL"}  {label}: {result.testsRun - bad} of {result.testsRun}')
        for case, text in result.failures + result.errors:
            print(f'      {case.id()}')
            print('      ' + text.strip().splitlines()[-1])
    print(f'\npi: {"all passed" if total_fail == 0 else f"{total_fail} failed"}')
    return 1 if total_fail else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
