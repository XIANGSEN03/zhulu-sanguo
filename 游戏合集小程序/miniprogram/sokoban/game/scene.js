// Scene geometry, textures, lighting and worker animation ported from the original game.
const createThree = require('../vendor/three-scoped');
module.exports = function createWarehouseScene(options) {
  const { platform, game } = options;
  const THREE = createThree(platform);
  const PI = Math.PI, coarse = true;
  const reduceMotion = false, performance = platform.performance, document = platform.document;
  const save = game, persist = () => {};
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const lerp = (a,b,t) => a+(b-a)*t;
  const detail = game.quality === 'detail';
  const context = platform.rawCanvas.getContext('webgl', { alpha: false, antialias: true });
  if (!context) throw new Error('当前设备无法创建 WebGL 画布');
  const renderer = new THREE.WebGLRenderer({ canvas: platform.canvas, context, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(options.pixelRatio || 1, 3));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ================= 贴图（全部用画布现画） =================
  const NUM_FONT = 'Arial, sans-serif';
  const CN_FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
  function canvasTex(w, h, draw, repeat) {
    const c = platform.createCanvas(w, h);
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = ANISO;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }
  function speckle(g, w, h, n, colors, alpha, s0, s1, r) {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = alpha * (0.3 + 0.7 * r());
      g.fillStyle = colors[(r() * colors.length) | 0];
      const s = s0 + r() * (s1 - s0);
      g.fillRect(r() * w, r() * h, s, s);
    }
    g.globalAlpha = 1;
  }
  function blotches(g, w, h, n, rgb, alpha, r0, r1, r) {
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rad = r0 + r() * (r1 - r0);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, `rgba(${rgb},${alpha})`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }
  function kraft(g, w, h, r, base) {
    g.fillStyle = base || "#c89a66"; g.fillRect(0, 0, w, h);
    blotches(g, w, h, 10, "120,80,40", .07, w * .1, w * .4, r);
    g.strokeStyle = "rgba(110,72,36,.10)"; g.lineWidth = 1;
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 4 + r() * 10, y + (r() - .5) * 2); g.stroke(); }
  }
  function edgeShade(g, w, h, a) {
    const s = Math.min(w, h) * .09;
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0,0,s,0,0,0,s,h],[w,0,w-s,0,w-s,0,s,h],[0,0,0,s,0,0,w,s],[0,h,0,h-s,0,h-s,w,s]]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, `rgba(80,50,20,${a})`); gr.addColorStop(1, "rgba(80,50,20,0)");
      g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
    }
  }

  const TEX = {};
  function buildTextures() {
    const r = rng(1002);
    TEX.epoxy = canvasTex(512, 512, (g, w, h) => {
      g.fillStyle = "#6d9282"; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 26, "255,255,255", .045, 60, 160, r);
      blotches(g, w, h, 20, "10,40,30", .06, 50, 140, r);
      speckle(g, w, h, 2600, ["#a9c6b8", "#4c6d60", "#dbe7e1"], .35, 1, 2.4, r);
      g.strokeStyle = "rgba(25,45,38,.10)";
      for (let i = 0; i < 10; i++) { g.lineWidth = 1 + r() * 2.5; g.beginPath(); const x = r() * w, y = r() * h; g.moveTo(x, y); g.quadraticCurveTo(x + r() * 90 - 45, y + r() * 90 - 45, x + r() * 170 - 85, y + r() * 170 - 85); g.stroke(); }
      g.fillStyle = "rgba(30,52,44,.55)"; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
      g.fillStyle = "rgba(255,255,255,.10)"; g.fillRect(0, 3, w, 1); g.fillRect(3, 0, 1, h);
    }, true);
    TEX.concrete = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#9b9f9b"; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 18, "60,60,55", .08, 20, 80, r);
      speckle(g, w, h, 1800, ["#b9bdb8", "#7c807c", "#5f625f"], .4, 1, 2, r);
    }, true);
    TEX.asphalt = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#3a3d40"; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 16, "0,0,0", .12, 20, 70, r);
      speckle(g, w, h, 3000, ["#6a6d70", "#25272a", "#8b8e90"], .45, 1, 2, r);
    }, true);
    TEX.grass = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "#5b8a3c"; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 30, "150,170,60", .14, 20, 70, r);
      blotches(g, w, h, 24, "30,70,30", .16, 20, 70, r);
      speckle(g, w, h, 4000, ["#7aa84c", "#4a7531", "#97b85a", "#3d6629"], .5, 1, 2.5, r);
    }, true);
    TEX.wall = canvasTex(256, 512, (g, w, h) => {
      for (let x = 0; x < w; x++) {
        const t = (x % 32) / 32, v = .5 + .5 * Math.cos(t * PI * 2), l = 192 + v * 30;
        g.fillStyle = `rgb(${l - 10},${l - 1},${l + 6})`; g.fillRect(x, 0, 1, h);
      }
      for (let x = 0; x < w; x++) {
        const t = (x % 32) / 32, v = .5 + .5 * Math.cos(t * PI * 2);
        g.fillStyle = `rgba(30,40,48,${.86 - v * .12})`; g.fillRect(x, h - 104, 1, 104);
      }
      g.fillStyle = "#f0b400"; g.fillRect(0, h - 112, w, 8);
      g.fillStyle = "rgba(60,50,40,.08)";
      for (let i = 0; i < 8; i++) { const x = r() * w; g.fillRect(x, 0, 2 + r() * 4, h * (.2 + r() * .5)); }
    }, true);
    TEX.wall.wrapT = THREE.ClampToEdgeWrapping;
    TEX.wood = canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = "#c79d6a"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = `rgba(${110 + r() * 30},${70 + r() * 20},${35},${.15 + r() * .2})`; g.lineWidth = .6 + r() * 1.4;
        const y = r() * h; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + (r() - .5) * 6, w * .7, y + (r() - .5) * 6, w, y + (r() - .5) * 3); g.stroke();
      }
      g.fillStyle = "rgba(70,45,20,.45)"; for (let i = 0; i < 3; i++) { g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 2, 1.2, 0, 0, PI * 2); g.fill(); }
    }, true);
    TEX.hazard = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = "#f2b705"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#1d1f20";
      for (let x = -32; x < w + 32; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.closePath(); g.fill(); }
    }, true);
    TEX.cartonTop = canvasTex(256, 256, (g, w, h) => {
      kraft(g, w, h, r);
      const gr = g.createLinearGradient(104, 0, 152, 0);
      gr.addColorStop(0, "#d9b880"); gr.addColorStop(.5, "#ecd3a3"); gr.addColorStop(1, "#d6b47b");
      g.fillStyle = gr; g.fillRect(104, 0, 48, h);
      g.fillStyle = "rgba(90,60,30,.25)"; g.fillRect(0, 127, w, 2);
      g.fillStyle = "rgba(255,255,255,.18)"; for (let y = 10; y < h; y += 22) g.fillRect(110, y, 36, 1);
      edgeShade(g, w, h, .28);
    });
    TEX.cartonPlain = canvasTex(128, 128, (g, w, h) => {
      kraft(g, w, h, r, "#c99b66");
      g.fillStyle = "#e1c38f"; g.fillRect(0, 54, w, 20);
      edgeShade(g, w, h, .3);
    });
    TEX.soft = canvasTex(64, 64, (g, w, h) => {
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(.4, "rgba(255,255,255,.45)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    TEX.ring = canvasTex(256, 256, (g, w, h) => {
      const gr = g.createRadialGradient(128, 128, 60, 128, 128, 128);
      gr.addColorStop(0, "rgba(80,255,150,0)"); gr.addColorStop(.62, "rgba(80,255,150,.55)"); gr.addColorStop(.74, "rgba(160,255,200,.95)"); gr.addColorStop(.86, "rgba(80,255,150,.35)"); gr.addColorStop(1, "rgba(80,255,150,0)");
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    TEX.cloud = canvasTex(256, 128, (g, w, h) => {
      for (let i = 0; i < 22; i++) {
        const x = 40 + r() * 176, y = 50 + r() * 40 - Math.abs(x - 128) * .12, rad = 18 + r() * 34;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, "rgba(255,255,255,.55)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.fillRect(0, 0, w, h);
      }
    });
    TEX.trailer = canvasTex(1024, 256, (g, w, h) => {
      g.fillStyle = "#eef1f3"; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 64) { g.fillStyle = "rgba(0,0,0,.05)"; g.fillRect(x, 0, 2, h); }
      g.fillStyle = "#1f5aa6"; g.fillRect(0, 168, w, 34);
      g.fillStyle = "#f0b400"; g.fillRect(0, 206, w, 8);
      g.fillStyle = "#1f5aa6"; g.font = `700 78px ${CN_FONT}`; g.textBaseline = "middle"; g.fillText("仓储物流", 60, 92);
      g.font = `600 34px ${NUM_FONT}`; g.fillStyle = "#5b6b7a"; g.fillText("WAREHOUSE  ·  LOGISTICS", 420, 100);
    });
    TEX.backPrint = canvasTex(128, 64, (g, w, h) => {
      g.fillStyle = "#c9cfd2"; g.fillRect(0, 0, w, h);
      g.fillStyle = "#1c2320"; g.font = `700 40px ${CN_FONT}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("仓管", w / 2, h / 2 + 2);
    });
  }
  function signTex(text, opts) {
    const o = Object.assign({ w: 512, h: 128, bg: "#1d3557", fg: "#ffffff", border: "#f0b400", size: 64, font: CN_FONT }, opts);
    return canvasTex(o.w, o.h, (g, w, h) => {
      g.fillStyle = o.bg; g.fillRect(0, 0, w, h);
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); }
      g.fillStyle = o.fg; g.font = `700 ${o.size}px ${o.font}`; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, w / 2, h / 2 + 3);
    });
  }
  function cartonSideTex(code, placed) {
    const r = rng(code.charCodeAt(3) * 131 + code.charCodeAt(4) * 7);
    return canvasTex(360, 256, (g, w, h) => {
      kraft(g, w, h, r);
      g.fillStyle = "#dfbf8a"; g.fillRect(156, 0, 48, 34);
      // 向上箭头
      g.strokeStyle = "#4a3220"; g.fillStyle = "#4a3220"; g.lineWidth = 5;
      for (const x of [34, 58]) { g.beginPath(); g.moveTo(x, 70); g.lineTo(x, 40); g.stroke(); g.beginPath(); g.moveTo(x - 9, 46); g.lineTo(x, 32); g.lineTo(x + 9, 46); g.closePath(); g.fill(); }
      g.strokeRect(20, 24, 52, 54);
      // 标签
      const lx = 130, ly = 112, lw = 200, lh = 112;
      g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(lx + 4, ly + 5, lw, lh);
      g.fillStyle = placed ? "#2e9a58" : "#fbfaf5"; g.fillRect(lx, ly, lw, lh);
      g.textBaseline = "alphabetic";
      if (placed) {
        g.fillStyle = "#ffffff"; g.font = `700 40px ${CN_FONT}`; g.fillText("✓ 已上架", lx + 14, ly + 52);
        g.font = `700 34px ${NUM_FONT}`; g.fillText(code, lx + 16, ly + 94);
      } else {
        g.fillStyle = "#5a6661"; g.font = `600 18px ${CN_FONT}`; g.fillText("料号", lx + 14, ly + 26);
        g.fillStyle = "#1c2320"; g.font = `700 40px ${NUM_FONT}`; g.fillText(code, lx + 14, ly + 64);
        let bx = lx + 14; const bars = [3,1,2,1,1,3,2,1,1,2,3,1,2,2,1,3,1,1,2,1,3,2,1,2,1,1,3,1,2,1];
        bars.forEach((b, i) => { if (i % 2 === 0) g.fillRect(bx, ly + 76, b * 2, 26); bx += b * 2 + 1.5; });
      }
      edgeShade(g, w, h, .3);
    });
  }
  function goalTex(code) {
    return canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = "rgba(242,183,5,.2)"; g.fillRect(16, 16, 224, 224);
      g.strokeStyle = "#f2b705"; g.lineWidth = 14; g.lineCap = "butt";
      const m = 20, L = 64;
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
        g.beginPath(); g.moveTo(x + sx * L, y); g.lineTo(x, y); g.lineTo(x, y + sy * L); g.stroke();
      }
      g.fillStyle = "#f2b705"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `600 24px ${CN_FONT}`; g.fillText("库位", w / 2, 84);
      g.font = `700 76px ${NUM_FONT}`; g.fillText(code, w / 2, 146);
    });
  }

  // ================= 材质 / 几何 =================
  const std = o => new THREE.MeshStandardMaterial(o);
  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const CYL = new THREE.CylinderGeometry(1, 1, 1, 20);
  const SPH = new THREE.SphereGeometry(1, 20, 14);
  const PLANE = new THREE.PlaneGeometry(1, 1);
  let M = {};
  function buildMaterials() {
    const decal = { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 };
    M = {
      epoxy: std({ map: TEX.epoxy, roughness: .3, metalness: 0 }),
      concrete: std({ map: TEX.concrete, roughness: .92 }),
      asphalt: std({ map: TEX.asphalt, roughness: .95 }),
      grass: std({ map: TEX.grass, roughness: 1 }),
      wall: std({ map: TEX.wall, roughness: .5, metalness: .3 }),
      wallBody: std({ color: 0xa9b2b8, roughness: .7, metalness: .2 }),
      steel: std({ color: 0x4f5f6c, roughness: .42, metalness: .6 }),
      steelLight: std({ color: 0x9aa4ab, roughness: .35, metalness: .7 }),
      dark: std({ color: 0x26292c, roughness: .6, metalness: .2 }),
      rubber: std({ color: 0x141516, roughness: .92 }),
      rackBlue: std({ color: 0x2a5c9e, roughness: .4, metalness: .35 }),
      beam: std({ color: 0xea661e, roughness: .42, metalness: .25 }),
      deck: std({ color: 0xa6aeb3, roughness: .36, metalness: .65 }),
      carton: std({ map: TEX.cartonPlain, roughness: .85 }),
      cartonTop: std({ map: TEX.cartonTop, roughness: .8 }),
      tote: std({ color: 0xffffff, roughness: .45 }),
      film: std({ color: 0xe6f0f6, roughness: .12, transparent: true, opacity: .38, depthWrite: false }),
      wood: std({ map: TEX.wood, roughness: .88 }),
      woodDark: std({ map: TEX.wood, color: 0xb59a80, roughness: .9 }),
      yellow: std({ color: 0xf2b705, roughness: .42, metalness: .1 }),
      hazard: std({ map: TEX.hazard, roughness: .5 }),
      hazardDecal: std(Object.assign({ map: TEX.hazard, roughness: .5 }, decal)),
      paintYellow: std(Object.assign({ color: 0xf2b705, roughness: .5 }, decal)),
      paintWhite: std(Object.assign({ color: 0xf0f2f0, roughness: .6 }, decal)),
      glass: std({ color: 0xb5d6e6, roughness: .04, metalness: .3, transparent: true, opacity: .26, depthWrite: false, side: THREE.DoubleSide }),
      darkGlass: std({ color: 0x18222c, roughness: .08, metalness: .6 }),
      white: std({ color: 0xeef1f3, roughness: .45, metalness: .1 }),
      chrome: std({ color: 0xd4d8db, roughness: .18, metalness: 1 }),
      red: std({ color: 0xc8261c, roughness: .38, metalness: .1 }),
      cabBlue: std({ color: 0x1d4f8f, roughness: .3, metalness: .4 }),
      cabRed: std({ color: 0xb8322a, roughness: .3, metalness: .4 }),
      lamp: std({ color: 0x333333, emissive: 0xffe0a8, emissiveIntensity: 0 }),
      headlight: std({ color: 0xcccccc, emissive: 0xfff3d6, emissiveIntensity: 0 }),
      taillight: std({ color: 0x5a0d0d, emissive: 0xff2a1a, emissiveIntensity: 0 }),
      beacon: std({ color: 0x6a3000, emissive: 0xff8a00, emissiveIntensity: 0 }),
      screen: std({ color: 0x0b1622, emissive: 0x4aa3ff, emissiveIntensity: .5 }),
      trailer: std({ map: TEX.trailer, roughness: .5, metalness: .1 }),
      backPrint: std({ map: TEX.backPrint, roughness: .7 }),
      trunk: std({ color: 0x6a4a31, roughness: .95 }),
      foliage: std({ color: 0xffffff, roughness: .82, flatShading: true }),
      mountain: std({ color: 0x6d8494, roughness: 1, flatShading: true }),
      hill: std({ color: 0x5f7b55, roughness: 1, flatShading: true }),
      // 工人
      vest: std({ color: 0xff6a13, roughness: .62 }),
      reflect: std({ color: 0xe8edf0, roughness: .25, metalness: .4, emissive: 0x9aa6ad, emissiveIntensity: .08 }),
      navy: std({ color: 0x25344d, roughness: .78 }),
      pants: std({ color: 0x2b3a52, roughness: .8 }),
      skin: std({ color: 0xe6b08a, roughness: .7 }),
      helmet: std({ color: 0xf5c21b, roughness: .28, metalness: .05 }),
      boot: std({ color: 0x3b2a1b, roughness: .75 }),
      glove: std({ color: 0x3d4440, roughness: .8 }),
      eye: std({ color: 0x1a1a1a, roughness: .3 }),
    };
    M.ring = new THREE.MeshBasicMaterial({ map: TEX.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  }

  function mesh(geo, mat, parent, x, y, z, sx, sy, sz, shadow) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz);
    m.castShadow = shadow !== false; m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  const bx = (p, mat, x, y, z, w, h, d, shadow) => mesh(BOX, mat, p, x, y, z, w, h, d, shadow);
  const cyl = (p, mat, x, y, z, r, h, axis) => {
    const m = mesh(CYL, mat, p, x, y, z, r, h, r);
    if (axis === "x") m.rotation.z = PI / 2; else if (axis === "z") m.rotation.x = PI / 2;
    return m;
  };
  function flat(x0, x1, z0, z1, y, mat, uvScale, parent) {
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0);
    geo.rotateX(-PI / 2); geo.translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / uvScale, -pos.getZ(i) / uvScale);
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  function strip(x0, z0, x1, z1, width, y, mat, period, parent) {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const geo = new THREE.PlaneGeometry(len, width);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len / (period || 1));
    geo.rotateX(-PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
    m.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    m.receiveShadow = true;
    if (parent) parent.add(m);
    return m;
  }
  // 竖直墙面（带世界坐标贴图），axis="x" 表示墙沿 x 方向延伸
  function wallFace(axis, fixed, a0, a1, y0, y1, facing, mat, parent) {
    const geo = new THREE.PlaneGeometry(a1 - a0, y1 - y0);
    if (axis === "x") { if (facing < 0) geo.rotateY(PI); geo.translate((a0 + a1) / 2, (y0 + y1) / 2, fixed); }
    else { geo.rotateY(facing > 0 ? PI / 2 : -PI / 2); geo.translate(fixed, (y0 + y1) / 2, (a0 + a1) / 2); }
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (axis === "x" ? pos.getX(i) : pos.getZ(i)) / 2, pos.getY(i) / 4.2);
    const m = new THREE.Mesh(geo, mat); m.receiveShadow = true;
    parent.add(m); return m;
  }
  function instanced(list, mat, parent, shadow) {
    if (!list.length) return null;
    const m = new THREE.InstancedMesh(BOX, mat, list.length);
    const o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((it, i) => {
      o.position.set(it[0], it[1], it[2]); o.scale.set(it[3], it[4], it[5]); o.rotation.set(0, it[7] || 0, 0);
      o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it[6] == null ? 0xffffff : it[6]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.castShadow = shadow !== false; m.receiveShadow = true; m.frustumCulled = false;
    parent.add(m); return m;
  }

  // ================= 场景基础 =================
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xb27a6b, 50, 320);
  const camera = new THREE.PerspectiveCamera(coarse ? 46 : 40, 1, .1, 2400);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envRT = null;

  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
      sunColor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunSize: { value: .0016 }, glow: { value: 1 }
    },
    vertexShader: "varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: `
      uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunColor; uniform vec3 sunDir;
      uniform float sunSize; uniform float glow; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir); float h = d.y;
        vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 1.0, h), 0.5)) : mix(horizon, bottom, smoothstep(0.0, 0.18, -h));
        float s = max(dot(d, normalize(sunDir)), 0.0);
        col += sunColor * glow * (pow(s, 6.0) * 0.28 + pow(s, 48.0) * 0.55) * smoothstep(-0.15, 0.05, h);
        col += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.45, s) * 4.0;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 40, 20), skyMat);
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 40, 20), skyMat));

  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, .3);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(detail ? 1024 : 512, detail ? 1024 : 512);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 120 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .025;
  scene.add(sun, sun.target);

  // 建筑尺寸固定（按最大的 9×9 单子留够地方），每张单子放在场地中间
  const B = { x0: -6.5, x1: 7.5, z0: -6.5, z1: 7.5, wallH: 4.2, slab: 1.0 };
  const GROUND_Y = -B.slab;
  const lampLights = [], yardLights = [];
  const world = new THREE.Group(); scene.add(world);
  let stars, starMat, moon, clouds = [], cloudGroup, dust, dustMat, dustBase, flies, flyMat, flyBase, beaconMesh;

  function buildShell() {
    const g = new THREE.Group(); world.add(g);
    // 地坪和楼板
    bx(g, M.concrete, (B.x0 - .3 + B.x1) / 2, -B.slab / 2 - .01, (B.z0 - .3 + B.z1) / 2, B.x1 - B.x0 + .3, B.slab, B.z1 - B.z0 + .3, false).receiveShadow = true;
    const epoxy = flat(B.x0, B.x1, B.z0, B.z1, 0, M.epoxy, 1, g);
    epoxy.name = "epoxy";
    // 楼板边沿的警示线（装卸平台边）
    strip(B.x1 - .1, B.z0, B.x1 - .1, B.z1, .2, .003, M.hazardDecal, .72, g);
    strip(B.x0, B.z1 - .1, B.x1 - .2, B.z1 - .1, .2, .003, M.hazardDecal, .72, g);
    // 前侧人行通道
    strip(-3.6, 5.25, B.x1 - .5, 5.25, .07, .003, M.paintYellow, 1, g);
    strip(-3.6, 6.95, B.x1 - .5, 6.95, .07, .003, M.paintYellow, 1, g);
    const walk = new THREE.Mesh(PLANE, std({ map: signTex("人 行 通 道", { bg: "rgba(0,0,0,0)", fg: "#f2f4f1", border: null, size: 82, w: 640, h: 128 }), transparent: true, depthWrite: false, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
    walk.rotation.x = -PI / 2; walk.position.set(.5, .004, 6.1); walk.scale.set(3.4, .68, 1); walk.receiveShadow = true; g.add(walk);
    for (const x of [-2.6, 5.6]) {
      const arrow = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-.5, -.12), new THREE.Vector2(.2, -.12), new THREE.Vector2(.2, -.3), new THREE.Vector2(.55, 0), new THREE.Vector2(.2, .3), new THREE.Vector2(.2, .12), new THREE.Vector2(-.5, .12)])), M.paintWhite);
      arrow.rotation.x = -PI / 2; arrow.position.set(x, .004, 6.1); if (x < 0) arrow.rotation.z = PI; g.add(arrow);
    }

    const H = B.wallH, T = .3;
    // 后墙（北），两个月台门洞
    const doors = [[-4.2, -1.8], [2.0, 4.4]], doorH = 3.0;
    const bz = B.z0 - T / 2;
    const backPiece = (xa, xb, ya, yb) => {
      bx(g, M.wallBody, (xa + xb) / 2, (ya + yb) / 2, bz, xb - xa, yb - ya, T);
      wallFace("x", B.z0 + .004, xa, xb, ya, yb, 1, M.wall, g);
      wallFace("x", B.z0 - T - .004, xa, xb, ya, yb, -1, M.wall, g);
    };
    backPiece(B.x0 - T, doors[0][0], -.01, H);
    backPiece(doors[0][0], doors[0][1], doorH, H);
    backPiece(doors[0][1], doors[1][0], -.01, H);
    backPiece(doors[1][0], doors[1][1], doorH, H);
    backPiece(doors[1][1], B.x1, -.01, H);
    doors.forEach(([a, b], i) => {
      const cx = (a + b) / 2;
      // 门框警示柱、卷帘盒、门封、调节板
      bx(g, M.hazard, a + .06, doorH / 2, B.z0 + .06, .12, doorH, .12);
      bx(g, M.hazard, b - .06, doorH / 2, B.z0 + .06, .12, doorH, .12);
      cyl(g, M.steelLight, cx, doorH + .22, B.z0 + .22, .2, b - a + .1, "x");
      for (let k = 0; k < 5; k++) bx(g, M.steelLight, cx, doorH - .02 - k * .05, B.z0 + .03, b - a - .2, .03, .02);
      bx(g, M.rubber, a - .12, doorH / 2, B.z0 - T - .2, .25, doorH + .2, .4);
      bx(g, M.rubber, b + .12, doorH / 2, B.z0 - T - .2, .25, doorH + .2, .4);
      bx(g, M.rubber, cx, doorH + .2, B.z0 - T - .2, b - a + .5, .4, .4);
      for (const x of [a + .3, b - .3]) bx(g, M.rubber, x, -.35, B.z0 - T - .12, .3, .35, .25);
      bx(g, M.steelLight, cx, .006, B.z0 + .6, b - a - .2, .012, 1.2, false);
      strip(a + .1, B.z0 + 1.25, b - .1, B.z0 + 1.25, .12, .004, M.hazardDecal, .72, g);
      // 月台号牌
      const sign = new THREE.Mesh(PLANE, std({ map: signTex((i + 1) + " 号月台"), roughness: .5 }));
      sign.position.set(cx, doorH + .62, B.z0 + .006); sign.scale.set(1.6, .4, 1); g.add(sign);
      // 门两侧防撞柱
      for (const x of [a - .35, b + .35]) {
        cyl(g, M.yellow, x, .5, B.z0 + .45, .08, 1.0);
        cyl(g, M.dark, x, .82, B.z0 + .45, .085, .08);
        cyl(g, M.dark, x, .62, B.z0 + .45, .085, .08);
      }
    });
    // 左墙（西），上部带一圈窗
    const lx = B.x0 - T / 2;
    const leftPiece = (za, zb, ya, yb) => {
      bx(g, M.wallBody, lx, (ya + yb) / 2, (za + zb) / 2, T, yb - ya, zb - za);
      wallFace("z", B.x0 + .004, za, zb, ya, yb, 1, M.wall, g);
      wallFace("z", B.x0 - T - .004, za, zb, ya, yb, -1, M.wall, g);
    };
    leftPiece(B.z0, B.z1, -.01, 2.5);
    leftPiece(B.z0, B.z1, 3.4, H);
    for (let z = B.z0; z <= B.z1 + .01; z += 1.4) bx(g, M.steel, lx, 2.95, Math.min(z, B.z1 - .06), T + .04, .9, .12);
    const glass = new THREE.Mesh(PLANE, M.glass);
    glass.rotation.y = PI / 2; glass.position.set(lx, 2.95, (B.z0 + B.z1) / 2); glass.scale.set(B.z1 - B.z0, .9, 1);
    glass.castShadow = false; g.add(glass);
    bx(g, M.steel, lx, 2.5, (B.z0 + B.z1) / 2, T + .1, .05, B.z1 - B.z0);
    // 檐口
    bx(g, M.steel, (B.x0 - T + B.x1) / 2, H + .06, bz, B.x1 - B.x0 + T + .1, .14, T + .14);
    bx(g, M.steel, lx, H + .06, (B.z0 + B.z1) / 2, T + .14, .14, B.z1 - B.z0);
    // 工字钢立柱
    const column = (x, z) => {
      for (const s of [-1, 1]) bx(g, M.steel, x, H / 2, z + s * .12, .3, H + .1, .04);
      bx(g, M.steel, x, H / 2, z, .05, H + .1, .24);
    };
    for (const x of [B.x0 + .1, -.6, 5.9, B.x1 - .16]) column(x, B.z0 + .14);
    for (const z of [-1.6, 3.2, B.z1 - .16]) column(B.x0 + .14, z);
    // 墙上泛光灯
    const flood = (x, y, z, ry) => {
      const f = new THREE.Group(); f.position.set(x, y, z); f.rotation.y = ry; g.add(f);
      bx(f, M.dark, 0, 0, .14, .5, .16, .28);
      const lens = bx(f, M.lamp, 0, -.085, .16, .44, .02, .22, false);
      lens.rotation.x = .25;
      bx(f, M.dark, 0, .02, .02, .08, .08, .1);
    };
    for (const x of [-5.4, .6, 5.6]) flood(x, 3.95, B.z0, 0);
    for (const z of [-3.6, 1.0, 5.4]) flood(B.x0, 3.95, z, PI / 2);
    for (const [x, z] of [[-3, -4.6], [3.2, -4.6], [-4.8, 1.6], [3, 3]]) {
      const l = new THREE.PointLight(0xffd9a0, 0, 0, 2); l.position.set(x, 3.4, z); g.add(l); lampLights.push(l);
    }
    // 安全标语
    const slogan = new THREE.Mesh(PLANE, std({ map: signTex("安全第一  预防为主", { w: 1024, h: 160, bg: "#f4f4f0", fg: "#c8261c", border: "#c8261c", size: 92 }), roughness: .5 }));
    slogan.rotation.y = PI / 2; slogan.position.set(B.x0 + .006, 1.75, -3.6); slogan.scale.set(3.2, .5, 1); g.add(slogan);
    // 灭火器
    const ext = new THREE.Group(); ext.position.set(B.x0 + .32, 0, -1.6 + .32); g.add(ext);
    cyl(ext, M.red, 0, .26, 0, .09, .46); cyl(ext, M.dark, 0, .53, 0, .03, .08);
    bx(ext, M.dark, .05, .58, 0, .14, .025, .03);
    const extSign = new THREE.Mesh(PLANE, std({ map: signTex("灭火器", { w: 256, h: 96, bg: "#c8261c", fg: "#fff", border: null, size: 48 }), roughness: .5 }));
    extSign.rotation.y = PI / 2; extSign.position.set(B.x0 + .006, 1.15, -1.6 + .32); extSign.scale.set(.5, .19, 1); g.add(extSign);
    // 楼梯（前左角下到地面）
    const st = new THREE.Group(); st.position.set(-5.2, 0, B.z1); g.add(st);
    for (let k = 0; k < 6; k++) bx(st, M.steelLight, 0, -.08 - k * .167, .15 + k * .28, 1.0, .05, .28);
    for (const sx of [-.52, .52]) {
      const rail = bx(st, M.yellow, sx, .42, .85, .04, .04, 1.9); rail.rotation.x = Math.atan2(1, 1.68);
      for (const k of [0, 5]) cyl(st, M.yellow, sx, .37 - k * .167, .15 + k * .28, .025, .9);
    }
    return { epoxy };
  }

  function makePallet(parent, x, y, z, rot) {
    const p = new THREE.Group(); p.position.set(x, y, z); p.rotation.y = rot || 0; parent.add(p);
    for (const zz of [-.36, 0, .36]) bx(p, M.wood, 0, .011, zz, .84, .022, .12);
    for (const xx of [-.36, 0, .36]) for (const zz of [-.36, 0, .36]) bx(p, M.woodDark, xx, .057, zz, .12, .07, .12);
    for (const xx of [-.36, 0, .36]) bx(p, M.wood, xx, .103, 0, .12, .022, .84);
    for (const zz of [-.36, -.18, 0, .18, .36]) bx(p, M.wood, 0, .125, zz, .84, .022, .11);
    return p;
  }

  function makeForklift() {
    const g = new THREE.Group();
    bx(g, M.yellow, 0, .42, -.05, .92, .46, 1.25);
    bx(g, M.dark, 0, .5, -.78, .94, .62, .34);
    bx(g, M.yellow, 0, .7, -.05, .92, .08, 1.0);
    bx(g, M.dark, 0, .82, -.28, .44, .1, .4);
    bx(g, M.dark, 0, 1.02, -.46, .44, .38, .08);
    const col = cyl(g, M.dark, 0, .92, .22, .03, .36); col.rotation.x = -.5;
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.13, .02, 8, 20), M.dark); wheel.position.set(0, 1.08, .14); wheel.rotation.x = -PI / 2 + .5; wheel.castShadow = true; g.add(wheel);
    for (const [x, z] of [[-.43, .32], [.43, .32], [-.43, -.58], [.43, -.58]]) bx(g, M.dark, x, 1.32, z, .05, 1.0, .05);
    bx(g, M.dark, 0, 1.84, -.13, .92, .05, .95);
    for (let k = -2; k <= 2; k++) bx(g, M.dark, k * .17, 1.84, -.13, .03, .055, .9);
    for (const x of [-.3, .3]) bx(g, M.steel, x, 1.0, .68, .08, 2.0, .1);
    bx(g, M.steel, 0, 1.96, .68, .68, .08, .1);
    bx(g, M.steel, 0, 1.0, .68, .68, .06, .08);
    cyl(g, M.chrome, 0, .75, .62, .04, 1.3);
    bx(g, M.dark, 0, .32, .78, .7, .42, .06);
    for (const x of [-.2, .2]) { bx(g, M.steelLight, x, .06, 1.22, .1, .04, .9); bx(g, M.steelLight, x, .26, .8, .1, .4, .04); }
    for (const [x, z, r] of [[-.5, .38, .22], [.5, .38, .22], [-.48, -.62, .18], [.48, -.62, .18]]) {
      cyl(g, M.rubber, x, r, z, r, .2, "x"); cyl(g, M.steelLight, x * 1.02, r, z, r * .5, .21, "x");
    }
    beaconMesh = mesh(SPH, M.beacon, g, 0, 1.92, -.45, .07, .07, .07);
    for (const x of [-.43, .43]) bx(g, M.headlight, x, 1.6, .36, .1, .07, .05, false);
    return g;
  }

  function makeTruck(cabMat, branded) {
    const g = new THREE.Group(); // 车头朝 -z，车尾 +z
    const L = 9.4, W = 2.1, top = 2.75, floor = .05;
    const body = new THREE.Mesh(BOX, [branded ? M.trailer : M.white, branded ? M.trailer : M.white, M.white, M.dark, M.dark, M.white]);
    body.scale.set(W, top - floor, L); body.position.set(0, (top + floor) / 2, 0); body.castShadow = body.receiveShadow = true; g.add(body);
    bx(g, M.dark, 0, -.12, 0, 1.2, .25, L - .4);
    for (const z of [L / 2 - 1.0, L / 2 - 2.1, L / 2 - 3.2]) for (const x of [-.82, .82]) { cyl(g, M.rubber, x, GROUND_Y + .45, z, .45, .36, "x"); cyl(g, M.steelLight, x * 1.03, GROUND_Y + .45, z, .22, .37, "x"); }
    bx(g, M.dark, 0, -.35, L / 2 - .05, W, .14, .1);
    for (const x of [-.8, .8]) bx(g, M.taillight, x, -.2, L / 2 + .01, .25, .1, .03, false);
    // 车头
    const cz = -L / 2 - 1.15;
    bx(g, cabMat, 0, .75, cz, 2.2, 2.0, 1.9);
    bx(g, M.darkGlass, 0, 1.22, cz - .96, 1.9, .8, .04, false);
    for (const x of [-1.105, 1.105]) bx(g, M.darkGlass, x, 1.25, cz - .35, .02, .7, .8, false);
    bx(g, M.dark, 0, .15, cz - .97, 2.0, .5, .06);
    for (let k = 0; k < 6; k++) bx(g, M.chrome, 0, -.02 + k * .07, cz - 1.0, 1.4, .025, .02, false);
    bx(g, M.chrome, 0, -.38, cz - 1.0, 2.25, .18, .14);
    for (const x of [-.82, .82]) bx(g, M.headlight, x, .32, cz - 1.0, .3, .14, .03, false);
    for (const x of [-1.2, 1.2]) { bx(g, M.dark, x, 1.5, cz - .9, .05, .35, .12); }
    bx(g, cabMat, 0, 1.95, cz + .1, 2.1, .4, 1.6);
    for (const x of [-.86, .86]) { cyl(g, M.rubber, x, GROUND_Y + .45, cz, .45, .36, "x"); cyl(g, M.steelLight, x * 1.03, GROUND_Y + .45, cz, .22, .37, "x"); }
    for (const x of [-.86, .86]) { cyl(g, M.rubber, x, GROUND_Y + .45, -L / 2 + .3, .45, .36, "x"); }
    bx(g, M.dark, 0, -.25, cz + .4, 1.0, .3, 2.6);
    return g;
  }

  function buildOutdoors() {
    const r = rng(77);
    const g = new THREE.Group(); world.add(g);
    // 草地 + 场院
    flat(-420, 420, -420, 420, GROUND_Y - .03, M.grass, 6, g);
    flat(-13, 25, -26, B.z0 - .3, GROUND_Y, M.asphalt, 4, g);
    flat(B.x1, 25, B.z0 - .3, 12, GROUND_Y, M.asphalt, 4, g);
    // 路缘
    bx(g, M.concrete, 6, GROUND_Y + .04, -26.1, 38.4, .14, .25);
    bx(g, M.concrete, -13.1, GROUND_Y + .04, -16.5, .25, .14, 19.2);
    bx(g, M.concrete, 25.1, GROUND_Y + .04, -7, .25, .14, 38.4);
    bx(g, M.concrete, 16.2, GROUND_Y + .04, 12.1, 17.6, .14, .25);
    // 停车位线
    for (let k = 0; k < 4; k++) strip(16.5 + k * 2.4, 1, 16.5 + k * 2.4, 11, .1, GROUND_Y + .004, M.paintWhite, 1, g);
    strip(10.5, -4.2, 24, -4.2, .12, GROUND_Y + .004, M.paintYellow, 1, g);
    for (let k = 0; k < 6; k++) strip(-11 + k * 4, -21, -9 + k * 4, -21, .14, GROUND_Y + .004, M.paintWhite, 1, g);
    // 卡车：一辆靠在 1 号月台，一辆停在东侧场院
    const tA = makeTruck(M.cabBlue, false); tA.position.set(-3, 0, B.z0 - .32 - 4.7); g.add(tA);
    const tB = makeTruck(M.cabRed, true); tB.position.set(12.6, 0, 3.5); tB.rotation.y = PI; g.add(tB);
    // 路灯
    for (const [x, z, ry] of [[-10.5, -8.5, PI / 2], [9.8, -8.6, -PI / 2], [23.4, -2.5, -PI / 2], [23.4, 9, -PI / 2], [4, -24.5, PI]]) {
      const p = new THREE.Group(); p.position.set(x, GROUND_Y, z); p.rotation.y = ry; g.add(p);
      cyl(p, M.concrete, 0, .2, 0, .22, .4);
      cyl(p, M.steel, 0, 3.6, 0, .07, 6.8);
      bx(p, M.steel, 0, 6.9, .6, .08, .08, 1.3);
      bx(p, M.dark, 0, 6.88, 1.25, .3, .14, .55);
      bx(p, M.lamp, 0, 6.8, 1.25, .26, .02, .48, false);
    }
    for (const [x, z] of [[9.8, -11], [21, 5.5], [-8, -12]]) {
      const l = new THREE.PointLight(0xffe0b0, 0, 0, 2); l.position.set(x, GROUND_Y + 6.2, z); g.add(l); yardLights.push(l);
    }
    // 围栏
    const fence = [];
    for (let x = -13; x <= 25; x += 2) fence.push([x, GROUND_Y + .6, -26.4, .06, 1.2, .06, 0x6d7a84]);
    for (let z = -26; z <= 12; z += 2) fence.push([25.4, GROUND_Y + .6, z, .06, 1.2, .06, 0x6d7a84]);
    fence.push([6, GROUND_Y + 1.15, -26.4, 38, .05, .05, 0x6d7a84], [6, GROUND_Y + .55, -26.4, 38, .04, .04, 0x6d7a84]);
    fence.push([25.4, GROUND_Y + 1.15, -7, .05, .05, 38, 0x6d7a84], [25.4, GROUND_Y + .55, -7, .04, .04, 38, 0x6d7a84]);
    instanced(fence, M.steel, g);

    // 树：阔叶树 + 松树，近处投影
    const trunkGeo = new THREE.CylinderGeometry(.5, .7, 1, 7); trunkGeo.translate(0, .5, 0);
    const blobGeo = new THREE.IcosahedronGeometry(1, 1);
    const coneGeo = new THREE.ConeGeometry(1, 1, 8); coneGeo.translate(0, .5, 0);
    const near = { trunk: [], blob: [], cone: [] }, far = { cone: [], trunk: [] };
    const blocked = (x, z) => (x > -16 && x < 28 && z > -29 && z < 15) || Math.hypot(x, z) < 26;
    const greens = ["#4f7f3a", "#5d8f3f", "#6b9a44", "#3f6e35", "#7a9d4a", "#567f36"];
    const autumn = ["#c4892f", "#b8642a", "#d1a23a"];
    const pinesC = ["#2f5a3a", "#36643f", "#2a4f36", "#3b6b45"];
    let n = 0, tries = 0;
    while (n < 210 && tries++ < 8000) {
      const a = r() * PI * 2, d = 24 + Math.pow(r(), 1.4) * 80, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (blocked(x, z)) continue;
      n++;
      const s = .8 + r() * .8, y = GROUND_Y;
      if (r() < .58) {
        near.trunk.push([x, y, z, .32 * s, 1.7 * s, .32 * s, "#6a4a31"]);
        const pal = r() < .14 ? autumn : greens;
        for (const [ox, oy, oz, rr] of [[0, 2.2, 0, 1.15], [.55, 1.8, .2, .85], [-.45, 1.9, -.3, .9], [.1, 2.8, -.1, .75]]) {
          const c = new THREE.Color(pal[(r() * pal.length) | 0]).offsetHSL(0, 0, (r() - .5) * .06);
          near.blob.push([x + ox * s, y + oy * s, z + oz * s, rr * s, rr * s * .9, rr * s, c, r() * PI]);
        }
      } else {
        near.trunk.push([x, y, z, .22 * s, .9 * s, .22 * s, "#5a3d28"]);
        const c = pinesC[(r() * pinesC.length) | 0];
        for (const [h0, rr, hh] of [[.6, 1.25, 1.7], [1.5, .98, 1.5], [2.3, .7, 1.3]]) near.cone.push([x, y + h0 * s, z, rr * s, hh * s, rr * s, c, r() * PI]);
      }
    }
    for (let i = 0; i < (detail ? 340 : 140); i++) {
      const a = r() * PI * 2, d = 105 + r() * 70, x = Math.cos(a) * d, z = Math.sin(a) * d, s = 1.6 + r() * 1.6;
      const c = pinesC[(r() * pinesC.length) | 0];
      far.cone.push([x, GROUND_Y + .4 * s, z, 1.3 * s, 3.4 * s, 1.3 * s, c, 0]);
    }
    const instGeo = (geo, list, mat, shadow) => {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, mat, list.length);
      const o = new THREE.Object3D(), c = new THREE.Color();
      list.forEach((it, i) => { o.position.set(it[0], it[1], it[2]); o.scale.set(it[3], it[4], it[5]); o.rotation.set(0, it[7] || 0, 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, it[6] instanceof THREE.Color ? it[6] : c.set(it[6])); });
      m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false; g.add(m);
    };
    instGeo(trunkGeo, near.trunk, M.trunk, true);
    instGeo(blobGeo, near.blob, M.foliage, true);
    instGeo(coneGeo, near.cone, M.foliage, true);
    instGeo(coneGeo, far.cone, M.foliage, false);
    // 灌木
    const bush = [];
    for (let i = 0; i < 46; i++) {
      let x, z;
      if (i < 20) { x = B.x0 - 1.4 - r() * 3; z = -6 + r() * 18; } else if (i < 34) { x = -12 + r() * 10; z = B.z1 + 1.5 + r() * 3.5; } else { x = 2 + r() * 8; z = 13.2 + r() * 3; }
      const s = .35 + r() * .45;
      bush.push([x, GROUND_Y + s * .5, z, s * 1.3, s, s * 1.2, new THREE.Color(greens[(r() * greens.length) | 0]), r() * PI]);
    }
    instGeo(blobGeo, bush, M.foliage, true);

    // 远山两层
    const mountains = (count, d0, d1, h0, h1, rad0, rad1, mat) => {
      for (let i = 0; i < count; i++) {
        const geo = new THREE.ConeGeometry(1, 1, 9, 4); geo.translate(0, .5, 0);
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) { const y = p.getY(k); if (y > .02 && y < .98) { p.setX(k, p.getX(k) * (.82 + r() * .36)); p.setZ(k, p.getZ(k) * (.82 + r() * .36)); p.setY(k, y + (r() - .5) * .08); } }
        geo.computeVertexNormals();
        const a = (i / count) * PI * 2 + r() * .3, d = d0 + r() * (d1 - d0);
        const m = new THREE.Mesh(geo, mat);
        const rad = rad0 + r() * (rad1 - rad0);
        m.scale.set(rad, h0 + r() * (h1 - h0), rad * (.7 + r() * .5));
        m.position.set(Math.cos(a) * d, GROUND_Y - 1, Math.sin(a) * d); m.rotation.y = r() * PI;
        g.add(m);
      }
    };
    mountains(20, 240, 330, 34, 78, 40, 70, M.mountain);
    mountains(16, 150, 190, 12, 26, 26, 44, M.hill);

    // 云
    cloudGroup = new THREE.Group(); scene.add(cloudGroup);
    for (let i = 0; i < 18; i++) {
      const mat = new THREE.SpriteMaterial({ map: TEX.cloud, transparent: true, depthWrite: false, fog: false, opacity: .9 });
      const s = new THREE.Sprite(mat);
      const a = r() * PI * 2, d = 260 + r() * 300;
      s.position.set(Math.cos(a) * d, 70 + r() * 110, Math.sin(a) * d);
      const w = 110 + r() * 160; s.scale.set(w, w * (.32 + r() * .14), 1);
      cloudGroup.add(s); clouds.push(s);
    }
    // 星星和月亮
    const sp = [];
    for (let i = 0; i < 1100; i++) {
      const u = r(), v = r() * .95 + .05, th = u * PI * 2, y = v, rr = Math.sqrt(1 - y * y);
      sp.push(Math.cos(th) * rr * 950, y * 950, Math.sin(th) * rr * 950);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    stars = new THREE.Points(sg, starMat); stars.frustumCulled = false; scene.add(stars);
    moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.soft, color: 0xdfe8ff, transparent: true, depthWrite: false, fog: false }));
    moon.scale.set(70, 70, 1); scene.add(moon);

    // 库内浮尘
    const dp = [];
    const dr = rng(5);
    for (let i = 0; i < 280; i++) dp.push(B.x0 + dr() * (B.x1 - B.x0), .3 + dr() * 3.6, B.z0 + dr() * (B.z1 - B.z0));
    dustBase = dp.slice();
    const dg = new THREE.BufferGeometry(); dg.setAttribute("position", new THREE.Float32BufferAttribute(dp, 3));
    dustMat = new THREE.PointsMaterial({ map: TEX.soft, color: 0xffe6c4, size: .07, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending });
    dust = new THREE.Points(dg, dustMat); scene.add(dust);
    // 萤火虫（夜班才看得见）
    const fp = [];
    for (let i = 0; i < 90; i++) { const a = dr() * PI * 2, d = 22 + dr() * 22; fp.push(Math.cos(a) * d, GROUND_Y + .3 + dr() * 2.2, Math.sin(a) * d); }
    flyBase = fp.slice();
    const fg = new THREE.BufferGeometry(); fg.setAttribute("position", new THREE.Float32BufferAttribute(fp, 3));
    flyMat = new THREE.PointsMaterial({ map: TEX.soft, color: 0xd6ff6a, size: .34, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    flies = new THREE.Points(fg, flyMat); scene.add(flies);
  }

  function buildDecor() {
    const g = new THREE.Group(); world.add(g);
    const fk = makeForklift(); fk.position.set(6.25, 0, -1.2); fk.rotation.y = PI; g.add(fk);
    strip(5.55, -2.6, 6.95, -2.6, .06, .003, M.paintYellow, 1, g);
    strip(5.55, .3, 6.95, .3, .06, .003, M.paintYellow, 1, g);
    strip(5.55, -2.6, 5.55, .3, .06, .003, M.paintYellow, 1, g);
    strip(6.95, -2.6, 6.95, .3, .06, .003, M.paintYellow, 1, g);
    // 空托盘垛
    for (let k = 0; k < 6; k++) makePallet(g, -5.5, k * .137, 6.2, (k % 2) * .06);
    for (let k = 0; k < 3; k++) makePallet(g, -4.4, k * .137, 6.3, .1);
    // 周转箱垛
    const totes = [];
    for (let s = 0; s < 3; s++) for (let k = 0; k < 4 - s; k++) totes.push([6.2 + (s % 2) * .02, .09 + k * .175, 3.4 + s * .5, .62, .17, .44, s === 1 ? 0x8d9499 : 0x2f6fb5]);
    instanced(totes, M.tote, g);
    // 收货工位：桌子、电脑、标签打印机
    const d = new THREE.Group(); d.position.set(-5.55, 0, 2.3); g.add(d);
    bx(d, M.white, 0, .78, 0, .7, .04, 1.4);
    for (const [x, z] of [[-.3, -.65], [.3, -.65], [-.3, .65], [.3, .65]]) bx(d, M.steel, x, .38, z, .04, .76, .04);
    bx(d, M.dark, -.2, 1.05, -.2, .04, .38, .6);
    bx(d, M.screen, -.175, 1.06, -.2, .005, .33, .54, false);
    bx(d, M.dark, -.24, .86, -.2, .14, .14, .06);
    bx(d, M.dark, .08, .81, -.2, .18, .015, .42);
    bx(d, M.white, -.05, .87, .42, .24, .16, .24);
    bx(d, M.dark, .05, .87, .42, .01, .03, .14);
    cyl(d, M.dark, .6, .27, 0, .18, .05); cyl(d, M.steel, .6, .13, 0, .025, .26);
    bx(d, M.yellow, .1, .8, .22, .08, .03, .13);
  }

  // ================= 时间 / 天色 =================
  const SKIES = {
    day: { label: "白班", top: "#2f6fc4", horizon: "#b8d5ee", bottom: "#7d8a74", sunColor: "#fff1d8", dir: [.42, .82, .38], sun: 2.6, glow: .7, size: .0007,
      hemiSky: "#cfe3ff", hemiGround: "#6d6a52", hemi: .35, fog: "#bfd6e9", fogFar: 430, exposure: .95, lamps: 0, stars: 0, cloud: "#ffffff", cloudA: .95,
      mountain: "#7290a3", hill: "#6a8a5c", dust: .22, flies: 0 },
    dusk: { label: "黄昏", top: "#24386a", horizon: "#f3a165", bottom: "#4a3c45", sunColor: "#ffaa6b", dir: [.78, .17, .6], sun: 2.4, glow: 1.25, size: .0011,
      hemiSky: "#8aa0d0", hemiGround: "#5a4038", hemi: .3, fog: "#c48b74", fogFar: 380, exposure: 1.15, lamps: .55, stars: .12, cloud: "#ffbf98", cloudA: .9,
      mountain: "#6a5a7a", hill: "#5e5f52", dust: .6, flies: 0 },
    night: { label: "夜班", top: "#050b1b", horizon: "#1c2c4a", bottom: "#0a0d13", sunColor: "#a9c0ff", dir: [-.35, .62, .55], sun: .32, glow: .5, size: .0005,
      hemiSky: "#3a4c7a", hemiGround: "#101418", hemi: .28, fog: "#111a2c", fogFar: 300, exposure: 1.15, lamps: 1, stars: 1, cloud: "#3c4864", cloudA: .5,
      mountain: "#18223a", hill: "#121c22", dust: .18, flies: 1 }
  };
  const SKY_ORDER = ["day", "dusk", "night"];
  let skyName = SKIES[save.sky] ? save.sky : "dusk", skyP = SKIES[skyName];
  const sunDir = new THREE.Vector3();
  function applySky(name) {
    skyName = name; skyP = SKIES[name]; save.sky = name; persist();
    const P = skyP, u = skyMat.uniforms;
    u.top.value.set(P.top); u.horizon.value.set(P.horizon); u.bottom.value.set(P.bottom);
    u.sunColor.value.set(P.sunColor); sunDir.set(...P.dir).normalize(); u.sunDir.value.copy(sunDir);
    u.glow.value = P.glow; u.sunSize.value = P.size;
    sun.color.set(P.sunColor); sun.intensity = P.sun;
    hemi.color.set(P.hemiSky); hemi.groundColor.set(P.hemiGround); hemi.intensity = P.hemi;
    scene.fog.color.set(P.fog); scene.fog.far = P.fogFar;
    renderer.toneMappingExposure = P.exposure;
    M.lamp.emissiveIntensity = P.lamps * 4;
    M.headlight.emissiveIntensity = P.lamps * 3;
    M.taillight.emissiveIntensity = P.lamps * 1.5;
    M.screen.emissiveIntensity = .35 + P.lamps * .8;
    M.reflect.emissiveIntensity = .05 + P.lamps * .15;
    lampLights.forEach(l => l.intensity = P.lamps * 22);
    yardLights.forEach(l => l.intensity = P.lamps * 70);
    starMat.opacity = P.stars;
    moon.visible = name === "night";
    clouds.forEach(c => { c.material.color.set(P.cloud); c.material.opacity = P.cloudA; });
    M.mountain.color.set(P.mountain); M.hill.color.set(P.hill);
    dustMat.opacity = P.dust;
    if (envRT) envRT.dispose();
    envRT = pmrem.fromScene(envScene, .035);
    scene.environment = envRT.texture;
    if (options.onSky) options.onSky(name, P.label);
  }

  // ================= 关卡 =================
  let L = null, levelGroup = null, levelTrash = [], crates = [], worker = null, shell = null;
  const cellX = k => L.ox + (k % L.W), cellZ = k => L.oz + ((k / L.W) | 0);

  function disposeLevel() {
    if (!levelGroup) return;
    world.remove(levelGroup);
    levelGroup.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
    levelTrash.forEach(t => t.dispose());
    levelTrash = []; crates = []; levelGroup = null;
  }

  function buildLevelVisuals() {
    disposeLevel();
    const g = new THREE.Group(); levelGroup = g; world.add(g);
    const r = rng(L.i * 97 + 13);
    const W = L.W, H = L.H, isWall = (x, y) => x >= 0 && y >= 0 && x < W && y < H && L.wall[y * W + x];
    // 地坪接缝对齐格子
    TEX.epoxy.offset.set(((L.ox - .5) % 1 + 1) % 1 * -1, ((L.oz - .5) % 1 + 1) % 1);
    // 场地边界警示带
    const ex = W / 2 + .14, ez = H / 2 + .14;
    for (const [a, b2, c, d] of [[-ex, -ez, ex, -ez], [-ex, ez, ex, ez], [-ex, -ez, -ex, ez], [ex, -ez, ex, ez]])
      levelTrash.push(strip(a, b2, c, d, .16, .003, M.hazardDecal, .72, g).geometry);
    // 货架（每个墙格一组，立柱和横梁共用）
    const lists = { post: [], plate: [], beam: [], deck: [], carton: [], tote: [], film: [] };
    const posts = new Set(), edges = new Set();
    const LV = [.1, .64, 1.18], POST_H = 1.36;
    const kraftTints = [0xffffff, 0xf3e6d2, 0xe8d8c0, 0xfff2e0, 0xdcc8ae];
    const toteTints = [0x2f6fb5, 0x2f6fb5, 0x2f6fb5, 0x8d9499, 0x3f8f5a, 0xe0a21a];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!isWall(x, y)) continue;
      const wx = L.ox + x, wz = L.oz + y;
      for (const [cx, cz] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) {
        const key = cx + "," + cz; if (posts.has(key)) continue; posts.add(key);
        lists.post.push([L.ox + cx - .5, POST_H / 2, L.oz + cz - .5, .085, POST_H, .085]);
        lists.plate.push([L.ox + cx - .5, .008, L.oz + cz - .5, .17, .016, .17, 0x7d868c]);
      }
      for (const [t, ex2, ez2] of [["h", x, y], ["h", x, y + 1], ["v", x, y], ["v", x + 1, y]]) {
        const key = t + ex2 + "," + ez2; if (edges.has(key)) continue; edges.add(key);
        for (const lv of LV) {
          if (t === "h") lists.beam.push([L.ox + ex2, lv, L.oz + ez2 - .5, 1, .075, .05]);
          else lists.beam.push([L.ox + ex2 - .5, lv, L.oz + ez2, .05, .075, 1]);
        }
      }
      LV.forEach((lv, li) => {
        lists.deck.push([wx, lv + .047, wz, .92, .02, .92]);
        const base = lv + .057, maxH = li < 2 ? LV[li + 1] - lv - .12 : .34;
        const roll = r();
        if ((li === 2 && roll < .4) || roll < .1) return;
        if (roll < .5) {
          if (r() < .3) { const h = Math.min(maxH, .32 + r() * .14); lists.carton.push([wx, base + h / 2, wz, .82, h, .8, kraftTints[(r() * 5) | 0], r() < .5 ? 0 : PI / 2]); return; }
          const slots = [[-1, -1], [1, -1], [-1, 1], [1, 1]].sort(() => r() - .5), n = 1 + ((r() * 4) | 0);
          for (let k = 0; k < n; k++) {
            const [sx, sz] = slots[k], w = .3 + r() * .1, d = .3 + r() * .1, h = Math.min(maxH, .18 + r() * .22);
            lists.carton.push([wx + sx * .21, base + h / 2, wz + sz * .21, w, h, d, kraftTints[(r() * 5) | 0], (r() - .5) * .2]);
            if (h < maxH - .2 && r() < .4) { const h2 = .12 + r() * .08; lists.carton.push([wx + sx * .21, base + h + h2 / 2, wz + sz * .21, w * .85, h2, d * .85, kraftTints[(r() * 5) | 0], (r() - .5) * .3]); }
          }
        } else if (roll < .78) {
          const along = r() < .5, c = toteTints[(r() * toteTints.length) | 0], n = Math.max(1, Math.min(3, Math.floor(maxH / .17)));
          for (const s of [-1, 1]) {
            const cnt = 1 + ((r() * n) | 0);
            for (let k = 0; k < cnt; k++) {
              if (along) lists.tote.push([wx + s * .22, base + .08 + k * .165, wz, .42, .155, .78, c]);
              else lists.tote.push([wx, base + .08 + k * .165, wz + s * .22, .78, .155, .42, c]);
            }
          }
        } else {
          const h = Math.min(maxH, .3 + r() * .12);
          for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) lists.carton.push([wx + sx * .2, base + h / 2, wz + sz * .2, .39, h, .39, kraftTints[(r() * 5) | 0]]);
          lists.film.push([wx, base + h / 2 + .005, wz, .84, h + .02, .84]);
        }
      });
    }
    instanced(lists.post, M.rackBlue, g);
    instanced(lists.plate, M.steelLight, g);
    instanced(lists.beam, M.beam, g);
    instanced(lists.deck, M.deck, g);
    instanced(lists.carton, M.carton, g);
    instanced(lists.tote, M.tote, g);
    instanced(lists.film, M.film, g, false);
    // 库位地标
    L.goals.forEach(k => {
      const t = goalTex(L.codes[k]);
      const mat = std({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: .45, transparent: true, depthWrite: false, roughness: .5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
      const m = new THREE.Mesh(PLANE, mat); m.rotation.x = -PI / 2; m.scale.set(.96, .96, 1);
      m.position.set(cellX(k), .004, cellZ(k)); m.receiveShadow = true; g.add(m);
      levelTrash.push(t, mat);
    });
    // 货（托盘 + 大纸箱）
    const cr = rng(L.i * 31 + 7);
    L.startBoxes.forEach((k, j) => {
      const code = (["7A", "3C", "5F", "8K", "2M"][(cr() * 5) | 0]) + "-" + String(100 + ((cr() * 900) | 0)).padStart(4, "0");
      const c = new THREE.Group(); g.add(c);
      makePallet(c, 0, 0, 0, 0);
      const side = cartonSideTex(code, false), sideOk = cartonSideTex(code, true);
      const ms = std({ map: side, roughness: .85 }), msOk = std({ map: sideOk, roughness: .85 });
      const box = new THREE.Mesh(BOX, [ms, ms, M.cartonTop, M.carton, ms, ms]);
      box.scale.set(.76, .54, .76); box.position.y = .136 + .27; box.castShadow = box.receiveShadow = true; c.add(box);
      const ring = new THREE.Mesh(PLANE, M.ring.clone()); ring.rotation.x = -PI / 2; ring.scale.set(1.35, 1.35, 1); ring.position.y = .006; ring.castShadow = false; c.add(ring);
      c.userData = { box, ms, msOk, ring, placed: false, glow: 0, code };
      levelTrash.push(side, sideOk, ms, msOk, ring.material);
      crates.push(c);
    });
  }

  // ================= 工人 =================
  function makeWorker() {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const legGeo = new THREE.CapsuleGeometry(.068, .3, 4, 10);
    const legs = [-1, 1].map(s => {
      const hip = new THREE.Group(); hip.position.set(s * .085, .5, 0); body.add(hip);
      const leg = new THREE.Mesh(legGeo, M.pants); leg.position.y = -.22; leg.castShadow = true; hip.add(leg);
      bx(hip, M.boot, 0, -.45, .035, .12, .09, .21);
      bx(hip, M.rubber, 0, -.49, .035, .125, .02, .215);
      return hip;
    });
    bx(body, M.navy, 0, .5, 0, .3, .1, .18);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(.16, .22, 6, 16), M.vest);
    torso.scale.set(1, 1, .7); torso.position.y = .76; torso.castShadow = true; body.add(torso);
    const stripeGeo = new THREE.CylinderGeometry(.163, .163, .032, 24, 1, true);
    for (const y of [-.07, .07]) { const s = new THREE.Mesh(stripeGeo, M.reflect); s.position.y = y; torso.add(s); }
    const back = new THREE.Mesh(PLANE, M.backPrint); back.position.set(0, .04, -.164); back.rotation.y = PI; back.scale.set(.17, .085, 1); torso.add(back);
    bx(body, M.dark, -.08, .86, .118, .045, .08, .025);
    bx(body, M.dark, -.095, .93, .118, .008, .07, .008);
    cyl(body, M.navy, 0, 1.0, 0, .06, .08);
    const head = new THREE.Group(); head.position.y = 1.12; body.add(head);
    mesh(SPH, M.skin, head, 0, 0, 0, .115, .12, .112);
    for (const s of [-1, 1]) mesh(SPH, M.eye, head, s * .04, .01, .103, .014, .018, .014, false);
    mesh(SPH, M.skin, head, 0, -.015, .112, .016, .022, .014, false);
    const hat = new THREE.Mesh(new THREE.SphereGeometry(.132, 22, 12, 0, PI * 2, 0, PI / 2), M.helmet);
    hat.position.y = .035; hat.castShadow = true; head.add(hat);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(.15, .15, .012, 26), M.helmet);
    brim.position.set(0, .04, .025); brim.scale.set(1, 1, 1.12); brim.castShadow = true; head.add(brim);
    bx(head, M.helmet, 0, .16, 0, .03, .03, .2);
    const arms = [-1, 1].map(s => {
      const sh = new THREE.Group(); sh.position.set(s * .2, .93, 0); body.add(sh);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.052, .28, 4, 10), M.navy); arm.position.y = -.19; arm.castShadow = true; sh.add(arm);
      mesh(SPH, M.glove, sh, 0, -.4, 0, .06, .065, .06);
      sh.rotation.z = s * .08;
      return sh;
    });
    root.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
    return { root, body, legs, arms, head, phase: 0, push: 0, yaw: 0, cheer: 0 };
  }


  let player = 0, boxPos = [], facing = 1, anim = null;
  const STEP_MS = 175, yawFor = d => [PI, 0, -PI / 2, PI / 2][d];
  function syncVisuals(snapAll) {
    worker.root.position.set(cellX(player), 0, cellZ(player));
    if (snapAll) { worker.yaw = yawFor(facing); worker.root.rotation.y = worker.yaw; }
    boxPos.forEach((k, j) => { crates[j].position.set(cellX(k), 0, cellZ(k)); });
    refreshPlaced(snapAll);
  }
  function refreshPlaced(instant) {
    boxPos.forEach((k, j) => {
      const c = crates[j], ud = c.userData, on = !!L.goal[k];
      if (on !== ud.placed) {
        ud.placed = on;
        const m = on ? ud.msOk : ud.ms;
        ud.box.material[0] = ud.box.material[1] = ud.box.material[4] = ud.box.material[5] = m;
      }
      if (instant) { ud.glow = on ? 1 : 0; ud.ring.material.opacity = on ? .85 : 0; }
    });
  }


  function readState() { player = game.player; boxPos = game.boxPos; facing = game.facing; }
  function finishAnim() {
    anim = null; syncVisuals(false);
    if (game.won) worker.cheer = performance.now();
    if (options.onAnimationEnd) options.onAnimationEnd();
  }
  const AZ0 = .4, EL0 = .98, SCENIC_DIST = 20;
  const cam = { az: AZ0, el: EL0, dist: 18, ty: .3 }, goal = { az: AZ0, el: EL0, zoom: 1, ty: .3 };
  let camRate = 7, fitGoal = 18, scenic = false, overhead = false;
  let width = options.width, height = options.height, topInset = 170, bottomInset = 205;
  const target = new THREE.Vector3();
  function refit() {
    if (!L) return;
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), th = tv * camera.aspect;
    const el = overhead ? 1.36 : EL0, az = overhead ? 0 : AZ0;
    const hx = L.W / 2 + .35, hz = L.H / 2 + .35, ca = Math.abs(Math.cos(az)), sa = Math.abs(Math.sin(az));
    const hh = hx * ca + hz * sa;
    const hv = (hz * ca + hx * sa) * Math.sin(el) + .6 * Math.cos(el);
    const freeFrac = Math.max(.2, (height - topInset - bottomInset) / height);
    fitGoal = Math.max(hv / (tv * freeFrac), hh / th) * 1.08 + .6;
  }
  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    renderer.setSize(width, height, false); camera.aspect = width / height;
    camera.setViewOffset(width, height, 0, -(topInset - bottomInset) / 2 * (scenic ? 0 : 1), width, height);
    camera.updateProjectionMatrix(); refit();
  }
  function setScenic(on) {
    scenic = !!on; goal.zoom = 1;
    goal.el = scenic ? .14 : overhead ? 1.36 : EL0;
    goal.ty = scenic ? 1.6 : .3; camRate = scenic ? 1.6 : 7;
    resize(width, height);
  }
  function resetView() { setScenic(false); goal.az = overhead ? 0 : AZ0; goal.zoom = 1; refit(); }
  function setOverhead(on) { overhead = !!on; resetView(); }
  function updateCamera(dt) {
    if (scenic) goal.az += dt * .06;
    const k = 1 - Math.exp(-dt * camRate), distance = (scenic ? SCENIC_DIST : fitGoal) * goal.zoom;
    cam.az += (goal.az - cam.az) * k; cam.el += (goal.el - cam.el) * k;
    cam.dist += (distance - cam.dist) * k; cam.ty += (goal.ty - cam.ty) * k;
    const ce = Math.cos(cam.el); target.set(0, cam.ty, 0);
    camera.position.set(Math.sin(cam.az) * ce * cam.dist, Math.max(GROUND_Y + .8, Math.sin(cam.el) * cam.dist + cam.ty), Math.cos(cam.az) * ce * cam.dist);
    camera.lookAt(target);
    sky.position.copy(camera.position); stars.position.copy(camera.position); cloudGroup.position.set(camera.position.x, 0, camera.position.z);
    moon.position.copy(camera.position).addScaledVector(sunDir, 900);
  }
  function screenToDir(sx, sy) {
    const rx = Math.cos(cam.az), rz = -Math.sin(cam.az), fx = -Math.sin(cam.az), fz = -Math.cos(cam.az);
    const wx = sx * rx - sy * fx, wz = sx * rz - sy * fz;
    return Math.abs(wx) > Math.abs(wz) ? (wx > 0 ? 3 : 2) : (wz > 0 ? 1 : 0);
  }
  const angLerp = (a, b, t) => { let d = ((b - a + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return a + d * t; };
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function animate(now, dt) {
    const w = worker;
    let moving = false;
    if (anim) {
      const t = clamp((now - anim.t0) / STEP_MS, 0, 1), e = ease(t);
      moving = true;
      w.root.position.set(lerp(cellX(anim.from), cellX(anim.to), e), 0, lerp(cellZ(anim.from), cellZ(anim.to), e));
      if (anim.bi >= 0) crates[anim.bi].position.set(lerp(cellX(anim.bFrom), cellX(anim.bTo), e), 0, lerp(cellZ(anim.bFrom), cellZ(anim.bTo), e));
      if (t >= 1) finishAnim();
    }
    w.yaw = angLerp(w.yaw, yawFor(facing), 1 - Math.exp(-dt * 20));
    w.root.rotation.y = w.yaw;
    if (moving) w.phase += dt * 15;
    const swing = moving ? Math.sin(w.phase) : 0;
    const kk = 1 - Math.exp(-dt * 14);
    w.push = Math.max(0, w.push - dt * (anim && anim.bi >= 0 ? 0 : 2.6));
    w.legs[0].rotation.x = lerp(w.legs[0].rotation.x, swing * .6, kk);
    w.legs[1].rotation.x = lerp(w.legs[1].rotation.x, -swing * .6, kk);
    let armL, armR, bodyY;
    if (w.cheer) {
      const ct = (now - w.cheer) / 1000;
      armL = armR = -2.75 + Math.sin(ct * 12) * .18;
      bodyY = ct < 1.4 ? Math.abs(Math.sin(ct * 7)) * .2 : Math.sin(now / 450) * .006;
    } else if (w.push > .05) {
      armL = armR = -1.3 * Math.min(1, w.push * 1.5) + Math.sin(w.phase * 2) * .04;
      bodyY = moving ? Math.abs(swing) * .02 : 0;
    } else {
      armL = -swing * .5; armR = swing * .5;
      bodyY = moving ? Math.abs(swing) * .03 : Math.sin(now / 450) * .006;
    }
    w.arms[0].rotation.x = lerp(w.arms[0].rotation.x, armL, kk);
    w.arms[1].rotation.x = lerp(w.arms[1].rotation.x, armR, kk);
    w.body.position.y = lerp(w.body.position.y, bodyY, .5);
    w.body.rotation.x = lerp(w.body.rotation.x, w.push > .05 ? .16 : 0, kk);
    w.head.rotation.y = moving || w.cheer ? 0 : Math.sin(now / 2300) * .35 * Math.max(0, Math.sin(now / 5100));
    // 上架后的绿光
    crates.forEach(c => {
      const ud = c.userData, tgt = ud.placed && !(anim && anim.bi >= 0 && crates[anim.bi] === c) ? 1 : 0;
      ud.glow += (tgt - ud.glow) * (1 - Math.exp(-dt * 6));
      ud.ring.material.opacity = ud.glow * (.6 + .25 * Math.sin(now / 380 + c.position.x));
    });
  }
  function ambient(now, dt) {
    const t = now / 1000;
    cloudGroup.rotation.y += dt * .004;
    const dp = dust.geometry.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      dp.setY(i, dustBase[i * 3 + 1] + Math.sin(t * .4 + i) * .25);
      dp.setX(i, dustBase[i * 3] + Math.sin(t * .23 + i * 1.7) * .3);
    }
    dp.needsUpdate = true;
    if (skyP.flies) {
      const fp = flies.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        fp.setXYZ(i, flyBase[i * 3] + Math.sin(t * .5 + i) * .8, flyBase[i * 3 + 1] + Math.sin(t * .9 + i * 2.1) * .3, flyBase[i * 3 + 2] + Math.cos(t * .4 + i * .7) * .8);
      }
      fp.needsUpdate = true;
      flyMat.opacity = .55 + .45 * Math.sin(t * 2.3);
    } else flyMat.opacity = 0;
    M.beacon.emissiveIntensity = skyP.lamps > .2 ? (Math.sin(t * 6) > 0 ? 4 : .2) : (Math.sin(t * 6) > 0 ? 1.2 : 0);
  }


  // 小游戏版：界面画在一张 2D 画布上（options.overlayCanvas），每帧作为最上层贴到 3D 画面上。小程序版不传，不受影响。
  let overlay = null;
  if (options.overlayCanvas) {
    const tex = new THREE.CanvasTexture(options.overlayCanvas);
    tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    const ovScene = new THREE.Scene(); ovScene.add(quad);
    overlay = { tex, mat, quad, ovScene, ovCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }
  let running = false, destroyed = false, frameId = null, last = 0, lastDraw = 0, lostNotified = false;
  function frame(timestamp) {
    if (!running || destroyed) return;
    // 显卡收回了绘图上下文（锁屏、休眠、驱动重置等）后 three.js 不再作画，画布会一直空着。
    // 发现后停下渲染循环，交给页面拆掉旧画布重建。
    if (context.isContextLost && context.isContextLost()) {
      running = false; frameId = null;
      if (!lostNotified) { lostNotified = true; if (options.onContextLost) options.onContextLost(); }
      return;
    }
    const now = performance.now();
    if (now - lastDraw >= 1000 / (detail ? 60 : 30) - 1) {
      const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; lastDraw = now;
      if (L) animate(now, dt); ambient(now, dt); updateCamera(dt);
      sun.position.copy(sunDir).multiplyScalar(48); sun.target.position.set(0, 0, 0);
      renderer.render(scene, camera);
      if (overlay) { renderer.autoClear = false; renderer.render(overlay.ovScene, overlay.ovCam); renderer.autoClear = true; }
    }
    if (running) frameId = platform.requestAnimationFrame(frame);
  }
  function resume() { if (running || destroyed) return; running = true; last = performance.now(); lastDraw = 0; frameId = platform.requestAnimationFrame(frame); }
  function pause() { running = false; if (frameId !== null) platform.cancelAnimationFrame(frameId); frameId = null; }
  function load() {
    anim = null; L = game.level; buildLevelVisuals(); readState(); worker.cheer = 0;
    syncVisuals(true); refit(); cam.dist = fitGoal * goal.zoom;
  }
  function move(result) {
    readState();
    if (!result.moved) return;
    if (scenic) setScenic(false);
    anim = Object.assign({ t0: performance.now() }, result); if (result.bi >= 0) worker.push = 1;
  }
  function sync() { anim = null; readState(); worker.cheer = 0; syncVisuals(true); }
  function settle() { if (anim) { anim = null; readState(); syncVisuals(true); } }
  function destroy() {
    if (destroyed) return; destroyed = true; pause();
    // 上下文已经丢失时，释放显卡资源可能报错；这里只求尽量释放，失败不影响重建
    try { releaseAll(); } catch (e) { /* ignore */ }
  }
  function releaseAll() {
    if (overlay) { overlay.tex.dispose(); overlay.mat.dispose(); overlay.quad.geometry.dispose(); }
    const geometries = new Set(), materials = new Set(), textures = new Set();
    const collect = object => {
      if (object.geometry) geometries.add(object.geometry);
      const list = Array.isArray(object.material) ? object.material : [object.material];
      list.filter(Boolean).forEach(material => materials.add(material));
      if (object.isInstancedMesh && object.dispose) object.dispose();
      if (object.shadow && object.shadow.dispose) object.shadow.dispose();
    };
    scene.traverse(collect); envScene.traverse(collect);
    Object.keys(M).forEach(key => materials.add(M[key]));
    Object.keys(TEX).forEach(key => textures.add(TEX[key]));
    levelTrash.forEach(resource => { if (resource.isTexture) textures.add(resource); else if (resource.isMaterial) materials.add(resource); else if (resource.isBufferGeometry) geometries.add(resource); });
    materials.forEach(material => { Object.keys(material).forEach(key => { if (material[key] && material[key].isTexture) textures.add(material[key]); }); material.dispose(); });
    textures.forEach(texture => texture.dispose()); geometries.forEach(geometry => geometry.dispose());
    if (envRT) envRT.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
  }
  buildTextures(); buildMaterials(); buildShell(); buildOutdoors(); buildDecor();
  worker = makeWorker(); world.add(worker.root);
  applySky(skyName); resize(width, height); load(); updateCamera(1);
  return {
    load, move, sync, settle, pause, resume, resize, destroy, resetView, setScenic, setOverhead, screenToDir,
    setInsets(top, bottom) { topInset = Math.max(0, top); bottomInset = Math.max(0, bottom); resize(width, height); },
    isMoving: () => !!anim,
    // 小游戏版：界面画布内容变了，下一帧重新上传贴图
    overlayChanged() { if (overlay) overlay.tex.needsUpdate = true; },
    // 仅供自动化测试：模拟显卡收回绘图上下文，检验自动恢复
    debugLoseContext() { const ext = context.getExtension && context.getExtension('WEBGL_lose_context'); if (!ext) return false; ext.loseContext(); return true; },
    cycleSky() { applySky(SKY_ORDER[(SKY_ORDER.indexOf(skyName) + 1) % 3]); },
    orbit(dx, dy) { goal.az -= dx * .008; goal.el = clamp(goal.el + dy * .005, .1, 1.4); },
    zoom(ratio) { goal.zoom = clamp(goal.zoom * ratio, .5, scenic ? 1.6 : 2.1); },
    tap(x, y) {
      if (!L) return null;
      const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(x / width * 2 - 1, -y / height * 2 + 1), hit = new THREE.Vector3();
      ray.setFromCamera(ndc, camera);
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
      const ox = hit.x - cellX(game.player), oz = hit.z - cellZ(game.player);
      return Math.max(Math.abs(ox), Math.abs(oz)) > .5 ? Math.abs(ox) > Math.abs(oz) ? (ox > 0 ? 3 : 2) : (oz > 0 ? 1 : 0) : null;
    }
  };
};
