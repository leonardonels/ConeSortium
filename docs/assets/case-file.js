/* ConeSortium · Cone Case File
   1. Redactions: every <span class="r"> becomes a bar you can click (or press Enter on) to reveal.
   2. Read the full minutes: one button reveals every bar and slams a DISCLOSED stamp.
   3. Exhibit A: draws the track, its cones and a driverless car lapping it. */

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

  /* ---------- 3. Exhibit A ---------- */

  var svg = document.querySelector('[data-track]');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var TRACK = 'M90.0 70.0 L101.4 65.0 L114.8 61.0 L129.9 57.9 L146.2 55.5 L163.4 53.8 L181.2 52.5 L199.1 51.6 L216.8 51.0 L233.9 50.5 L250.0 50.0 L265.6 49.6 L281.4 49.4 L297.3 49.5 L313.1 49.9 L328.8 50.6 L344.1 51.7 L359.0 53.1 L373.4 55.0 L387.1 57.2 L400.0 60.0 L412.5 63.2 L425.0 67.0 L437.1 71.1 L448.9 75.7 L460.0 80.6 L470.3 85.9 L479.7 91.5 L487.8 97.4 L494.7 103.6 L500.0 110.0 L503.8 117.0 L506.3 125.0 L507.6 133.5 L507.8 142.5 L506.9 151.6 L505.0 160.5 L502.3 169.1 L498.9 177.0 L494.7 184.1 L490.0 190.0 L484.2 195.0 L476.8 199.6 L468.2 203.7 L458.8 207.3 L448.8 210.3 L438.4 212.7 L428.0 214.4 L418.0 215.4 L408.6 215.6 L400.0 215.0 L392.2 213.1 L384.9 209.7 L377.8 205.1 L371.0 199.6 L364.4 193.8 L357.8 187.8 L351.1 182.0 L344.3 176.9 L337.3 172.8 L330.0 170.0 L322.3 168.2 L314.3 166.7 L306.1 165.6 L297.8 165.0 L289.4 165.0 L281.0 165.6 L272.8 166.8 L264.9 168.7 L257.2 171.4 L250.0 175.0 L243.4 180.0 L237.4 186.7 L231.8 194.7 L226.5 203.6 L221.2 212.8 L215.9 222.0 L210.3 230.8 L204.2 238.7 L197.5 245.2 L190.0 250.0 L181.4 253.4 L171.7 256.2 L161.2 258.3 L150.2 259.7 L139.1 260.3 L128.0 260.1 L117.2 259.0 L107.1 257.0 L98.0 254.0 L90.0 250.0 L82.9 244.6 L76.0 237.8 L69.6 229.6 L63.7 220.5 L58.4 210.6 L53.9 200.3 L50.2 189.8 L47.4 179.4 L45.6 169.4 L45.0 160.0 L45.3 150.7 L46.4 140.9 L48.3 130.8 L51.0 120.6 L54.7 110.6 L59.4 101.0 L65.2 91.9 L72.2 83.5 L80.4 76.2 Z';
  var HALF_WIDTH = 19;   // distance from centerline to each cone row
  var SPACING = 24;      // rough distance between cones along the track
  var LAP_MS = 11000;    // one lap of the car

  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return svg.appendChild(e);
  }

  var path = el('path', { d: TRACK, 'class': 'centerline' });
  var length = path.getTotalLength();

  function frameAt(s) {
    s = ((s % length) + length) % length;
    var p = path.getPointAtLength(s), q = path.getPointAtLength((s + 1) % length);
    var dx = q.x - p.x, dy = q.y - p.y, n = Math.hypot(dx, dy) || 1;
    return { x: p.x, y: p.y, tx: dx / n, ty: dy / n };
  }

  // Cones: blue on the car's left, yellow on its right.
  var cones = [];
  var count = Math.round(length / SPACING), step = length / count;
  for (var i = 0; i < count; i++) {
    var s = i * step, f = frameAt(s);
    [['blue', 1], ['yellow', -1]].forEach(function (side) {
      var c = el('circle', {
        cx: (f.x + side[1] * f.ty * HALF_WIDTH).toFixed(1),
        cy: (f.y - side[1] * f.tx * HALF_WIDTH).toFixed(1),
        r: 4.5,
        'class': 'cone ' + side[0]
      });
      cones.push({ el: c, s: s });
    });
  }

  var car = el('path', { d: 'M12 0 -8 -6.5 -8 6.5Z', 'class': 'car' });
  function place(s) {
    var f = frameAt(s);
    car.setAttribute('transform', 'translate(' + f.x.toFixed(1) + ' ' + f.y.toFixed(1) + ') rotate(' + (Math.atan2(f.ty, f.tx) * 180 / Math.PI).toFixed(1) + ')');
  }
  place(length * 0.12);

  if (reduceMotion) return;

  // The car laps the centerline; cones within LiDAR range ahead of it light up.
  svg.classList.add('live');
  var near = length * 0.02, far = length * 0.22, start = null;
  function tick(now) {
    if (start === null) start = now;
    var pos = ((now - start) / LAP_MS * length + length * 0.12) % length;
    place(pos);
    cones.forEach(function (c) {
      var ahead = (c.s - pos + length) % length;
      c.el.classList.toggle('seen', ahead > near && ahead < far);
    });
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
