# Troubleshooting

Start with the health check. It reads only and takes a few seconds:

```powershell
powershell -ExecutionPolicy Bypass -File MCP-SETUP\check-observer.ps1
```

## Quick table

| What you see | Most likely cause | Fix |
|---|---|---|
| `status`: `bytes_seen` 0, and `recent_errors` says "UDP 14445 already bound" | A second observer is running | [Two observers](#two-observers-on-one-port) |
| `status`: `bytes_seen` 0, no errors | QGC is not forwarding, or not connected | [Nothing arrives](#nothing-arrives-and-there-is-no-error) |
| `status`: data arrives, `params_received` 0 | The observer started after QGC's download | Press Refresh in QGC's Parameters view, USB cable in |
| `params_received` lower than `params_expected` | Download interrupted, or running over the SiK radio | Plug in USB, press Refresh |
| A diff shows hundreds of `only_in_file` lines | The cache is incomplete, not the aircraft | Press Refresh, run the diff again |
| A diff shows `_HASH_CHECK` under `only_live` | Normal | Nothing |
| `status` shows `MAV_TYPE_GCS`, or armed with no aircraft | QGC's own heartbeat got through | Should not happen; run `selftest.py`, check 2 |
| `autopilot_version` says "not seen yet" | QGC asked for it before the observer was listening | Unplug and replug the Pixhawk's USB |
| Claude Code does not list `qgc-readonly` | Paths in `.mcp.json` are wrong, or the server was not approved | [Server does not start](#the-server-does-not-start) |
| Values look old | The cache only updates when QGC downloads again | Press Refresh |

## Two observers on one port

**What happens.** Only one program can receive on UDP 14445. The observer that started
first keeps the port. Any later one reports an error every two seconds and hears nothing.
Each Claude Code session in this folder starts its own observer, so two sessions means
two observers.

**How to tell.** `status` shows this in `recent_errors`:

```
UDP 14445 already bound by another process, probably an observer from another
Claude Code session in this folder. Close that session.
```

`check-observer.ps1` names both, with start times, and says which one holds the port:

```
[..] observer started 11:52:56, launched by claude.exe (PID 12240): HOLDS THE PORT
[..] observer started 12:02:29, launched by claude.exe (PID 17592): starved, receives nothing
```

**Fix.**

1. Decide which Claude Code session you are keeping.
2. Close the other one.
3. If the one you kept was the starved one, it recovers by itself: it retries every two
   seconds and takes the port as soon as it is free. Its cache starts empty, so press
   Refresh in QGC afterwards.

**If you cannot close the other session yet.** The starved session still has the file
tools (`list_params_files`, `read_params_file`, `diff_params_files`) and the flight-log
tools. Only the live tools are blind. Do not end the other session's Python process from
Task Manager to free the port: that session would lose its observer without knowing why.

**Why each observer shows as two Python processes.** On Windows the environment's
`python.exe` is a small launcher that starts the real Python as a child. One observer,
two processes. The health check counts them correctly.

## Nothing arrives and there is no error

Work down the chain:

1. **Is QGC running and connected to the aircraft?** QGC's own Fly view should show the
   vehicle. If QGC cannot see it, the observer cannot either.
2. **Is forwarding on?** QGC → Application Settings → MAVLink → Enable MAVLink
   forwarding, host `localhost:14445`.
3. **Do the ports match?** The host in QGC must end in the same number as `QGC_FWD_PORT`
   in `.mcp.json`. Both are 14445 in this build.
4. **Did forwarding get switched on after QGC connected?** Unplug and replug the
   Pixhawk's USB so QGC reconnects.
5. **Is a firewall prompt waiting?** The first time Python listens on a port, Windows may
   ask for permission. Traffic from QGC on the same computer normally arrives either way.
   If it does not, allow Python on private networks.

## The server does not start

1. Type `/mcp` in Claude Code and read what it says about `qgc-readonly`.
2. Run the health check. Section 2 tests every path in `.mcp.json`.
3. **Was the folder moved or renamed?** `.mcp.json` and the environment both hold
   absolute paths. Fix `.mcp.json` (see `mcp.example.json`) and rebuild the environment
   (`INSTALL.md`, step 1). OneDrive changing the Desktop path counts as a move.
4. Try it by hand, with Claude Code closed:
   ```powershell
   tools\qgc-readonly-mcp\.venv\Scripts\python.exe tools\qgc-readonly-mcp\server.py --watch
   ```
   An error about a missing module means the environment is incomplete: `INSTALL.md`,
   step 1.

## Parameters and the SiK radio

With the battery in and the ground radio on the laptop, QGC connects over the radio and
the observer hears telemetry. Parameters do not download over that link by themselves.
For anything involving parameters, plug in the USB cable first, then press Refresh.

## After changing `server.py`

1. Run `selftest.py`. All 21 checks must pass, including the four that prove the socket
   refuses to send.
2. Restart Claude Code so it starts the new version.
3. If the change added any way of sending to the aircraft, it needed a D-number before
   it was written.

## Known problems already met (from `build-log.md` and `HANDOFF.md`)

| Date | What went wrong | Lesson |
|---|---|---|
| 2026-09-27 | Observer started after QGC had connected; no parameters, no version. | Replug USB or press Refresh. |
| 2026-09-27 | Two sessions, one starved silently. Cost twenty minutes. | The port check was added; one session per folder. |
| 2026-09-28 | After a reconnect the cache held only two freshly written values; the diff was partial. | Check `live_cached` against `file_count` before trusting a diff. |
| 2026-09-28 | A snapshot was saved into the wrong place under the wrong date. | QGC's save dialog opens where it was last pointed. Check `params/` after saving. |
| 2026-09-29 | Two sessions again; the second session's live tools were blind. | `check-observer.ps1` now names both sessions. |
