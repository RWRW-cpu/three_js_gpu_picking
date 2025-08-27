/**
 * Fast GPU picker for Three.JS, modified to only pick lines (Line objects).
 */

var THREE;

var GPUPicker = function (three, renderer, scene, camera) {
  THREE = three;

  // This is the 1x1 pixel render target we use to do the picking
  var pickingTarget = new THREE.WebGLRenderTarget(1, 1, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    encoding: THREE.LinearEncoding,
  });

  var emptyScene = new THREE.Scene();
  emptyScene.onAfterRender = renderList;

  var pixelBuffer = new Uint8Array(4 * pickingTarget.width * pickingTarget.height);
  var clearColor = new THREE.Color(0xffffff);
  var shouldPickObjectCB = undefined;

  var currClearColor = new THREE.Color();

  this.pick = function (x, y, shouldPickObject) {
    shouldPickObjectCB = shouldPickObject;
    var w = renderer.domElement.width;
    var h = renderer.domElement.height;

    // Set the projection matrix to only look at the pixel we are interested in.
    camera.setViewOffset(w, h, x, y, 1, 1);

    var currRenderTarget = renderer.getRenderTarget();
    var currAlpha = renderer.getClearAlpha();
    renderer.getClearColor(currClearColor);
    renderer.setRenderTarget(pickingTarget);
    renderer.setClearColor(clearColor);
    renderer.clear();
    renderer.render(emptyScene, camera);
    renderer.readRenderTargetPixels(pickingTarget, 0, 0, pickingTarget.width, pickingTarget.height, pixelBuffer);
    renderer.setRenderTarget(currRenderTarget);
    renderer.setClearColor(currClearColor, currAlpha);
    camera.clearViewOffset();

    var val = (pixelBuffer[0] << 24) + (pixelBuffer[1] << 16) + (pixelBuffer[2] << 8) + pixelBuffer[3];
    return val;
  };

  function renderList() {
    // Only process lines in the render list
    var renderList = renderer.renderLists.get(scene, 0);
    renderList.opaque.forEach(processLine);
    renderList.transmissive.forEach(processLine);
    renderList.transparent.forEach(processLine);
  }

  function processLine(renderItem) {
    var object = renderItem.object;

    // Only process Line objects
    if (!object.isLine || !renderItem.geometry.isBufferGeometry) {
      return;
    }

    if (shouldPickObjectCB && !shouldPickObjectCB(object)) {
      return;
    }

    var objId = object.id;

    // Create a simple ShaderMaterial for picking
    var pickingMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec4 objectId;
        void main() {
          gl_FragColor = objectId;
        }
      `,
      uniforms: {
        objectId: {
          value: [
            (objId >> 24 & 255) / 255,
            (objId >> 16 & 255) / 255,
            (objId >> 8 & 255) / 255,
            (objId & 255) / 255,
          ],
        },
      },
    });

    // Render the line with the picking material
    renderer.renderBufferDirect(camera, null, renderItem.geometry, pickingMaterial, object, null);
  }
}

export { GPUPicker };