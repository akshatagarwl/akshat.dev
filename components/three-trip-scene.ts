import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import basemap from '@/data/taiwan-basemap.json';

export type MapPoint = { id: string; point: [number, number] };
export type MapScene = { zoom: (factor: number) => void; fit: () => void; select: (id: string) => void; dispose: () => void };

// A raised cartographic silhouette, not invented elevation/terrain or a recorded route.
export function createTripScene(host: HTMLElement, points: MapPoint[], markers: Map<string, HTMLElement>, onChange: (zoom: number) => void, onFailure: () => void): MapScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor('#edf2ed');
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#edf2ed', 950, 2200);
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.listenToKeyEvents(host);
  controls.enableDamping = false; // Render on demand, never an idle animation loop.
  controls.enableZoom = false; // Wheel and trackpad gestures belong to document scrolling.
  controls.maxPolarAngle = Math.PI * .43;
  controls.minPolarAngle = .12;
  controls.screenSpacePanning = false;
  renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
  const mouseOnly = (event: PointerEvent) => { if (event.pointerType !== 'mouse') event.stopImmediatePropagation(); };
  renderer.domElement.addEventListener('pointerdown', mouseOnly, true);
  scene.add(new THREE.HemisphereLight('#fffdf4', '#889b8c', 2.2));
  const light = new THREE.DirectionalLight('#fff8e8', 1.3);
  light.position.set(-250, 600, 200); scene.add(light);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: '#e3eeeb', roughness: 1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -1; scene.add(sea);
  const grid = new THREE.GridHelper(2000, 80, '#c5d6cf', '#c5d6cf');
  (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = .22; scene.add(grid);
  const land = new THREE.Group(); land.scale.z = -1; scene.add(land);
  const loader = new SVGLoader();
  for (const [path, raised] of [[basemap.sceneNeighbours, false], [basemap.taiwan, true]] as const) {
    const parsed = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${path}"/></svg>`);
    for (const item of parsed.paths) for (const shape of SVGLoader.createShapes(item)) {
      const geometry = raised ? new THREE.ExtrudeGeometry(shape, { depth: 7, bevelEnabled: true, bevelSize: .5, bevelThickness: .5, bevelSegments: 1, steps: 1, curveSegments: 2 }) : new THREE.ShapeGeometry(shape);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: raised ? '#a8c199' : '#d5dfce', roughness: 1 }));
      mesh.rotation.x = -Math.PI / 2; mesh.position.set(-200, raised ? .2 : .05, 210); land.add(mesh);
      if (raised) {
        const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 35), new THREE.LineBasicMaterial({ color: '#69876a', transparent: true, opacity: .45 }));
        edge.rotation.copy(mesh.rotation); edge.position.copy(mesh.position); land.add(edge);
      }
    }
  }
  const pinMaterial = new THREE.MeshStandardMaterial({ color: '#a34e37', roughness: .9 });
  const pins = new Map<string, THREE.Mesh>();
  for (const point of points) {
    const pin = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 8), pinMaterial);
    pin.position.set(point.point[0] - 200, 10, point.point[1] - 210); scene.add(pin); pins.set(point.id, pin);
  }
  let width = 1, height = 1, fitDistance = 720, frame = 0, draws = 0, disposed = false;
  const scratch = new THREE.Vector3();
  const render = () => {
    frame = 0; if (disposed) return;
    renderer.render(scene, camera);
    host.dataset.renders = String(++draws);
    for (const point of points) {
      const marker = markers.get(point.id); if (!marker) continue;
      scratch.set(point.point[0] - 200, 12, point.point[1] - 210).project(camera);
      const x = (scratch.x + 1) * width / 2, y = (1 - scratch.y) * height / 2;
      const visible = scratch.z > -1 && scratch.z < 1 && x > 55 && x < width - 55 && y > 55 && y < height - 20;
      marker.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      marker.hidden = !visible;
    }
    host.dataset.camera = camera.position.toArray().map(n => n.toFixed(1)).join(',');
    onChange(fitDistance / camera.position.distanceTo(controls.target));
  };
  const invalidate = () => { if (!frame && !disposed) frame = requestAnimationFrame(render); };
  const constrain = () => {
    const old = controls.target.clone();
    controls.target.set(THREE.MathUtils.clamp(old.x, -160, 160), 0, THREE.MathUtils.clamp(old.z, -190, 190));
    camera.position.add(scratch.copy(controls.target).sub(old)); invalidate();
  };
  controls.addEventListener('change', constrain);
  const fit = () => {
    fitDistance = Math.max(580, 160 / (Math.tan(THREE.MathUtils.degToRad(19)) * camera.aspect));
    controls.minDistance = fitDistance / 6; controls.maxDistance = fitDistance;
    controls.target.set(0, 0, 40); camera.position.set(80, 570, 380).normalize().multiplyScalar(fitDistance).add(controls.target);
    camera.lookAt(controls.target); controls.update(); invalidate();
  };
  const resize = () => {
    width = host.clientWidth; height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); fit();
  };
  const observer = new ResizeObserver(resize); observer.observe(host); resize();
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  return {
    zoom(factor) {
      const distance = camera.position.distanceTo(controls.target);
      camera.position.sub(controls.target).multiplyScalar(THREE.MathUtils.clamp(distance / factor, controls.minDistance, controls.maxDistance) / distance).add(controls.target);
      controls.update(); invalidate();
    },
    fit,
    select(id) { for (const [key, pin] of pins) pin.scale.setScalar(key === id ? 1.5 : 1); invalidate(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('pointerdown', mouseOnly, true);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) { geometries.add(object.geometry); for (const material of [object.material].flat()) materials.add(material); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); scene.clear();
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    },
  };
}
