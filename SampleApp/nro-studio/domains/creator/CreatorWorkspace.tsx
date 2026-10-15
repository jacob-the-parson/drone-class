// CreatorWorkspace — THE EON CHARACTER CREATOR viewport (nro-three seed,
// re-expressed in the studio chrome). The golden bodies load from the served
// asset library; regions recolor LIVE through the baked ID map (distance-mask
// lookup — shader-pipeline tier 2: same regions.body.json + idmap the Blender
// side uses), 2-band toon ramp + inverted-hull ink outline. Render loop reads
// the store via getState() — zero React re-renders per frame.
'use client';
import { useEffect, useRef } from 'react';
import { PersonStanding } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useCreatorStore, type CreatorGender } from '@/stores/domains/creatorStore';

export function CreatorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  // badges/status only — the scene reads getState() in its loop
  const gender = useCreatorStore((s) => s.gender);
  const turntable = useCreatorStore((s) => s.turntable);
  const outline = useCreatorStore((s) => s.outline);
  const loadState = useCreatorStore((s) => s.loadState);
  const statusText = useCreatorStore((s) => s.statusText);
  const regions = useCreatorStore((s) => s.regions);
  const loadManifest = useCreatorStore((s) => s.loadManifest);
  const setLoadState = useCreatorStore((s) => s.setLoadState);
  const setExporter = useCreatorStore((s) => s.setExporter);

  useEffect(() => {
    loadManifest();
  }, [loadManifest]);

  // build the scene once the manifest is in (shader compiles N from it)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || regions.length === 0) return;

    const { maskRadius } = useCreatorStore.getState();
    const N = regions.length;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
    camera.position.set(0.9, 1.5, 2.6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.9, 0);
    controls.enableDamping = true;

    // stage: soft ground disc + faint ring (showroom vibes, theme-neutral)
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(1.6, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x808894, transparent: true, opacity: 0.18 }),
    );
    scene.add(ground);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.56, 1.6, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x808894, transparent: true, opacity: 0.4 }),
    );
    ring.position.y = 0.001;
    scene.add(ring);

    // ---- the seed's region-color toon material, verbatim math ----
    const uKeys = regions.map((r) => new THREE.Vector3(...r.key));
    const uCols = regions.map((r) => new THREE.Color().setRGB(...r.display, THREE.SRGBColorSpace));

    const toonMat = new THREE.ShaderMaterial({
      uniforms: {
        uIdMap: { value: null },
        uKeys: { value: uKeys },
        uCols: { value: uCols },
        uLightDir: { value: new THREE.Vector3(0.45, 0.85, 0.55).normalize() },
        uShadowTint: { value: new THREE.Color().setRGB(0.5, 0.47, 0.5, THREE.SRGBColorSpace) },
        uSplit: { value: 0.45 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNw;
        void main() {
          vUv = uv;
          vNw = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        #define N ${N}
        uniform sampler2D uIdMap;
        uniform vec3 uKeys[N];
        uniform vec3 uCols[N];
        uniform vec3 uLightDir;
        uniform vec3 uShadowTint;
        uniform float uSplit;
        varying vec2 vUv;
        varying vec3 vNw;
        void main() {
          vec3 id = texture2D(uIdMap, vUv).rgb;
          vec3 base = vec3(0.78);
          for (int i = 0; i < N; i++) {
            if (distance(id, uKeys[i]) < ${maskRadius.toFixed(3)}) { base = uCols[i]; break; }
          }
          float ndl = max(dot(normalize(vNw), uLightDir), 0.0);
          vec3 shade = mix(uShadowTint, vec3(1.0), step(uSplit, ndl));
          gl_FragColor = vec4(base * shade, 1.0);
          #include <colorspace_fragment>
        }`,
    });

    const outlineMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: /* glsl */ `
        void main() {
          vec3 p = position + normal * 0.008;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `void main(){ gl_FragColor = vec4(0.02, 0.02, 0.03, 1.0); }`,
    });

    // ---- per-gender unit loading (both cached) ----
    const loader = new GLTFLoader();
    const texLoader = new THREE.TextureLoader();
    const units: Partial<Record<CreatorGender, THREE.Group>> = {};
    const idMaps: Partial<Record<CreatorGender, THREE.Texture>> = {};
    const outlineHulls: THREE.Mesh[] = [];

    const loadIdMap = (g: CreatorGender) => {
      const t = texLoader.load(`/assets/entities/humanoids/idmap.body_${g}_stylized.single.png`);
      // the single-tile idmaps store the keys sRGB-ENCODED (verified: pixel at the
      // nose == sRGB(1/3, 2/3, 1/3)) — declare sRGB so the GPU decodes back to the
      // linear thirds the manifest keys use. NoColorSpace here scrambles regions.
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = t.magFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.flipY = false; // glTF-space UVs
      return t;
    };

    async function loadUnit(g: CreatorGender): Promise<THREE.Group> {
      const cached = units[g];
      if (cached) return cached;
      const gltf = await loader.loadAsync(`/assets/entities/humanoids/body_${g}_stylized.glb`);
      const group = new THREE.Group();
      idMaps[g] = loadIdMap(g);
      gltf.scene.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        if (node.name.includes('eye')) {
          const eye = node.clone();
          eye.material = new THREE.MeshBasicMaterial({ vertexColors: true });
          group.add(eye);
        } else {
          const m = node.clone();
          m.material = toonMat;
          group.add(m);
          const hull = new THREE.Mesh(m.geometry, outlineMat);
          hull.position.copy(m.position);
          hull.quaternion.copy(m.quaternion);
          hull.scale.copy(m.scale);
          outlineHulls.push(hull);
          group.add(hull);
        }
      });
      units[g] = group;
      return group;
    }

    let disposed = false;
    let current: THREE.Group | null = null;
    let shownGender: CreatorGender | null = null;

    async function show(g: CreatorGender) {
      setLoadState('loading', `loading ${g}…`);
      try {
        const unit = await loadUnit(g);
        if (disposed) return;
        if (current) scene.remove(current);
        current = unit;
        shownGender = g;
        toonMat.uniforms.uIdMap.value = idMaps[g] ?? null;
        scene.add(unit);
        setLoadState('ready', `${g} · ${N} regions · drag to orbit`);
      } catch {
        if (!disposed) setLoadState('error', `failed to load ${g} body`);
      }
    }
    show(useCreatorStore.getState().gender);

    // frame capture for the footer Vault keycap (render-then-read, same frame)
    setExporter(async () => {
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      return fetch(dataUrl).then((r) => r.blob());
    });

    // ---- render loop: store -> uniforms, every frame, zero React ----
    const hexCache: string[] = regions.map(() => '');
    const baseCols = regions.map((r) => new THREE.Color().setRGB(...r.display, THREE.SRGBColorSpace));
    const clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
      const state = useCreatorStore.getState();

      if (shownGender && state.gender !== shownGender && state.loadState !== 'loading') {
        show(state.gender);
      }
      if (state.turntable && current) current.rotation.y += 0.004;

      for (let i = 0; i < regions.length; i++) {
        const hex = state.colors[regions[i].name];
        if (hex && hex !== hexCache[i]) {
          hexCache[i] = hex;
          baseCols[i].setStyle(hex, THREE.SRGBColorSpace);
        }
        uCols[i].copy(baseCols[i]);
      }
      // active region gets a soft breathing highlight
      if (state.activeRegion) {
        const idx = regions.findIndex((r) => r.name === state.activeRegion);
        if (idx >= 0) {
          const pulse = 0.18 + 0.12 * Math.sin(clock.getElapsedTime() * 4);
          uCols[idx].lerp(new THREE.Color(1, 1, 1), pulse);
        }
      }
      for (const hull of outlineHulls) hull.visible = state.outline;

      controls.update();
      renderer.render(scene, camera);
    });

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    observer.observe(container);

    return () => {
      disposed = true;
      setExporter(null);
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      toonMat.dispose();
      outlineMat.dispose();
      Object.values(idMaps).forEach((t) => t?.dispose());
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regions, setExporter, setLoadState]);

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      {/* workspace header — identity · live state · status */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <PersonStanding size={16} className="text-cyan-600 dark:text-cyan-400" />
          <span className="font-semibold text-ink">Character Creator</span>
          <span className="uppercase text-ink-muted">{gender}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          <span className={turntable ? 'text-cyan-600 dark:text-cyan-400' : 'opacity-40'}>Spin</span>
          <span className={outline ? 'text-cyan-600 dark:text-cyan-400' : 'opacity-40'}>Ink</span>
        </div>
        <div className="truncate text-right text-ink-muted">
          {loadState === 'error' ? <span className="text-red-500">{statusText}</span> : statusText || 'drag to orbit · scroll to zoom'}
        </div>
      </div>

      {/* the stage */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-edge bg-surface-sunken/60">
        {loadState === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-ink-muted">
            {statusText}
          </div>
        )}
      </div>
    </div>
  );
}
