/* ConeSortium · Cone Case File
   1. Redactions: every <span class="r"> becomes a bar you can click (or press Enter on) to reveal.
   2. Read the full minutes: one button reveals every bar and slams a DISCLOSED stamp.
   3. Plate A: an inked survey of the track; the driverless car laps it, drawing the Way in red ink. */

(function () {
  'use strict';

  var root = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Redactions ---------- */

  var bars = [].slice.call(document.querySelectorAll('.r'));
  var counter = document.getElementById('withheld');

  function hiddenCount() {
    if (root.classList.contains('all')) return 0;
    return bars.filter(function (b) { return !b.classList.contains('on'); }).length;
  }
  function updateCount() { if (counter) counter.textContent = hiddenCount(); }

  bars.forEach(function (bar) {
    bar.tabIndex = 0;
    bar.setAttribute('role', 'button');
    bar.setAttribute('aria-pressed', 'false');
    bar.setAttribute('title', 'Redacted. Click to reveal.');

    function toggle() {
      var open = bar.classList.toggle('on');
      bar.setAttribute('aria-pressed', String(open));
      updateCount();
    }
    bar.addEventListener('click', toggle);
    bar.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  updateCount();

  /* ---------- 2. Read the full minutes ---------- */

  var button = document.getElementById('minutes');
  if (button) {
    var stamp = document.createElement('div');
    stamp.className = 'disclosed';
    stamp.setAttribute('aria-hidden', 'true');
    stamp.textContent = 'DISCLOSED';
    button.closest('.page').appendChild(stamp);

    button.addEventListener('click', function () {
      var open = root.classList.toggle('all');
      button.textContent = open ? 'CLOSE THE MINUTES' : 'READ THE FULL MINUTES';
      button.setAttribute('aria-pressed', String(open));
      if (!open) bars.forEach(function (b) { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
      updateCount();
      stamp.classList.remove('go');
      if (open) { void stamp.offsetWidth; stamp.classList.add('go'); }
    });
  }

  /* ---------- 3. Plate A ---------- */

  var svg = document.querySelector('[data-track]');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var TRACK = 'M90.0 70.0 L101.4 65.0 L114.8 61.0 L129.9 57.9 L146.2 55.5 L163.4 53.8 L181.2 52.5 L199.1 51.6 L216.8 51.0 L233.9 50.5 L250.0 50.0 L265.6 49.6 L281.4 49.4 L297.3 49.5 L313.1 49.9 L328.8 50.6 L344.1 51.7 L359.0 53.1 L373.4 55.0 L387.1 57.2 L400.0 60.0 L412.5 63.2 L425.0 67.0 L437.1 71.1 L448.9 75.7 L460.0 80.6 L470.3 85.9 L479.7 91.5 L487.8 97.4 L494.7 103.6 L500.0 110.0 L503.8 117.0 L506.3 125.0 L507.6 133.5 L507.8 142.5 L506.9 151.6 L505.0 160.5 L502.3 169.1 L498.9 177.0 L494.7 184.1 L490.0 190.0 L484.2 195.0 L476.8 199.6 L468.2 203.7 L458.8 207.3 L448.8 210.3 L438.4 212.7 L428.0 214.4 L418.0 215.4 L408.6 215.6 L400.0 215.0 L392.2 213.1 L384.9 209.7 L377.8 205.1 L371.0 199.6 L364.4 193.8 L357.8 187.8 L351.1 182.0 L344.3 176.9 L337.3 172.8 L330.0 170.0 L322.3 168.2 L314.3 166.7 L306.1 165.6 L297.8 165.0 L289.4 165.0 L281.0 165.6 L272.8 166.8 L264.9 168.7 L257.2 171.4 L250.0 175.0 L243.4 180.0 L237.4 186.7 L231.8 194.7 L226.5 203.6 L221.2 212.8 L215.9 222.0 L210.3 230.8 L204.2 238.7 L197.5 245.2 L190.0 250.0 L181.4 253.4 L171.7 256.2 L161.2 258.3 L150.2 259.7 L139.1 260.3 L128.0 260.1 L117.2 259.0 L107.1 257.0 L98.0 254.0 L90.0 250.0 L82.9 244.6 L76.0 237.8 L69.6 229.6 L63.7 220.5 L58.4 210.6 L53.9 200.3 L50.2 189.8 L47.4 179.4 L45.6 169.4 L45.0 160.0 L45.3 150.7 L46.4 140.9 L48.3 130.8 L51.0 120.6 L54.7 110.6 L59.4 101.0 L65.2 91.9 L72.2 83.5 L80.4 76.2 Z';
  var HALF_WIDTH = 19;   // distance from centerline to each cone row
  var SPACING = 24;      // rough distance between cones along the track, in plate units
  var CONE_GAP_M = 3;    // ...which is about 3 m on a real track; sets the scale bar
  var LAP_MS = 11000;    // one lap of the car

  var layer = svg;
  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return (parent || layer).appendChild(e);
  }

  // The plate: a ruled double frame, like an engraved survey sheet.
  // The drawing sits centred inside it, clear of the rules.
  el('rect', { x: 3, y: 3, width: 550, height: 298, 'class': 'frame' });
  el('rect', { x: 8, y: 8, width: 540, height: 288, 'class': 'frame thin' });
  layer = el('g', { transform: 'translate(1.5 -2)' });

  // Pencil centerline underneath, the red-ink Way on top.
  var path = el('path', { d: TRACK, 'class': 'centerline' });
  var length = path.getTotalLength();
  var way = el('path', { d: TRACK, 'class': 'way' });

  function frameAt(s) {
    s = ((s % length) + length) % length;
    var p = path.getPointAtLength(s), q = path.getPointAtLength((s + 1) % length);
    var dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1;
    return { x: p.x, y: p.y, tx: dx / n, ty: dy / n };
  }

  // Cones, drawn as small inked triangles: blue on the car's left, yellow on its right.
  var count = Math.round(length / SPACING), step = length / count;
  for (var i = 0; i < count; i++) {
    var f = frameAt(i * step);
    [['blue', 1], ['yellow', -1]].forEach(function (side) {
      var x = f.x + side[1] * f.ty * HALF_WIDTH, y = f.y - side[1] * f.tx * HALF_WIDTH;
      el('path', {
        d: 'M0 -5 L4 3.5 L-4 3.5Z',
        transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')',
        'class': 'cone ' + side[0]
      });
    });
  }

  // Survey furniture in the infield: a north arrow and a scale bar.
  var north = el('g', { 'class': 'furniture', transform: 'translate(118 168)' });
  el('path', { d: 'M0 -16 L5 4 L0 0 L-5 4Z' }, north);
  el('text', { x: 0, y: -21, 'text-anchor': 'middle' }, north).textContent = 'N';
  var M = SPACING / CONE_GAP_M;   // plate units per metre
  var scale = el('g', { 'class': 'furniture', transform: 'translate(' + (318 - 5 * M).toFixed(1) + ' 118)' });
  el('path', { d: 'M0 0 H' + 10 * M + ' M0 -4 V4 M' + 5 * M + ' -3 V3 M' + 10 * M + ' -4 V4', 'class': 'rule' }, scale);
  el('text', { x: 0, y: 16, 'text-anchor': 'middle' }, scale).textContent = '0';
  el('text', { x: 5 * M, y: 16, 'text-anchor': 'middle' }, scale).textContent = '5';
  el('text', { x: 10 * M, y: 16, 'text-anchor': 'middle' }, scale).textContent = '10 m';
  el('text', { x: 5 * M, y: -10, 'text-anchor': 'middle', 'class': 'note' }, scale).textContent = 'approx.';

  // The car is the pen.
  var car = el('path', { d: 'M9 0 -6 -5 -6 5Z', 'class': 'car' });
  var START = length * 0.12;
  function place(s) {
    var f = frameAt(s);
    car.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ') rotate(' + (Math.atan2(f.ty, f.tx) * 180 / Math.PI).toFixed(1) + ')');
  }
  // Ink the Way from the start line up to `drawn` along the track (wrapping past the path's end).
  way.style.strokeDashoffset = (-START).toFixed(1);
  function ink(drawn) {
    way.style.strokeDasharray = drawn.toFixed(1) + ' ' + (length - drawn + 0.01).toFixed(1);
  }

  var lapLabel = document.querySelector('[data-lap]');
  function setLap(n) { if (lapLabel) lapLabel.textContent = 'Lap ' + (n < 10 ? '0' : '') + n + ' of \u221e'; }

  if (reduceMotion) { place(START); ink(length); return; }

  // One lap per LAP_MS; the ink dries and is wiped at the start line.
  // The counter runs to ten and starts over: in this society, ten is infinite enough.
  var start = null;
  function tick(now) {
    if (start === null) start = now;
    var t = (now - start) / LAP_MS;
    var lap = Math.floor(t), d = (t - lap) * length;
    place(START + d);
    ink(d);
    setLap(lap % 10 + 1);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
