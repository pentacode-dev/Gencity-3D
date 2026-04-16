/**
 * GENCITY 3D — Procity Module
 * Description: Procedural 3D City Generator engine using p5.js, Three.js, and Clipper.js
 * All logic namespaced to avoid conflicts with Gencity 3D globals (bgCanvas, ctx, particles…)
 */

/* ══════════════════════════════════════════════════
   PROCITY BOOT FUNCTION
══════════════════════════════════════════════════ */
function bootProcity() {

  // ── STATE ──
  let pc_nodes = [], pc_edges = [], pc_lots = [], pc_isGenerating = true, pc_seed;
  let pc_cityReady = false, pc_p5Canvas = null;
  const PC_SCALE = 12, PC_STREET_Y = 1.5;

  let pc_currentView = sessionStorage.getItem('procity_view') || 'fps';
  let pc_currentTheme = sessionStorage.getItem('procity_theme') || 'cyberpunk';

  let pc_moveF = false, pc_moveB = false, pc_moveL = false, pc_moveR = false, pc_sprint = false;
  let pc_yaw = 0, pc_pitch = 0, pc_pointerLocked = false;

  let pc_orbitDragging = false, pc_orbitLast = { x: 0, y: 0 };
  let pc_orbitTheta = 0.6, pc_orbitPhi = Math.PI / 4, pc_orbitRadius = 120, pc_orbitTarget = { x: 0, y: 0, z: 0 };

  let pc_renderer, pc_scene, pc_camera, pc_orthoCamera, pc_clock;
  let pc_minimapVisible = false, pc_totalBuildings = 0;
  let pc_cityBounds = { cx: 0, cz: 0, w: 1, h: 1 };
  let pc_buildingColliders = [];

  let pc_groundMesh, pc_roadMeshes = [], pc_hwRoadMeshes = [], pc_ambientLight, pc_dirLight, pc_streetLights = [];

  const PC_THEMES = {
    cyberpunk: { fog: 0x000a05, fogNear: 30, fogFar: 180, sky: 0x000a05, ground: 0x0a1a0a, road: 0x1a1a1a, hwRoad: 0x252010, ambient: 0x0a1a0a, ambIntensity: 0.6, dir: 0x4466aa, dirIntensity: 0.5, streetLight: 0xffaa44, roofSat: 0.9, roofLight: 0.55, winHue: 0.15, winSat: 0.3, winLight: 0.75, buildingDarken: 0.55, buildingDesaturation: 0.7 },
    noir: { fog: 0x080604, fogNear: 25, fogFar: 140, sky: 0x080604, ground: 0x0d0b08, road: 0x141210, hwRoad: 0x1a1714, ambient: 0x1a1510, ambIntensity: 0.5, dir: 0x998866, dirIntensity: 0.35, streetLight: 0xcc9944, roofSat: 0.05, roofLight: 0.4, winHue: 0.11, winSat: 0.15, winLight: 0.65, buildingDarken: 0.45, buildingDesaturation: 0.9 },
    soviet: { fog: 0x0c0404, fogNear: 20, fogFar: 150, sky: 0x0c0404, ground: 0x100808, road: 0x180a0a, hwRoad: 0x201010, ambient: 0x180404, ambIntensity: 0.55, dir: 0xaa5533, dirIntensity: 0.45, streetLight: 0xff5500, roofSat: 0.8, roofLight: 0.5, winHue: 0.06, winSat: 0.5, winLight: 0.65, buildingDarken: 0.5, buildingDesaturation: 0.6 },
    arctic: { fog: 0x020810, fogNear: 40, fogFar: 220, sky: 0x020810, ground: 0x060c14, road: 0x0a1018, hwRoad: 0x0c1420, ambient: 0x102030, ambIntensity: 0.7, dir: 0x88bbdd, dirIntensity: 0.6, streetLight: 0x4499ff, roofSat: 0.6, roofLight: 0.7, winHue: 0.58, winSat: 0.4, winLight: 0.8, buildingDarken: 0.6, buildingDesaturation: 0.5 }
  };

  class PriorityQueue {
    constructor() { this.items = []; }
    push(i) { this.items.push(i); this.items.sort((a, b) => a.t - b.t); }
    pop() { return this.items.shift(); }
    isEmpty() { return this.items.length === 0; }
  }

  const PC_MAX_NODES = 1500, PC_HIGHWAY_LEN = 60, PC_STREET_LEN = 25;
  const PC_SNAP_DIST = 18, PC_MIN_LOT_AREA = 20, PC_NOISE_SCALE = 0.002, PC_WATER_THRESHOLD = 0.25;
  let pc_queue = new PriorityQueue();

  // ── p5 city generator ──
  new p5(function (p) {
    p.setup = function () {
      let cnv = p.createCanvas(p.windowWidth, p.windowHeight);
      cnv.parent('p5-canvas-container');
      pc_p5Canvas = cnv.elt;
      pc_seed = p.floor(p.random(999999));
      p.noiseSeed(pc_seed);
      let start = pcAddNode(p.width / 2, p.height / 2, p);
      let base = p.random(p.TWO_PI);
      for (let i = 0; i < 4; i++)
        pc_queue.push({ t: 0, from: start, angle: base + i * p.HALF_PI, type: "HIGHWAY", length: PC_HIGHWAY_LEN });
      document.getElementById('h-seed').textContent = pc_seed;
    };
    p.draw = function () {
      p.background(10);
      if (pc_isGenerating) {
        let done = false;
        for (let i = 0; i < 15; i++) {
          if (!pc_queue.isEmpty() && pc_nodes.length < PC_MAX_NODES) pcProcessStep(p);
          else { pc_isGenerating = false; done = true; pcBuildBlocks(p); break; }
        }
        if (!done) {
          let pct = Math.min(100, Math.round(pc_nodes.length / PC_MAX_NODES * 100));
          document.getElementById('progress-fill').style.width = pct + '%';
          document.getElementById('progress-text').textContent = 'GROWING ROAD NETWORK... ' + pc_nodes.length + '/' + PC_MAX_NODES;
        }
      }
      pcDrawTerrain(p); pcDrawLots(p); pcDrawRoads(p);
      if (!pc_cityReady && !pc_isGenerating) { pc_cityReady = true; pcOnCityReady(); }
    };
    p.windowResized = function () { p.resizeCanvas(p.windowWidth, p.windowHeight); };
  }, document.getElementById('p5-canvas-container'));

  function pcAddNode(x, y, p) { pc_nodes.push(p.createVector(x, y)); return pc_nodes.length - 1; }
  function pcAddEdge(u, v, type) { pc_edges.push({ u, v, type }); }
  function pcSplitEdge(i, pos, p) { let e = pc_edges[i], n = pcAddNode(pos.x, pos.y, p), old = e.v; e.v = n; pcAddEdge(n, old, e.type); return n; }

  function pcProcessStep(p) {
    let r = pc_queue.pop(); if (!r) return;
    let p1 = pc_nodes[r.from], angle = r.angle;
    if (r.type === "HIGHWAY") {
      let bA = angle, bP = -1;
      for (let a = angle - 0.2; a <= angle + 0.2; a += 0.05) {
        let pop = p.noise((p1.x + p.cos(a) * 100) * 0.003, (p1.y + p.sin(a) * 100) * 0.003);
        if (pop > bP) { bP = pop; bA = a; }
      }
      angle = bA;
    }
    let p2 = p.createVector(p1.x + p.cos(angle) * r.length, p1.y + p.sin(angle) * r.length);
    let res = pcLocalConstraints(r.from, p2, p);
    if (res.state === "FAILED") return;
    let idx, terminal = false;
    if (res.state === "SNAP_NODE") { idx = res.nodeIdx; terminal = true; }
    else if (res.state === "INTERSECT" || res.state === "SNAP_EDGE") { idx = pcSplitEdge(res.edgeIdx, res.pos, p); terminal = true; }
    else idx = pcAddNode(p2.x, p2.y, p);
    pcAddEdge(r.from, idx, r.type);
    if (!terminal) {
      pc_queue.push({ t: r.t + 1, from: idx, angle: angle + p.random(-0.02, 0.02), type: r.type, length: r.length });
      if (p.random() < (r.type === "HIGHWAY" ? 0.4 : 0.25)) {
        let side = p.random() > 0.5 ? p.HALF_PI : -p.HALF_PI;
        let type = (r.type === "HIGHWAY" && p.random() > 0.3) ? "STREET" : r.type;
        pc_queue.push({ t: r.t + 1, from: idx, angle: angle + side, type, length: type === "STREET" ? PC_STREET_LEN : PC_HIGHWAY_LEN });
      }
    }
  }

  function pcLocalConstraints(fi, p2, p) {
    let p1 = pc_nodes[fi];
    if (p2.x < 0 || p2.y < 0 || p2.x > p.width || p2.y > p.height) return { state: "FAILED" };
    if (p.noise(p2.x * PC_NOISE_SCALE, p2.y * PC_NOISE_SCALE + 5000) < PC_WATER_THRESHOLD) return { state: "FAILED" };
    let cl = null, md = Infinity, idx = -1;
    for (let i = 0; i < pc_edges.length; i++) {
      let e = pc_edges[i]; if (e.u === fi || e.v === fi) continue;
      let inter = pcLineIntersect(p1, p2, pc_nodes[e.u], pc_nodes[e.v], p);
      if (inter) { let d = p5.Vector.dist(p1, inter); if (d < md) { md = d; cl = inter; idx = i; } }
    }
    if (cl) return { state: "INTERSECT", pos: cl, edgeIdx: idx };
    for (let i = 0; i < pc_nodes.length; i++) { if (i === fi) continue; if (p5.Vector.dist(p2, pc_nodes[i]) < PC_SNAP_DIST) return { state: "SNAP_NODE", nodeIdx: i }; }
    for (let i = 0; i < pc_edges.length; i++) { let e = pc_edges[i], pr = pcProjectPt(p2, pc_nodes[e.u], pc_nodes[e.v]); if (pr.on && p5.Vector.dist(p2, pr.p) < PC_SNAP_DIST) return { state: "SNAP_EDGE", pos: pr.p, edgeIdx: i }; }
    return { state: "OK" };
  }

  function pcLineIntersect(p1, p2, p3, p4, p) {
    let den = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (den === 0) return null;
    let ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / den;
    let ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / den;
    if (ua > 0.05 && ua < 0.95 && ub > 0.05 && ub < 0.95) return p.createVector(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    return null;
  }

  function pcProjectPt(pt, a, b) {
    let l2 = p5.Vector.dist(a, b) ** 2;
    if (l2 === 0) return { p: a, on: false };
    let t = Math.max(0, Math.min(1, p5.Vector.sub(pt, a).dot(p5.Vector.sub(b, a)) / l2));
    return { p: p5.Vector.lerp(a, b, t), on: (t > 0 && t < 1) };
  }

  function pcPolyArea(poly) {
    let a = 0;
    for (let i = 0; i < poly.length; i++) { let j = (i + 1) % poly.length; a += poly[i].x * poly[j].y - poly[j].x * poly[i].y; }
    return Math.abs(a / 2);
  }

  function pcSimplifyPoly(poly) {
    let out = [];
    for (let i = 0; i < poly.length; i++) {
      let a = poly[(i - 1 + poly.length) % poly.length], b = poly[i], c = poly[(i + 1) % poly.length];
      if (p5.Vector.sub(b, a).normalize().dot(p5.Vector.sub(c, b).normalize()) < 0.999) out.push(b);
    }
    return out;
  }

  function pcBuildBlocks(p) {
    const S = 100;
    let world = [[{ X: 0, Y: 0 }, { X: p.width * S, Y: 0 }, { X: p.width * S, Y: p.height * S }, { X: 0, Y: p.height * S }]];
    let roadPolys = pc_edges.map(e => {
      let a = pc_nodes[e.u], b = pc_nodes[e.v], w = e.type === "HIGHWAY" ? 5 : 2;
      let d = p5.Vector.sub(b, a).normalize(), n = p.createVector(-d.y, d.x).mult(w);
      return [
        { X: Math.floor((a.x + n.x) * S), Y: Math.floor((a.y + n.y) * S) },
        { X: Math.floor((b.x + n.x) * S), Y: Math.floor((b.y + n.y) * S) },
        { X: Math.floor((b.x - n.x) * S), Y: Math.floor((b.y - n.y) * S) },
        { X: Math.floor((a.x - n.x) * S), Y: Math.floor((a.y - n.y) * S) }
      ];
    });
    let c = new ClipperLib.Clipper(), roads = [];
    c.AddPaths(roadPolys, ClipperLib.PolyType.ptSubject, true);
    c.Execute(ClipperLib.ClipType.ctUnion, roads, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    let c2 = new ClipperLib.Clipper(), blocks = [];
    c2.AddPaths(world, ClipperLib.PolyType.ptSubject, true);
    c2.AddPaths(roads, ClipperLib.PolyType.ptClip, true);
    c2.Execute(ClipperLib.ClipType.ctDifference, blocks, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
    pc_lots = [];
    blocks.forEach(poly => {
      let pts = poly.map(pt => p.createVector(pt.X / S, pt.Y / S));
      let onWater = false;
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(v => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); });
      for (let gx = 0; gx <= 4 && !onWater; gx++) for (let gy = 0; gy <= 4 && !onWater; gy++) {
        let tx = minX + (maxX - minX) * gx / 4, ty = minY + (maxY - minY) * gy / 4;
        if (p.noise(tx * PC_NOISE_SCALE, ty * PC_NOISE_SCALE + 5000) < PC_WATER_THRESHOLD) onWater = true;
      }
      if (!onWater) for (let v of pts) if (p.noise(v.x * PC_NOISE_SCALE, v.y * PC_NOISE_SCALE + 5000) < PC_WATER_THRESHOLD) { onWater = true; break; }
      if (!onWater && pcPolyArea(pts) > PC_MIN_LOT_AREA) {
        let clean = pcSimplifyPoly(pts);
        if (clean.length >= 3) pc_lots.push({ points: clean, color: [Math.random() * 130 + 70, Math.random() * 130 + 70, Math.random() * 130 + 70] });
      }
    });
    document.getElementById('h-blocks').textContent = pc_lots.length;
    document.getElementById('progress-text').textContent = 'BUILDING 3D SCENE...';
    document.getElementById('progress-fill').style.width = '100%';
  }

  function pcDrawTerrain(p) {
    p.noStroke(); p.fill(20, 40, 20); p.rect(0, 0, p.width, p.height);
    p.fill(20, 50, 100);
    for (let x = 0; x < p.width; x += 20) for (let y = 0; y < p.height; y += 20)
      if (p.noise(x * PC_NOISE_SCALE, y * PC_NOISE_SCALE + 5000) < PC_WATER_THRESHOLD) p.rect(x, y, 20, 20);
  }

  function pcDrawRoads(p) {
    for (let e of pc_edges) {
      p.stroke(e.type === "HIGHWAY" ? "#fc0" : "#888");
      p.strokeWeight(e.type === "HIGHWAY" ? 3 : 1);
      p.line(pc_nodes[e.u].x, pc_nodes[e.u].y, pc_nodes[e.v].x, pc_nodes[e.v].y);
    }
  }

  function pcDrawLots(p) {
    p.stroke(0, 120); p.strokeWeight(1);
    for (let lot of pc_lots) {
      p.fill(lot.color[0], lot.color[1], lot.color[2], 220);
      p.beginShape(); for (let v of lot.points) p.vertex(v.x, v.y); p.endShape(p.CLOSE);
    }
  }

  function pcPointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      let xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function pcErodePoly(pts, margin) {
    const S = 100;
    let cl = pts.map(v => ({ X: Math.round(v.x * S), Y: Math.round(v.y * S) }));
    let co = new ClipperLib.ClipperOffset();
    co.AddPath(cl, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
    let sol = []; co.Execute(sol, -margin * S);
    if (!sol || !sol.length) return null;
    return sol[0].map(pt => ({ x: pt.X / S, y: pt.Y / S }));
  }

  function pcC2t(x, y, rW, rH) { return { x: (x - rW / 2) / PC_SCALE, z: (y - rH / 2) / PC_SCALE }; }

  function pcOnCityReady() {
    document.getElementById('h-state').textContent = 'CITY LOADED · CLICK TO EXPLORE';
    pcBuildThreeScene();
    setTimeout(() => {
      document.getElementById('splash').classList.add('fade');
      setTimeout(() => {
        document.getElementById('splash').style.display = 'none';
        if (pc_currentView === 'fps') document.getElementById('lock-prompt').classList.remove('hidden');
        else pcShowOrbitHint();
      }, 900);
    }, 600);
  }

  function pcBuildThreeScene() {
    const cnv = document.getElementById('three-canvas');
    pc_renderer = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
    pc_renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    pc_renderer.setSize(window.innerWidth, window.innerHeight);
    pc_renderer.shadowMap.enabled = true;
    pc_renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    pc_scene = new THREE.Scene();
    pc_camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);
    pc_camera.rotation.order = 'YXZ';
    pc_clock = new THREE.Clock();

    let ow = window.innerWidth / 12, oh = window.innerHeight / 12;
    pc_orthoCamera = new THREE.OrthographicCamera(-ow, ow, oh, -oh, 0.1, 800);
    pc_orthoCamera.rotation.order = 'YXZ';

    pcApplyThemeToScene();

    const refW = window.innerWidth, refH = window.innerHeight;

    let gGeo = new THREE.PlaneGeometry(refW / PC_SCALE * 2, refH / PC_SCALE * 2);
    let gMat = new THREE.MeshLambertMaterial({ color: PC_THEMES[pc_currentTheme].ground });
    pc_groundMesh = new THREE.Mesh(gGeo, gMat);
    pc_groundMesh.rotation.x = -Math.PI / 2; pc_groundMesh.receiveShadow = true;
    pc_scene.add(pc_groundMesh);

    let rMat = new THREE.MeshLambertMaterial({ color: PC_THEMES[pc_currentTheme].road });
    let hMat = new THREE.MeshLambertMaterial({ color: PC_THEMES[pc_currentTheme].hwRoad });
    pc_edges.forEach(e => {
      let a = pc_nodes[e.u], b = pc_nodes[e.v];
      let ta = pcC2t(a.x, a.y, refW, refH), tb = pcC2t(b.x, b.y, refW, refH);
      let dx = tb.x - ta.x, dz = tb.z - ta.z, len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.01) return;
      let w = e.type === "HIGHWAY" ? 0.9 : 0.35;
      let geo = new THREE.BoxGeometry(len, 0.01, w);
      let mesh = new THREE.Mesh(geo, e.type === "HIGHWAY" ? hMat : rMat);
      mesh.position.set((ta.x + tb.x) / 2, 0.02, (ta.z + tb.z) / 2);
      mesh.rotation.y = -Math.atan2(dz, dx);
      mesh.receiveShadow = true;
      pc_scene.add(mesh);
      if (e.type === "HIGHWAY") pc_hwRoadMeshes.push(mesh); else pc_roadMeshes.push(mesh);
    });

    const centerX = refW / 2, centerY = refH / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    pc_totalBuildings = 0;
    const th = PC_THEMES[pc_currentTheme];

    pc_lots.forEach((lot, lotIdx) => {
      let pts = lot.points, area = pcPolyArea(pts);
      let eroded = pcErodePoly(pts, 2);
      if (!eroded || eroded.length < 3) return;
      let count = Math.max(1, Math.min(8, Math.floor(area / 400)));
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      eroded.forEach(v => { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); });
      if (maxX - minX < 2 || maxY - minY < 2) return;
      let cx = eroded.reduce((s, v) => s + v.x, 0) / eroded.length;
      let cy = eroded.reduce((s, v) => s + v.y, 0) / eroded.length;
      let centerFactor = 1 - Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2) / maxDist;

      let lseed = lotIdx * 7919 + 13;
      function lr() { lseed = (lseed * 1664525 + 1013904223) & 0xffffffff; return (lseed >>> 0) / 0xffffffff; }

      let placed = 0, attempts = 0;
      while (placed < count && attempts < count * 40) {
        attempts++;
        let bx = minX + lr() * (maxX - minX), by = minY + lr() * (maxY - minY);
        let fw = 5 + lr() * 10, fd = 5 + lr() * 10;
        let hfw = fw / 2, hfd = fd / 2;
        let corners = [{ x: bx - hfw, y: by - hfd }, { x: bx + hfw, y: by - hfd }, { x: bx + hfw, y: by + hfd }, { x: bx - hfw, y: by + hfd }];
        if (!corners.every(c => pcPointInPoly(c.x, c.y, eroded))) continue;
        let hPx = Math.max(12, (20 + lr() * 30) + (centerFactor * 40 * lr()));
        let t3 = pcC2t(bx, by, refW, refH);
        let w3 = fw / PC_SCALE, d3 = fd / PC_SCALE, h3 = hPx / PC_SCALE;

        let r = lot.color[0] / 255, g = lot.color[1] / 255, b = lot.color[2] / 255;
        let avg = (r + g + b) / 3;
        let ds = th.buildingDesaturation;
        r = avg * ds + r * (1 - ds); g = avg * ds + g * (1 - ds); b = avg * ds + b * (1 - ds);
        r *= th.buildingDarken; g *= th.buildingDarken; b *= th.buildingDarken;

        let geo = new THREE.BoxGeometry(w3, h3, d3);
        let mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(r, g, b) });
        let mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(t3.x, h3 / 2, t3.z);
        mesh.castShadow = true; mesh.receiveShadow = true;
        pc_scene.add(mesh);

        let pad = 0.15;
        pc_buildingColliders.push({ minX: t3.x - w3 / 2 - pad, maxX: t3.x + w3 / 2 + pad, minZ: t3.z - d3 / 2 - pad, maxZ: t3.z + d3 / 2 + pad });

        if (hPx > 30) {
          let rH = 0.08;
          let rGeo = new THREE.BoxGeometry(w3 + 0.02, rH, d3 + 0.02);
          let hue = th.roofSat > 0.5 ? lr() : (th.winHue + lr() * 0.05);
          let rCol = new THREE.Color().setHSL(hue, th.roofSat, th.roofLight);
          let rMesh = new THREE.Mesh(rGeo, new THREE.MeshBasicMaterial({ color: rCol }));
          rMesh.position.set(t3.x, h3 + rH / 2, t3.z);
          pc_scene.add(rMesh);
          if (lr() < 0.3) {
            let pl = new THREE.PointLight(rCol, 0.6 + lr() * 0.8, 12);
            pl.position.set(t3.x, h3 + 0.5, t3.z);
            pc_scene.add(pl);
          }
        }

        let wCol = new THREE.Color().setHSL(th.winHue + lr() * 0.05, th.winSat, th.winLight);
        let wMat = new THREE.MeshBasicMaterial({ color: wCol });
        let cols = Math.max(1, Math.floor(w3 / 0.3)), rows = Math.max(1, Math.floor(h3 / 0.35));
        let stepX = w3 / cols, stepY = h3 / rows;
        for (let face = 0; face < 2; face++) {
          let fz = face === 0 ? t3.z + d3 / 2 + 0.01 : t3.z - d3 / 2 - 0.01;
          for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
            if (lr() > 0.55) continue;
            let wx = t3.x - w3 / 2 + stepX * (col + 0.3), wy = stepY * (row + 0.2);
            let wMesh = new THREE.Mesh(new THREE.PlaneGeometry(stepX * 0.5, stepY * 0.55), wMat);
            wMesh.position.set(wx, wy, fz);
            if (face === 1) wMesh.rotation.y = Math.PI;
            pc_scene.add(wMesh);
          }
        }
        placed++; pc_totalBuildings++;
      }
    });

    document.getElementById('h-buildings').textContent = pc_totalBuildings;

    let allX = pc_nodes.map(n => n.x), allZ = pc_nodes.map(n => n.y);
    let t1 = pcC2t(Math.min(...allX), Math.min(...allZ), refW, refH);
    let t2 = pcC2t(Math.max(...allX), Math.max(...allZ), refW, refH);
    pc_cityBounds = { cx: (t1.x + t2.x) / 2, cz: (t1.z + t2.z) / 2, w: Math.max(1, t2.x - t1.x), h: Math.max(1, t2.z - t1.z) };
    pc_orbitTarget = { x: pc_cityBounds.cx, y: 0, z: pc_cityBounds.cz };

    pc_ambientLight = new THREE.AmbientLight(th.ambient, th.ambIntensity);
    pc_scene.add(pc_ambientLight);
    pc_dirLight = new THREE.DirectionalLight(th.dir, th.dirIntensity);
    pc_dirLight.position.set(50, 80, 30);
    pc_dirLight.castShadow = true;
    pc_dirLight.shadow.camera.near = 0.1; pc_dirLight.shadow.camera.far = 400;
    pc_dirLight.shadow.camera.left = -150; pc_dirLight.shadow.camera.right = 150;
    pc_dirLight.shadow.camera.top = 150; pc_dirLight.shadow.camera.bottom = -150;
    pc_dirLight.shadow.mapSize.set(2048, 2048);
    pc_scene.add(pc_dirLight);

    for (let i = 0; i < 8; i++) {
      let ang = i / 8 * Math.PI * 2, r2 = 15 + Math.random() * 25;
      let sl = new THREE.PointLight(th.streetLight, 0.4 + Math.random() * 0.4, 20);
      sl.position.set(Math.cos(ang) * r2, 2, Math.sin(ang) * r2);
      pc_scene.add(sl); pc_streetLights.push(sl);
    }

    window.addEventListener('resize', () => {
      pc_camera.aspect = window.innerWidth / window.innerHeight;
      pc_camera.updateProjectionMatrix();
      let ow2 = window.innerWidth / 12, oh2 = window.innerHeight / 12;
      pc_orthoCamera.left = -ow2; pc_orthoCamera.right = ow2;
      pc_orthoCamera.top = oh2; pc_orthoCamera.bottom = -oh2;
      pc_orthoCamera.updateProjectionMatrix();
      pc_renderer.setSize(window.innerWidth, window.innerHeight);
    });

    pcApplyThemeToScene();
    pcSetView(pc_currentView, true);
    pcRender();
  }

  function pcApplyThemeToScene() {
    if (!pc_scene) return;
    const th = PC_THEMES[pc_currentTheme];
    pc_scene.background = new THREE.Color(th.sky);
    pc_scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
    pc_renderer.setClearColor(th.sky);
    if (pc_groundMesh) pc_groundMesh.material.color.set(th.ground);
    pc_roadMeshes.forEach(m => m.material.color.set(th.road));
    pc_hwRoadMeshes.forEach(m => m.material.color.set(th.hwRoad));
    if (pc_ambientLight) { pc_ambientLight.color.set(th.ambient); pc_ambientLight.intensity = th.ambIntensity; }
    if (pc_dirLight) { pc_dirLight.color.set(th.dir); pc_dirLight.intensity = th.dirIntensity; }
    pc_streetLights.forEach(sl => sl.color.set(th.streetLight));
  }

  function pcRender() {
    requestAnimationFrame(pcRender);
    if (!pc_renderer) return;
    let dt = Math.min(pc_clock.getDelta(), 0.05);

    if (pc_currentView === 'fps' && pc_pointerLocked) {
      let spd = pc_sprint ? 18 : 7;
      let fd = new THREE.Vector3(); pc_camera.getWorldDirection(fd); fd.y = 0; fd.normalize();
      let rt = new THREE.Vector3().crossVectors(fd, new THREE.Vector3(0, 1, 0));
      let newPos = pc_camera.position.clone();
      if (pc_moveF) newPos.addScaledVector(fd, spd * dt);
      if (pc_moveB) newPos.addScaledVector(fd, -spd * dt);
      if (pc_moveR) newPos.addScaledVector(rt, spd * dt);
      if (pc_moveL) newPos.addScaledVector(rt, -spd * dt);
      newPos.y = PC_STREET_Y;
      const PR = 0.35;
      let nx = newPos.x, nz = newPos.z;
      for (let i = 0; i < pc_buildingColliders.length; i++) {
        let c = pc_buildingColliders[i];
        if (nx + PR > c.minX && nx - PR < c.maxX && nz + PR > c.minZ && nz - PR < c.maxZ) {
          let ox = pc_camera.position.x, oz = pc_camera.position.z;
          let sX = ox, sZ = nz;
          let sXB = (sX + PR > c.minX && sX - PR < c.maxX && sZ + PR > c.minZ && sZ - PR < c.maxZ);
          let sZX = nx, sZZ = oz;
          let sZB = (sZX + PR > c.minX && sZX - PR < c.maxX && sZZ + PR > c.minZ && sZZ - PR < c.maxZ);
          if (!sXB) { nx = sX; nz = sZ; }
          else if (!sZB) { nx = sZX; nz = sZZ; }
          else { nx = ox; nz = oz; }
          break;
        }
      }
      pc_camera.position.set(nx, PC_STREET_Y, nz);
      document.getElementById('h-pos').textContent = `${pc_camera.position.x.toFixed(1)}, ${pc_camera.position.z.toFixed(1)}`;
    }

    if (pc_currentView === 'bird' && !pc_orbitDragging) pc_orbitTheta += 0.0002;
    if (pc_currentView === 'bird' || pc_currentView === 'iso') pcUpdateOrbitCamera();

    if (pc_currentView !== 'top') {
      let activeCamera = (pc_currentView === 'iso') && pc_orthoCamera ? pc_orthoCamera : pc_camera;
      pc_renderer.render(pc_scene, activeCamera);
    }

    if (pc_minimapVisible && pc_cityBounds.w > 0) {
      let dot = document.getElementById('mm-dot');
      let mm = document.getElementById('minimap');
      let mmW = mm.offsetWidth, mmH = mm.offsetHeight;
      let px = ((pc_camera.position.x - pc_cityBounds.cx) / pc_cityBounds.w + 0.5) * mmW;
      let pz = ((pc_camera.position.z - pc_cityBounds.cz) / pc_cityBounds.h + 0.5) * mmH;
      dot.style.left = Math.max(4, Math.min(mmW - 4, px)) + 'px';
      dot.style.top = Math.max(4, Math.min(mmH - 4, pz)) + 'px';
    }
  }

  function pcUpdateOrbitCamera() {
    if (pc_currentView === 'bird') {
      let x = pc_orbitTarget.x + pc_orbitRadius * Math.sin(pc_orbitPhi) * Math.cos(pc_orbitTheta);
      let y = pc_orbitTarget.y + pc_orbitRadius * Math.cos(pc_orbitPhi);
      let z = pc_orbitTarget.z + pc_orbitRadius * Math.sin(pc_orbitPhi) * Math.sin(pc_orbitTheta);
      pc_camera.position.set(x, y, z);
      pc_camera.lookAt(pc_orbitTarget.x, pc_orbitTarget.y, pc_orbitTarget.z);
    } else if (pc_currentView === 'iso') {
      const ISO_THETA = Math.PI / 4;
      const ISO_PHI = Math.atan(1 / Math.sqrt(2));
      const r = pc_orbitRadius * 0.85;
      let x = pc_orbitTarget.x + r * Math.sin(ISO_PHI) * Math.cos(ISO_THETA);
      let y = pc_orbitTarget.y + r * Math.cos(ISO_PHI);
      let z = pc_orbitTarget.z + r * Math.sin(ISO_PHI) * Math.sin(ISO_THETA);
      pc_orthoCamera.position.set(x, y, z);
      pc_orthoCamera.lookAt(pc_orbitTarget.x, pc_orbitTarget.y, pc_orbitTarget.z);
    }
  }

  // ── Public functions called by toolbar buttons ──
  window.pcSetView = function (v, silent) {
    if (!silent) {
      let fl = document.getElementById('view-flash');
      fl.style.opacity = '0.15';
      setTimeout(() => fl.style.opacity = '0', 200);
    }
    if (pc_currentView === 'fps' && v !== 'fps') { pc_mouseLookActive = false; pc_pointerLocked = false; }
    if (pc_currentView === 'top' && v !== 'top') {
      document.getElementById('p5-canvas-container').classList.remove('active');
      document.getElementById('three-canvas').style.display = 'block';
    }
    pc_currentView = v;
    document.querySelectorAll('#btn-fps,#btn-bird,#btn-iso,#btn-top').forEach(b => b.classList.remove('active'));
    document.getElementById({ fps: 'btn-fps', bird: 'btn-bird', iso: 'btn-iso', top: 'btn-top' }[v]).classList.add('active');
    document.getElementById('h-view').textContent = { fps: 'FIRST PERSON', bird: 'BIRD EYE', iso: 'ISOMETRIC', top: 'TOP DOWN' }[v];
    document.getElementById('hud-tr').style.display = v === 'fps' ? 'block' : 'none';
    document.getElementById('crosshair').style.display = (v === 'fps' && pc_pointerLocked) ? 'block' : 'none';
    document.getElementById('orbit-hint').classList.toggle('vis', v === 'bird');
    document.getElementById('orbit-hint').textContent = 'DRAG TO ORBIT · SCROLL TO ZOOM';
    if (v === 'fps') {
      if (!silent && pc_cityReady) document.getElementById('lock-prompt').classList.remove('hidden');
      pc_camera.fov = 75; pc_camera.updateProjectionMatrix();
      pc_camera.rotation.order = 'YXZ';
      pc_camera.position.set(0, PC_STREET_Y, 0);
      pc_camera.rotation.set(0, pc_yaw, 0);
    } else if (v === 'bird') {
      document.getElementById('lock-prompt').classList.add('hidden');
      pc_camera.fov = 60; pc_camera.updateProjectionMatrix();
      pc_orbitPhi = 0.45; pc_orbitRadius = 55;
      pcUpdateOrbitCamera();
    } else if (v === 'iso') {
      document.getElementById('lock-prompt').classList.add('hidden');
      pc_orbitRadius = 55;
      let ow = window.innerWidth / 20, oh = window.innerHeight / 20;
      pc_orthoCamera.left = -ow; pc_orthoCamera.right = ow;
      pc_orthoCamera.top = oh; pc_orthoCamera.bottom = -oh;
      pc_orthoCamera.updateProjectionMatrix();
      pcUpdateOrbitCamera();
    } else if (v === 'top') {
      document.getElementById('lock-prompt').classList.add('hidden');
      document.getElementById('p5-canvas-container').classList.add('active');
      document.getElementById('three-canvas').style.display = 'none';
    }
  };

  window.pcSetTheme = function (t) {
    pc_currentTheme = t;
    document.getElementById('procity-root').className = 'procity-root theme-' + t;
    pcApplyThemeToScene();
    document.querySelectorAll('.tb-btn[id^="btn-t-"]').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-t-' + t).classList.add('active');
    document.getElementById('h-theme').textContent = { cyberpunk: 'CYBERPUNK', noir: 'NOIR', soviet: 'SOVIET', arctic: 'ARCTIC' }[t];
  };

  window.pcNewCity = function () {
    sessionStorage.setItem('procity_view', pc_currentView);
    sessionStorage.setItem('procity_theme', pc_currentTheme);
    pc_nodes = []; pc_edges = []; pc_lots = []; pc_isGenerating = true; pc_cityReady = false;
    pc_roadMeshes = []; pc_hwRoadMeshes = []; pc_streetLights = []; pc_buildingColliders = [];
    if (pc_renderer) { pc_renderer.dispose(); pc_renderer = null; }
    pc_scene = null; pc_camera = null; pc_orthoCamera = null;
    document.getElementById('splash').style.display = 'flex';
    document.getElementById('splash').classList.remove('fade');
    document.getElementById('progress-fill').style.width = '0%';
    document.getElementById('h-seed').textContent = '—';
    document.getElementById('h-blocks').textContent = '—';
    document.getElementById('h-buildings').textContent = '—';
    window._procityBooted = false;
    bootProcity();
  };

  function pcShowOrbitHint() {
    let h = document.getElementById('orbit-hint');
    h.classList.add('vis');
    setTimeout(() => h.classList.remove('vis'), 3000);
  }

  // ── Input: keyboard ──
  let pc_mouseLookActive = false, pc_lastMouseX = 0, pc_lastMouseY = 0;

  document.addEventListener('keydown', e => {
    if (document.getElementById('page-procity').classList.contains('active')) {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': pc_moveF = true; break;
        case 'KeyS': case 'ArrowDown': pc_moveB = true; break;
        case 'KeyA': case 'ArrowLeft': pc_moveL = true; break;
        case 'KeyD': case 'ArrowRight': pc_moveR = true; break;
        case 'ShiftLeft': case 'ShiftRight': pc_sprint = true; break;
        case 'KeyM': pcToggleMinimap(); break;
        case 'KeyR': pcNewCity(); break;
        case 'Digit1': pcSetView('fps'); break;
        case 'Digit2': pcSetView('bird'); break;
        case 'Digit3': pcSetView('iso'); break;
        case 'Digit4': pcSetView('top'); break;
      }
    }
  });

  document.addEventListener('keyup', e => {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': pc_moveF = false; break;
      case 'KeyS': case 'ArrowDown': pc_moveB = false; break;
      case 'KeyA': case 'ArrowLeft': pc_moveL = false; break;
      case 'KeyD': case 'ArrowRight': pc_moveR = false; break;
      case 'ShiftLeft': case 'ShiftRight': pc_sprint = false; break;
    }
  });

  document.getElementById('three-canvas').addEventListener('click', e => {
    if (e.target.closest && e.target.closest('#toolbar')) return;
    if (pc_currentView === 'fps') {
      pc_mouseLookActive = !pc_mouseLookActive;
      pc_pointerLocked = pc_mouseLookActive;
      let lp = document.getElementById('lock-prompt');
      lp.classList.toggle('hidden', pc_mouseLookActive);
      document.getElementById('crosshair').style.display = pc_mouseLookActive ? 'block' : 'none';
      document.getElementById('h-state').textContent = pc_mouseLookActive ? 'EXPLORING · CLICK TO PAUSE' : 'PAUSED · CLICK TO RESUME';
    }
  });

  document.getElementById('lock-prompt').addEventListener('click', () => {
    if (pc_currentView === 'fps') {
      pc_mouseLookActive = true; pc_pointerLocked = true;
      document.getElementById('lock-prompt').classList.add('hidden');
      document.getElementById('crosshair').style.display = 'block';
      document.getElementById('h-state').textContent = 'EXPLORING · CLICK TO PAUSE';
    }
  });

  document.addEventListener('mousemove', e => {
    if (pc_currentView === 'fps' && pc_mouseLookActive) {
      let dx = e.clientX - pc_lastMouseX, dy = e.clientY - pc_lastMouseY;
      pc_yaw -= dx * 0.003;
      pc_pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, pc_pitch - dy * 0.003));
      pc_camera.rotation.y = pc_yaw; pc_camera.rotation.x = pc_pitch;
    }
    pc_lastMouseX = e.clientX; pc_lastMouseY = e.clientY;
    if (pc_currentView === 'bird' && pc_orbitDragging) {
      let dx = e.clientX - pc_orbitLast.x, dy = e.clientY - pc_orbitLast.y;
      pc_orbitLast = { x: e.clientX, y: e.clientY };
      pc_orbitTheta -= dx * 0.005;
      pc_orbitPhi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, pc_orbitPhi - dy * 0.005));
    }
  });

  document.addEventListener('mousedown', e => {
    if (e.target && e.target.closest && e.target.closest('#toolbar')) return;
    if (pc_currentView === 'bird') { pc_orbitDragging = true; pc_orbitLast = { x: e.clientX, y: e.clientY }; }
  });
  document.addEventListener('mouseup', () => pc_orbitDragging = false);

  document.addEventListener('wheel', e => {
    if (pc_currentView === 'bird') {
      pc_orbitRadius = Math.max(15, Math.min(150, pc_orbitRadius + e.deltaY * 0.05));
    } else if (pc_currentView === 'iso') {
      pc_orbitRadius = Math.max(15, Math.min(200, pc_orbitRadius + e.deltaY * 0.05));
      let ow = window.innerWidth / 20 * (pc_orbitRadius / 55), oh = window.innerHeight / 20 * (pc_orbitRadius / 55);
      pc_orthoCamera.left = -ow; pc_orthoCamera.right = ow;
      pc_orthoCamera.top = oh; pc_orthoCamera.bottom = -oh;
      pc_orthoCamera.updateProjectionMatrix();
    }
  }, { passive: true });

  function pcToggleMinimap() {
    pc_minimapVisible = !pc_minimapVisible;
    let mm = document.getElementById('minimap');
    mm.classList.toggle('vis', pc_minimapVisible);
    if (pc_minimapVisible && pc_p5Canvas) {
      let old = mm.querySelector('canvas');
      if (old) mm.removeChild(old);
      let mc = document.createElement('canvas');
      mc.width = 200; mc.height = 200;
      mc.style.position = 'absolute'; mc.style.top = '0'; mc.style.left = '0';
      mc.style.width = '100%'; mc.style.height = '100%';
      mm.appendChild(mc);
      let mctx = mc.getContext('2d');
      mctx.drawImage(pc_p5Canvas, 0, 0, 200, 200);
    }
  }

} // end bootProcity

// ── Global toolbar button proxies ──
function pcSetView(v) { if (window.pcSetView) window.pcSetView(v); }
function pcSetTheme(t) { if (window.pcSetTheme) window.pcSetTheme(t); }
function pcNewCity() { if (window.pcNewCity) window.pcNewCity(); }
