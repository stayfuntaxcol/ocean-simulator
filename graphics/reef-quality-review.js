import * as THREE from 'three';
import { createReefLife } from './ReefLife.js';
import { installCaustics } from './UnderwaterAtmosphere.js';

const stage = document.getElementById('stage'), status = document.getElementById('status');
try {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x164d59); scene.fog = new THREE.FogExp2(0x164d59, .034);
  const camera = new THREE.PerspectiveCamera(39, 1, .1, 120);
  scene.add(new THREE.HemisphereLight(0xc2e8e2, 0x44666c, 2));
  const sun = new THREE.DirectionalLight(0xffe2b3, 3.1); sun.position.set(-4, 8, 5); scene.add(sun);
  const rim = new THREE.DirectionalLight(0x71cbd9, 1.3); rim.position.set(5, 4, -5); scene.add(rim);
  const uniforms = { oceanTime: { value: 12 }, oceanStrength: { value: .22 } };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), installCaustics(new THREE.MeshStandardMaterial({ color: 0xb5b395, roughness: 1 }), uniforms));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.015; scene.add(floor);

  const colonies = [
    { type: 'branch', color: 0xe27e70, position: [-2.4, 0, -.25], size: [2.2, 2.5, 1.85] },
    { type: 'plate', color: 0xc793bb, position: [.0, 0, -1.25], size: [3.0, 1.65, 2.65] },
    { type: 'sponge', color: 0xe8b755, position: [2.5, 0, .0], size: [1.8, 2.5, 1.65] },
    { type: 'anemone', color: 0x8dc7ae, position: [-.5, 0, 1.5], size: [2.25, 2.4, 2.0] },
  ];
  const versions = ['existing', 'organic'].map(style => {
    const group = new THREE.Group(); scene.add(group);
    const library = createReefLife(uniforms, { style });
    for (const [variant, colony] of colonies.entries()) {
      const root = new THREE.Group(); root.position.fromArray(colony.position); group.add(root);
      // Envelope only: attach replaces it with the real shared production geometry.
      const envelope = new THREE.Mesh(new THREE.BoxGeometry(...colony.size), new THREE.MeshStandardMaterial());
      envelope.position.y = colony.size[1] / 2; root.add(envelope);
      library.attach(root, colony.type, colony.color, variant);
    }
    return { style, group, library };
  });
  // Soft contact patches are a review-stage aid, not a new lighting pass in the app.
  const contactGeometry = new THREE.PlaneGeometry(1, 1);
  const contactMaterial = new THREE.ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv;void main(){float r=length((vUv-.5)*2.0);gl_FragColor=vec4(.07,.16,.17,.23*(1.0-smoothstep(.15,1.0,r)));}' });
  for (const colony of colonies) {
    const contact = new THREE.Mesh(contactGeometry, contactMaterial);
    contact.rotation.x = -Math.PI / 2; contact.scale.set(colony.size[0]*1.15, colony.size[2]*1.15, 1);
    contact.position.set(colony.position[0], .003, colony.position[2]); scene.add(contact);
  }
  const view = document.getElementById('view'), quality = document.getElementById('quality');
  let style = 'organic', paused = false, time = 12, last = performance.now(), frameId, stopped = false;
  function placeCamera() {
    const selected = colonies.find(c => c.type === view.value);
    const narrow = Math.max(1, 1.35 / camera.aspect);
    if (selected) {
      const target = new THREE.Vector3(...selected.position); target.y = selected.type === 'anemone' ? .46 : 1.02;
      camera.position.copy(target).add(new THREE.Vector3(.9, selected.type === 'sponge' ? 2.0 : 1.15, 4.6).multiplyScalar(narrow)); camera.lookAt(target);
    } else {
      const far = view.value === 'far' ? 1.9 : 1;
      camera.position.set(4.9 * far * narrow, 5.0 * far * narrow, 11.6 * far * narrow); camera.lookAt(0, .85, 0);
    }
  }
  function resize() { renderer.setSize(stage.clientWidth, stage.clientHeight); camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix(); placeCamera(); }
  addEventListener('resize', resize); resize(); view.onchange = placeCamera;
  for (const mode of ['existing', 'organic']) document.getElementById(mode).onclick = () => {
    style = mode;
    for (const button of ['existing', 'organic']) document.getElementById(button).setAttribute('aria-pressed', String(button === mode));
  };
  document.getElementById('pause').onclick = event => {
    paused = !paused; event.target.textContent = paused ? 'Verder bewegen' : 'Pauzeren'; event.target.setAttribute('aria-pressed', String(paused));
  };
  document.getElementById('reset').onclick = () => { time = 12; };
  let samples = 0, totalTime = 0, reportAt = performance.now();
  const lodCamera = { position: new THREE.Vector3(0, 0, 100) };
  function frame(now) {
    if (stopped) return;
    const elapsed = (now - last) / 1000; last = now;
    if (!paused) time += Math.min(.05, elapsed);
    uniforms.oceanTime.value = time;
    for (const version of versions) {
      version.group.visible = version.style === style;
      if (version.group.visible) { version.library.setTime(time); version.library.update(quality.value === 'low' ? lodCamera : camera, quality.value, true); }
    }
    renderer.render(scene, camera); samples++; totalTime += elapsed;
    if (now - reportAt > 700) {
      status.textContent = `${style === 'organic' ? 'Organische proefversie' : 'Bestaande rifmodule'} · ${renderer.info.render.triangles.toLocaleString('nl-NL')} driehoeken · ${renderer.info.render.calls} tekenaanroepen · ${Math.round(samples / totalTime)} fps op dit apparaat`;
      samples = 0; totalTime = 0; reportAt = now;
    }
    // Read-only diagnostics for repeatable visual and pause tests.
    stage.dataset.ready = 'true'; stage.dataset.time = String(time); stage.dataset.style = style;
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);
  addEventListener('pagehide', () => {
    stopped = true; cancelAnimationFrame(frameId); removeEventListener('resize', resize);
    versions.forEach(version => {
      version.group.traverse(object => { if (object.isMesh && object.geometry.type === 'BoxGeometry') object.material.dispose(); });
      version.library.dispose();
    });
    floor.geometry.dispose(); floor.material.dispose(); contactGeometry.dispose(); contactMaterial.dispose(); renderer.dispose();
  }, { once: true });
} catch (error) {
  status.textContent = `Proefrif kon niet starten: ${error.message}`; console.error(error);
}
