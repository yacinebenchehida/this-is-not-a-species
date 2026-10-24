/* Small native WebGL character renderer. The pond, paths and family timeline stay in Canvas 2D. */
(function () {
  'use strict';
  const fallback = window.DuckCharacter;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 384;
  const gl = sprite.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
  try {
    let uniforms;
    const indices = [];
    if (gl) {
    const vertexSource = `
      attribute vec3 position;
      attribute vec3 normal;
      uniform mat3 basis;
      uniform mat3 normalBasis;
      uniform vec3 center;
      varying vec3 surfaceNormal;
      varying vec3 surfacePoint;
      void main() {
        vec3 p = basis * position + center;
        surfaceNormal = normalize(normalBasis * normal);
        surfacePoint = p;
        float viewY = p.y * 0.9396926 - p.z * 0.3420201;
        float viewZ = p.y * 0.3420201 + p.z * 0.9396926;
        gl_Position = vec4(p.x / 80.0, (viewY - 35.0) / 80.0, -viewZ / 250.0, 1.0);
      }`;
    const fragmentSource = `
      precision mediump float;
      uniform vec3 color;
      uniform float badge;
      varying vec3 surfaceNormal;
      varying vec3 surfacePoint;
      void main() {
        vec3 n = normalize(surfaceNormal);
        vec3 light = normalize(vec3(-0.65, 1.0, 0.8));
        vec3 eye = vec3(0.0, 0.3420201, 0.9396926);
        float diffuse = max(dot(n, light), 0.0);
        float sky = n.y * 0.5 + 0.5;
        vec3 lit = color * (0.56 + 0.30 * diffuse + 0.15 * sky);
        lit += vec3(0.06, 0.10, 0.10) * (1.0 - sky) * 0.35;
        float softHighlight = pow(max(dot(n, normalize(light + eye)), 0.0), 28.0);
        lit += vec3(1.0, 0.95, 0.78) * softHighlight * 0.12;
        lit = mix(lit, color, badge * 0.65);
        gl_FragColor = vec4(lit, 1.0);
      }`;
    function shader(type, source) {
      const s = gl.createShader(type); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    uniforms = Object.fromEntries(['basis', 'normalBasis', 'center', 'color', 'badge'].map(name => [name, gl.getUniformLocation(program, name)]));
    // Reuse one smooth sphere mesh for all articulated ellipsoids.
    const vertices = [], columns = 36, rows = 24;
    for (let row = 0; row <= rows; row++) {
      const v = row / rows * Math.PI;
      for (let col = 0; col <= columns; col++) {
        const u = col / columns * Math.PI * 2;
        vertices.push(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u));
      }
    }
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = row * (columns + 1) + col, b = a + columns + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const vertexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    for (const name of ['position', 'normal']) {
      const location = gl.getAttribLocation(program, name); gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
    }
    const indexBuffer = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.clearColor(0, 0, 0, 0);
    }
    const cos = Math.cos, sin = Math.sin;
    function multiply(a, b) {
      const out = new Array(9);
      for (let col = 0; col < 3; col++) for (let row = 0; row < 3; row++) {
        out[col * 3 + row] = a[row] * b[col * 3] + a[3 + row] * b[col * 3 + 1] + a[6 + row] * b[col * 3 + 2];
      }
      return out;
    }
    function transform(a, p) { return [a[0] * p[0] + a[3] * p[1] + a[6] * p[2], a[1] * p[0] + a[4] * p[1] + a[7] * p[2], a[2] * p[0] + a[5] * p[1] + a[8] * p[2]]; }
    function rotation(x = 0, y = 0, z = 0) {
      return multiply([cos(z), sin(z), 0, -sin(z), cos(z), 0, 0, 0, 1], multiply([cos(y), 0, -sin(y), 0, 1, 0, sin(y), 0, cos(y)], [1, 0, 0, 0, cos(x), sin(x), 0, -sin(x), cos(x)]));
    }
    function ellipsoid(position, size, color, parent, local = [0, 0, 0], badge = 0, offset = [0, 0, 0]) {
      const center = transform(parent, position).map((v, i) => v + offset[i]);
      const orientation = multiply(parent, rotation(...local));
      const basis = orientation.map((v, i) => v * size[Math.floor(i / 3)]);
      const normalBasis = orientation.map((v, i) => v / size[Math.floor(i / 3)]);
      if (!gl) { softwareSphere(center, basis, normalBasis, color, badge); return; }
      gl.uniformMatrix3fv(uniforms.basis, false, basis); gl.uniformMatrix3fv(uniforms.normalBasis, false, normalBasis);
      gl.uniform3fv(uniforms.center, center); gl.uniform3fv(uniforms.color, color); gl.uniform1f(uniforms.badge, badge);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
    }
    // Analytic ray/ellipsoid rendering gives the identical 3D geometry, smooth normals
    // and depth ordering on browsers without WebGL. It is not a flat sprite fallback.
    const softwareCanvas = document.createElement('canvas');
    softwareCanvas.width = softwareCanvas.height = 320;
    const softwareContext = softwareCanvas.getContext('2d');
    const pixels = softwareContext.createImageData(320, 320), depths = new Float32Array(320 * 320);
    const pixelStep = 160 / 320, eye = [0, .3420201, .9396926];
    const lightLength = Math.hypot(-.65, 1, .8), light = [-.65 / lightLength, 1 / lightLength, .8 / lightLength];
    const halfLength = Math.hypot(light[0], light[1] + eye[1], light[2] + eye[2]);
    const halfway = [light[0] / halfLength, (light[1] + eye[1]) / halfLength, (light[2] + eye[2]) / halfLength];
    function softwareSphere(center, basis, normals, color, badge) {
      const centerY = center[1] * eye[2] - center[2] * eye[1];
      const radiusX = Math.hypot(basis[0], basis[3], basis[6]);
      const radiusY = Math.hypot(...[0, 3, 6].map(i => basis[i + 1] * eye[2] - basis[i + 2] * eye[1]));
      const minX = Math.max(0, Math.floor((center[0] - radiusX + 80) / pixelStep));
      const maxX = Math.min(319, Math.ceil((center[0] + radiusX + 80) / pixelStep));
      const minY = Math.max(0, Math.floor((115 - centerY - radiusY) / pixelStep));
      const maxY = Math.min(319, Math.ceil((115 - centerY + radiusY) / pixelStep));
      // inverse(basis) is transpose(normalBasis).
      const vx = normals[1] * eye[1] + normals[2] * eye[2];
      const vy = normals[4] * eye[1] + normals[5] * eye[2];
      const vz = normals[7] * eye[1] + normals[8] * eye[2];
      const a = vx * vx + vy * vy + vz * vz;
      const data = pixels.data;
      for (let y = minY; y <= maxY; y++) {
        const viewY = 115 - (y + .5) * pixelStep;
        const oy = viewY * eye[2] - center[1], oz = -viewY * eye[1] - center[2];
        for (let x = minX; x <= maxX; x++) {
          const ox = (x + .5) * pixelStep - 80 - center[0];
          const qx = normals[0] * ox + normals[1] * oy + normals[2] * oz;
          const qy = normals[3] * ox + normals[4] * oy + normals[5] * oz;
          const qz = normals[6] * ox + normals[7] * oy + normals[8] * oz;
          const b = qx * vx + qy * vy + qz * vz;
          const discriminant = b * b - a * (qx * qx + qy * qy + qz * qz - 1);
          if (discriminant < 0) continue;
          const depth = (-b + Math.sqrt(discriminant)) / a, index = y * 320 + x;
          if (depth <= depths[index]) continue;
          depths[index] = depth;
          const lx = qx + depth * vx, ly = qy + depth * vy, lz = qz + depth * vz;
          let nx = normals[0] * lx + normals[3] * ly + normals[6] * lz;
          let ny = normals[1] * lx + normals[4] * ly + normals[7] * lz;
          let nz = normals[2] * lx + normals[5] * ly + normals[8] * lz;
          const length = Math.hypot(nx, ny, nz); nx /= length; ny /= length; nz /= length;
          const sky = ny * .5 + .5;
          const brightness = .56 + .30 * Math.max(0, nx * light[0] + ny * light[1] + nz * light[2]) + .15 * sky;
          const shine = Math.pow(Math.max(0, nx * halfway[0] + ny * halfway[1] + nz * halfway[2]), 28) * .12;
          const ink = index * 4, mix = badge * .65;
          for (let channel = 0; channel < 3; channel++) {
            const lit = color[channel] * brightness + bounceColor[channel] * (1 - sky) * .35 + highlightColor[channel] * shine;
            data[ink + channel] = Math.min(255, (lit * (1 - mix) + color[channel] * mix) * 255);
          }
          data[ink + 3] = 255;
        }
      }
    }
    const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
    const alleleColors = fallback.palette.map(rgb);
    const bounceColor = [.06, .10, .10], highlightColor = [1, .95, .78];
    function draw(c, duck, time = 0, pose = {}) {
      if (gl && gl.isContextLost()) return fallback.draw(c, duck, time, pose);
      const scale = duck.scale || 1;
      const puff = pose.puff || 0, nod = pose.nod || 0, flap = pose.flap || 0;
      const yaw = Number.isFinite(duck.yaw) ? duck.yaw : (duck.facing >= 0 ? 1.16 : -1.16);
      const bob = pose.still ? 0 : sin(time * 5 + (duck.phase || 0)) * 1.4;
      const roll = pose.roll || (pose.still ? 0 : sin(time * 3 + (duck.phase || 0)) * .025);
      const body = rotation(0, yaw, roll);
      const head = multiply(body, rotation(nod * .8, 0, 0));
      const neckPivot = [0, 37, 18], pivot = transform(body, neckPivot), movedPivot = transform(head, neckPivot);
      const headOffset = pivot.map((v, i) => v - movedPivot[i]);
      const headPart = (position, size, color, local = [0, 0, 0]) => ellipsoid(position, size, color, head, local, 0, headOffset);
      const gold = duck.cream ? [1, .945, .77] : [1, .825, .28];
      const wingColor = duck.cream ? [.965, .884, .66] : [.97, .74, .20];
      const orange = [1, .56, .22], eye = [.08, .22, .245];
      const headSize = duck.baby ? 1.12 : 1;
      if (gl) { gl.viewport(0, 0, sprite.width, sprite.height); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); }
      else { pixels.data.fill(0); depths.fill(-Infinity); }
      // A lifted tail, plump chest and oversized head retain the little rubber-duck silhouette.
      ellipsoid([0, 29, -33], [12, 11, 21], gold, body, [-.45, 0, 0]);
      ellipsoid([0, 19, -5], [27 * (1 + puff * .07), 23, 35 * (1 + puff * .12)], gold, body);
      ellipsoid([0, 35 + puff * 2, 14 + puff * 2], [16, 22, 17], gold, body);
      for (const side of [-1, 1]) {
        ellipsoid([side * (25 + flap * 4), 24 + flap * 4, -10], [6.5 + flap * 2, 13, 23], wingColor, body, [0, side * .12, side * flap * .38]);
      }
      headPart([0, 55 + puff * 2, 18], [24 * headSize, 25 * headSize, 23 * headSize], gold);
      // Two flattened bill lobes make a rounded bill with a very fine smile seam.
      headPart([0, 45.8 + puff * 2, 42], [13.3, 3.8, 13.8], [.82, .39, .14]);
      headPart([0, 48 + puff * 2, 43], [14.3, 4.2, 14], orange);
      const blink = pose.blink || (!pose.still && (time + (duck.phase || 0)) % 5.9 < .12);
      for (const side of [-1, 1]) {
        const eyeX = side * 17.7 * headSize;
        const eyeY = 60 + puff * 2 + (headSize - 1) * 8;
        const eyeZ = 34 + (headSize - 1) * 18;
        headPart([eyeX, eyeY, eyeZ], [3.25, blink ? .65 : 4.25, 2.3], eye, [0, side * .65, 0]);
        if (!blink) headPart([eyeX - .5, eyeY + 1.35, eyeZ + 1.9], [.73, .9, .55], [1, 1, .94]);
        headPart([side * 20.2 * headSize, 51 + puff * 2, 31.5 + (headSize - 1) * 17], [3.8, 2, 1.1], [1, .69, .43], [0, side * .7, 0]);
      }
      // The two information badges face the viewer so both remain readable during a full turn.
      const badgeParent = rotation(0, 0, roll);
      const dots = [-10.5, 10.5].map((x, i) => {
        const position = [x, 22 + puff * 2, 34 + puff * 3];
        if (pose.highlight === i) ellipsoid(position, [10.1, 10.1, 2.6], [1, .98, .80], badgeParent, [-.349, 0, 0], 1);
        ellipsoid([position[0], position[1] + .5, position[2] + 2.8], [7.9, 7.9, 2.8], alleleColors[duck.alleles[i]], badgeParent, [-.349, 0, 0], 1);
        const point = transform(badgeParent, [position[0], position[1] + .5, position[2] + 3.5]);
        return { x: duck.x + point[0] * scale, y: duck.y + bob - (point[1] * .9396926 - point[2] * .3420201) * scale, allele: duck.alleles[i] };
      });
      c.save(); c.globalAlpha = pose.alpha === undefined ? 1 : pose.alpha;
      const shadow = c.createRadialGradient(duck.x, duck.y + 7 * scale, 3 * scale, duck.x, duck.y + 7 * scale, 39 * scale);
      shadow.addColorStop(0, '#2c747b32'); shadow.addColorStop(1, '#2c747b00');
      fallback.oval(c, duck.x, duck.y + 7 * scale, 41 * scale, 11 * scale, shadow);
      c.beginPath(); c.ellipse(duck.x, duck.y + 7 * scale, 39 * scale, 9 * scale, 0, .1, 3); c.strokeStyle = '#f1fbdfa0'; c.lineWidth = 1.6; c.stroke();
      if (!gl) softwareContext.putImageData(pixels, 0, 0);
      c.drawImage(gl ? sprite : softwareCanvas, duck.x - 80 * scale, duck.y + bob - 115 * scale, 160 * scale, 160 * scale);
      c.restore();
      return dots;
    }
    window.DuckCharacter = { ...fallback, draw, renderer: gl ? 'webgl-3d' : 'software-3d' };
  } catch (error) { console.warn('3D ducks unavailable; using Canvas ducks.', error); }
})();
