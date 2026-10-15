"""The arithmetic of the use cases. No hardware, no network, no clock: functions of
what the sensors said, so that every one can be checked on any computer.

Angles: degrees, clockwise from the aircraft's nose, from -180 to 180. That is the
"body FRD" convention MAVLink uses for a sensor fixed to the aircraft (OBSTACLE_DISTANCE,
frame MAV_FRAME_BODY_FRD: "vehicle front aligned").

A scan here is two lists of the same length: angles in that convention and ranges in
metres, already turned from the LiDAR's own 0 degrees into the aircraft's (sensors.py,
with the mount settings). A range of 0 or less is "no return".
"""

import math

UINT16_MAX = 65535
# OBSTACLE_DISTANCE has 72 elements (MAVLink common.xml)
SECTORS = 72


def wrap(deg):
    """An angle in (-180, 180]."""
    d = math.fmod(deg + 180.0, 360.0)
    if d < 0:
        d += 360.0
    return d - 180.0 if d != 0 else 180.0


def to_body(lidar_deg, zero_offset_deg, mirrored):
    """The LiDAR's own angle, as an angle on the aircraft.

    zero_offset_deg: where on the aircraft the LiDAR's 0 degrees points, clockwise from
    the nose. mirrored: True if the LiDAR counts its angles the other way round.
    """
    a = -lidar_deg if mirrored else lidar_deg
    return wrap(a + zero_offset_deg)


# ---------------------------------------------------------------- stage B: obstacle data

def obstacle_sectors(angles, ranges, min_m, max_m, ignore_within_m=0.0, no_return='unknown', sectors=SECTORS):
    """The scan as OBSTACLE_DISTANCE's `distances`: one value per sector, in centimetres.

    Sector i is centred on i * (360 / sectors) degrees clockwise from the nose, so
    angle_offset is 0 and increment is 360 / sectors. Each sector holds its nearest
    return. As MAVLink defines the field:
        a distance in cm               an obstacle that far away;
        max_distance + 1               "no obstacle is present" (a return beyond range);
        UINT16_MAX (65535)             "unknown/not used".
    A sector with no return at all is "unknown" unless no_return is "clear". Unknown is
    the careful choice: PX4 then will not move that way (CP_GO_NO_DATA 0).
    """
    width = 360.0 / sectors
    min_cm = int(round(min_m * 100))
    max_cm = int(round(max_m * 100))
    nearest = [None] * sectors
    seen = [False] * sectors
    for a, r in zip(angles, ranges):
        i = int(math.floor((a % 360.0) / width + 0.5)) % sectors
        seen[i] = True
        if r is None or r <= 0 or r < ignore_within_m:
            continue
        cm = int(round(r * 100))
        if cm < min_cm:
            continue
        if nearest[i] is None or cm < nearest[i]:
            nearest[i] = cm
    out = []
    for i in range(sectors):
        if nearest[i] is not None:
            out.append(min(nearest[i], max_cm + 1))
        elif seen[i] and no_return == 'clear':
            out.append(max_cm + 1)
        else:
            out.append(UINT16_MAX)
    return out, {'increment_deg': width, 'angle_offset_deg': 0.0, 'min_cm': min_cm, 'max_cm': max_cm}


# ---------------------------------------------------------------- the camera and the LiDAR together

def bearing_of_box(box, horizontal_fov_deg):
    """Which way an object in the picture is, in degrees clockwise from the camera's middle.

    box: (x, y, w, h) as fractions of the picture. A pinhole camera: the angle of the
    box's centre is atan of its distance from the middle, scaled by tan(fov / 2).
    Assumes the camera looks straight ahead along the aircraft's nose.
    """
    if not horizontal_fov_deg:
        raise ValueError('camera.horizontal_fov_deg is not set; the angle of an object cannot be worked out')
    cx = box[0] + box[2] / 2.0
    half = math.radians(horizontal_fov_deg) / 2.0
    return math.degrees(math.atan((cx - 0.5) * 2.0 * math.tan(half)))


def range_toward(angles, ranges, bearing_deg, half_width_deg=3.0, ignore_within_m=0.0):
    """The nearest LiDAR return within half_width_deg of a bearing, in metres, or None."""
    best = None
    for a, r in zip(angles, ranges):
        if r is None or r <= 0 or r < ignore_within_m:
            continue
        if abs(wrap(a - bearing_deg)) <= half_width_deg and (best is None or r < best):
            best = r
    return best


def look_and_measure(detections, angles, ranges, horizontal_fov_deg, ignore_within_m=0.0):
    """Every detection, with which way it is and, if the LiDAR sees it, how far.

    detections: [{'label', 'score', 'box': (x, y, w, h) as fractions}]. The half width
    searched is half the box's own width in degrees, and at least 2 degrees.
    """
    out = []
    for d in detections:
        b = bearing_of_box(d['box'], horizontal_fov_deg)
        half = max(2.0, d['box'][2] * horizontal_fov_deg / 2.0)
        out.append({
            'label': d['label'],
            'score': d['score'],
            'bearing_deg': round(b, 1),
            'distance_m': (lambda r: None if r is None else round(r, 2))(range_toward(angles, ranges, b, half, ignore_within_m)),
        })
    return out


def nearest_of(found, label):
    """Of the measured detections with this label, the nearest one with a distance; else the most certain one."""
    same = [f for f in found if f['label'] == label]
    with_d = [f for f in same if f['distance_m'] is not None]
    if with_d:
        return min(with_d, key=lambda f: f['distance_m'])
    return max(same, key=lambda f: f['score']) if same else None


# ---------------------------------------------------------------- stage C: setpoints

# SET_POSITION_TARGET_LOCAL_NED type_mask (MAVLink POSITION_TARGET_TYPEMASK): ignore
# position (1, 2, 4), acceleration (64, 128, 256) and yaw (1024); use velocity and yaw rate.
VELOCITY_AND_YAW_RATE = 1 | 2 | 4 | 64 | 128 | 256 | 1024


def clamp(v, limit):
    return max(-limit, min(limit, v))


def stay_still():
    """Velocity zero, turning zero. What every template falls back to."""
    return {'vx': 0.0, 'vy': 0.0, 'vz': 0.0, 'yaw_rate_dps': 0.0, 'why': 'stay still'}


def face(bearing_deg, max_yaw_rate_dps, gain=1.0, deadband_deg=3.0):
    """Turn toward a bearing: a yaw rate proportional to how far off it is."""
    if bearing_deg is None:
        return 0.0
    if abs(bearing_deg) < deadband_deg:
        return 0.0
    return clamp(gain * bearing_deg, max_yaw_rate_dps)


def keep_distance(distance_m, want_m, max_speed_ms, gain=0.5, deadband_m=0.15):
    """Forward speed to keep a distance to what is ahead: closer than wanted backs away."""
    if distance_m is None:
        return 0.0
    err = distance_m - want_m
    if abs(err) < deadband_m:
        return 0.0
    return clamp(gain * err, max_speed_ms)


def template_setpoint(name, inputs, limits):
    """What a stage C template asks for now.

    inputs: {'target': {'bearing_deg', 'distance_m'} or None, 'ahead_m': float or None,
             'fresh': bool}. Anything not fresh gives "stay still".
    limits: the settings' `limits`. Speeds are capped there, whatever the template says.
    """
    if not inputs.get('fresh'):
        return dict(stay_still(), why='inputs lost: stay still')
    max_v = float(limits['max_speed_ms'])
    max_r = float(limits['max_yaw_rate_dps'])
    want = float(limits['keep_distance_m'])
    t = inputs.get('target')
    if name == 'hold':
        return dict(stay_still(), why='hold: stay still')
    if name == 'face-person':
        if not t:
            return dict(stay_still(), why='no person: stay still')
        return dict(stay_still(), yaw_rate_dps=face(t['bearing_deg'], max_r), why='turn toward the person')
    if name == 'keep-distance':
        return dict(stay_still(), vx=keep_distance(inputs.get('ahead_m'), want, max_v), why='keep the distance ahead')
    if name == 'follow-person':
        if not t:
            return dict(stay_still(), why='no person: stay still')
        vx = keep_distance(t.get('distance_m'), want, max_v) if abs(t['bearing_deg']) < 15 else 0.0
        return dict(stay_still(), vx=vx, yaw_rate_dps=face(t['bearing_deg'], max_r),
                    why='turn toward the person, then keep the distance' if vx else 'turn toward the person')
    raise ValueError(f'no template called {name}')


TEMPLATES = {
    'hold': 'Stay where you are. The first offboard lesson: the Pi is flying, and nothing moves.',
    'face-person': 'Turn on the spot to face the nearest person the camera sees.',
    'keep-distance': 'Move forward or back to keep a set distance to whatever the LiDAR sees ahead.',
    'follow-person': 'Turn to face the nearest person, then keep a set distance from them.',
}
