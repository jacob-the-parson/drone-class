# Installing the observer on a new computer

These steps rebuild the observer from nothing. They were run on 2026-09-29 on Windows 11
with Python 3.12.10 and produced a working environment. Run every command from the
project folder (the one that holds `CLAUDE.md`).

Everything here is free and open-source software, which is what D-09 requires.

## What you need first

| Thing | Notes |
|---|---|
| The project folder | Copied whole. `tools/qgc-readonly-mcp/server.py` is the observer. |
| Python 3.12 | From python.org. The working build uses 3.12.10. Other versions are untested. |
| QGroundControl | Already part of the build. |
| Claude Code | Already part of the build. |

Do **not** copy the `.venv` folder from another computer. It holds absolute paths to the
computer it was made on. Make a new one (step 1).

## 1. Make the Python environment

```powershell
python -m venv tools\qgc-readonly-mcp\.venv
tools\qgc-readonly-mcp\.venv\Scripts\python.exe -m pip install -r MCP-SETUP\requirements.txt
```

If a newer package version ever breaks the install, use the exact versions instead:

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\python.exe -m pip install -r MCP-SETUP\requirements-lock.txt
```

## 2. Test it without the aircraft

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\python.exe MCP-SETUP\selftest.py
```

Expect `21 passed, 0 failed`. If anything fails, stop here and read the line that failed.

## 3. Register it with Claude Code

Claude Code reads `.mcp.json` in the project folder. The paths inside it are absolute, so
they must be changed whenever the folder is on a different computer or has been moved
or renamed.

1. Copy `MCP-SETUP\mcp.example.json` to the project folder as `.mcp.json` (or edit the
   `.mcp.json` that is already there).
2. Replace `C:\\PATH\\TO\\drone-class` with the real path, in both places. Inside a JSON
   file every backslash is written twice: `C:\\Users\\name\\Desktop\\drone-class`.
3. Start Claude Code in the project folder. The first time, it asks whether to trust the
   `qgc-readonly` server. Say yes. The answer is remembered in
   `.claude\settings.local.json`.
4. Type `/mcp` in Claude Code. `qgc-readonly` should be listed as connected.

## 4. Switch on forwarding in QGroundControl

QGC → Application Settings → MAVLink → tick **Enable MAVLink forwarding**, host
`localhost:14445`. QGC remembers it.

## 5. Check the whole chain

1. Props off. Plug the Pixhawk in over USB-C and let QGC connect.
2. Run the health check:
   ```powershell
   powershell -ExecutionPolicy Bypass -File MCP-SETUP\check-observer.ps1
   ```
   Expect `Result: nothing wrong found.`
3. Ask Claude for `status`. Expect `receiving: true` and a vehicle of type
   `MAV_TYPE_QUADROTOR`.
4. Press Refresh in QGC's Parameters view, then ask Claude for `status` again. Expect
   `params_received` equal to `params_expected`.

## The flight-log tools come with it

`pyulog` installs three programs into the same environment. They read saved `.ulg` files
and have nothing to do with the live link:

```powershell
tools\qgc-readonly-mcp\.venv\Scripts\ulog_info.exe     logs\<file>.ulg
tools\qgc-readonly-mcp\.venv\Scripts\ulog_messages.exe logs\<file>.ulg
tools\qgc-readonly-mcp\.venv\Scripts\ulog_params.exe   logs\<file>.ulg
```

## macOS (the client's Intel Mac): NOT TESTED

Nothing below has been run. It is what should differ, written down so it can be tested
and corrected, not a verified procedure.

- The environment's Python is at `tools/qgc-readonly-mcp/.venv/bin/python`, not
  `.venv\Scripts\python.exe`. Make it with `python3 -m venv tools/qgc-readonly-mcp/.venv`.
- `.mcp.json` needs the Mac's own absolute paths, with forward slashes and no doubling.
- `requirements-lock.txt` skips `pywin32` on anything that is not Windows. Whether the
  remaining pinned versions all install on an Intel Mac is unknown.
- `check-observer.ps1` is Windows only. `selftest.py` should run anywhere.
- Where QGC keeps its settings file on macOS has not been looked up.

When someone does test this, record the result in `build-log.md` and correct this section.

## Removing it

Delete the `qgc-readonly` entry from `.mcp.json` and delete `tools\qgc-readonly-mcp\.venv`.
Switch off MAVLink forwarding in QGC. Nothing was ever installed on the aircraft.
