"""fcpi: the Raspberry Pi side of Flight Companion.

A small program on the Pi, the bridge (`pi/bridge.py`), reads the Pi's own sensors
(the AI camera and the LiDAR), tells the app what they see, and runs the modules a
person starts from the app: lesson apps for the sensors, templates that combine them,
and the three stages that connect the Pi to an autopilot.

The parts:

    config.py     the settings and the level, read from a file the teacher writes
    gate.py       who may start what: the level, the token
    hub.py        the newest of everything, shared by the modules and the bridge
    sensors.py    the LiDAR and the camera, real or made up
    templates.py  the arithmetic of the use cases: no hardware, no network
    mav.py        the MAVLink link to an autopilot, and the only code that sends on it
    autopilot.py  stage A (listen), stage B (obstacle data), stage C (setpoints)
    modules.py    what a person can start and stop, and what each one needs
    standin.py    a stand-in autopilot for the tests. It is NOT PX4.

Rules the code keeps, whatever the level:
    - the Pi never arms an aircraft: there is no arm command anywhere in fcpi. (An
      experiment, at the developer level, is the developer's own Python, and is outside
      this rule.);
    - with --made-up, which takes a settings file of the caller's choosing, nothing talks
      to a real autopilot port;
    - nothing that sends to an autopilot runs at the student level;
    - the camera sends no picture unless the teacher's settings allow it.
"""

__version__ = '0.1.0'
