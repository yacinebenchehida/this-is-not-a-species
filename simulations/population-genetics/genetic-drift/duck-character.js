/* Articulated reference-style duck. Cosmetic pose never changes its allele data. */
(function () {
  'use strict';
  const body = new Path2D('M-31 8C-40-2-40-18-34-18Q-26-10-19-11C-3-18 24-16 32-5C45 11 28 27 4 27C-15 29-28 24-31 8Z');
  const head = new Path2D('M-3-10C-18-24-11-53 10-58C33-64 49-43 37-24C33-17 27-12 20-10Z');
  const headEdge = new Path2D('M-3-10C-18-24-11-53 10-58C33-64 49-43 37-24');
  const beak = new Path2D('M35-31Q44-34 49-29Q53-23 46-20Q38-17 33-23Q32-27 35-31Z');
  const palette = ['#f57d5b', '#59a8aa'];
  function oval(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, 2 * Math.PI); c.fillStyle = fill; c.fill();
  }
  function wash(c, cream, top, bottom) {
    const g = c.createLinearGradient(-16, top, 24, bottom);
    g.addColorStop(0, cream ? '#fff9df' : '#fff0ad');
    g.addColorStop(.53, cream ? '#fff0c2' : '#ffdc6a');
    g.addColorStop(1, cream ? '#eddda9' : '#efc651');
    return g;
  }
  function draw(c, duck, time = 0, pose = {}) {
    const face = duck.facing >= 0 ? 1 : -1, scale = duck.scale || 1;
    const puff = pose.puff || 0, nod = pose.nod || 0, flap = pose.flap || 0;
    const bob = pose.still ? 0 : Math.sin(time * 5 + (duck.phase || 0)) * 1.4;
    const roll = pose.roll || (pose.still ? 0 : Math.sin(time * 3 + (duck.phase || 0)) * .025);
    const chestX = 1 + puff * .14, chestY = 1 - puff * .045;
    const markerY = 5 - puff * 2;
    c.save(); c.globalAlpha = pose.alpha === undefined ? 1 : pose.alpha;
    oval(c, duck.x, duck.y + 10 * scale, 34 * scale, 8 * scale, '#286f7525');
    c.strokeStyle = '#f1fbdf99'; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(duck.x, duck.y + 10 * scale, 42 * scale, 10 * scale, 0, .1, 3); c.stroke();
    c.translate(duck.x, duck.y + bob); c.scale(scale * face, scale); c.rotate(roll);
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.save(); c.translate(0, -puff * 2); c.scale(chestX, chestY);
    c.fillStyle = wash(c, duck.cream, -20, 28); c.fill(body); c.strokeStyle = '#34777b'; c.lineWidth = 2.25; c.stroke(body);
    // A soft belly shade retains the simple silhouette without a glossy plastic finish.
    c.save(); c.clip(body); oval(c, 1, 23, 28, 7, '#b88c2820'); c.restore();
    c.save(); c.translate(-13, 1); c.rotate(-flap * .55);
    c.beginPath(); c.moveTo(-10, -5); c.bezierCurveTo(0, -14, 21, -6, 18, 6); c.bezierCurveTo(5, 14, -8, 10, -10, -5);
    c.fillStyle = wash(c, duck.cream, -17, 24); c.fill();
    c.strokeStyle = duck.cream ? '#d6ca9b80' : '#d0b55480'; c.lineWidth = 1; c.stroke(); c.restore();
    c.restore();
    c.save(); c.translate(3, -13 - puff * 2); c.rotate(nod); c.translate(-3, 13);
    if (duck.baby) { c.translate(8, -21); c.scale(1.1, 1.1); c.translate(-8, 21); }
    c.fillStyle = wash(c, duck.cream, -61, -6); c.fill(head); c.strokeStyle = '#34777b'; c.lineWidth = 2.25; c.stroke(headEdge);
    c.fillStyle = '#f6a060'; c.fill(beak); c.strokeStyle = '#3c7b7d'; c.lineWidth = 1.9; c.stroke(beak);
    const blink = pose.blink || (!pose.still && (time + (duck.phase || 0)) % 5.9 < .12);
    if (blink) { c.beginPath(); c.moveTo(19.5, -35); c.quadraticCurveTo(23.5, -32, 27, -35); c.strokeStyle = '#174551'; c.lineWidth = 2.3; c.stroke(); }
    else { oval(c, 23.5, -35, 3.6, 4.9, '#174551'); oval(c, 24.2, -36.7, .65, .85, '#fff9db'); }
    oval(c, 28, -25, 4.6, 2.7, '#edac7532');
    c.restore();
    const localMarkers = [-10, 12].map((x, i) => ({ x: x * chestX, y: markerY, allele: duck.alleles[i] }));
    localMarkers.forEach((m, i) => {
      if (pose.highlight === i) {
        oval(c, m.x, m.y, 12.4, 12.4, '#fffbd4');
        c.beginPath(); c.arc(m.x, m.y, 12.4, 0, Math.PI * 2); c.strokeStyle = '#fffef1'; c.lineWidth = 1; c.stroke();
      }
      oval(c, m.x, m.y, 8.8, 8.8, palette[m.allele]);
      oval(c, m.x - 2, m.y - 2, 3.2, 1.5, '#ffffff16', -.35);
    });
    c.restore();
    const cos = Math.cos(roll), sin = Math.sin(roll);
    return localMarkers.map(m => ({ x: duck.x + (m.x * cos - m.y * sin) * scale * face, y: duck.y + bob + (m.x * sin + m.y * cos) * scale, allele: m.allele }));
  }
  window.DuckCharacter = { draw, palette, oval };
})();
