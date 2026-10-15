"""Who may start what.

Three levels, set in the teacher's settings file (config.py), never by the app:

    student      see everything; start and stop the camera and LiDAR lessons.
                 Nothing that sends to an autopilot.
    instructor   also: stage B (obstacle data to the autopilot) and the stage C
                 templates (setpoints), within the limits in the settings.
    developer    also: experimental modules, and asking the autopilot for Offboard
                 mode. For the teacher's and the developers' own tests.

And a token: every request that starts or stops something carries it. The bridge
prints it when it starts. Without it nothing on the classroom network can start the
camera.

Above all of these, and not a level: the Pi never arms an aircraft (mav.py has no
arm command), and PX4 ignores setpoints until a person selects Offboard.
"""

import hmac
import secrets

from .config import LEVELS


def rank(level):
    return LEVELS.index(level) if level in LEVELS else 0


def allows(level, needs):
    """True if a setting of `level` may start something that needs `needs`."""
    return rank(level) >= rank(needs)


def new_token():
    # short enough to type, long enough not to be guessed on a classroom network
    return secrets.token_hex(4) + '-' + secrets.token_hex(4)


def token_ok(expected, given):
    if not expected or not isinstance(given, str):
        return False
    return hmac.compare_digest(expected.encode(), given.strip().encode())
