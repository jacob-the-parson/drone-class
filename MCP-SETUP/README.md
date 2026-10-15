# MCP setup: the read-only MAVLink observer

This folder explains the `qgc-readonly` MCP server: what it is, how to use it day to day,
how to rebuild it on another computer, and what to do when it goes quiet. The server
itself lives in `tools/qgc-readonly-mcp/server.py`. Nothing in this folder is needed for
the server to run; it is documentation and two checking scripts.

The decision behind it is **D-11** in `build-log.md`. The rules it works under are in
`CLAUDE.md` and `notes.txt` section 6.

## What it is, in one paragraph

QGroundControl (QGC) is the only program that talks to the Pixhawk. QGC has a setting
that sends a **copy** of everything it hears from the aircraft to a network port on the
same computer. The observer listens on that port, remembers what it hears, and lets
Claude Code look things up. Claude can see what the aircraft is reporting. Claude cannot
say anything to the aircraft.

```
                 USB cable or SiK radio
   Pixhawk 6C  <------------------------>  QGroundControl   (a human makes every change here)
                                                 |
                                                 |  copy of what the aircraft said
                                                 |  UDP, localhost:14445, one way
                                                 v
                                     observer (server.py)
                                     listens, remembers, never sends
                                                 |
                                                 |  MCP tools (lookups)
                                                 v
                                            Claude Code
```

MCP (Model Context Protocol) is the standard way of giving Claude Code extra tools.
Claude Code starts the observer by itself when a session opens in this folder, because
`.mcp.json` tells it to.

## Files in this folder

| File | What it is |
|---|---|
| `README.md` | This page: overview and daily use. |
| `INSTALL.md` | Rebuilding the observer from nothing on a new computer. |
| `TOOLS.md` | Every tool the observer offers, with its inputs and what comes back. |
| `TROUBLESHOOTING.md` | Symptoms, causes and fixes, including the two-sessions problem. |
| `check-observer.ps1` | Health check. Reads only. Says who holds the port and what is wrong. |
| `selftest.py` | Offline test of the decoder. Needs no aircraft, no QGC, no network. |
| `requirements.txt` | The three Python packages the observer needs, with versions. |
| `requirements-lock.txt` | Every package in the working environment, for an exact rebuild. |
| `mcp.example.json` | Template for `.mcp.json` with the paths left to fill in. |

## Daily use

1. **Props off.** Plug the Pixhawk in over USB-C. QGC connects by itself.
2. In QGC: Application Settings → MAVLink → **Enable MAVLink forwarding**, host
   `localhost:14445`. It stays on between sessions once set.
3. Open **one** Claude Code session in the project folder. Not two.
4. Ask Claude for `status`. A `MAV_TYPE_QUADROTOR` heartbeat means the link is up.
5. If `params_received` is 0, press **Refresh** in QGC's Parameters view. The USB cable
   must be in: parameters do not download over the SiK radio by themselves.
6. Claude runs `diff_live_against_file` against the baseline named in `HANDOFF.md`.
   `_HASH_CHECK` as the only live-only item is normal.

## The two checks

Run either from the project folder. Neither changes anything.

```powershell
# Is everything in place, and who holds the port?
powershell -ExecutionPolicy Bypass -File MCP-SETUP\check-observer.ps1

# Does the decoder work? (no aircraft needed)
tools\qgc-readonly-mcp\.venv\Scripts\python.exe MCP-SETUP\selftest.py
```

To watch the live link by hand, with no Claude involved (close Claude Code first, or
this becomes a second observer):

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\python.exe tools\qgc-readonly-mcp\server.py --watch
```

It prints one line every two seconds, for example
`rx=True types=25 params=1034/1034 vehicle=MAV_TYPE_QUADROTOR MAV_AUTOPILOT_PX4 mode=AUTO:LOITER armed=False`.
Ctrl+C stops it.

## Why it cannot transmit

The guarantee is in the code, not in a promise:

- The connection's `write` method is replaced with a function that raises an error.
- The network socket is wrapped so `send`, `sendto`, `sendall` and `sendmsg` raise the
  same error.

`selftest.py` checks the second of these every time it runs. Anyone who edits
`server.py` should run the self-test afterwards.

## Rules

- **The observer never transmits.** Adding any tool that sends to the aircraft needs a new
  D-number in `build-log.md` first.
- **D-21** is approved but **not built**: a `download_log` tool allowed to send exactly
  three log-request messages (MAVLink IDs 117, 119, 122). It waits on a test of whether
  QGC passes packets from the forwarding port on to the aircraft. Until then, flight logs
  come off the SD card or through QGC's Analyze → Log Download.
- **One Claude Code session per folder.** Two observers cannot share the port; the second
  one hears nothing.
- **Every change to the aircraft is made by a person in QGC**, then checked with a diff.

## How it works inside

| Part | What it does |
|---|---|
| Listener thread | One background thread receives packets and decodes them with `pymavlink`. |
| Cache | Held in memory only: the latest message of each type, a count of each type, the parameter table, the last 500 text messages from the board. Restarting the observer empties it. |
| Tools | Lookups into the cache. None of them talks to the aircraft. |
| File tools | Read and compare the `.params` text files QGC saves. These work with no aircraft connected. |

Behaviour worth knowing:

- **Parameters are overheard, not requested.** The observer knows only the values QGC
  downloaded while it was listening. That is why Refresh is sometimes needed.
- **The parameter table is emptied when the aircraft's parameter count changes.** A reboot
  after a port or airframe change adds and removes parameters.
- **QGC's own messages are ignored** (system ID 255). Otherwise QGC's heartbeat would look
  like a second, armed vehicle.
- **Whole-number parameters are rebuilt from raw bytes.** PX4 sends them packed inside a
  decimal-number field.
- **The port is checked before it is opened**, so a second observer reports an error
  instead of failing silently.

## Settings

| Setting | Where | Default | Meaning |
|---|---|---|---|
| `QGC_FWD_PORT` | `env` in `.mcp.json` | `14445` | UDP port to listen on. Must match QGC's forwarding host. |
| `QGC_FWD_HOST` | `env` in `.mcp.json` | `127.0.0.1` | Address to listen on: this computer only, since D-32 (2026-09-29). It was `0.0.0.0`, every address. Not set in this build. |
| Forwarding on/off | QGC, Application Settings → MAVLink | off | Saved as `forwardMavlink` in `%APPDATA%\QGroundControl\QGroundControl.ini`. |

## What was verified, and when

Checked on 2026-09-29, Windows 11, Python 3.12.10:

- `selftest.py`: 21 of 21 checks pass, in the working environment and in a fresh one
  built from `requirements.txt`.
- `check-observer.ps1`: runs, and correctly reported two observers and which one held
  the port.
- `--watch` starts in the fresh environment.

Not checked on 2026-09-29: the live link end to end, because a second Claude Code session
held the port. The live link was last verified against the real board on 2026-09-27
(`build-log.md`, "D-11 observer verified against the real board").

Not tested at all: macOS. See `INSTALL.md`.
