import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
    import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

    // Basic setup
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const clock = new THREE.Clock();
    let t = 0;

    function createRandomGeometries(scene) {
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

    const scene1 = new THREE.Scene();
    const scene2 = new THREE.Scene();
    createRandomGeometries(scene1);
    createRandomGeometries(scene2);

    function createTransition(scene1, scene2, renderer, camera) {
      const uniforms = {
        aspect: { value: window.innerWidth / window.innerHeight },
        action: { value: 0 },
        timeStart: { value: -1000 },
        duration: { value: 3 },
        time: { value: 0 }
      };

      const renderTargets = [
        new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight),
        new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight)
      ];

      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: {
            scene0: { value: renderTargets[0].texture },
            scene1: { value: renderTargets[1].texture },
            aspect: uniforms.aspect,
            action: uniforms.action,
            time: uniforms.time,
            timeStart: uniforms.timeStart,
            duration: uniforms.duration
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

      function render(currentSceneIndex) {
        const sceneA = currentSceneIndex === 0 ? scene1 : scene2;
        const sceneB = currentSceneIndex === 0 ? scene2 : scene1;

        renderer.setRenderTarget(renderTargets[0]);
        renderer.render(sceneA, camera);

        renderer.setRenderTarget(renderTargets[1]);
        renderer.render(sceneB, camera);

        renderer.setRenderTarget(null);
        renderer.render(screen, new THREE.Camera());
      }

      function setRTSize(w, h) {
        uniforms.aspect.value = w / h;
        renderTargets.forEach(rt => rt.setSize(w, h));
      }

      return {
        uniforms,
        render,
        setRTSize
      };
    }

    const transition = createTransition(scene1, scene2, renderer, camera);

    function animate() {
      t += clock.getDelta();
      transition.uniforms.time.value = t;
      controls.update();
      transition.render(currentSceneIndex);
      requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      transition.setRTSize(width, height);
    });

    let currentSceneIndex = 0;

    document.getElementById('btn1').addEventListener('click', () => {
      if (currentSceneIndex !== 0) {
        transition.uniforms.timeStart.value = t;
        transition.uniforms.action.value = 0;
        currentSceneIndex = 0;
      }
    });

    document.getElementById('btn2').addEventListener('click', () => {
      if (currentSceneIndex !== 1) {
        transition.uniforms.timeStart.value = t;
        transition.uniforms.action.value = 1;
        currentSceneIndex = 1;
      }
    });

    animate();