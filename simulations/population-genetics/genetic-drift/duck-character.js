/* Articulated reference-style duck. Cosmetic pose never changes its allele data. */
(function () {
  'use strict';
  const body = new Path2D('M-31 8C-40-2-40-18-34-18Q-26-10-19-11C-3-18 24-16 32-5C45 11 28 27 4 27C-15 29-28 24-31 8Z');
  const head = new Path2D('M-3-10C-18-24-11-53 10-58C33-64 49-43 37-24C33-17 27-12 20-10Z');
  const headEdge = new Path2D('M-3-10C-18-24-11-53 10-58C33-64 49-43 37-24C33-17 27-12 20-10');
  const beak = new Path2D('M35-31Q44-34 49-29Q53-23 46-20Q38-17 33-23Q32-27 35-31Z');
  // The wing holds the two allele beads, as the page text describes.
  const wing = new Path2D('M-25 1C-16-12 13-12 21 0C16 13-13 16-25 1Z');
  const palette = ['#f57d5b', '#59a8aa'];
  const shine = ['#ffc2ab', '#a6dedb'];
  const markerSpots = [[-9, 2], [9, 2]];
  function oval(c, x, y, rx, ry, fill, rotation = 0) {
    c.beginPath(); c.ellipse(x, y, rx, ry, rotation, 0, 2 * Math.PI); c.fillStyle = fill; c.fill();
  }
  // Keep the reference outline; broad light and shadow describe its rounded surface.
  function wash(c, tone, part) {
    const isHead = part === 'head';
    const stops = tone === 'grey' ? ['#f4f1e8', '#e7e2d3', '#d8d2bf', isHead ? '#dfd9c6' : '#c3bca4']
      : tone === 'cream' ? ['#fff9df', '#fff1cb', '#f4e5b9', isHead ? '#f4e6bb' : '#d8cca1']
      : ['#fff2a5', '#ffe17a', '#f9cf58', isHead ? '#f8d465' : '#d5b149'];
    const g = c.createRadialGradient(isHead ? 2 : -12, isHead ? -48 : -10, 2, isHead ? 12 : -1, isHead ? -35 : 4, isHead ? 45 : 53);
    g.addColorStop(0, stops[0]); g.addColorStop(.37, stops[1]); g.addColorStop(.72, stops[2]); g.addColorStop(1, stops[3]);
    return g;
  }
  function waterline(c, time, phase, close) {
    c.beginPath();
    for (let x = -46; x <= 48; x += 4) {
      const y = 16 + Math.sin(x * .18 + time * 3 + phase) * 1.2;
      if (x === -46) c.moveTo(x, y); else c.lineTo(x, y);
    }
    if (close) { c.lineTo(48, 36); c.lineTo(-46, 36); c.closePath(); }
  }
  function bead(c, x, y, allele, radius = 7.2) {
    const g = c.createRadialGradient(x - 2, y - 2.5, 1, x, y, radius);
    g.addColorStop(0, shine[allele]); g.addColorStop(1, palette[allele]);
    c.beginPath(); c.arc(x, y, radius, 0, 2 * Math.PI); c.fillStyle = g; c.fill();
    c.strokeStyle = '#1f3d3d29'; c.lineWidth = 1; c.stroke();
    oval(c, x - 2.4, y - 2.8, 2.3, 1.3, '#ffffffbf', -.5);
  }
  /* pose: still, alpha, puff, nod, flap, roll, blink, highlight(s), dry (no water effects), shadow (false: no ground marks),
     tone ('grey' for a duck that passed on nothing), sleep (closed eye),
     beads ('only' draws just the allele beads; 'none' leaves them out). */
  function draw(c, duck, time = 0, pose = {}) {
    const face = duck.facing >= 0 ? 1 : -1, scale = duck.scale || 1, phase = duck.phase || 0;
    const puff = pose.puff || 0, flap = pose.flap || 0;
    const bob = pose.still ? 0 : Math.sin(time * 2.6 + phase) * 1.3;
    let roll = pose.roll || (pose.still ? 0 : Math.sin(time * 3 + phase) * .025);
    let nod = pose.nod || 0;
    if (!pose.still) {
      // Occasional tail wiggles and head dips are random-looking habits with no meaning.
      const wiggle = (time * .17 + phase * .31) % 1, dip = (time * .11 + phase * .53) % 1;
      if (wiggle < .06) roll += Math.sin(wiggle / .06 * Math.PI * 4) * .06;
      if (dip < .07 && !pose.nod) nod += Math.sin(dip / .07 * Math.PI) * .36;
    }
    const chestX = 1 + puff * .14, chestY = 1 - puff * .045;
    const markerY = markerSpots[0][1] - puff * 2;
    const beadsOnly = pose.beads === 'only';
    c.save(); c.globalAlpha = pose.alpha === undefined ? 1 : pose.alpha;
    if (!beadsOnly && pose.shadow !== false) {
      if (pose.dry) oval(c, duck.x, duck.y + 22 * scale, 30 * scale, 5 * scale, '#5a3f1f30');
      else {
        // A soft reflection and a ripple ring seat the duck in the water.
        oval(c, duck.x + 3 * face * scale, duck.y + 21 * scale, 30 * scale, 6 * scale, '#ffd65a38');
        c.strokeStyle = '#f6fff099'; c.lineWidth = 1.6;
        c.beginPath(); c.ellipse(duck.x, duck.y + 16 * scale, 44 * scale, 9 * scale, 0, 0, 2 * Math.PI); c.stroke();
        c.strokeStyle = '#f6fff040'; c.lineWidth = 1.2;
        c.beginPath(); c.ellipse(duck.x, duck.y + 16 * scale, 55 * scale, 12 * scale, 0, .2, Math.PI - .2); c.stroke();
      }
    }
    c.translate(duck.x, duck.y + bob); c.scale(scale * face, scale); c.rotate(roll);
    c.lineJoin = 'round'; c.lineCap = 'round';
    const tone = pose.tone || (duck.cream ? 'cream' : 'yellow');
    if (!beadsOnly) {
      c.save(); c.translate(0, -puff * 2); c.scale(chestX, chestY);
      c.fillStyle = wash(c, tone, 'body'); c.fill(body);
      c.save(); c.clip(body);
      // The head casts a soft contact shadow into the chest, inside the original silhouette.
      const neckShadow = c.createRadialGradient(12, -12, 1, 12, -12, 23);
      neckShadow.addColorStop(0, '#a982292a'); neckShadow.addColorStop(1, '#a9822900');
      oval(c, 12, -12, 25, 19, neckShadow);
      if (!pose.dry) {
        const t = pose.still ? 0 : time;
        waterline(c, t, phase, true); c.fillStyle = '#3f96a04d'; c.fill();
        waterline(c, t, phase, false); c.strokeStyle = '#ffffffb3'; c.lineWidth = 1.4; c.stroke();
      }
      c.restore();
      c.strokeStyle = '#34777b'; c.lineWidth = 2.25; c.stroke(body);
      c.save(); c.translate(-2, 0); c.rotate(-flap * .35); c.translate(2, 0);
      c.fillStyle = tone === 'grey' ? '#e2dbc5' : '#f7cd52'; c.fill(wing);
      c.strokeStyle = tone === 'grey' ? '#b7ad8f' : '#c2952b'; c.lineWidth = 1.4; c.stroke(wing);
      c.restore();
      c.restore();
      c.save(); c.translate(3, -13 - puff * 2); c.rotate(nod); c.translate(-3, 13);
      if (duck.baby) { c.translate(8, -21); c.scale(1.1, 1.1); c.translate(-8, 21); }
      c.fillStyle = wash(c, tone, 'head'); c.fill(head); c.strokeStyle = '#34777b'; c.lineWidth = 2.25; c.stroke(headEdge);
      // An ochre bill keeps coral meaning only one thing: an allele.
      const bill = c.createLinearGradient(0, -33, 0, -19);
      bill.addColorStop(0, '#ffd27a'); bill.addColorStop(.6, '#f2ac3a'); bill.addColorStop(1, '#d08a22');
      c.fillStyle = bill; c.fill(beak); c.strokeStyle = '#3c7b7d'; c.lineWidth = 1.9; c.stroke(beak);
      const blink = pose.sleep || pose.blink || (!pose.still && (time + phase) % 5.9 < .12);
      if (blink) { c.beginPath(); c.moveTo(19.5, -35); c.quadraticCurveTo(23.5, -32, 27, -35); c.strokeStyle = '#174551'; c.lineWidth = 2.3; c.stroke(); }
      else oval(c, 23.5, -35, 3.6, 4.9, '#174551');
      c.restore();
    }
    const localMarkers = markerSpots.map(([x], i) => ({ x: x * chestX, y: markerY, allele: duck.alleles[i] }));
    if (pose.beads !== 'none') localMarkers.forEach((m, i) => {
      if (pose.highlight === i || (pose.highlights && pose.highlights.includes(i))) {
        oval(c, m.x, m.y, 11.6, 11.6, '#fffbd4');
        c.beginPath(); c.arc(m.x, m.y, 11.6, 0, Math.PI * 2); c.strokeStyle = '#fffef1'; c.lineWidth = 1; c.stroke();
      }
      bead(c, m.x, m.y, m.allele);
    });
    c.restore();
    const cos = Math.cos(roll), sin = Math.sin(roll);
    return localMarkers.map(m => ({ x: duck.x + (m.x * cos - m.y * sin) * scale * face, y: duck.y + bob + (m.x * sin + m.y * cos) * scale, allele: m.allele }));
  }
  window.DuckCharacter = { draw, bead, palette, oval, markerSpots, renderer: 'reference-volume' };
})();
