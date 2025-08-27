import * as THREE from 'three';
import Stats from 'three/examples/jsm/libs/stats.module';
import { GUI } from 'three/examples/jsm/libs/dat.gui.module';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { GPUPicker } from '/src/gpupicker.js';

var demoOptions = {
  useCPURaycast: false
};
var camera;
var scene;
var renderer;
var stats;
var mixers = [];

var raycaster = new THREE.Raycaster();
var rayDirection = new THREE.Vector2();

var gpuPicker;

var pixelRatio = window.devicePixelRatio ? 1.0 / window.devicePixelRatio : 1.0;

init();
animate();

function init() {

  var container = document.getElementById('container');

  // CAMERA

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
  camera.position.set(- 500, 500, 750);

  // SCENE

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  // LIGHTS

  var light = new THREE.DirectionalLight(0xffffff);
  light.position.set(0.5, 0.5, 1);
  scene.add(light);

  var ambientLight = new THREE.AmbientLight(0x080808);
  scene.add(ambientLight);

  // 增加背景.background()


  // RENDERER

  renderer = new THREE.WebGLRenderer();
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.top = "0px";
  renderer.domElement.style.left = "0px";

  container.appendChild(renderer.domElement);

  gpuPicker = new GPUPicker(THREE, renderer, scene, camera, idFromObject);

  // CONTROLS

  var controls = new OrbitControls(camera, renderer.domElement);

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  // GUI

  setupGui();

  // EVENTS

  window.addEventListener('resize', onWindowResize, false);

  renderer.domElement.addEventListener('mouseup', onMouseUp);
  renderer.domElement.addEventListener('touchend', onMouseUp);


  // CPU picking will only work if you pick on the t-pose.
  // var loader = new GLTFLoader().setPath('model/');
  // loader.load('scene.gltf', function (gltf) {
  //   var mixer = new THREE.AnimationMixer(gltf.scene);
  //   var action = mixer.clipAction(gltf.animations[0]);
  //   action.play();
  //   mixers.push(mixer);
  //   scene.add(gltf.scene);
  // });

  var geometry = new THREE.SphereGeometry(100, 500, 500, 0, Math.PI * 2, 0, Math.PI * 2);
  var material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
  var sphere = new THREE.Mesh(geometry, material);
  var sphereGroup = new THREE.Group(); // To make objectToId happy.
  sphereGroup.position.x = -200;
  scene.add(sphereGroup);
  sphereGroup.add(sphere);

  // Sprite
  var map = new THREE.TextureLoader().load( 'model/rollerblades.png' );
  var spriteMaterial = new THREE.SpriteMaterial( { map: map } );
  var sprite = window.sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.fromArray([100, 100, 100]);
  sprite.center.set(0, 3);
  sprite.material.rotation = Math.PI / 4;
  sprite.position.x = 100;
  scene.add( sprite );

  // Unattenuated sprite
  var spriteMaterial = new THREE.SpriteMaterial( { map: map } );
  var sprite = window.sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.fromArray([0.3, 0.3, 0.3]);
  sprite.material.rotation = Math.PI / 4;
  sprite.material.sizeAttenuation = false;
  sprite.position.x = -450;
  sprite.position.y = -100;
  scene.add( sprite );

  // Add a Line with BufferGeometry
  addExampleLine(9);


  console.log(scene.children);
}

function addExampleLine(len) {
  // Create geometry for the line
  const lineGeometry = new THREE.BufferGeometry();
  const points = [];
  
  for(let i=0; i<len; i++) {
    points.push(new THREE.Vector3(100 * i, Math.sin(i) * 100, 0));
  }
  const positions = []
  const colors = []

  const color = new THREE.Color(1,0,0);

  for ( let i = 0, l = points.length; i < l; i ++ ) {
    positions.push( points[i].x, points[i].y, points[i].z );
    colors.push( color.r, color.g, color.b );
  }
  console.log(colors);

  lineGeometry.setAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
  lineGeometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );


  // Create a material for the line
  const lineMaterial = new THREE.LineBasicMaterial({ 
      linewidth: 5, // in world units with size attenuation, pixels otherwise
      vertexColors: true,

      // dashed: false,
      // alphaToCoverage: true,
  });

  // 一定要告诉它当前画布的分辨率
  // lineMaterial.resolution.set(window.innerWidth, window.innerHeight);

  // Create the line and add it to the scene
  const line = new THREE.LineSegments(lineGeometry, lineMaterial);
  scene.add(line);
}

function setSegmentColor(objectId, segmentIndex, hexColor) {
  const line = scene.getObjectById(objectId);
  if (!line || !line.geometry || !line.geometry.attributes.color) return;
  const colors = line.geometry.attributes.color.array;
  const c = new THREE.Color(hexColor);

  // 每段两顶点，修改两顶点的 color
  const i0 = segmentIndex * 2 * 3; // 每段占 2 顶点 * 3 分量

  // 第一个顶点
  colors[i0 + 0] = c.r;
  colors[i0 + 1] = c.g;
  colors[i0 + 2] = c.b;
  // 第二个顶点
  colors[i0 + 3] = c.r;
  colors[i0 + 4] = c.g;
  colors[i0 + 5] = c.b;

  line.geometry.attributes.color.needsUpdate = true;
}

// resetLineColors 保持不变
function resetLineColors() {
  scene.traverse((object) => {
    if (object.isLine && object.geometry.attributes.color) {
      const colors = object.geometry.attributes.color.array;
      for (let i = 0; i < colors.length; i += 3) {
        colors[i] = 1;     // r = 0x00
        colors[i + 1] = 0; // g = 0xff
        colors[i + 2] = 0; // b = 0x00
      }
      object.geometry.attributes.color.needsUpdate = true;
    }
  });
}
function onMouseUp(ev) {
  const pick = demoOptions.useCPURaycast ? cpuPick(ev) : gpuPick(ev);
  // pick = { objectId, segmentIndex }
  console.log(pick);

  if (!pick.objectId || pick.segmentIndex === undefined) {
    resetLineColors();
    return;
  }
  setSegmentColor(pick.objectId, pick.segmentIndex, 0xffff00);
}



function cpuPick(ev) {
  rayDirection.x = (ev.clientX / (renderer.domElement.width * pixelRatio)) * 2 - 1;
  rayDirection.y = -(ev.clientY / (renderer.domElement.height * pixelRatio)) * 2 + 1;
  raycaster.setFromCamera(rayDirection, camera);
  var intersections = raycaster.intersectObject(scene, true);
  if (intersections.length) {
    return idFromObject(intersections[0].object);
  } else {
    return undefined;
  }
}

function gpuPick(ev) {
  // 先用 GPU 拾取到 LineSegments 的 objectId
  const inv = 1.0 / pixelRatio;
  const objectId = gpuPicker.pick(ev.clientX * inv, ev.clientY * inv);
  const object = scene.getObjectById(objectId);
  let segmentIndex;


  if (object && object.isLine) {
    // 再用 CPU Raycaster 得到是哪一段
    rayDirection.x = (ev.clientX / (renderer.domElement.width * pixelRatio)) * 2 - 1;
    rayDirection.y = -(ev.clientY / (renderer.domElement.height * pixelRatio)) * 2 + 1;
    raycaster.setFromCamera(rayDirection, camera);
    const hits = raycaster.intersectObject(object, false);
    if (hits.length) {
      // hits[0].index 是顶点索引，LineSegments 每两个顶点为一段
      segmentIndex = Math.floor(hits[0].index / 2);
    }
  }
  return { objectId, segmentIndex };
}


function idFromObject(obj) {
  var ret = obj;
  while (ret) {
    if (ret.parent.type === 'Scene') {
      return ret.id;
    } else {
      ret = ret.parent;
    }
  }
}

//
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}


function setupGui() {
  var gui = new GUI();
  gui.add(demoOptions, "useCPURaycast").name("Use CPU Raycasting");
}

function animate() {
  requestAnimationFrame(animate);
  mixers.forEach(mixer => {
    mixer.update(0.01);
  });
  renderer.render(scene, camera);
  stats.update();
}
