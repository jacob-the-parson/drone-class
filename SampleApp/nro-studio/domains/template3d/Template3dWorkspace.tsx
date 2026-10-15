// Template3dWorkspace — the 3D TECH SAMPLE (an explainer, not an app).
// Demonstrates, live: a vanilla three.js r184 viewport inside a springing
// island (ResizeObserver-driven), OrbitControls, and store-driven chrome —
// the footer Spin/Wire keycaps and the right-drawer Regions page command the
// scene with zero props. The render loop reads the store via getState(): no
// React re-render per frame (the pattern the character creator will inherit).
'use client';
import { useEffect, useRef } from 'react';
import { Box } from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { useTemplate3dStore } from '@/stores/domains/template3dStore';

export function Template3dWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  // live badges only — the scene itself reads getState() in the loop
  const turntable = useTemplate3dStore((s) => s.turntable);
  const wireframe = useTemplate3dStore((s) => s.wireframe);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(2.4, 1.8, 2.8);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x668866, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(3, 5, 2);
    scene.add(sun);

    const grid = new THREE.GridHelper(4, 8, 0x888888, 0x444444);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    scene.add(grid);

    // ship-look material: matte, no gloss (albedo-driven)
    const material = new THREE.MeshStandardMaterial({
      color: useTemplate3dStore.getState().color,
      roughness: 0.85,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(new THREE.TorusKnotGeometry(0.45, 0.16, 128, 24), material);
    mesh.position.y = 0.9;
    scene.add(mesh);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.8, 0);
    controls.enableDamping = true;

    renderer.setAnimationLoop(() => {
      const state = useTemplate3dStore.getState();
      if (state.turntable) mesh.rotation.y += 0.006;
      material.wireframe = state.wireframe;
      if (`#${material.color.getHexString()}` !== state.color) material.color.set(state.color);
      // outliner-driven visibility + selection highlight
      mesh.visible = state.objects.torus;
      grid.visible = state.objects.grid;
      sun.visible = state.objects.sun;
      material.emissive.set(state.activeObject === 'torus' ? '#3a1d00' : '#000000');
      controls.update();
      renderer.render(scene, camera);
    });

    // the islands SPRING — the viewport must follow every frame of the resize
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
      observer.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      mesh.geometry.dispose();
      material.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      {/* workspace header — identity · live state · hint */}
      <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Box size={15} className="text-orange-500 dark:text-orange-400" />
          <span className="font-semibold text-ink">3D Sample</span>
          <span className="text-ink-muted">three.js r184</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
          <span className={turntable ? 'text-orange-500 dark:text-orange-400' : 'opacity-40'}>Spin</span>
          <span className={wireframe ? 'text-orange-500 dark:text-orange-400' : 'opacity-40'}>Wire</span>
        </div>
        <div className="text-right text-ink-muted">drag to orbit · scroll to zoom</div>
      </div>

      {/* the viewport well */}
      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border border-edge bg-surface-sunken/60"
      />

      {/* what this sample teaches */}
      <div className="shrink-0 rounded-lg border border-dashed border-edge p-2.5 text-[11px] leading-relaxed text-ink-muted">
        <span className="font-semibold text-ink">Chrome in action:</span> footer Spin/Wire
        keycaps drive the scene · right drawer → Regions page recolors the material ·
        render loop reads the store via <code>getState()</code> (zero re-renders) ·
        ResizeObserver keeps the viewport true while the islands spring.
      </div>
    </div>
  );
}
