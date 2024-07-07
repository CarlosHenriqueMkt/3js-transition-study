import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

class ThreeJSApp {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 10;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.clock = new THREE.Clock();
    this.t = 0;

    this.scene1 = new THREE.Scene();
    this.scene2 = new THREE.Scene();
    this.createRandomGeometries(this.scene1);
    this.createRandomGeometries(this.scene2);

    this.transition = new Transition(this.scene1, this.scene2, this.renderer, this.camera);
    this.currentSceneIndex = 0;

    this.addEventListeners();
    this.animate();
  }

  createRandomGeometries(scene) {
    const geometries = [
      new THREE.BoxGeometry(),
      new THREE.SphereGeometry(),
      new THREE.ConeGeometry(),
      new THREE.CylinderGeometry(),
      new THREE.TorusGeometry()
    ];

    for (let i = 0; i < 50; i++) {
      const geometry = geometries[Math.floor(Math.random() * geometries.length)];
      const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      scene.add(mesh);
    }
  }

  addEventListeners() {
    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
      this.transition.setRTSize(width, height);
    });

    document.getElementById('btn1').addEventListener('click', () => {
      if (this.currentSceneIndex !== 0) {
        this.transition.uniforms.timeStart.value = this.t;
        this.transition.uniforms.action.value = 0;
        this.transition.setScenes(this.scene1, this.scene2);
        this.currentSceneIndex = 0;
      }
    });

    document.getElementById('btn2').addEventListener('click', () => {
      if (this.currentSceneIndex !== 1) {
        this.transition.uniforms.timeStart.value = this.t;
        this.transition.uniforms.action.value = 1;
        this.transition.setScenes(this.scene2, this.scene1);
        this.currentSceneIndex = 1;
      }
    });
  }

  animate() {
    this.t += this.clock.getDelta();
    this.transition.uniforms.time.value = this.t;
    this.controls.update();
    this.transition.render();
    requestAnimationFrame(() => this.animate());
  }
}

class Transition {
  constructor(scene1, scene2, renderer, camera) {
    this.scenes = [scene1, scene2];
    this.renderer = renderer;
    this.camera = camera;

    this.uniforms = {
      aspect: { value: window.innerWidth / window.innerHeight },
      action: { value: 0 },
      timeStart: { value: -1000 },
      duration: { value: 3 },
      time: { value: 0 }
    };

    this.renderTargets = [
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight),
      new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight)
    ];

    this.screen = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          scene0: { value: this.renderTargets[0].texture },
          scene1: { value: this.renderTargets[1].texture },
          aspect: this.uniforms.aspect,
          action: this.uniforms.action,
          time: this.uniforms.time,
          timeStart: this.uniforms.timeStart,
          duration: this.uniforms.duration
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D scene0;
          uniform sampler2D scene1;
          uniform float aspect;
          uniform float action;
          uniform float time;
          uniform float timeStart;
          uniform float duration;

          varying vec2 vUv;

          void main() {
            vec2 uv = vUv;
            vec4 s0 = texture2D(scene0, uv);
            vec4 s1 = texture2D(scene1, uv);
            
            float d = vUv.x;
            
            float waveWidth = 0.25;
            float halfWave = waveWidth * 0.5;
            float maxLength = 1.0 + waveWidth;
            float currWavePos = -halfWave + maxLength * clamp((time - timeStart) / duration, 0.0, 1.0);
            float f = smoothstep(currWavePos + halfWave, currWavePos - halfWave, d);
            
            vec3 col = mix(s0.rgb, s1.rgb, f);
            
            gl_FragColor = vec4(col, 1.0);
          }
        `
      })
    );
  }

  setScenes(sceneA, sceneB) {
    this.scenes = [sceneA, sceneB];
  }

  render() {
    this.scenes.forEach((s, sIdx) => {
      this.renderer.setRenderTarget(this.renderTargets[sIdx]);
      this.renderer.render(s, this.camera);
    });
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.screen, new THREE.Camera());
  }

  setRTSize(w, h) {
    this.uniforms.aspect.value = w / h;
    this.renderTargets.forEach(rt => rt.setSize(w, h));
  }
}

new ThreeJSApp();