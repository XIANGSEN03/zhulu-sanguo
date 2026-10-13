// 3D 攻城动画：玩家出征时先播 9 秒左右的攻城战，播完再看战报。
// 按这一仗的真实数据演：双方兵力和伤亡、火计、伏兵、单挑，最后攻克（破门、入城、换旗）还是败退。
// 做法参照推箱子 3D：Three.js r160、物理材质 + 环境光反射 + 胶片色调映射，所有贴图都用画布现画（夯土、青砖、筒瓦、木纹、门钉、水面、旗帜、匾额）。
// Three.js（vendor/three.min.js）第一次打开出征表单时才加载；加载不了、没有 WebGL 或系统要求减少动画时直接跳过。
// 用法：ZL.Siege.play(battle, info, done)
//   info：{ atkColor, defColor, atkMark, defMark, atkSurname, from, to, atkHead, defHead }
(function (ZL) {
  let THREE = null, loading = null, cur = null;
  const DUR = 9;

  const load = () => ZL.Kit3D.load().then(T => (THREE = T));
  function canRun() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return ZL.Kit3D.canRun();
  }

  // ---------- 小工具 ----------
  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = k => (k = clamp(k, 0, 1), k * k * (3 - 2 * k));
  const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const esc = t => String(t == null ? '' : t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = n => (n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(Math.round(n)));

  // =====================================================================
  function build(b, info, renderer) {
    // 贴图、材质、屋顶、楼阁等共用部件见 kit3d.js
    const K = ZL.Kit3D.make(THREE, renderer, b.a0 * 7 + b.d0 * 13 + 11);
    const { R, keep, tex, T, M, std, V, mat4, sbox, merge, disposables } = K;
    T.atkFlag = K.banner(info.atkColor, info.atkMark);
    T.defFlag = K.banner(info.defColor, info.defMark || '守');
    T.generalFlag = K.banner(info.atkColor, info.atkSurname || info.atkMark, true);
    M.plaque = std({ map: K.plaque(info.to), roughness: 0.5 });
    M.ground = std({ map: T.ground, vertexColors: true, roughness: 1 });
    M.atkFlag = K.flagMat(T.atkFlag); M.defFlag = K.flagMat(T.defFlag); M.generalFlag = K.flagMat(T.generalFlag);

    const scene = new THREE.Scene();
    K.sky(scene, { sunDir: V(-0.72, 0.36, 0.42), shadow: 110, fogNear: 160, fogFar: 620 });
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene, shadow = true) => K.add(geo, mat, x, y, z, parent, shadow);
    const roof = (parent, x, y, z, w, d, h, o, curl, mat) => K.roof(parent, x, y, z, w, d, h, o, curl, mat);
    const pavilion = (x, y, z, w, d, tiers, withPlaque) => K.pavilion(scene, x, y, z, w, d, tiers, withPlaque ? M.plaque : null);

    // ---------- 地面、远山、田、路、树 ----------
    const GR = 1000, gg = new THREE.PlaneGeometry(GR, GR, 140, 140); gg.rotateX(-PI / 2);
    { const p = gg.attributes.position, uv = gg.attributes.uv, cols = [], c = new THREE.Color(), dusty = new THREE.Color('#E4D2AE'), green = new THREE.Color('#BFD08C');
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i);
        const out = Math.max(0, Math.abs(x) - 95) + Math.max(0, z - 230) + Math.max(0, -z - 95);
        const n = Math.sin(x * 0.03) * Math.cos(z * 0.027) * 0.7 + Math.sin(x * 0.07 + z * 0.05) * 0.3;
        p.setY(i, n * clamp(out / 70, 0, 1) * 9);
        const d = Math.hypot(x, z - 20);
        c.copy(green).lerp(dusty, clamp(1.2 - d / 140, 0, 1)).multiplyScalar(0.92 + R() * 0.08);
        cols.push(c.r, c.g, c.b);
        uv.setXY(i, uv.getX(i) * GR / 22, uv.getY(i) * GR / 22);
      }
      gg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); gg.computeVertexNormals(); }
    const ground = new THREE.Mesh(keep(gg), M.ground); ground.receiveShadow = true; scene.add(ground);
    // 远山：起伏的山体，越远越淡
    const mountainMat = std({ vertexColors: true, roughness: 1, flatShading: true });
    for (let i = 0; i < 26; i++) {
      const ang = -PI * 0.05 - R() * PI * 1.1, dist = 330 + R() * 160;
      const g = new THREE.IcosahedronGeometry(1, 3), p = g.attributes.position, cols = [], c = new THREE.Color();
      for (let k = 0; k < p.count; k++) {
        const x = p.getX(k), y = p.getY(k), z = p.getZ(k), n = 1 + 0.18 * Math.sin(x * 5 + i) * Math.cos(z * 4 + i * 2) + 0.08 * Math.sin(y * 9);
        p.setXYZ(k, x * n, Math.max(-0.05, y * n), z * n);
        c.set(y > 0.55 ? '#8C8A80' : '#5D6E52').lerp(new THREE.Color('#79806A'), R() * 0.4); cols.push(c.r, c.g, c.b);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
      const m = add(g, mountainMat, Math.cos(ang) * dist, -2, Math.sin(ang) * dist, scene, false);
      m.scale.set(60 + R() * 70, 50 + R() * 90, 50 + R() * 60); m.rotation.y = R() * PI;
    }
    // 大道：从城门往南
    { const r = add(new THREE.PlaneGeometry(9, 260), M.road, 0, 0.04, 43 + 130, scene, false); r.rotation.x = -PI / 2; r.material.map.repeat.set(1, 6); }
    // 田
    for (const [x, z, w, d] of [[-75, 120, 40, 30], [-120, 70, 34, 50], [80, 140, 46, 32], [130, 80, 30, 44], [-90, 185, 50, 28], [95, 200, 40, 30]]) {
      const f = add(new THREE.PlaneGeometry(w, d), M.field, x, 0.06, z, scene, false); f.rotation.x = -PI / 2; f.rotation.z = (R() - 0.5) * 0.3;
    }
    // 树：松（叠锥）和阔叶（团块），实例化
    const pine = merge([[new THREE.CylinderGeometry(0.18, 0.28, 2, 6), '#4A3424', mat4(0, 1, 0)],
      [new THREE.ConeGeometry(1.7, 2.6, 7), '#355238', mat4(0, 2.6, 0)], [new THREE.ConeGeometry(1.35, 2.3, 7), '#3D5E40', mat4(0, 3.7, 0)], [new THREE.ConeGeometry(0.95, 2, 7), '#476B47', mat4(0, 4.7, 0)]]);
    const broad = merge([[new THREE.CylinderGeometry(0.22, 0.32, 2.4, 6), '#4A3424', mat4(0, 1.2, 0)],
      [new THREE.IcosahedronGeometry(1.6, 1), '#5A7A3E', mat4(0, 3.3, 0)], [new THREE.IcosahedronGeometry(1.2, 1), '#6A8A46', mat4(0.9, 3.9, 0.4)], [new THREE.IcosahedronGeometry(1.1, 1), '#4E6E36', mat4(-0.8, 3.7, -0.5)]]);
    const treeMat = std({ vertexColors: true, roughness: 0.9, flatShading: true });
    const forest = (geo, n, place) => {
      const im = new THREE.InstancedMesh(geo, treeMat, n), o = new THREE.Object3D(), c = new THREE.Color();
      for (let i = 0; i < n; i++) {
        const [x, z] = place(); o.position.set(x, 0, z); o.rotation.y = R() * PI * 2; o.scale.setScalar(0.8 + R() * 0.9); o.updateMatrix();
        im.setMatrixAt(i, o.matrix); im.setColorAt(i, c.setHSL(0.1, 0.1, 0.85 + R() * 0.2));
      }
      im.castShadow = true; im.receiveShadow = true; scene.add(im);
    };
    const outside = () => { let x, z; do { x = (R() - 0.5) * 360; z = (R() - 0.5) * 380 + 40; } while ((Math.abs(x) < 52 && z > -52 && z < 52) || (Math.abs(x) < 46 && z > 40 && z < 210) || Math.abs(x) < 8); return [x, z]; };
    forest(pine, 140, outside); forest(broad, 110, outside);
    forest(broad, 14, () => { let x, z; do { x = (R() - 0.5) * 50; z = (R() - 0.5) * 48; } while (Math.abs(x) < 7 && z > 0); return [x, z]; });

    // ---------- 城：青砖城墙、垛口、角楼、马面、城门楼、护城河 ----------
    const W = 32, H = 8, TK = 5;
    const wallSeg = (cx, cz, len, alongX) => {
      const w = alongX ? len : TK, d = alongX ? TK : len;
      add(sbox(w + (alongX ? 0 : 1.2), 1.2, d + (alongX ? 1.2 : 0), 3), M.brick, cx, 0.6, cz);
      add(sbox(w, H, d, 4), M.wallBrick, cx, H / 2, cz);
      add(sbox(w + 0.2, 0.4, d + 0.2, 3), M.brick, cx, H + 0.2, cz);
    };
    wallSeg(0, -W, 2 * W + TK, true); wallSeg(-W, 0, 2 * W - TK, false); wallSeg(W, 0, 2 * W - TK, false);
    wallSeg(-(W + 9) / 2 - 0.5, W, W - 9 + TK / 2, true); wallSeg((W + 9) / 2 + 0.5, W, W - 9 + TK / 2, true);
    // 垛口：外侧一圈带缺口的砖垛
    { const merlons = [], o = new THREE.Object3D();
      const push = (x, z, ry) => { o.position.set(x, H + 1.15, z); o.rotation.set(0, ry, 0); o.updateMatrix(); merlons.push(o.matrix.clone()); };
      for (let x = -W - 2; x <= W + 2; x += 2.3) { push(x, -W - TK / 2 + 0.3, 0); if (Math.abs(x) > 10) push(x, W + TK / 2 - 0.3, 0); }
      for (let z = -W; z <= W; z += 2.3) { push(-W - TK / 2 + 0.3, z, PI / 2); push(W + TK / 2 - 0.3, z, PI / 2); }
      const im = new THREE.InstancedMesh(keep(sbox(1.3, 1.5, 0.6, 3)), M.brick, merlons.length); merlons.forEach((m, i) => im.setMatrixAt(i, m)); im.castShadow = im.receiveShadow = true; scene.add(im); }
    // 马面（突出城墙的墩台）
    for (const [x, z, w, d] of [[-22, W + 4, 5, 3.4], [22, W + 4, 5, 3.4], [-W - 4, -10, 3.4, 5], [W + 4, -10, 3.4, 5], [-W - 4, 14, 3.4, 5], [W + 4, 14, 3.4, 5], [-14, -W - 4, 5, 3.4], [14, -W - 4, 5, 3.4]]) {
      add(sbox(w, H + 0.6, d, 3), M.brick, x, (H + 0.6) / 2, z);
    }
    // 角楼
    for (const [x, z] of [[-W, -W], [W, -W], [-W, W], [W, W]]) {
      add(sbox(9, H + 1.6, 9, 3), M.brick, x, (H + 1.6) / 2, z);
      pavilion(x, H + 1.6, z, 5.4, 5.4, 1);
    }
    // 城门墩台：青砖，拱券门洞（用挤出的形状挖出门洞）
    const HP = H + 1.6, gateFront = W + TK / 2 + 2;
    { const s = new THREE.Shape(); s.moveTo(-10, 0); s.lineTo(10, 0); s.lineTo(10, HP); s.lineTo(-10, HP); s.lineTo(-10, 0);
      const hole = new THREE.Path(); hole.moveTo(-3, 0); hole.lineTo(3, 0); hole.lineTo(3, 4.2); hole.absarc(0, 4.2, 3, 0, PI, false); hole.lineTo(-3, 0); s.holes.push(hole);
      add(new THREE.ExtrudeGeometry(s, { depth: 10, bevelEnabled: false, curveSegments: 18 }), M.brickW, 0, 0, gateFront - 10);
      add(sbox(20.4, 0.4, 10.4, 3), M.brick, 0, HP + 0.2, gateFront - 5);
      for (let x = -9.6; x <= 9.6; x += 2.4) add(sbox(1.3, 1.4, 0.6, 3), M.brick, x, HP + 1.1, gateFront - 0.2);
    }
    pavilion(0, HP + 0.4, gateFront - 5, 15, 6.4, 2, true);
    // 城门：两扇朱漆门，钉满门钉，门轴在两侧
    const doors = [-1, 1].map(sd => {
      const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(3, 0); s.lineTo(3, 7.2); s.absarc(3, 4.2, 3, PI / 2, PI, false); s.lineTo(0, 0);
      const pivot = new THREE.Group(); pivot.position.set(sd * 3, 0, gateFront - 1.2); scene.add(pivot);
      const m = add(new THREE.ExtrudeGeometry(s, { depth: 0.3, bevelEnabled: false, curveSegments: 12 }), M.door, 0, 0, 0, pivot); m.scale.x = -sd;
      return pivot;
    });
    // 护城河、石砌河岸、吊桥
    const moat = (x, z, w, d) => { const m = add(new THREE.PlaneGeometry(w, d), M.water, x, 0.05, z, scene, false); m.rotation.x = -PI / 2; };
    moat(0, 41, 92, 5.5); moat(0, -41, 92, 5.5); moat(-41, 0, 5.5, 76.5); moat(41, 0, 5.5, 76.5);
    for (const [x, z, w, d] of [[0, 38.1, 82, 0.4], [0, 43.9, 93, 0.4], [0, -38.1, 82, 0.4], [0, -43.9, 93, 0.4], [-38.1, 0, 0.4, 76], [-43.9, 0, 0.4, 88], [38.1, 0, 0.4, 76], [43.9, 0, 0.4, 88]]) add(sbox(w, 0.5, d, 3), M.stone, x, 0.2, z, scene, false);
    add(sbox(7, 0.4, 7.4, 2), M.wood, 0, 0.35, 41);
    for (const s of [-1, 1]) for (let z = 38; z <= 44; z += 1.5) add(new THREE.CylinderGeometry(0.1, 0.1, 1.1, 6), M.wood, s * 3.3, 0.9, z);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.15, 0.15, 7.2), M.wood, s * 3.3, 1.4, 41);
    // 城内：官署、民居
    pavilion(0, 0.6, -12, 13, 8, 2);
    add(sbox(14, 0.6, 9, 3), M.stone, 0, 0.3, -12);
    const houses = [];
    for (let i = 0; i < 30; i++) {
      const x = (R() - 0.5) * 52, z = (R() - 0.5) * 50;
      if (Math.abs(x) < 7 && z > -18) continue; if (Math.abs(x) < 9 && Math.abs(z + 12) < 8) continue;
      const w = 4.5 + R() * 3, d = 3.4 + R() * 2, h = 2.4 + R() * 1;
      const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = R() < 0.5 ? 0 : PI / 2; scene.add(grp);
      add(sbox(w, h, d, 3), M.plaster, 0, h / 2, 0, grp);
      add(new THREE.BoxGeometry(1, 1.6, 0.1), M.wood, 0, 0.8, d / 2 + 0.03, grp);
      roof(grp, 0, h, 0, w, d, 1.5, 0.6, 0.3);
      houses.push(V(x, h + 1, z));
    }

    // ---------- 旗帜 ----------
    const flags = [];
    function flag(x, y, z, mat, scale = 1, pole = 5.5, parent = scene) {
      const grp = new THREE.Group(); grp.position.set(x, y, z); parent.add(grp);
      add(new THREE.CylinderGeometry(0.07, 0.09, pole, 6), M.wood, 0, pole / 2, 0, grp);
      add(new THREE.SphereGeometry(0.14, 8, 6), M.gold, 0, pole + 0.1, 0, grp);
      const g = keep(new THREE.PlaneGeometry(2.6, 1.95, 12, 6)); g.translate(1.3, 0, 0);
      const cloth = new THREE.Mesh(g, mat); cloth.position.y = pole - 1.05; cloth.castShadow = true; grp.add(cloth);
      grp.scale.setScalar(scale);
      const f = { grp, cloth, base: g.attributes.position.array.slice(), ph: R() * 6, top: pole - 1.05 };
      flags.push(f); return f;
    }
    const cityFlags = [];
    for (const [x, z] of [[-W, W], [W, W], [-W, -W], [W, -W]]) cityFlags.push(flag(x + 2.4, H + 1.6, z + 2.4, M.defFlag, 1.1));
    for (const x of [-9, 9]) cityFlags.push(flag(x, HP + 0.4, gateFront - 0.6, M.defFlag, 1.25));
    for (const x of [-26, -16, 16, 26]) cityFlags.push(flag(x, H + 0.4, W + 1.6, M.defFlag, 0.95));

    // ---------- 士兵：实例化，一份势力色部件（战袍、盔缨、盾）+ 一份本色部件 ----------
    const soldierTint = merge([
      [new THREE.CylinderGeometry(0.21, 0.31, 0.5, 8), '#ffffff', mat4(0, 0.62, 0)],
      [new THREE.ConeGeometry(0.05, 0.24, 5), '#ffffff', mat4(0, 1.68, 0)],
      [new THREE.BoxGeometry(0.5, 0.64, 0.07), '#ffffff', mat4(-0.3, 0.98, 0.17, 0, 0.25, 0)],
    ]);
    const soldierBase = merge([
      [new THREE.BoxGeometry(0.15, 0.55, 0.17), '#3B332B', mat4(-0.1, 0.28, 0)], [new THREE.BoxGeometry(0.15, 0.55, 0.17), '#3B332B', mat4(0.1, 0.28, 0)],
      [new THREE.BoxGeometry(0.17, 0.13, 0.25), '#241E1A', mat4(-0.1, 0.07, 0.03)], [new THREE.BoxGeometry(0.17, 0.13, 0.25), '#241E1A', mat4(0.1, 0.07, 0.03)],
      [new THREE.BoxGeometry(0.46, 0.5, 0.3), '#5A5650', mat4(0, 0.99, 0)], [new THREE.BoxGeometry(0.48, 0.08, 0.32), '#6B4A2A', mat4(0, 0.77, 0)],
      [new THREE.BoxGeometry(0.2, 0.14, 0.3), '#47443F', mat4(-0.3, 1.17, 0)], [new THREE.BoxGeometry(0.2, 0.14, 0.3), '#47443F', mat4(0.3, 1.17, 0)],
      [new THREE.BoxGeometry(0.12, 0.42, 0.14), '#5A5650', mat4(0.31, 0.95, 0.06, -0.35, 0, 0)],
      [new THREE.SphereGeometry(0.13, 10, 8), '#C8996F', mat4(0, 1.39, 0.01)],
      [new THREE.SphereGeometry(0.165, 10, 6, 0, PI * 2, 0, PI / 2), '#4A4846', mat4(0, 1.43, 0)], [new THREE.CylinderGeometry(0.19, 0.19, 0.03, 12), '#3C3A38', mat4(0, 1.43, 0)],
      [new THREE.CylinderGeometry(0.025, 0.025, 3.1, 5), '#7A5A38', mat4(0.33, 1.5, 0.12)], [new THREE.ConeGeometry(0.06, 0.34, 5), '#CDD1D5', mat4(0.33, 3.2, 0.12)],
    ]);
    const armyMatTint = std({ roughness: 0.82 }), armyMatBase = std({ vertexColors: true, roughness: 0.55, metalness: 0.35 });
    function army(n, color) {
      const tint = new THREE.InstancedMesh(soldierTint, armyMatTint, n), base = new THREE.InstancedMesh(soldierBase, armyMatBase, n);
      const c = new THREE.Color(color), c2 = new THREE.Color();
      for (let i = 0; i < n; i++) tint.setColorAt(i, c2.copy(c).offsetHSL(0, (R() - 0.5) * 0.1, (R() - 0.5) * 0.08));
      tint.castShadow = base.castShadow = true; tint.receiveShadow = base.receiveShadow = true;
      tint.frustumCulled = base.frustumCulled = false;
      scene.add(tint); scene.add(base); return { tint, base, n };
    }
    const nA = clamp(Math.round(b.a0 / 32), 180, 520), nD = clamp(Math.round(b.d0 / 90), 44, 150);
    const A = army(nA, info.atkColor), D = army(nD, info.defColor);
    // 攻方 8 个方阵：两排，每排 4 个，中间留出冲车的路
    const blockX = [-25, -9, 9, 25], perBlock = Math.ceil(nA / 8), rowLen = 11;
    const atk = [];
    for (let i = 0; i < nA; i++) {
      const bi = Math.floor(i / perBlock), k = i % perBlock, bx = blockX[bi % 4], bz = 54 + Math.floor(bi / 4) * 17;
      atk.push({ x: bx + (k % rowLen - (rowLen - 1) / 2) * 1.15 + (R() - 0.5) * 0.2, z: bz + Math.floor(k / rowLen) * 1.3, front: bi < 4, delay: R() * 0.35, ph: R() * 6, die: 1e9, ladder: -1 });
    }
    // 守军：城头一字排开，城门楼上也站一排
    const def = [];
    for (let i = 0; i < nD; i++) {
      let x, y = H + 0.4, z = W + 1.2, ry = 0;
      if (i < nD * 0.16) { x = lerp(-8, 8, (i + 0.5) / (nD * 0.16)); y = HP + 0.4; z = gateFront - 1.1; }
      else if (i < nD * 0.8) { do { x = (R() - 0.5) * 2 * (W + 1); } while (Math.abs(x) < 10.5); }
      else { x = (R() < 0.5 ? -1 : 1) * (W - 1.2); z = (R() - 0.5) * 2 * (W - 4); ry = x < 0 ? -PI / 2 : PI / 2; }
      def.push({ x, y, z, ry, ph: R() * 6, die: 1e9 });
    }
    // 伤亡：按真实损失比例，挑一部分人在交战时段倒下
    const lostA = clamp(1 - b.a / Math.max(1, b.a0), 0, 0.92), lostD = clamp(1 - b.d / Math.max(1, b.d0), 0, 1);
    const plotA = b.steps.some(s => s.kind === 'plot' && /火计/.test(s.text)), plotD = b.steps.some(s => s.kind === 'plot' && /伏/.test(s.text));
    const duel = b.steps.find(s => s.kind === 'duel'), duelWin = !!(duel && /抵挡不住|拨马便走/.test(duel.text));
    const take = b.result === 'take';
    atk.forEach(s => { if (R() < lostA) s.die = 3.4 + R() * 3.4 - (plotD && Math.abs(s.x) > 18 ? 0.8 : 0); });
    def.forEach(s => { if (R() < lostD * (take ? 0.85 : 0.75)) s.die = 3.4 + R() * 3.2; });

    // ---------- 云梯 ----------
    const LL = 13.2, ladderParts = [];
    for (const s of [-0.55, 0.55]) ladderParts.push([new THREE.BoxGeometry(0.16, LL, 0.16), '#6A4A2C', mat4(s, LL / 2, 0)]);
    for (let y = 0.5; y < LL; y += 0.6) ladderParts.push([new THREE.BoxGeometry(1.1, 0.08, 0.1), '#7C5934', mat4(0, y, 0)]);
    ladderParts.push([new THREE.BoxGeometry(0.1, 0.1, 0.5), '#55585C', mat4(-0.55, LL, -0.25)], [new THREE.BoxGeometry(0.1, 0.1, 0.5), '#55585C', mat4(0.55, LL, -0.25)]);
    const ladderGeo = merge(ladderParts), ladderMat = std({ vertexColors: true, roughness: 0.8 });
    const ladders = [-26, -16, 16, 26].map(x => { const m = new THREE.Mesh(ladderGeo, ladderMat); m.position.set(x, 0, 44.6); m.rotation.x = 1.45; m.castShadow = true; scene.add(m); return m; });
    const LEAN = Math.atan2(10.1, H + 0.6);
    // 每架梯子挑 5 个前排的兵爬
    ladders.forEach((lad, li) => {
      const near = atk.filter(s => s.front && s.ladder < 0).sort((a, c) => Math.abs(a.x - lad.position.x) - Math.abs(c.x - lad.position.x)).slice(0, 5);
      near.forEach((s, k) => { s.ladder = li; s.lk = k; s.die = take ? 1e9 : 6.1 + k * 0.12; });
    });

    // ---------- 冲车 ----------
    const ram = new THREE.Group(); scene.add(ram);
    const wheels = [];
    for (const sx of [-1.5, 1.5]) for (const sz of [-2.6, 2.6]) {
      add(new THREE.BoxGeometry(0.3, 3.2, 0.3), M.wood, sx, 1.9, sz, ram);
      const w = add(new THREE.CylinderGeometry(0.7, 0.7, 0.3, 14), M.wood, sx * 1.15, 0.7, sz, ram); w.rotation.z = PI / 2; wheels.push(w);
    }
    for (const sx of [-1.5, 1.5]) add(new THREE.BoxGeometry(0.3, 0.3, 6.4), M.wood, sx, 3.4, 0, ram);
    roof(ram, 0, 3.5, 0, 2.6, 6.4, 1.3, 0.35, 0, M.hide);
    const log = new THREE.Group(); log.position.set(0, 2.3, 0); ram.add(log);
    { const l = add(new THREE.CylinderGeometry(0.38, 0.38, 7.2, 12), M.wood, 0, 0, 0, log); l.rotation.x = PI / 2;
      const h = add(new THREE.ConeGeometry(0.5, 1, 12), M.bronze, 0, 0, -4.1, log); h.rotation.x = -PI / 2; }
    ram.position.set(0, 0, 80);

    // ---------- 骑马的将领 ----------
    const horseMat = std({ color: '#5A3A24', roughness: 0.6 }), maneMat = std({ color: '#1E1714', roughness: 0.8 }), skinMat = std({ color: '#C8996F', roughness: 0.7 }), plumeMat = std({ color: '#B0281C', roughness: 0.8 });
    function horseman(color, fmat) {
      const g = new THREE.Group(), cm = std({ color, roughness: 0.75, side: THREE.DoubleSide });
      const body = add(new THREE.CapsuleGeometry(0.55, 1.5, 6, 12), horseMat, 0, 1.6, 0, g); body.rotation.x = PI / 2;
      add(new THREE.CapsuleGeometry(0.28, 0.8, 4, 10), horseMat, 0, 2.25, -1.05, g).rotation.x = -0.65;
      add(new THREE.BoxGeometry(0.34, 0.42, 0.95), horseMat, 0, 2.7, -1.55, g).rotation.x = 0.55;
      add(new THREE.BoxGeometry(0.08, 0.5, 0.9), maneMat, 0, 2.5, -1.0, g).rotation.x = -0.65;
      add(new THREE.ConeGeometry(0.16, 1.2, 6), maneMat, 0, 1.4, 1.35, g).rotation.x = -2.6;
      const legs = [];
      for (const sx of [-0.3, 0.3]) for (const sz of [-0.75, 0.75]) {
        const hip = new THREE.Group(); hip.position.set(sx, 1.3, sz); g.add(hip);
        add(new THREE.CylinderGeometry(0.1, 0.08, 1.25, 6), horseMat, 0, -0.62, 0, hip);
        add(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 6), maneMat, 0, -1.25, 0, hip);
        legs.push(hip);
      }
      add(new THREE.BoxGeometry(1.15, 0.12, 1.2), cm, 0, 2.17, 0.05, g);
      add(new THREE.CapsuleGeometry(0.27, 0.45, 4, 10), M.iron, 0, 2.75, 0.1, g);
      add(new THREE.BoxGeometry(0.58, 0.5, 0.36), cm, 0, 2.6, 0.12, g);
      add(new THREE.SphereGeometry(0.17, 12, 10), skinMat, 0, 3.28, 0.08, g);
      add(new THREE.ConeGeometry(0.2, 0.35, 10), M.iron, 0, 3.48, 0.08, g);
      add(new THREE.ConeGeometry(0.06, 0.4, 6), plumeMat, 0, 3.78, 0.08, g);
      add(new THREE.PlaneGeometry(0.7, 1.3, 1, 4), cm, 0, 2.5, 0.42, g).rotation.x = 0.35;
      add(new THREE.CylinderGeometry(0.035, 0.035, 4.4, 6), M.wood, 0.45, 3.0, -0.4, g).rotation.x = -0.9;
      add(new THREE.ConeGeometry(0.08, 0.5, 6), M.iron, 0.45, 4.55, -2.05, g).rotation.x = -0.9;
      if (fmat) flag(-0.55, 2.1, 0.45, fmat, 1.25, 6.5, g);
      scene.add(g); return { g, legs };
    }
    const general = horseman(info.atkColor, M.generalFlag);
    const champA = duel ? horseman(info.atkColor) : null, champD = duel ? horseman(info.defColor) : null;
    if (champA) champA.g.visible = champD.g.visible = false;

    // ---------- 箭 ----------
    const arrowData = [];
    const arrowGeo = merge([[new THREE.BoxGeometry(0.05, 0.05, 1.3), '#3A2A1C', null], [new THREE.BoxGeometry(0.02, 0.16, 0.25), '#D8D0C0', mat4(0, 0, 0.55)], [new THREE.ConeGeometry(0.05, 0.18, 4), '#9DA2A6', mat4(0, 0, -0.73, -PI / 2)]]);
    const arrows = new THREE.InstancedMesh(arrowGeo, std({ vertexColors: true, roughness: 0.7 }), 420);
    const fireArrows = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(0.09, 0.09, 1.4)), keep(new THREE.MeshBasicMaterial({ color: '#FFB060' })), 140);
    arrows.frustumCulled = fireArrows.frustumCulled = false; arrows.count = fireArrows.count = 0; scene.add(arrows); scene.add(fireArrows);
    const volley = (t0, n, from, to, fire) => { for (let i = 0; i < n; i++) arrowData.push({ t0: t0 + R() * 0.7, dur: 0.9 + R() * 0.35, s: from(), e: to(), h: 9 + R() * 7, fire }); };
    const atkPt = () => V((R() - 0.5) * 60, 1.6, 55 + R() * 26), wallPt = () => V((R() - 0.5) * 62, H + 0.8 + R() * 1.4, W + (R() - 0.5) * 3);
    const cityPt = () => V((R() - 0.5) * 44, 1.5 + R() * 3, (R() - 0.5) * 36), wallShoot = () => V((R() - 0.5) * 60, H + 1.6, W + 1.4);
    volley(2.2, 90, atkPt, wallPt, false); volley(2.7, 70, wallShoot, atkPt, false);
    volley(3.7, plotA ? 50 : 90, atkPt, wallPt, false); volley(4.4, 70, wallShoot, atkPt, false);
    if (plotA) volley(3.2, 130, atkPt, cityPt, true);
    volley(5.2, 50, wallShoot, () => V((R() - 0.5) * 40, 1.4, 46 + R() * 12), false);

    // ---------- 粒子与火光 ----------
    const sprites = [];
    const spMat = { fire: [T.fire, THREE.AdditiveBlending], smoke: [T.smoke, THREE.NormalBlending], dust: [T.dust, THREE.NormalBlending] };
    function spawn(kind, p, t, life = 1.6, size = 4, vy) {
      const [map, blending] = spMat[kind];
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, blending, transparent: true, depthWrite: false, opacity: 0 }));
      s.position.copy(p); s.scale.setScalar(0.01); scene.add(s);
      sprites.push({ s, kind, t0: t, life, size, vy: vy != null ? vy : kind === 'dust' ? 0.5 : kind === 'fire' ? 2.4 : 2.0, drift: (R() - 0.5) * 1.4 + (kind === 'smoke' ? 0.9 : 0) });
    }
    const fireLights = [0, 1, 2, 3].map(() => { const l = new THREE.PointLight('#FF8A3A', 0, 34, 2); scene.add(l); return { l, t0: -9, life: 0 }; });
    let fl = 0;
    const lightAt = (p, t, life) => { const f = fireLights[fl++ % fireLights.length]; f.l.position.copy(p).add(V(0, 2, 0)); f.t0 = t; f.life = life; };
    // 鸟群（开战就惊飞）
    const birdTex = tex(64, 32, g => { g.strokeStyle = '#2B231A'; g.lineWidth = 3; g.beginPath(); g.moveTo(4, 10); g.quadraticCurveTo(18, 4, 32, 18); g.quadraticCurveTo(46, 4, 60, 10); g.stroke(); });
    const birds = [];
    for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: birdTex, fog: false, transparent: true, depthWrite: false }))); scene.add(s); birds.push({ s, x: -20 + R() * 40, y: 30 + R() * 10, z: -10 + R() * 30, ph: R() * 6 }); }
    // 云
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: T.cloud, fog: false, depthWrite: false, transparent: true, opacity: 0.75, color: '#FFE6C8' })));
      const ang = -PI * R(), d = 420 + R() * 200; s.position.set(Math.cos(ang) * d, 110 + R() * 90, Math.sin(ang) * d - 60); s.scale.set(240 + R() * 160, 90 + R() * 50, 1); scene.add(s);
    }

    // ---------- 镜头：高空俯冲 → 低掠军阵 → 侧看单挑和箭雨 → 云梯登城 → 城门下 → 拉起看换旗 ----------
    const camPath = new THREE.CatmullRomCurve3([V(150, 92, 270), V(78, 30, 150), V(-42, 11, 86), V(-34, 17, 58), V(15, 7.5, 63), V(take ? 34 : 42, take ? 30 : 22, take ? 86 : 108), V(take ? 52 : 62, take ? 44 : 30, take ? 118 : 140)]);
    const lookPath = new THREE.CatmullRomCurve3([V(0, 4, 40), V(0, 4, 62), V(0, 5, 52), V(0, 8, 36), V(0, 6.5, 35), V(0, 8, take ? 18 : 48), V(0, 7, take ? 8 : 60)]);

    return { scene, flags, cityFlags, A, D, atk, def, doors, ram, wheels, log, ladders, LEAN, LL, general, champA, champD, duelWin, take, plotA, plotD,
      arrows, fireArrows, arrowData, spawn, sprites, fireLights, lightAt, burning: [], houses, birds, camPath, lookPath, W, H, gateFront, M, disposables };
  }

  // =====================================================================
  // 每一帧
  let tmpObj = null;
  function frame(S, cam, t, dt) {
    const o = tmpObj || (tmpObj = new THREE.Object3D());
    const { W, take } = S;
    // 镜头（竖屏时离远一点）
    const u = clamp(t / DUR, 0, 1), cu = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    const look = S.lookPath.getPoint(cu), k = cam.aspect < 1 ? 1.25 + (1 - cam.aspect) * 0.9 : 1;
    cam.position.copy(S.camPath.getPoint(cu)).sub(look).multiplyScalar(k).add(look);
    cam.position.y = Math.max(cam.position.y, 2.5);
    cam.lookAt(look);
    S.scene.fog.near = 160 * k; S.scene.fog.far = 620 * k;
    // 水面流动
    S.M.water.map.offset.x += dt * 0.012; S.M.water.map.offset.y += dt * 0.004;
    // 旗帜飘
    for (const f of S.flags) {
      const p = f.cloth.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = f.base[i * 3], y = f.base[i * 3 + 1]; p.setZ(i, Math.sin(x * 1.9 - t * 7.5 + f.ph + y * 0.6) * 0.24 * (x / 2.6)); }
      p.needsUpdate = true; f.cloth.geometry.computeVertexNormals();
    }
    // 攻克：城头先降旗，换成我方旗再升起
    if (take) for (const f of S.cityFlags) {
      const down = ease(seg(t, 6.8, 7.2)), up = ease(seg(t, 7.2, 7.7));
      if (t >= 7.2 && f.cloth.material !== S.M.atkFlag) f.cloth.material = S.M.atkFlag;
      f.cloth.position.y = f.top - (t < 7.2 ? down : 1 - up) * (f.top - 0.8);
      f.cloth.scale.y = t < 7.2 ? 1 - down * 0.9 : 0.1 + up * 0.9;
    }
    // 攻方
    const inrush = take ? seg(t, 6.4, 8.8) : 0, back = take ? 0 : ease(seg(t, 6.4, 9));
    for (let i = 0; i < S.atk.length; i++) {
      const s = S.atk[i];
      let x = s.x, y = 0, z = lerp(s.z + 110, s.z, ease(seg(t, s.delay, 3.2 + s.delay))), ry = PI, walking = t < 3.2 + s.delay;
      if (s.front) z -= 6 * ease(seg(t, 3.0, 4.2));
      if (s.ladder >= 0) {
        const lad = S.ladders[s.ladder], bx = lad.position.x + (s.lk % 2 ? 0.25 : -0.25);
        const go = ease(seg(t, 3.4, 4.4)); x = lerp(x, bx, go); z = lerp(z, 45.2 + s.lk * 0.7, go); walking = walking || (t > 3.4 && t < 4.4);
        const climb = seg(t, 4.7 + s.lk * 0.3, 6.0 + s.lk * 0.3) * S.LL * 0.93;
        if (climb > 0 && t < s.die) { y = climb * Math.cos(S.LEAN); z = 44.6 - climb * Math.sin(S.LEAN) + 0.4; x = bx; walking = true; }
        if (take && climb >= S.LL * 0.92) { y = S.H + 0.4; z = W + 1.6 - s.lk * 0.6; }
      }
      if (inrush > 0 && s.ladder < 0) {
        const kk = clamp(inrush * 1.5 - (s.z - 50) / 80, 0, 1);
        if (kk > 0) { walking = true; x = lerp(x, x * 0.08, ease(kk)); z = lerp(z, 22 - (s.z - 50) * 0.2, kk); }
      }
      if (back > 0) { z += back * (55 + (s.z - 50)); ry = 0; walking = true; }
      o.position.set(x, y + (walking ? Math.abs(Math.sin(t * 10 + s.ph)) * 0.13 : 0), z);
      o.rotation.set(0, ry, 0); o.scale.setScalar(1);
      if (t > s.die) {
        const kk = ease(seg(t, s.die, s.die + 0.4));
        if (y > 0.5) { o.position.y = Math.max(0.1, y - kk * y); o.position.z += kk * 3; }
        o.rotation.set(kk * PI / 2, ry, 0);
        if (t > s.die + 1.8) o.scale.setScalar(0.0001);
      }
      if (inrush > 0 && z < 24 && s.ladder < 0) o.scale.setScalar(0.0001);
      o.updateMatrix(); S.A.tint.setMatrixAt(i, o.matrix); S.A.base.setMatrixAt(i, o.matrix);
      if (walking && i % 23 === 0 && t < 3.4 && Math.random() < 0.3) S.spawn('dust', new THREE.Vector3(x, 0.4, z + 1), t, 1.6, 3.5);
    }
    S.A.tint.instanceMatrix.needsUpdate = S.A.base.instanceMatrix.needsUpdate = true;
    // 守军
    for (let i = 0; i < S.def.length; i++) {
      const s = S.def[i];
      o.position.set(s.x, s.y + Math.abs(Math.sin(t * 2.6 + s.ph)) * 0.05, s.z); o.rotation.set(0, s.ry, 0); o.scale.setScalar(1);
      if (t > s.die) {
        const kk = ease(seg(t, s.die, s.die + 0.5));
        o.rotation.set(-kk * PI / 2, s.ry, 0); o.position.y -= kk * 0.5;
        if (t > s.die + 1.4) o.scale.setScalar(0.0001);
      }
      if (take && t > 6.9) o.scale.setScalar(0.0001);
      o.updateMatrix(); S.D.tint.setMatrixAt(i, o.matrix); S.D.base.setMatrixAt(i, o.matrix);
    }
    S.D.tint.instanceMatrix.needsUpdate = S.D.base.instanceMatrix.needsUpdate = true;
    // 将领：在大军最前面
    const gz = lerp(178, 68, ease(seg(t, 0, 3.2))) + (back > 0 ? back * 60 : 0) - (take ? ease(seg(t, 6.6, 8.6)) * 40 : 0);
    const gMove = t < 3.2 || (take && t > 6.6) || back > 0;
    S.general.g.position.set(-3.5, 0, gz); S.general.g.rotation.y = back > 0 ? PI : 0;
    S.general.legs.forEach((l, i) => { l.rotation.x = gMove ? Math.sin(t * 13 + i * 1.7) * 0.6 : 0; });
    S.general.g.visible = !(take && gz < 30);
    // 云梯：竖起靠上城墙；败退时被推倒
    S.ladders.forEach((lad, i) => {
      const up = ease(seg(t, 3.9 + i * 0.12, 4.7 + i * 0.12)), fall = take ? 0 : ease(seg(t, 6.0 + i * 0.1, 6.7 + i * 0.1));
      lad.rotation.x = lerp(lerp(1.45, -S.LEAN, up), 1.45, fall);
    });
    // 冲车：推到城门下撞三下，攻克时门被撞开
    S.ram.position.z = lerp(80, S.gateFront + 4.1, ease(seg(t, 3.5, 4.9))) + (take ? 0 : ease(seg(t, 6.4, 9)) * 40);
    S.ram.visible = !(take && t > 7.3);
    S.wheels.forEach(w => { w.rotation.x = -S.ram.position.z * 1.4; });
    const swing = t > 4.9 && t < 6.4 ? Math.sin((t - 4.9) * PI * 2) : 0;
    S.log.position.z = -Math.max(0, swing) * 1.4 + Math.max(0, -swing) * 0.6;
    if (swing > 0.97 && Math.random() < 0.7) for (let i = 0; i < 2; i++) S.spawn('dust', new THREE.Vector3((Math.random() - 0.5) * 5, 1 + Math.random() * 3, S.gateFront - 0.6), t, 1.2, 5);
    const open = take ? ease(seg(t, 6.3, 6.8)) : 0;
    S.doors[0].rotation.y = open * 1.35; S.doors[1].rotation.y = -open * 1.35;
    if (take && t > 6.3 && !S.burst) { S.burst = true; for (let i = 0; i < 14; i++) S.spawn('dust', new THREE.Vector3((Math.random() - 0.5) * 9, 1 + Math.random() * 4, S.gateFront + Math.random() * 3), t, 2, 8); }
    // 单挑：两骑在阵前对冲，输的一方拨马退回
    if (S.champA) {
      const on = t > 1.9 && t < 3.9;
      S.champA.g.visible = S.champD.g.visible = on;
      if (on) {
        const kk = ease(seg(t, 1.9, 2.8));
        S.champA.g.position.set(-1.6, 0, lerp(62, 49.4, kk)); S.champA.g.rotation.y = 0;
        S.champD.g.position.set(1.6, 0, lerp(37, 48.6, kk)); S.champD.g.rotation.y = PI;
        if (t > 2.8 && !S.clash) { S.clash = true; for (let i = 0; i < 8; i++) S.spawn('fire', new THREE.Vector3(0, 3 + Math.random(), 49), t, 0.45, 2.5); S.lightAt(new THREE.Vector3(0, 2, 49), t, 0.5); }
        if (t > 2.95) { const loser = S.duelWin ? S.champD : S.champA, k2 = ease(seg(t, 2.95, 3.9)); loser.g.rotation.y = S.duelWin ? 0 : PI; loser.g.position.z += (S.duelWin ? -1 : 1) * k2 * 12; }
        for (const c of [S.champA, S.champD]) c.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 15 + i * 1.7) * 0.7; });
      }
    }
    // 箭
    const q = new THREE.Quaternion(), fwd = new THREE.Vector3(0, 0, -1), vel = new THREE.Vector3(), p = new THREE.Vector3();
    let ni = 0, fi = 0;
    for (const a of S.arrowData) {
      const kk = (t - a.t0) / a.dur;
      if (kk < 0 || kk > 1) {
        if (a.fire && kk > 1 && !a.lit) { a.lit = true; S.spawn('fire', a.e.clone(), t, 2.4, 4.5); S.spawn('smoke', a.e.clone().add(new THREE.Vector3(0, 2, 0)), t, 3.5, 7); if (Math.random() < 0.15) S.lightAt(a.e, t, 2); }
        continue;
      }
      p.lerpVectors(a.s, a.e, kk); p.y += 4 * a.h * kk * (1 - kk);
      vel.subVectors(a.e, a.s); vel.y += 4 * a.h * (1 - 2 * kk); vel.normalize(); q.setFromUnitVectors(fwd, vel);
      o.position.copy(p); o.quaternion.copy(q); o.scale.setScalar(1); o.updateMatrix();
      if (a.fire) { if (fi < 140) S.fireArrows.setMatrixAt(fi++, o.matrix); } else if (ni < 420) S.arrows.setMatrixAt(ni++, o.matrix);
    }
    o.rotation.set(0, 0, 0);
    S.arrows.count = ni; S.fireArrows.count = fi;
    S.arrows.instanceMatrix.needsUpdate = S.fireArrows.instanceMatrix.needsUpdate = true;
    // 火计：城内房子着火，冒烟柱；攻克后城里也起火
    if (S.plotA && t > 4.2 && S.burning.length < 4 && Math.random() < 0.08) { const h = S.houses[(Math.random() * S.houses.length) | 0]; if (h) { S.burning.push(h.clone()); S.lightAt(h, t, 5); } }
    if (take && t > 6.9 && !S.capFire) { S.capFire = true; S.burning.push(new THREE.Vector3(-14, 3, 6), new THREE.Vector3(12, 3, -4)); }
    for (const bp of S.burning) {
      if (Math.random() < 0.35) S.spawn('fire', bp.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)), t, 1.1, 3.5);
      if (Math.random() < 0.3) S.spawn('smoke', bp.clone().add(new THREE.Vector3(0, 2, 0)), t, 4.5, 9, 3.2);
    }
    // 伏兵：两翼烟尘大起
    if (S.plotD && !S.ambush && t > 3.0) { S.ambush = true; for (let i = 0; i < 18; i++) S.spawn('dust', new THREE.Vector3((i % 2 ? 1 : -1) * (36 + Math.random() * 16), 1.5, 50 + Math.random() * 30), t + i * 0.04, 2.6, 10); }
    // 火光闪烁
    for (const f of S.fireLights) { const kk = (t - f.t0) / Math.max(0.1, f.life); f.l.intensity = kk >= 0 && kk < 1 ? (1 - kk * 0.6) * (90 + Math.random() * 60) : 0; }
    // 鸟：开战惊飞
    for (const bd of S.birds) {
      const fly = seg(t, 1.5, 9);
      bd.s.position.set(bd.x + fly * 140 + Math.sin(t * 2 + bd.ph) * 2, bd.y + fly * 40, bd.z - fly * 90);
      bd.s.scale.set(2.4, 1.2 * (0.6 + 0.4 * Math.abs(Math.sin(t * 8 + bd.ph))), 1);
    }
    // 粒子
    for (let i = S.sprites.length - 1; i >= 0; i--) {
      const sp = S.sprites[i], kk = (t - sp.t0) / sp.life;
      if (kk > 1 || kk < -0.5) { S.scene.remove(sp.s); sp.s.material.dispose(); S.sprites.splice(i, 1); continue; }
      if (kk < 0) continue;
      sp.s.position.y += sp.vy * dt; sp.s.position.x += sp.drift * dt;
      sp.s.scale.setScalar(sp.size * (0.35 + kk * (sp.kind === 'smoke' ? 1.6 : 1)));
      sp.s.material.opacity = sp.kind === 'fire' ? (1 - kk) : Math.sin(kk * PI) * (sp.kind === 'smoke' ? 0.7 : 0.8);
    }
    if (S.sprites.length > 500) S.sprites.splice(0, S.sprites.length - 500).forEach(sp => { S.scene.remove(sp.s); sp.s.material.dispose(); });
  }

  // =====================================================================
  function play(b, info, done) {
    const finish = () => { if (done) done(); };
    if (!canRun() || cur) { finish(); return; }
    load().then(() => start(b, info, finish)).catch(finish);
  }
  function start(b, info, done) {
    const root = document.getElementById('siege');
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch (e) { done(); return; }
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    let S;
    try { S = build(b, info, renderer); } catch (e) { renderer.dispose(); if (window.console) console.error(e); done(); return; }
    const cam = new THREE.PerspectiveCamera(42, 1, 0.5, 2000);
    root.innerHTML = `
      <div class="sg-hud">
        <div class="sg-top"><span class="sg-route">${esc(info.from)}<i>→</i>${esc(info.to)}</span>
          <button class="sg-skip" data-sg="skip">跳过<i><b>▶▶</b></i></button></div>
        <div class="sg-side atk" style="--sg-c:${info.atkColor}">${info.atkHead}<div><b>${esc(b.atkLead)}</b><small>${esc(b.atkName)}军 · 攻</small><span class="sg-n" id="sg-an">${fmt(b.a0)}</span></div></div>
        <div class="sg-side def" style="--sg-c:${info.defColor}"><div><b>${esc(b.defLead)}</b><small>${esc(b.defName)}${b.defender ? '军' : ''} · 守</small><span class="sg-n" id="sg-dn">${fmt(b.d0)}</span></div>${info.defHead}</div>
        <p class="sg-cap" id="sg-cap"></p>
        <div class="sg-stamp ${b.result === 'take' ? '' : 'lose'}" id="sg-stamp" hidden>${b.result === 'take' ? '攻克' : '败退'}</div>
      </div>`;
    root.prepend(renderer.domElement);
    root.hidden = false;
    requestAnimationFrame(() => root.classList.add('show'));
    const size = () => {
      const w = root.clientWidth, h = root.clientHeight;
      renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 52 : 40; cam.updateProjectionMatrix();
    };
    size();
    // 字幕：按时间轴放这一仗的战报原文
    const cues = [], rounds = b.steps.filter(s => s.kind === 'round');
    b.steps.forEach(s => {
      if (s.kind === 'open') cues.push([0.4, s.text]);
      else if (s.kind === 'plot') cues.push([3.1, s.text]);
      else if (s.kind === 'duel') cues.push([2.0, s.text]);
      else if (s.kind === 'end') cues.push([6.5, s.text]);
    });
    rounds.forEach((s, i) => cues.push([3.9 + i * (2.5 / Math.max(1, rounds.length)), s.text]));
    cues.sort((x, y) => x[0] - y[0]);
    // 时钟从第一帧画出来才开始走，每帧最多前进 0.05 秒：慢的设备放成慢动作，而不是一卡就跳到结尾
    let cueI = -1, raf = 0, ended = false, last = 0, clock = 0, prevNow = 0, drawnT = -1;
    try { renderer.compile(S.scene, cam); } catch (e) { /* 预编译失败不影响播放 */ }
    const cap = root.querySelector('#sg-cap'), an = root.querySelector('#sg-an'), dn = root.querySelector('#sg-dn'), stamp = root.querySelector('#sg-stamp');
    const end = () => {
      if (ended) return; ended = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', size);
      document.removeEventListener('keydown', onKey, true);
      root.classList.remove('show');
      setTimeout(() => {
        S.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach(m => m.dispose()); });
        S.disposables.forEach(d => d.dispose && d.dispose());
        renderer.dispose(); if (renderer.forceContextLoss) renderer.forceContextLoss();
        root.hidden = true; root.innerHTML = ''; cur = null; done();
      }, 300);
    };
    const onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); end(); } };
    document.addEventListener('keydown', onKey, true);
    root.onclick = e => { if (e.target.closest('[data-sg="skip"]')) end(); };
    window.addEventListener('resize', size);
    cur = { end };
    const loop = now => {
      if (prevNow) clock = Math.min(DUR, clock + clamp((now - prevNow) / 1000, 0, 0.05));
      prevNow = now;
      const t = window.__SIEGE_T != null ? window.__SIEGE_T : clock;
      // 录视频时由外部逐帧给 t：同一个 t 不重画
      if (window.__SIEGE_T != null && t === drawnT) { raf = requestAnimationFrame(loop); return; }
      drawnT = t;
      const dt = clamp(t - last, 0, 0.1); last = t;
      frame(S, cam, t, dt);
      renderer.render(S.scene, cam);
      while (cueI + 1 < cues.length && t >= cues[cueI + 1][0]) { cueI++; cap.textContent = cues[cueI][1]; cap.classList.remove('in'); void cap.offsetWidth; cap.classList.add('in'); }
      const kk = seg(t, 3.2, 6.8);
      an.textContent = fmt(lerp(b.a0, b.a, kk)); dn.textContent = fmt(lerp(b.d0, b.d, kk));
      if (t > 7.0 && stamp.hidden) stamp.hidden = false;
      if (t >= DUR && window.__SIEGE_T == null) { setTimeout(end, 600); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  ZL.Siege = { play, active: () => !!cur, preload: () => (canRun() ? load().catch(() => null) : null) };
})(globalThis.ZL = globalThis.ZL || {});
