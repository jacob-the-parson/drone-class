# Tool reference

Twelve tools. Eight read the live cache, four read `.params` files on disk. None sends
anything to the aircraft. In Claude Code they appear as `mcp__qgc-readonly__<name>`.

"Live" tools only know what the observer has heard since it started. An empty answer
usually means "not heard yet", not "not there".

## Live tools

| Tool | Inputs | Gives back |
|---|---|---|
| `status` | none | Is data arriving, vehicle type, armed or not, flight mode, how many parameters are cached, the last three errors. **Start here.** |
| `autopilot_version` | none | Firmware version, git hash (QGC's "Custom FW Ver"), board and vendor IDs, board UID. |
| `params` | `prefix` (text, default all), `limit` (default 300) | Cached parameters whose names start with `prefix`. Not case sensitive. |
| `param` | `name` | One parameter by exact name. |
| `messages` | `n` (default 50), `min_severity` (default 7) | The board's recent text messages, such as "Armed by Stick gesture". |
| `sensors` | none | Each sensor present / enabled / healthy, GPS fix and satellites, battery, estimator flags. |
| `traffic` | none | Every message type heard, with count, rate in Hz and age. |
| `latest` | `msg_type` | The raw fields of the newest message of one type, e.g. `ATTITUDE`, `RC_CHANNELS`. |

### Severity numbers for `messages`

Lower is more serious. `min_severity=4` returns warnings and worse.

| 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|
| Emergency | Alert | Critical | Error | Warning | Notice | Info | Debug |

### Reading `status`

| Field | Meaning |
|---|---|
| `receiving` | `true` if a packet arrived in the last 5 seconds. |
| `bytes_seen` | Zero with QGC connected means the link is broken. See `TROUBLESHOOTING.md`. |
| `params_received` / `params_expected` | Equal means the table is complete. 0 means press Refresh in QGC. |
| `recent_errors` | Look here first when nothing arrives. |
| `vehicle.type` | `MAV_TYPE_QUADROTOR` for this aircraft. |
| `vehicle.armed` | `true` means the motors are live. |
| `vehicle.mode.name` | PX4 flight mode. `AUTO:LOITER` is what QGC calls "Hold". |

## File tools

These work with no aircraft and no QGC. Paths may be relative to the project folder.

| Tool | Inputs | Gives back |
|---|---|---|
| `list_params_files` | `folder` | The `.params` files in a folder, newest first. |
| `read_params_file` | `path`, `prefix` (optional) | The contents of one file, optionally filtered by name. |
| `diff_params_files` | `path_a`, `path_b` | What changed between two saved files. |
| `diff_live_against_file` | `path` | What differs between the aircraft now and a saved file. |

### Reading a diff

| Field | Meaning |
|---|---|
| `changed` | Same parameter, different value. Every line here needs an explanation in `build-log.md`. |
| `only_in_file` | In the saved file, not in the live cache. |
| `only_live` | On the aircraft, not in the file. `_HASH_CHECK` alone is normal: PX4 never saves it. |
| `live_cached` | How many live parameters were compared. **If this is far below `file_count`, the cache is incomplete and the diff cannot be trusted.** Press Refresh in QGC and run it again. |

## Things to ask Claude

| You want to know | Claude uses |
|---|---|
| "Is the link up?" | `status` |
| "Has anything changed since the baseline?" | `diff_live_against_file` with the file named in `HANDOFF.md` |
| "What is `COM_LOW_BAT_ACT` set to?" | `param` |
| "Show me all the battery settings." | `params` with prefix `BAT` |
| "Why will it not arm?" | `messages`, then `sensors` |
| "Is the GPS good enough to fly?" | `sensors` |
| "Which switch position is the radio sending?" | `latest` with `RC_CHANNELS` |
| "What did the power session change?" | `diff_params_files` on the two dated snapshots |
| "Which firmware is on the board?" | `autopilot_version` |

## What the tools cannot do

- Change a parameter, arm, disarm, change mode, or send any command.
- Ask the aircraft for anything. They wait to overhear it.
- Download flight logs (D-21 is approved but not built).
- Remember anything after the observer restarts. The cache is in memory only.
