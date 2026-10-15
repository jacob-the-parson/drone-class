// Checks for the Pi screen and the bridge (D-37, D-38). No Pi and no aircraft: the
// bridge runs here with made-up sensors, and the autopilot is the stand-in, which is
// NOT PX4.
//
//   node scripts/verify-pi.mjs
//
// Four parts: the app's own pieces (addresses, readings, the practice data); the
// app's list of modules against the bridge's; the app's client against a made-up
// bridge on this computer; and the Pi side's own suites, stage by stage
// (pi/run-tests.py). The last two need a Python with pymavlink, and are skipped,
// saying so, without one.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { onPi, piAddress } from '../lib/pi/address.ts';
import { PI_CATALOG } from '../lib/pi/catalog.ts';
import { PiClient } from '../lib/pi/client.ts';
import { bearingWords, measuredLine, nearest, radarPoints, sectorCounts } from '../lib/pi/view.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
let passed = 0;
let failed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) passed++;
  else {
    failed++;
    console.log(`  FAIL ${name}${detail ? `: ${detail}` : ''}`);
  }
};
const eq = (name, got, want) => ok(name, got === want, `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ addresses
{
  const o = (t) => {
    const a = piAddress(t);
    return 'error' in a ? `error` : a.origin;
  };
  eq('address: a private address, with the bridge\'s port', o('192.168.0.130'), 'http://192.168.0.130:8765');
  eq('address: with a port', o('192.168.0.130:9000'), 'http://192.168.0.130:9000');
  eq('address: with http://', o('http://10.1.2.3/'), 'http://10.1.2.3:8765');
  eq('address: a .local name', o('Drone-Pi-Student.local'), 'http://drone-pi-student.local:8765');
  eq('address: 172.16 to 172.31', `${o('172.16.0.1')} ${o('172.31.255.1')} ${o('172.32.0.1')}`, 'http://172.16.0.1:8765 http://172.31.255.1:8765 error');
  eq('address: the HM30\'s network', o('192.168.144.25'), 'http://192.168.144.25:8765');
  for (const bad of ['8.8.8.8', 'example.com', 'https://192.168.0.130', '192.168.0.130/api', '999.1.1.1', '192.168.0.130:99999', '', 'pi.local.evil.com', 'file:///etc/passwd']) {
    ok(`address: refused: ${JSON.stringify(bad)}`, 'error' in piAddress(bad), o(bad));
  }
  ok('address: onPi matches the origin and its paths only', onPi('http://10.0.0.5:8765/api/v1/hello', 'http://10.0.0.5:8765') && !onPi('http://10.0.0.5:87650/', 'http://10.0.0.5:8765') && !onPi('http://10.0.0.5:8765.evil/', 'http://10.0.0.5:8765'));
}

// ------------------------------------------------------------ readings
{
  const scan = { angles: [0, 90, 180, -90, 45], ranges_m: [2.5, 0, 1.5, 2.0, 0.8], hz: 10, points: 5, made_up: true, mount_measured: true, max_range_m: 16 };
  eq('nearest: the nearest return, skipping no-return', JSON.stringify(nearest(scan)), JSON.stringify({ distance_m: 0.8, bearing_deg: 45 }));
  eq('bearing words', [0, 2, 12, -30, 179, -178].map(bearingWords).join('|'), 'ahead|ahead|12° right|30° left|behind|behind');
  const pts = radarPoints(scan, 3);
  ok('radar: right is +x, forward is +y', pts.some((p) => Math.abs(p.y - 2.5) < 1e-9 && Math.abs(p.x) < 1e-9) && pts.some((p) => Math.abs(p.x + 2.0) < 1e-9));
  eq('radar: only what is within the range shown', pts.length, 4);
  eq('sectors counted', JSON.stringify(sectorCounts({ distances_cm: [100, 1601, 65535, 200], increment_deg: 5, min_cm: 5, max_cm: 1600 })), JSON.stringify({ obstacle: 2, clear: 1, unknown: 1 }));
  eq('measured line', measuredLine([{ label: 'person', score: 0.8, bearing_deg: 20, distance_m: 2.53 }]), 'person, 20° right, 2.5 m');
  eq('measured line: too far for the LiDAR', measuredLine([{ label: 'dog', score: 0.6, bearing_deg: -5, distance_m: null }]), 'dog, 5° left, too far for the LiDAR');
}

// ------------------------------------------------------------ the practice data
{
  const text = readFileSync(join(ROOT, 'public', 'data', 'practice-pi.json'), 'utf8');
  const doc = JSON.parse(text);
  eq('practice: its schema', doc.schema, 'flight-companion/practice-pi@1');
  ok('practice: says it is made up', /made-up/i.test(doc.about) && /No real room/.test(doc.about));
  ok('practice: frames, each a whole scan', doc.frames.length > 50 && doc.frames.every((f) => f.ranges_cm.length === doc.angles_deg.length));
  ok('practice: the person is found, and measured, in most frames', doc.frames.filter((f) => f.measure.some((m) => m.label === 'person' && m.distance_m !== null)).length > doc.frames.length * 0.6);
  ok('practice: no position and no path of this computer', !/47\.39|8\.54|Users|OneDrive/.test(text));
}

// ------------------------------------------------------------ the assistant cannot start anything
{
  const tools = readFileSync(join(ROOT, 'lib', 'assistant', 'tools.ts'), 'utf8');
  ok('assistant: its tools reach no Pi', !/fetch\(|PiClient|startModule|stopModule|\/start|EventSource/.test(tools));
  const store = readFileSync(join(ROOT, 'stores', 'domains', 'piStore.ts'), 'utf8');
  ok('pi store: it makes no MAVLink and opens no socket', !/mavlink|dgram|WebSocket|node:/.test(store));
}

// ------------------------------------------------------------ Python
const python = [process.env.FC_PI_PYTHON, join(ROOT, '..', 'tools', 'qgc-readonly-mcp', '.venv', 'Scripts', 'python.exe'), join(ROOT, 'mcp', 'observer', '.venv', 'Scripts', 'python.exe'), join(ROOT, 'mcp', 'observer', '.venv', 'bin', 'python')]
  .filter(Boolean)
  .find((p) => existsSync(p) && spawnSync(p, ['-c', 'import pymavlink'], { encoding: 'utf8' }).status === 0);

if (!python) {
  console.log('  skipped: the bridge and the stage suites (no Python with pymavlink was found)');
} else {
  // the app's list against the bridge's
  {
    const r = spawnSync(python, ['-c', 'import sys, json; sys.path.insert(0, "pi"); from fcpi.modules import CATALOG; print(json.dumps([{"id": k, **{x: v[x] for x in ("name", "level", "stage", "uses")}, "talks": bool(v.get("talks"))} for k, v in CATALOG.items()]))'], { cwd: ROOT, encoding: 'utf8' });
    const theirs = JSON.parse(r.stdout || '[]');
    const mine = PI_CATALOG.map((c) => ({ id: c.id, name: c.name, level: c.level, stage: c.stage, uses: c.uses, talks: !!c.talks }));
    eq('catalog: the app lists what the bridge offers, the same', JSON.stringify(mine), JSON.stringify(theirs));
  }

  // the app's client against a made-up bridge on this computer
  {
    const port = await new Promise((resolve) => {
      const s = createServer();
      s.listen(0, '127.0.0.1', () => {
        const p = s.address().port;
        s.close(() => resolve(p));
      });
    });
    const cfgFile = join(ROOT, 'pi', 'tests', `.verify-pi-${port}.json`);
    const { writeFileSync, rmSync } = await import('node:fs');
    writeFileSync(cfgFile, JSON.stringify({ level: 'student', token: 'verify-token' }));
    const bridge = spawn(python, [join(ROOT, 'pi', 'bridge.py'), '--made-up', '--host', '127.0.0.1', '--port', String(port)], { env: { ...process.env, FC_PI_CONFIG: cfgFile }, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let said = '';
    bridge.stdout.on('data', (c) => (said += c));
    for (let i = 0; i < 50 && !said.includes('token:'); i++) await wait(100);
    try {
      ok('bridge: it starts with made-up sensors and prints a token', /MADE-UP/.test(said) && /token: verify-token/.test(said), said);
      const c = new PiClient(`http://127.0.0.1:${port}`, 'verify-token');
      const hello = await c.hello();
      eq('client: hello', `${hello.app} ${hello.level} ${hello.made_up}`, 'flight-companion-pi student true');
      ok('client: the settings it is shown hold no token', !JSON.stringify(hello).includes('verify-token'));
      const inv = await c.inventory();
      ok('client: the inventory', typeof inv.host === 'string' && 'packages' in inv);
      const mods = await c.modules();
      eq('client: the modules', mods.modules.length, PI_CATALOG.length);
      const no = await new PiClient(`http://127.0.0.1:${port}`, 'wrong').start('lidar').catch((e) => e);
      eq('client: a wrong token is refused, in words', no.status, 401);
      const gated = await c.start('obstacles').catch((e) => e);
      ok('client: the student level cannot start stage B', gated.status === 403 && /instructor/.test(gated.message), gated.message);
      eq('client: start', (await c.start('look-and-measure')).ok, true);
      // the event stream, read by hand: Node has no EventSource
      const r = await fetch(`http://127.0.0.1:${port}/api/v1/events`, { headers: { Origin: 'http://localhost:3000' } });
      const reader = r.body.getReader();
      const kinds = new Set();
      let buf = '';
      const end = Date.now() + 2500;
      while (Date.now() < end && !(kinds.has('scan') && kinds.has('measure'))) {
        const { value, done } = await Promise.race([reader.read(), wait(500).then(() => ({ value: null, done: false }))]);
        if (done) break;
        if (value) buf += new TextDecoder().decode(value);
        for (const m of buf.matchAll(/event: (\w+)\n/g)) kinds.add(m[1]);
      }
      await reader.cancel().catch(() => undefined);
      ok('client: the stream brings the scan and the measurements', kinds.has('scan') && kinds.has('measure'), [...kinds].join());
      eq('client: stop', (await c.stop('look-and-measure')).ok, true);
      eq('client: stop all', (await c.stopAll()).ok, true);
    } catch (e) {
      failed++;
      console.log(`  FAIL the client check stopped: ${e?.message ?? e}`);
    } finally {
      bridge.kill();
      rmSync(cfgFile, { force: true });
    }
  }

  // the Pi side's own suites, a line per stage
  {
    const r = spawnSync(python, [join(ROOT, 'pi', 'run-tests.py')], { cwd: join(ROOT, 'pi'), encoding: 'utf8', timeout: 300000 });
    const lines = (r.stdout ?? '').trim().split(/\r?\n/);
    for (const line of lines.filter((l) => /^(PASS|FAIL) /.test(l))) {
      ok(`pi/run-tests.py ${line.replace(/^(PASS|FAIL)\s+/, '')}`, line.startsWith('PASS'), lines.join('\n'));
      console.log(`  ${line}`);
    }
    ok('pi/run-tests.py: all four suites ran', lines.filter((l) => /^(PASS|FAIL) /.test(l)).length === 4, (r.stdout || r.stderr || '').slice(-400));
  }
}

console.log(`\npi: ${passed} checks passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
