import * as THREE from 'three';

const pmrem = new THREE.PMREMGenerator(new THREE.WebGLRenderer({ alpha: true }));
let cached = {};

function sphereGradient(top, horizon, ground, sunDir, sunColor, sunSize) {
  const geo = new THREE.SphereGeometry(500, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      horizonColor: { value: new THREE.Color(horizon) },
      groundColor: { value: new THREE.Color(ground) },
      sunDir: { value: sunDir.clone().normalize() },
      sunColor: { value: new THREE.Color(sunColor) },
      sunSize: { value: sunSize }
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 topColor, horizonColor, groundColor, sunColor;
      uniform vec3 sunDir;
      uniform float sunSize;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = mix(horizonColor, topColor, smoothstep(0.0, 0.55, h));
        col = mix(groundColor, col, smoothstep(-0.12, 0.06, h));
        float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, sunSize) * 2.2;
        col += sunColor * pow(sd, 8.0) * 0.18;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  return mesh;
}

export function exteriorEnvironment(opts = {}) {
  const key = 'ext-' + JSON.stringify(opts);
  if (cached[key]) return cached[key];

  const scene = new THREE.Scene();
  const sunDir = opts.sunDir || new THREE.Vector3(0.55, 0.62, 0.42);
  scene.add(sphereGradient(
    opts.top || 0x4a7fb5,
    opts.horizon || 0xdcc49c,
    opts.ground || 0xb08a5c,
    sunDir,
    opts.sunColor || 0xfff0d4,
    opts.sunSize || 900
  ));

  const tex = pmrem.fromScene(scene, 0, 1, 1000).texture;
  cached[key] = tex;
  return tex;
}

export function interiorEnvironment(opts = {}) {
  const key = 'int-' + JSON.stringify(opts);
  if (cached[key]) return cached[key];

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(opts.base || 0x120b06);

  const room = new THREE.Mesh(
    new THREE.BoxGeometry(24, 9, 18),
    new THREE.MeshStandardMaterial({
      color: opts.wall || 0x4a4038, roughness: 1, side: THREE.BackSide
    })
  );
  room.position.y = 2.6;
  scene.add(room);

  const lamps = [
    [-7, 3.2, -6], [0, 3.4, -7], [7, 3.2, -6],
    [-8, 2.6, 4], [8, 2.6, 4]
  ];
  for (const [x, y, z] of lamps) {
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.lamp || 0xffb968).multiplyScalar(5) })
    );
    bulb.position.set(x, y, z);
    scene.add(bulb);
  }

  const bounce = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 20),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(opts.bounce || 0x53321a).multiplyScalar(0.35) })
  );
  bounce.rotation.x = -Math.PI / 2;
  bounce.position.y = -1.6;
  scene.add(bounce);

  const tex = pmrem.fromScene(scene, 0.02, 1, 60).texture;
  cached[key] = tex;
  return tex;
}

export function applyEnvironment(scene, tex, intensity = 1.0) {
  scene.environment = tex;
  scene.environmentIntensity = intensity;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m) continue;
      m.envMapIntensity = 1.0;
      m.needsUpdate = true;
    }
  });
}
