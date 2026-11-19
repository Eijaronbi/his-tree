import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1280, 720) },
    time: { value: 0 },
    grain: { value: 0.03 },
    vignette: { value: 0.4 },
    ca: { value: 0.0012 },
    saturation: { value: 1.0 },
    contrast: { value: 1.0 },
    lift: { value: new THREE.Vector3(0, 0, 0) },
    gain: { value: new THREE.Vector3(1, 1, 1) },
    tint: { value: new THREE.Vector3(1, 1, 1) }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    uniform float time, grain, vignette, ca, saturation, contrast;
    uniform vec3 lift, gain, tint;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233)) + time * 1.7) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 d = uv - 0.5;
      float r2 = dot(d, d);
      float off = ca * (0.4 + r2 * 2.2);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + d * off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - d * off).b;

      col = col * gain + lift * (1.0 - col);
      col = (col - 0.5) * contrast + 0.5;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, saturation);
      col *= tint;

      float n = hash(uv * resolution) - 0.5;
      col += n * grain * (0.55 + 0.45 * (1.0 - smoothstep(0.0, 0.85, l)));

      float v = 1.0 - vignette * smoothstep(0.08, 0.62, r2);
      col *= clamp(v, 0.0, 1.0);

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `
};

const PRESETS = {
  mali: {
    exposure: 1.14,
    bloom: { strength: 0.18, radius: 0.6, threshold: 1.05 },
    dof: { aperture: 0.00010, maxblur: 0.0035, focus: 7.0 },
    dofGameplay: 0.3,
    grade: {
      grain: 0.018, vignette: 0.24, ca: 0.0007,
      saturation: 1.06, contrast: 1.015,
      lift: [0.006, 0.010, 0.016],
      gain: [1.03, 1.005, 0.97],
      tint: [1.015, 1.0, 0.995]
    }
  },
  lincoln: {
    exposure: 0.92,
    bloom: { strength: 0.30, radius: 0.68, threshold: 1.00 },
    dof: { aperture: 0.0016, maxblur: 0.019, focus: 2.4 },
    dofGameplay: 1.0,
    grade: {
      grain: 0.045, vignette: 0.60, ca: 0.0013,
      saturation: 0.90, contrast: 1.14,
      lift: [0.010, 0.018, 0.024],
      gain: [1.07, 0.98, 0.86],
      tint: [1.03, 0.99, 0.94]
    }
  },
  mud: {
    exposure: 0.92,
    bloom: { strength: 0.12, radius: 0.5, threshold: 1.15 },
    dof: { aperture: 0.0012, maxblur: 0.014, focus: 3.0 },
    dofGameplay: 0.9,
    grade: {
      grain: 0.05, vignette: 0.42, ca: 0.0009,
      saturation: 0.72, contrast: 1.05,
      lift: [0.010, 0.012, 0.010],
      gain: [0.98, 1.0, 0.99],
      tint: [0.99, 1.0, 1.01]
    }
  },
  cold: {
    exposure: 0.95,
    bloom: { strength: 0.3, radius: 0.6, threshold: 0.9 },
    dof: { aperture: 0.0012, maxblur: 0.012, focus: 3.2 },
    dofGameplay: 0.85,
    grade: {
      grain: 0.04, vignette: 0.4, ca: 0.0011,
      saturation: 0.85, contrast: 1.05,
      lift: [0.006, 0.010, 0.016],
      gain: [0.97, 1.0, 1.04],
      tint: [0.97, 1.0, 1.03]
    }
  },
  hub: {
    exposure: 1.0,
    bloom: { strength: 0.3, radius: 0.6, threshold: 0.85 },
    dof: { aperture: 0.0008, maxblur: 0.01, focus: 6.0 },
    dofGameplay: 0.6,
    grade: {
      grain: 0.03, vignette: 0.42, ca: 0.001,
      saturation: 0.95, contrast: 1.04,
      lift: [0.004, 0.008, 0.014],
      gain: [0.98, 1.0, 1.05],
      tint: [0.97, 1.0, 1.03]
    }
  }
};

export const QUALITY = {
  high: { dpr: 1.5, ao: true, bloom: true, dof: true, msaa: 0 },
  medium: { dpr: 1, ao: false, bloom: true, dof: true, msaa: 0 },
  low: { dpr: 1, ao: false, bloom: false, dof: false, msaa: 0 }
};

export class PostFX {
  constructor(renderer, scene, camera, tier = 'high', preset = 'mali') {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.tier = QUALITY[tier] ? tier : 'high';
    this.settings = QUALITY[this.tier];
    this.presetName = preset;
    this.time = 0;

    const size = renderer.getSize(new THREE.Vector2());
    const target = new THREE.WebGLRenderTarget(
      Math.max(1, Math.floor(size.x * this.settings.dpr)),
      Math.max(1, Math.floor(size.y * this.settings.dpr)),
      { type: THREE.HalfFloatType, samples: this.settings.msaa }
    );
    this.composer = new EffectComposer(renderer, target);
    this.composer.setPixelRatio(this.settings.dpr);
    this.composer.setSize(size.x, size.y);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    if (this.settings.ao) {
      try {
        this.aoPass = new GTAOPass(scene, camera, size.x, size.y);
        this.aoPass.output = GTAOPass.OUTPUT.Default;
        this.aoPass.blendIntensity = 0.55;
        if (this.aoPass.updateGtaoMaterial) {
          this.aoPass.updateGtaoMaterial({
            radius: 0.22, distanceExponent: 1.4, thickness: 1.0,
            scale: 1.0, samples: 12, distanceFalloff: 1.0, screenSpaceRadius: false
          });
        }
        this.composer.addPass(this.aoPass);
      } catch (err) {
        console.warn('GTAO unavailable', err);
        this.aoPass = null;
      }
    }

    if (this.settings.dof) {
      try {
        this.bokehPass = new BokehPass(scene, camera, {
          focus: 6.0, aperture: 0.0008, maxblur: 0.008
        });
        this.composer.addPass(this.bokehPass);
      } catch (err) {
        console.warn('Bokeh unavailable', err);
        this.bokehPass = null;
      }
    }

    if (this.settings.bloom) {
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(size.x, size.y), 0.25, 0.55, 0.9
      );
      this.composer.addPass(this.bloomPass);
    }

    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);

    this.setPreset(preset);
    this.resize();
  }

  setPreset(name) {
    const p = PRESETS[name] || PRESETS.mali;
    this.presetName = PRESETS[name] ? name : 'mali';
    this.renderer.toneMappingExposure = p.exposure;

    if (this.bloomPass) {
      this.bloomPass.strength = p.bloom.strength;
      this.bloomPass.radius = p.bloom.radius;
      this.bloomPass.threshold = p.bloom.threshold;
    }
    this.dofScale = p.dofGameplay ?? 1.0;
    this.baseDof = p.dof;
    if (this.bokehPass) {
      this.bokehPass.uniforms['aperture'].value = p.dof.aperture;
      this.bokehPass.uniforms['maxblur'].value = p.dof.maxblur * this.dofScale;
      this.bokehPass.uniforms['focus'].value = p.dof.focus;
    }
    const g = p.grade;
    const u = this.gradePass.uniforms;
    u.grain.value = g.grain;
    u.vignette.value = g.vignette;
    u.ca.value = g.ca;
    u.saturation.value = g.saturation;
    u.contrast.value = g.contrast;
    u.lift.value.fromArray(g.lift);
    u.gain.value.fromArray(g.gain);
    u.tint.value.fromArray(g.tint);
  }

  setFocus(distance, maxblur) {
    if (!this.bokehPass) return;
    this.bokehPass.uniforms['focus'].value = Math.max(0.3, distance);
    const blur = maxblur !== undefined ? maxblur : this.baseDof.maxblur * this.dofScale;
    this.bokehPass.uniforms['maxblur'].value = blur;
  }

  setDofStrength(scale) {
    this.dofScale = Math.max(0, scale);
    if (!this.bokehPass || !this.baseDof) return;
    this.bokehPass.uniforms['aperture'].value = this.baseDof.aperture * (0.4 + 0.6 * this.dofScale);
    this.bokehPass.uniforms['maxblur'].value = this.baseDof.maxblur * this.dofScale;
  }

  setTier(tier) {
    if (!QUALITY[tier] || tier === this.tier) return;
    this.tier = tier;
    this.settings = QUALITY[tier];
    this.composer.setPixelRatio(this.settings.dpr);
  }

  resize() {
    const size = this.renderer.getSize(new THREE.Vector2());
    this.composer.setSize(size.x, size.y);
    if (this.aoPass && this.aoPass.setSize) this.aoPass.setSize(size.x, size.y);
    this.gradePass.uniforms.resolution.value.set(size.x, size.y);
  }

  render(dt) {
    this.time += dt || 0.016;
    this.gradePass.uniforms.time.value = this.time;
    this.composer.render(dt);
  }
}
