// 3D 沙盘：舆图右上角切到“沙盘”，同一张天下变成斜俯视的立体沙盘。
// 地形由舆图数据生成：海岸线、黄河、长江、四道山脉（太行、秦岭、大别、武夷）；各家地盘用地面晕染上色，道路画在地上。
// 22 座城都是立体的青砖城池（城墙、角楼、城门楼、官署、民居），城头大旗写所属势力的字，换了主人旗跟着换。
// 城名、兵力、待命人数用页面文字叠在画面上，点城池（或点名字）和平面舆图一样打开右侧面板。
// 操作：拖动平移，滚轮 / 双指缩放，右键拖动或双指旋转；右下角有旋转、俯视、复位按钮。
// 用法：ZL.Sandbox.open(容器, { pick }) → Promise<是否成功>；update(状态)；focus(城 id)；close()
(function (ZL) {
  let THREE = null, cur = null;
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => (n >= 10000 ? (n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万' : String(Math.round(n)));
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // 舆图坐标（880×800）→ 世界坐标：中心在原点，缩一半
  const KS = 0.5, MX = 440, MY = 400;
  const toW = (mx, my) => [(mx - MX) * KS, (my - MY) * KS];
  // 地形覆盖的范围（舆图坐标），比舆图大一圈，免得看到边
  const EX0 = -140, EY0 = -140, EX1 = 1020, EY1 = 940;

  // ---------- 噪声 ----------
  function hash(x, y) { let h = x * 374761393 + y * 668265263; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v);
  }
  const fbm = (x, y) => vnoise(x, y) * 0.5 + vnoise(x * 2.1, y * 2.1) * 0.27 + vnoise(x * 4.3, y * 4.3) * 0.15 + vnoise(x * 8.7, y * 8.7) * 0.08;
  const ridged = (x, y) => { let s = 0, a = 0.55, f = 1; for (let i = 0; i < 4; i++) { s += a * (1 - Math.abs(vnoise(x * f, y * f) * 2 - 1)); a *= 0.5; f *= 2.05; } return s; };
  function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  }
  const lineDist = (px, py, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; };

  // ---------- 地形 ----------
  function makeTerrain() {
    const MAP = ZL.MAP, CITIES = ZL.CITIES;
    // 海和江河：用舆图上的路径画一张遮罩（红 = 海，绿 = 江河）
    const mw = 580, mh = 540, sx = mw / (EX1 - EX0), sy = mh / (EY1 - EY0);
    const c = document.createElement('canvas'); c.width = mw; c.height = mh;
    const g = c.getContext('2d');
    g.setTransform(sx, 0, 0, sy, -EX0 * sx, -EY0 * sy);
    g.fillStyle = '#000'; g.fillRect(EX0, EY0, EX1 - EX0, EY1 - EY0);
    g.fillStyle = 'rgb(255,0,0)';
    g.fill(new Path2D(MAP.coast));
    g.fillRect(890, EY0, EX1 - 890, EY1 - EY0); g.fillRect(760, EY0, EX1 - 760, 130); g.fillRect(826, 800, EX1 - 826, EY1 - 800);
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, a] of [[30, 0.3], [18, 0.6], [10, 1]]) {
      g.strokeStyle = `rgba(0,255,0,${a})`; g.lineWidth = w;
      g.stroke(new Path2D(MAP.yellowRiver)); g.stroke(new Path2D(MAP.yangtze));
    }
    const px = g.getImageData(0, 0, mw, mh).data;
    const mask = (mx, my, ch) => {
      const fx = clamp((mx - EX0) * sx - 0.5, 0, mw - 1.001), fy = clamp((my - EY0) * sy - 0.5, 0, mh - 1.001), x0 = fx | 0, y0 = fy | 0, u = fx - x0, v = fy - y0;
      const at = (x, y) => px[(y * mw + x) * 4 + ch] / 255;
      return lerp(lerp(at(x0, y0), at(x0 + 1, y0), u), lerp(at(x0, y0 + 1), at(x0 + 1, y0 + 1), u), v);
    };
    // 山脉：舆图上的四道，再加四周一圈远山
    const ranges = MAP.ranges.map(r => ({ pts: r.pts, rad: 34, h: 34 }))
      .concat([
        { pts: [[-90, 80], [-60, 260], [-70, 420], [-40, 600]], rad: 60, h: 38 }, { pts: [[120, -100], [360, -110], [600, -90]], rad: 55, h: 32 },
        { pts: [[40, 600], [120, 700], [220, 850]], rad: 50, h: 30 }, { pts: [[380, 880], [560, 900], [700, 880]], rad: 45, h: 26 },
        { pts: [[90, 300], [140, 360], [170, 470]], rad: 22, h: 14 },
      ]);
    const cities = Object.values(CITIES);
    function height(mx, my) {
      let h = 1.4 + (fbm(mx * 0.012, my * 0.012) - 0.5) * 2.2;
      for (const r of ranges) {
        const d = lineDist(mx, my, r.pts);
        if (d < r.rad * 2.6) {
          const m = Math.exp(-((d / r.rad) ** 2));
          h += m * r.h * (0.4 + 0.75 * ridged(mx * 0.022 + r.h, my * 0.022) + 0.35 * (ridged(mx * 0.07, my * 0.07 + r.h) - 0.5));
        }
      }
      for (const ct of cities) {   // 城池周围压平
        const d = Math.hypot(mx - ct.x, my - ct.y);
        if (d < 40) h = lerp(1.6, h, smooth(18, 40, d));
      }
      const sea = mask(mx, my, 0), river = mask(mx, my, 1);
      h = lerp(h, -5, smooth(0.25, 0.75, sea));
      h = Math.min(h, lerp(h, -0.9, smooth(0.15, 1, river)));
      return h;
    }
    const nx = 330, ny = 306, W = (EX1 - EX0) * KS, D = (EY1 - EY0) * KS;
    const geo = new THREE.PlaneGeometry(W, D, nx, ny); geo.rotateX(-PI / 2);
    geo.translate((EX0 + EX1) / 2 * KS - MX * KS, 0, (EY0 + EY1) / 2 * KS - MY * KS);
    const p = geo.attributes.position, uv = geo.attributes.uv, cols = [], heights = new Float32Array(p.count);
    const C = (h) => new THREE.Color(h);
    const loess = C('#D4BE8E'), plain = C('#BCC288'), south = C('#93B072'), forest = C('#5B7A4C'), rock = C('#857D6E'), bank = C('#D8C89E'), col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const mx = p.getX(i) / KS + MX, my = p.getZ(i) / KS + MY, h = height(mx, my);
      p.setY(i, h); heights[i] = h;
      const lat = clamp((my - 80) / 700, 0, 1);
      col.copy(loess).lerp(plain, smooth(0, 0.5, lat)).lerp(south, smooth(0.5, 1, lat));
      const mt = fbm(mx * 0.06 + 3, my * 0.06);   // 山上林木和裸岩交错
      col.lerp(forest, smooth(3, 9, h) * 0.85).lerp(rock, smooth(20 + mt * 10, 34 + mt * 8, h));
      col.lerp(bank, smooth(0.2, 0.7, mask(mx, my, 1)) * 0.7 + smooth(0.1, 0.45, mask(mx, my, 0)) * 0.5);
      const n = 0.92 + fbm(mx * 0.05, my * 0.05) * 0.16; col.multiplyScalar(n);
      cols.push(col.r, col.g, col.b);
      uv.setXY(i, uv.getX(i) * W / 14, uv.getY(i) * D / 14);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    // 采样任意点的地面高度（世界坐标）
    const gx0 = (EX0 - MX) * KS, gz0 = (EY0 - MY) * KS;
    const heightAt = (x, z) => {
      const fx = clamp((x - gx0) / W * nx, 0, nx - 0.001), fz = clamp((z - gz0) / D * ny, 0, ny - 0.001), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j;
      const at = (a, b) => heights[b * (nx + 1) + a];
      return lerp(lerp(at(i, j), at(i + 1, j), u), lerp(at(i, j + 1), at(i + 1, j + 1), u), v);
    };
    return { geo, heightAt, mask, W, D };
  }

  // ---------- 城池模型（真实尺寸搭一座，合并后按比例缩小，所有城共用） ----------
  function cityModel(K, capital) {
    const { M, sbox } = K, g = new THREE.Group();
    const add = (geo, mat, x, y, z, parent = g) => K.add(geo, mat, x, y, z, parent);
    const W = capital ? 15 : 12, H = 5, TK = 2.6;
    const seg = (cx, cz, len, alongX) => {
      const w = alongX ? len : TK, d = alongX ? TK : len;
      add(sbox(w, H, d, 3), M.wallBrick, cx, H / 2, cz);
      add(sbox(w + 0.2, 0.3, d + 0.2, 3), M.brick, cx, H + 0.15, cz);
    };
    seg(0, -W, 2 * W + TK, true); seg(-W, 0, 2 * W - TK, false); seg(W, 0, 2 * W - TK, false);
    seg(-(W + 3) / 2 - 0.5, W, W - 3 + TK / 2, true); seg((W + 3) / 2 + 0.5, W, W - 3 + TK / 2, true);
    for (let x = -W; x <= W; x += 1.9) { add(sbox(1, 1, 0.5, 3), M.brick, x, H + 0.8, -W - TK / 2 + 0.25); if (Math.abs(x) > 4.5) add(sbox(1, 1, 0.5, 3), M.brick, x, H + 0.8, W + TK / 2 - 0.25); }
    for (let z = -W + 1.9; z < W; z += 1.9) for (const s of [-1, 1]) add(sbox(0.5, 1, 1, 3), M.brick, s * (W + TK / 2 - 0.25), H + 0.8, z);
    for (const [x, z] of [[-W, -W], [W, -W], [-W, W], [W, W]]) { add(sbox(4.2, H + 1.2, 4.2, 3), M.brick, x, (H + 1.2) / 2, z); K.pavilion(g, x, H + 1.2, z, 2.6, 2.6, 1); }
    add(sbox(9, H + 0.8, 4.4, 3), M.brick, 0, (H + 0.8) / 2, W);
    add(new THREE.PlaneGeometry(3.4, 4.2), M.door, 0, 2.1, W + 2.22);
    K.pavilion(g, 0, H + 0.8, W, 7.4, 3.4, capital ? 2 : 1);
    K.pavilion(g, 0, 0, -3, capital ? 9 : 6.5, capital ? 5.5 : 4.4, capital ? 2 : 1);
    const R = K.R;
    for (let i = 0; i < (capital ? 12 : 8); i++) {
      const x = (R() - 0.5) * (2 * W - 7), z = (R() - 0.5) * (2 * W - 7);
      if (Math.abs(x) < 5 && z > -8) continue;
      const w = 3 + R() * 2, d = 2.4 + R() * 1.4, h = 1.8 + R() * 0.6, grp = new THREE.Group();
      grp.position.set(x, 0, z); grp.rotation.y = R() < 0.5 ? 0 : PI / 2; g.add(grp);
      add(sbox(w, h, d, 3), M.plaster, 0, h / 2, 0, grp);
      K.roof(grp, 0, h, 0, w, d, 1.1, 0.45, 0.25);
    }
    return K.bake(g);
  }

  // ---------- 建场景 ----------
  function build(box, hooks) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const K = ZL.Kit3D.make(THREE, renderer, 2002), { M, std, keep, tex, R } = K;
    const scene = new THREE.Scene();
    const sky = K.sky(scene, { sunDir: new THREE.Vector3(-0.55, 0.62, 0.48), shadow: 250, fogNear: 420, fogFar: 1300, radius: 1600, sunIntensity: 3.1 });

    // 地形：底层是顶点色 + 细纹，上面盖一层“地盘和道路”的画布
    const TER = makeTerrain();
    const detail = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#E8E4DA'; g.fillRect(0, 0, w, h);
      K.blotches(g, w, h, 30, '120,110,90', 0.12, 20, 70); K.blotches(g, w, h, 20, '255,255,255', 0.16, 20, 60);
      K.speckle(g, w, h, 4000, ['#FFFFFF', '#B8B0A0', '#9C9480'], 0.35, 1, 2.2);
    }, true);
    const ground = new THREE.Mesh(TER.geo, std({ map: detail, vertexColors: true, roughness: 1 }));
    ground.receiveShadow = true; scene.add(ground); keep(TER.geo);
    const ovW = 1160, ovH = 940, ov = document.createElement('canvas'); ov.width = ovW; ov.height = ovH;
    const ovTex = keep(new THREE.CanvasTexture(ov)); ovTex.colorSpace = THREE.SRGBColorSpace; ovTex.anisotropy = 4;
    const ovGeo = keep(TER.geo.clone());
    { const uv = ovGeo.attributes.uv, p = ovGeo.attributes.position;
      for (let i = 0; i < p.count; i++) { const mx = p.getX(i) / KS + MX, my = p.getZ(i) / KS + MY; uv.setXY(i, (mx - EX0) / (EX1 - EX0), 1 - (my - EY0) / (EY1 - EY0)); } }
    const overlay = new THREE.Mesh(ovGeo, std({ map: ovTex, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    overlay.receiveShadow = true; overlay.renderOrder = 1; scene.add(overlay);
    // 水：海和江河（地形在水位以下的地方都会露出水面）
    const waterTex = tex(256, 256, (g, w, h) => {   // 浅青的水面，细碎的波纹
      g.fillStyle = '#7FA9A6'; g.fillRect(0, 0, w, h);
      K.blotches(g, w, h, 18, '60,100,100', 0.18, 20, 70); K.blotches(g, w, h, 14, '200,225,215', 0.14, 20, 60);
      g.strokeStyle = 'rgba(235,245,238,0.4)';
      for (let i = 0; i < 120; i++) { g.lineWidth = 0.6 + R(); const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 2, x + 12 + R() * 10, y); g.stroke(); }
    }, true);
    waterTex.repeat.set(220, 220);
    const water = new THREE.Mesh(keep(new THREE.PlaneGeometry(3200, 3200)), std({ map: waterTex, roughness: 0.22, metalness: 0, envMapIntensity: 0.6 }));
    water.rotation.x = -PI / 2; water.position.y = 0; water.receiveShadow = true; scene.add(water);

    // 树林：松和阔叶，实例化；海、江、城、高山顶上不种
    const pine = K.merge([[new THREE.CylinderGeometry(0.18, 0.28, 2, 5), '#4A3424', K.mat4(0, 1, 0)],
      [new THREE.ConeGeometry(1.7, 2.6, 6), '#355238', K.mat4(0, 2.6, 0)], [new THREE.ConeGeometry(1.35, 2.3, 6), '#3D5E40', K.mat4(0, 3.7, 0)], [new THREE.ConeGeometry(0.95, 2, 6), '#476B47', K.mat4(0, 4.7, 0)]]);
    const broad = K.merge([[new THREE.CylinderGeometry(0.22, 0.32, 2.4, 5), '#4A3424', K.mat4(0, 1.2, 0)],
      [new THREE.IcosahedronGeometry(1.6, 1), '#5A7A3E', K.mat4(0, 3.3, 0)], [new THREE.IcosahedronGeometry(1.2, 1), '#6A8A46', K.mat4(0.9, 3.9, 0.4)], [new THREE.IcosahedronGeometry(1.1, 1), '#4E6E36', K.mat4(-0.8, 3.7, -0.5)]]);
    const treeMat = std({ vertexColors: true, roughness: 0.9, flatShading: true });
    const cityList = Object.entries(ZL.CITIES);
    const plant = (geo, n, want) => {
      const im = new THREE.InstancedMesh(geo, treeMat, n), o = new THREE.Object3D(), c = new THREE.Color();
      let k = 0;
      for (let tries = 0; tries < n * 30 && k < n; tries++) {
        const mx = EX0 + 40 + R() * (EX1 - EX0 - 80), my = EY0 + 40 + R() * (EY1 - EY0 - 80);
        const [x, z] = toW(mx, my), h = TER.heightAt(x, z);
        if (h < 0.6 || h > 30 || TER.mask(mx, my, 1) > 0.05) continue;
        if (cityList.some(([, ct]) => Math.hypot(ct.x - mx, ct.y - my) < 34)) continue;
        if (!want(mx, my, h)) continue;
        o.position.set(x, h - 0.2, z); o.rotation.y = R() * PI * 2; o.scale.setScalar(0.5 + R() * 0.55); o.updateMatrix();
        im.setMatrixAt(k, o.matrix); im.setColorAt(k, c.setHSL(0.1, 0.1, 0.82 + R() * 0.22)); k++;
      }
      im.count = k; im.castShadow = true; im.receiveShadow = true; scene.add(im);
    };
    plant(pine, 1100, (mx, my, h) => h > 4 || fbm(mx * 0.02 + 7, my * 0.02) > 0.55);
    plant(broad, 750, (mx, my, h) => h < 9 && fbm(mx * 0.018, my * 0.018 + 3) > 0.5 + (my < 300 ? 0.12 : 0));

    // 城池：两种模型（都城大一些），每种材质一次画完所有城
    const cityPos = {}, CS = 0.42;
    for (const [id, ct] of cityList) { const [x, z] = toW(ct.x, ct.y); cityPos[id] = { x, z, y: TER.heightAt(x, z), capital: !!ct.capital }; }
    for (const capital of [false, true]) {
      const ids = cityList.filter(([id]) => cityPos[id].capital === capital).map(([id]) => id);
      if (!ids.length) continue;
      const o = new THREE.Object3D();
      for (const part of cityModel(K, capital)) {
        const im = new THREE.InstancedMesh(part.geometry, part.material, ids.length);
        ids.forEach((id, i) => { const p = cityPos[id]; o.position.set(p.x, p.y - 0.05, p.z); o.scale.setScalar(CS); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
        im.castShadow = true; im.receiveShadow = true; scene.add(im);
      }
    }
    // 城外的田（压平的地方）
    const fieldMat = std({ map: K.T.field, roughness: 1, polygonOffset: true, polygonOffsetFactor: -3 });
    for (const [id] of cityList) {
      const p = cityPos[id];
      for (let i = 0; i < 3; i++) {
        const a = R() * PI * 2, d = 10 + R() * 4, f = new THREE.Mesh(keep(new THREE.PlaneGeometry(4 + R() * 3, 3 + R() * 2)), fieldMat);
        f.rotation.set(-PI / 2, 0, R() * PI); f.position.set(p.x + Math.cos(a) * d, p.y + 0.06, p.z + Math.sin(a) * d);
        if (TER.heightAt(f.position.x, f.position.z) > 0.8) { f.receiveShadow = true; scene.add(f); }
      }
    }
    // 城头大旗：每座城一面，写所属势力的字
    const bannerCache = {};
    const bannerMat = (color, ch) => bannerCache[color + ch] || (bannerCache[color + ch] = K.flagMat(K.banner(color, ch)));
    const flags = {};
    for (const [id] of cityList) {
      const p = cityPos[id], grp = new THREE.Group(), s = p.capital ? 1.25 : 1;
      grp.position.set(p.x - 4.2 * s, p.y, p.z + 4.6 * s); scene.add(grp);
      K.add(new THREE.CylinderGeometry(0.1, 0.13, 9 * s, 6), M.wood, 0, 4.5 * s, 0, grp);
      K.add(new THREE.SphereGeometry(0.22, 8, 6), M.gold, 0, 9 * s + 0.15, 0, grp);
      const g = keep(new THREE.PlaneGeometry(4.4 * s, 3.3 * s, 10, 5)); g.translate(2.2 * s, 0, 0);
      const cloth = new THREE.Mesh(g, bannerMat('#888', '')); cloth.position.y = 9 * s - 1.75 * s; cloth.castShadow = true; grp.add(cloth);
      flags[id] = { cloth, base: g.attributes.position.array.slice(), ph: R() * 6, w: 4.4 * s, key: '' };
    }
    // 选中 / 目标的光圈
    const ringGeo = keep(new THREE.RingGeometry(8.4, 9.6, 48)); ringGeo.rotateX(-PI / 2);
    const ringMats = { sel: keep(new THREE.MeshBasicMaterial({ color: '#E3C08A', transparent: true, opacity: 0.85, depthWrite: false })),
      attack: keep(new THREE.MeshBasicMaterial({ color: '#E2553E', transparent: true, opacity: 0.8, depthWrite: false })),
      move: keep(new THREE.MeshBasicMaterial({ color: '#7FC08A', transparent: true, opacity: 0.8, depthWrite: false })) };
    const rings = [];
    // 云
    const clouds = [];
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: K.T.cloud, depthWrite: false, transparent: true, opacity: 0.55, color: '#FFF1DE', fog: false })));
      const a = -PI * (0.1 + R() * 0.8), d = 1000 + R() * 300;   // 远在天边，只在斜着看时露出来
      sp.position.set(Math.cos(a) * d, 90 + R() * 120, Math.sin(a) * d); sp.scale.set(300 + R() * 200, 100 + R() * 50, 1); scene.add(sp); clouds.push(sp);
    }

    // 画面层：画布 + 城名标签 + 视角按钮
    const wrap = document.createElement('div'); wrap.className = 'sandbox';
    wrap.innerHTML = `<div class="sb-labels"></div>
      <div class="sb-ctrl" role="group" aria-label="沙盘视角">
        <button data-sb="left" aria-label="向左转" title="向左转">⟲</button><button data-sb="right" aria-label="向右转" title="向右转">⟳</button>
        <button data-sb="tilt" title="俯视 / 斜视">俯视</button><button data-sb="home" title="看全图">全图</button>
      </div>
      <p class="sb-hint">拖动平移 · 滚轮或双指缩放 · 右键或双指旋转</p>`;
    wrap.prepend(renderer.domElement);
    box.appendChild(wrap);
    const labels = wrap.querySelector('.sb-labels');

    const cam = new THREE.PerspectiveCamera(36, 1, 1, 4000);
    const view = { tx: 0, tz: 20, dist: 420, az: 0, pitch: 0.92 }, goal = Object.assign({}, view);
    return { renderer, scene, K, TER, ground, overlay, ov, ovTex, water, waterTex, cityPos, flags, bannerMat, ringGeo, ringMats, rings, clouds,
      wrap, labels, cam, view, goal, hooks, sun: sky.sun, labelEls: {}, sig: '', ovKey: '' };
  }

  // ---------- 地盘、道路（画在地面那层画布上） ----------
  function paintOverlay(Z, st) {
    const g = Z.ov.getContext('2d'), w = Z.ov.width, h = Z.ov.height, sx = w / (EX1 - EX0), sy = h / (EY1 - EY0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h);
    g.setTransform(sx, 0, 0, sy, -EX0 * sx, -EY0 * sy);
    const S = st.S;
    for (const c of Object.values(S.cities)) {   // 各家地盘：以城为中心晕开
      if (!c.owner) continue;
      const p = ZL.CITIES[c.id], col = css('--' + c.owner), gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 100);
      gr.addColorStop(0, hexA(col, 0.28)); gr.addColorStop(0.55, hexA(col, 0.15)); gr.addColorStop(1, hexA(col, 0));
      g.fillStyle = gr; g.fillRect(p.x - 100, p.y - 100, 200, 200);
    }
    // 江河、海岸：在地面上再描一遍软边，水陆交界更顺
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [w, c] of [[26, 'rgba(150,180,170,0.18)'], [15, 'rgba(120,165,160,0.5)'], [10, 'rgba(127,169,166,0.9)']]) {
      g.strokeStyle = c; g.lineWidth = w; g.stroke(new Path2D(ZL.MAP.yellowRiver)); g.stroke(new Path2D(ZL.MAP.yangtze));
    }
    g.strokeStyle = 'rgba(210,196,160,0.55)'; g.lineWidth = 10; g.stroke(new Path2D(ZL.MAP.coast));
    const hot = new Set((st.targets || []).map(t => [st.from, t].sort().join('|')));
    for (const [a, b] of ZL.ROADS) {   // 道路：土黄虚线；出征 / 调动的路线加粗高亮
      const A = ZL.CITIES[a], B = ZL.CITIES[b], dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      const bend = (((A.x * 7 + B.y * 3) % 17) - 8) * 0.9, cx = (A.x + B.x) / 2 - (dy / len) * bend, cy = (A.y + B.y) / 2 + (dx / len) * bend;
      const on = hot.has([a, b].sort().join('|'));
      g.beginPath(); g.moveTo(A.x, A.y); g.quadraticCurveTo(cx, cy, B.x, B.y);
      if (on) {
        g.setLineDash([]); g.lineWidth = 9; g.strokeStyle = st.cmd === 'move' ? 'rgba(127,192,138,0.45)' : 'rgba(226,85,62,0.45)'; g.stroke();
        g.lineWidth = 3.4; g.strokeStyle = st.cmd === 'move' ? '#5FA36C' : '#D9452E'; g.setLineDash([10, 6]); g.stroke();
      } else { g.setLineDash([4, 4]); g.lineWidth = 1.6; g.strokeStyle = 'rgba(92,70,44,0.55)'; g.stroke(); }
    }
    g.setLineDash([]);
    for (const c of Object.values(S.cities)) { const p = ZL.CITIES[c.id]; g.fillStyle = 'rgba(214,196,160,0.55)'; g.beginPath(); g.arc(p.x, p.y, 17, 0, 2 * PI); g.fill(); }
    Z.ovTex.needsUpdate = true;
  }
  function hexA(col, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(col || ''); if (!m) return `rgba(138,132,118,${a})`;
    const n = parseInt(m[1], 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------- 状态 → 画面 ----------
  function update(st) {
    const Z = cur && cur.Z; if (!Z) return;
    cur.st = st;
    const S = st.S;
    // 旗：换了主人才换
    for (const c of Object.values(S.cities)) {
      const f = Z.flags[c.id], key = c.owner || ('n' + (c.keeper || ''));
      if (f.key === key) continue;
      f.key = key;
      const col = c.owner ? css('--' + c.owner) : css('--neutral');
      f.cloth.material = Z.bannerMat(col, c.owner ? S.factions[c.owner].mark : (c.keeper || '守').slice(0, 1));
    }
    const ovKey = Object.values(S.cities).map(c => c.owner || '-').join(',') + '|' + (st.from || '') + (st.targets || []).join(',') + st.cmd;
    if (ovKey !== Z.ovKey) { Z.ovKey = ovKey; paintOverlay(Z, st); }
    // 光圈
    Z.rings.forEach(r => Z.scene.remove(r)); Z.rings.length = 0;
    const ring = (id, kind, s = 1) => { const p = Z.cityPos[id], m = new THREE.Mesh(Z.ringGeo, Z.ringMats[kind]); m.position.set(p.x, p.y + 0.25, p.z); m.scale.setScalar(s * (p.capital ? 1.2 : 1)); m.userData.kind = kind; Z.scene.add(m); Z.rings.push(m); };
    if (st.sel && !st.form) ring(st.sel, 'sel');
    if (st.from) ring(st.from, 'sel');
    (st.targets || []).forEach(t => ring(t, st.cmd === 'move' ? 'move' : 'attack', t === st.picked ? 1.15 : 0.9));
    // 标签
    const tg = new Set(st.targets || []);
    Z.labels.innerHTML = Object.values(S.cities).map(c => {
      const cls = ['sb-label', 'f-' + (c.owner || 'none'), c.id === st.sel && !st.form ? 'sel' : '', tg.has(c.id) ? 'target' : '', c.id === st.picked ? 'picked' : '', c.id === st.from ? 'from' : ''].filter(Boolean).join(' ');
      const mark = c.owner ? S.factions[c.owner].mark : '';
      const idle = st.idle && st.idle[c.id];
      return `<button class="${cls}" data-city="${c.id}" aria-label="${esc(c.name)}，兵${fmt(c.troops)}">
        <span class="sb-mark">${esc(mark) || '·'}</span><b>${esc(c.name)}</b><small>${fmt(c.troops)}</small>${st.seats && st.seats.has(c.id) ? '<i class="sb-seat">都</i>' : ''}${idle ? `<i class="sb-idle">${idle}</i>` : ''}</button>`;
    }).join('');
    Z.labelEls = {};
    Z.labels.querySelectorAll('.sb-label').forEach(el => { Z.labelEls[el.dataset.city] = el; });
    placeLabels(Z);
  }

  // ---------- 视角 ----------
  function applyCam(Z) {
    const v = Z.view, h = Math.cos(v.pitch) * v.dist;
    Z.cam.position.set(v.tx + Math.sin(v.az) * h, Math.sin(v.pitch) * v.dist, v.tz + Math.cos(v.az) * h);
    Z.cam.lookAt(v.tx, 0, v.tz);
  }
  const tmpV = { v: null };
  function placeLabels(Z) {
    const w = Z.wrap.clientWidth, h = Z.wrap.clientHeight, v = tmpV.v || (tmpV.v = new THREE.Vector3());
    for (const id in Z.labelEls) {
      const p = Z.cityPos[id], el = Z.labelEls[id];
      v.set(p.x, p.y + (p.capital ? 11 : 9), p.z).project(Z.cam);
      const vis = v.z < 1 && v.x > -1.15 && v.x < 1.15 && v.y > -1.15 && v.y < 1.15;
      el.style.display = vis ? '' : 'none';
      if (vis) el.style.transform = `translate(${((v.x + 1) / 2 * w).toFixed(1)}px, ${((1 - v.y) / 2 * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
  function pick(Z, cx, cy) {
    const r = Z.wrap.getBoundingClientRect(), v = new THREE.Vector3();
    let best = null, bd = 44;
    for (const id in Z.cityPos) {
      const p = Z.cityPos[id];
      v.set(p.x, p.y + 2, p.z).project(Z.cam);
      const d = Math.hypot((v.x + 1) / 2 * r.width - (cx - r.left), (1 - v.y) / 2 * r.height - (cy - r.top));
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }
  function bindControls(Z) {
    const el = Z.wrap, ptrs = new Map(), g = Z.goal;
    let down = null, pinch = null;
    const wpp = () => 2 * Z.view.dist * Math.tan(Z.cam.fov * PI / 360) / Math.max(1, el.clientHeight);
    const pan = (dx, dy) => {
      const k = wpp(), az = g.az, fx = -Math.sin(az), fz = -Math.cos(az), rx = Math.cos(az), rz = -Math.sin(az), up = 1 / Math.max(0.5, Math.sin(g.pitch));
      g.tx = clamp(g.tx - rx * dx * k + fx * dy * k * up, -240, 240); g.tz = clamp(g.tz - rz * dx * k + fz * dy * k * up, -220, 230);
    };
    const onDown = e => {
      if (e.target.closest('.sb-label, .sb-ctrl')) return;
      el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, rot: e.button === 2 || e.shiftKey || e.ctrlKey };
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; down = null; }
    };
    const onMove = e => {
      const pt = ptrs.get(e.pointerId); if (!pt) return;
      const dx = e.clientX - pt.x, dy = e.clientY - pt.y; pt.x = e.clientX; pt.y = e.clientY;
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), ang = Math.atan2(b.y - a.y, b.x - a.x), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        g.dist = clamp(g.dist * pinch.d / Math.max(1, d), 40, 560); g.az -= ang - pinch.ang; pan(mx - pinch.mx, my - pinch.my);
        pinch = { d, ang, mx, my }; return;
      }
      if (!down) return;
      down.moved += Math.abs(dx) + Math.abs(dy);
      if (down.rot) { g.az -= dx * 0.006; g.pitch = clamp(g.pitch + dy * 0.004, 0.42, 1.45); } else pan(dx, dy);
    };
    const onUp = e => {
      ptrs.delete(e.pointerId);
      if (down && ptrs.size === 0 && down.moved < 7 && performance.now() - down.t < 600 && !down.rot) {
        const id = pick(Z, e.clientX, e.clientY); if (id && Z.hooks.pick) Z.hooks.pick(id);
      }
      if (ptrs.size < 2) pinch = null;
      if (ptrs.size === 0) down = null;
    };
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', e => { e.preventDefault(); g.dist = clamp(g.dist * Math.exp(e.deltaY * 0.0012), 40, 560); }, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
    el.querySelector('.sb-ctrl').addEventListener('click', e => {
      const b = e.target.closest('[data-sb]'); if (!b) return;
      if (b.dataset.sb === 'left') g.az += PI / 4;
      if (b.dataset.sb === 'right') g.az -= PI / 4;
      if (b.dataset.sb === 'tilt') { g.pitch = g.pitch > 1.2 ? 0.92 : 1.42; b.textContent = g.pitch > 1.2 ? '斜视' : '俯视'; }
      if (b.dataset.sb === 'home') home(Z);
    });
  }
  function home(Z) {
    const g = Z.goal, a = Math.max(0.6, Z.wrap.clientWidth / Math.max(1, Z.wrap.clientHeight));
    Object.assign(g, { tx: 0, tz: 20, az: 0, pitch: 0.92, dist: clamp(250 / Math.tan(Math.atan(Math.tan(Z.cam.fov * PI / 360) * a)), 300, 560) });
  }

  // ---------- 每帧 ----------
  const COVERS = ['title', 'profile'];
  function loop(now) {
    if (!cur) return;
    cur.raf = requestAnimationFrame(loop);
    const Z = cur.Z, dt = Math.min(0.05, (now - (cur.last || now)) / 1000); cur.last = now;
    if (document.hidden || (ZL.Siege && ZL.Siege.active()) || !Z.wrap.isConnected || Z.wrap.offsetParent === null) return;
    // 主菜单、武将详情这类整屏盖住棋盘时不画
    if (COVERS.some(id => { const e = document.getElementById(id); return e && !e.hidden; })) return;
    if (window.__SB_PAUSE) return;   // 自动测试用：暂停，由 ZL.Sandbox._frame() 一帧一帧地画
    // 镜头停稳后降到约 20 帧，省电（旗子、水面照样在动）
    const v0 = Z.view, g0 = Z.goal, moving = Math.abs(v0.tx - g0.tx) + Math.abs(v0.tz - g0.tz) + Math.abs(v0.dist - g0.dist) + Math.abs(v0.az - g0.az) * 50 + Math.abs(v0.pitch - g0.pitch) * 50 > 0.05;
    if (!moving && now - (cur.drawn || 0) < 48) return;
    cur.drawn = now;
    frame(Z, now, dt);
  }
  function frame(Z, now, dt) {
    const w = Z.wrap.clientWidth, h = Z.wrap.clientHeight;
    if (!cur) return;
    if (w !== cur.w || h !== cur.h) { cur.w = w; cur.h = h; Z.renderer.setSize(w, h, false); Z.cam.aspect = w / Math.max(1, h); Z.cam.updateProjectionMatrix(); if (!cur.homed) { home(Z); Object.assign(Z.view, Z.goal); cur.homed = true; } }
    const k = dt >= 1 ? 1 : 1 - Math.exp(-dt * 8), v = Z.view, g = Z.goal;
    for (const key of ['tx', 'tz', 'dist', 'az', 'pitch']) v[key] = lerp(v[key], g[key], k);
    applyCam(Z);
    const t = now / 1000;
    Z.waterTex.offset.x += dt * 0.004; Z.waterTex.offset.y += dt * 0.0015;
    for (const id in Z.flags) {
      const f = Z.flags[id], p = f.cloth.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = f.base[i * 3]; p.setZ(i, Math.sin(x * 1.3 - t * 5 + f.ph) * 0.35 * (x / f.w)); }
      p.needsUpdate = true;
    }
    for (const r of Z.rings) { r.material.opacity = 0.55 + 0.35 * Math.sin(t * 4); r.rotation.y = t * 0.3; }
    for (const c of Z.clouds) c.position.x += dt * 2;
    Z.renderer.render(Z.scene, Z.cam);
    placeLabels(Z);
  }

  // ---------- 对外 ----------
  function open(box, hooks) {
    if (cur) return Promise.resolve(true);
    if (!ZL.Kit3D || !ZL.Kit3D.canRun()) return Promise.resolve(false);
    cur = { building: true };
    return ZL.Kit3D.load().then(T => {
      THREE = T;
      if (!cur) return false;
      let Z;
      try { Z = build(box, hooks || {}); } catch (e) { if (window.console) console.error(e); cur = null; return false; }
      const pending = cur.pending;
      cur = { Z, raf: 0 };
      bindControls(Z);
      if (pending) update(pending);
      cur.raf = requestAnimationFrame(loop);
      return true;
    }).catch(() => { cur = null; return false; });
  }
  function close() {
    if (!cur) return;
    const c = cur; cur = null;
    if (!c.Z) return;
    cancelAnimationFrame(c.raf);
    const Z = c.Z;
    Z.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
    Z.K.dispose(); Z.renderer.dispose(); if (Z.renderer.forceContextLoss) Z.renderer.forceContextLoss();
    Z.wrap.remove();
  }
  function focus(id) {
    const Z = cur && cur.Z; if (!Z || !Z.cityPos[id]) return;
    const p = Z.cityPos[id]; Z.goal.tx = p.x; Z.goal.tz = p.z + 6; Z.goal.dist = Math.min(Z.goal.dist, 190);
  }
  ZL.Sandbox = {
    open, close, focus,
    update: st => { if (cur && cur.Z) update(st); else if (cur) cur.pending = st; },
    active: () => !!(cur && cur.Z),
    _frame: dt => { if (cur && cur.Z) frame(cur.Z, performance.now(), dt || 1); },   // 自动测试、录视频用：立刻画一帧（不给 dt 时镜头直接到位）
    _zoom: (dist, pitch, az) => { if (cur && cur.Z) Object.assign(cur.Z.goal, { dist, pitch }, az != null ? { az } : {}); },   // 自动测试用
    _cam: () => cur && cur.Z && { view: cur.Z.view, goal: cur.Z.goal, cityPos: cur.Z.cityPos },   // 录视频用：直接摆镜头
    _info: () => cur && cur.Z && Object.assign({}, cur.Z.renderer.info.render),
  };
})(globalThis.ZL = globalThis.ZL || {});
