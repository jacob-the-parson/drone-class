// creatorBlender — pushes the creator's live palette into Blender as a real
// SYNC (shader-pipeline TIER 3, recipe-canonical): if the per-gender body
// material doesn't exist or its region set drifted, the pushed bpy REBUILDS it
// from the canonical manifest (ported from toon_skin_idcolor.py's build(),
// same node graph: masks → colors → mix chain → toon ramp → toggle output);
// otherwise it fast-updates the `COLOR: <region>` nodes. The body ID maps load
// from the shader library next to the open playground .blend.
import { useCreatorStore } from '@/stores/domains/creatorStore';
import { useBlenderStore } from '@/stores/services/blenderStore';

export const blenderMaterialFor = (gender: string) => `eon.skin.toon.idcolor.body_${gender}_stylized`;

/** sRGB hex -> linear floats (Blender RGB nodes hold linear values). */
function hexToLinear(hex: string): [number, number, number] {
  const s = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return s.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))) as [
    number,
    number,
    number,
  ];
}

export async function pushPaletteToBlender(): Promise<{ ok: boolean; message: string }> {
  const { regions, colors, gender, maskRadius } = useCreatorStore.getState();
  const { execute } = useBlenderStore.getState();
  if (regions.length === 0) return { ok: false, message: 'regions not loaded yet' };

  const matName = blenderMaterialFor(gender);
  // [{n: name, k: idmap key rgb, c: current palette linear rgb}]
  const regionData = regions.map((r) => ({
    n: r.name,
    k: r.key,
    c: hexToLinear(colors[r.name] ?? '#cccccc'),
  }));

  const code = `
import bpy, os, json
REG = json.loads(${JSON.stringify(JSON.stringify(regionData))})
MAT = ${JSON.stringify(matName)}
GENDER = ${JSON.stringify(gender)}
RADIUS = ${maskRadius.toFixed(3)}
IDMAP_NAME = f"idmap.body_{GENDER}_stylized.single"

def idmap_image():
    img = bpy.data.images.get(IDMAP_NAME)
    if not img:
        path = os.path.normpath(os.path.join(bpy.path.abspath('//'), '..', 'shaders', 'entity', IDMAP_NAME + '.png'))
        if not os.path.exists(path):
            return None, path
        img = bpy.data.images.load(path)
        img.name = IDMAP_NAME
    # the single-tile idmaps store keys sRGB-ENCODED — let Blender decode them
    # back to the linear thirds the mask keys expect ('Non-Color' scrambles regions)
    img.colorspace_settings.name = 'sRGB'
    return img, None

def build(m):
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    Lk = nt.links.new
    def frame(label, x, y):
        f = nt.nodes.new('NodeFrame'); f.label = label; f.location = (x, y); return f
    f_in   = frame('1. INPUT: ID MAP', -2048, 200)
    f_mask = frame('2. REGION MASKS', -1598, 650)
    f_col  = frame('3. REGION COLORS (pushed from the studio)', -1598, -90)
    f_mix  = frame('4. COMBINE', -878, 510)
    f_toon = frame('5. TOON SHADE', -458, -300)
    f_out  = frame('6. TOGGLE + OUTPUT', 302, 450)

    img, missing = idmap_image()
    if img is None:
        return 'idmap missing: ' + missing
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.parent = f_in; tex.location = (30, -39)
    tex.label = 'ID MAP'; tex.image = img; tex.interpolation = 'Closest'
    # the single-tile idmaps are baked against the 'uv.single' layer — pin it
    uvn = nt.nodes.new('ShaderNodeUVMap'); uvn.parent = f_in; uvn.location = (-170, -39)
    uvn.uv_map = 'uv.single'
    Lk(uvn.outputs['UV'], tex.inputs['Vector'])
    fallback = nt.nodes.new('ShaderNodeRGB'); fallback.parent = f_in; fallback.location = (30, -289)
    fallback.label = 'DEFAULT / fallback'; fallback.outputs[0].default_value = (0.78, 0.78, 0.78, 1)

    prev = fallback.outputs['Color']
    for i, r in enumerate(REG):
        y = -39 - 150 * i
        k = nt.nodes.new('ShaderNodeRGB'); k.parent = f_mask; k.location = (30, y)
        k.label = 'key:' + r['n']; k.outputs[0].default_value = (*r['k'], 1)
        d = nt.nodes.new('ShaderNodeVectorMath'); d.parent = f_mask; d.location = (250, y - 40)
        d.label = 'dist ' + r['n']; d.operation = 'DISTANCE'
        lt = nt.nodes.new('ShaderNodeMath'); lt.parent = f_mask; lt.location = (430, y - 40)
        lt.label = '=' + r['n'] + '?'; lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = RADIUS
        c = nt.nodes.new('ShaderNodeRGB'); c.parent = f_col; c.location = (30, -39 - 95 * i)
        c.label = 'COLOR: ' + r['n']; c.outputs[0].default_value = (*r['c'], 1)
        mx = nt.nodes.new('ShaderNodeMix'); mx.parent = f_mix; mx.location = (30, y)
        mx.label = 'put ' + r['n']; mx.data_type = 'RGBA'
        Lk(tex.outputs['Color'], d.inputs[0]); Lk(k.outputs['Color'], d.inputs[1])
        Lk(d.outputs['Value'], lt.inputs[0])
        Lk(lt.outputs['Value'], mx.inputs['Factor'])
        Lk(prev, mx.inputs['A']); Lk(c.outputs['Color'], mx.inputs['B'])
        prev = mx.outputs['Result']

    diff = nt.nodes.new('ShaderNodeBsdfDiffuse'); diff.parent = f_toon; diff.location = (30, -249)
    s2rgb = nt.nodes.new('ShaderNodeShaderToRGB'); s2rgb.parent = f_toon; s2rgb.location = (210, -249)
    ramp = nt.nodes.new('ShaderNodeValToRGB'); ramp.parent = f_toon; ramp.location = (390, -249)
    cr = ramp.color_ramp; cr.interpolation = 'CONSTANT'
    cr.elements[0].position = 0.0; cr.elements[0].color = (0.5, 0.47, 0.5, 1)
    cr.elements[1].position = 0.45; cr.elements[1].color = (1, 1, 1, 1)
    mul = nt.nodes.new('ShaderNodeVectorMath'); mul.parent = f_toon; mul.location = (640, -39)
    mul.operation = 'MULTIPLY'
    em_toon = nt.nodes.new('ShaderNodeEmission'); em_toon.parent = f_toon; em_toon.location = (820, -39)
    em_flat = nt.nodes.new('ShaderNodeEmission'); em_flat.parent = f_out; em_flat.location = (30, -239)
    tog = nt.nodes.new('ShaderNodeValue'); tog.parent = f_out; tog.location = (30, -39)
    tog.label = 'TOON_TOGGLE 0=flat 1=toon'; tog.outputs[0].default_value = 1.0
    mix = nt.nodes.new('ShaderNodeMixShader'); mix.parent = f_out; mix.location = (290, -139)
    out = nt.nodes.new('ShaderNodeOutputMaterial'); out.parent = f_out; out.location = (490, -139)
    Lk(diff.outputs['BSDF'], s2rgb.inputs['Shader'])
    Lk(s2rgb.outputs['Color'], ramp.inputs['Fac'])
    Lk(prev, mul.inputs[0]); Lk(ramp.outputs['Color'], mul.inputs[1])
    Lk(mul.outputs['Vector'], em_toon.inputs['Color'])
    Lk(prev, em_flat.inputs['Color'])
    Lk(tog.outputs['Value'], mix.inputs['Fac'])
    Lk(em_flat.outputs['Emission'], mix.inputs[1])
    Lk(em_toon.outputs['Emission'], mix.inputs[2])
    Lk(mix.outputs['Shader'], out.inputs['Surface'])
    m.use_fake_user = True
    return None

m = bpy.data.materials.get(MAT)
wanted = set('COLOR: ' + r['n'] for r in REG)
have = set(n.label for n in m.node_tree.nodes if n.label.startswith('COLOR: ')) if (m and m.use_nodes) else set()

if m is None or have != wanted:
    if m is None:
        m = bpy.data.materials.new(MAT)
    err = build(m)
    if err:
        result = {"ok": False, "error": err}
    else:
        result = {"ok": True, "mode": "rebuilt", "regions": len(REG), "material": MAT}
else:
    pal = {r['n']: r['c'] for r in REG}
    matched = 0
    for n in m.node_tree.nodes:
        if n.label.startswith('COLOR: '):
            rn = n.label[7:]
            if rn in pal:
                n.outputs[0].default_value = (*pal[rn], 1.0)
                matched += 1
    result = {"ok": True, "mode": "updated", "regions": matched, "material": MAT}
`;

  const res = await execute(code, true);
  if (!res.ok) return { ok: false, message: res.error ?? 'relay error' };
  const r = res.result as { ok?: boolean; mode?: string; regions?: number; material?: string; error?: string };
  if (!r?.ok) return { ok: false, message: r?.error ?? 'Blender-side error' };
  return {
    ok: true,
    message:
      r.mode === 'rebuilt'
        ? `built ${r.material} with ${r.regions} regions — assign it to the ${gender} body mesh (EEVEE Rendered)`
        : `updated ${r.regions} regions on ${r.material}`,
  };
}
