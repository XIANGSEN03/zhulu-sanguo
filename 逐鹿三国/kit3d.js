// 3D 共用工具：攻城动画（siege3d.js）和沙盘（sandbox3d.js）都用这里的贴图、材质和建筑部件。
// 做法参照推箱子 3D：Three.js r160、物理材质 + 环境光反射 + 胶片色调映射，贴图全部用画布现画。
// 用法：ZL.Kit3D.load() 加载 vendor/three.min.js（只加载一次）；ZL.Kit3D.make(THREE, renderer, seed) 生成一套工具。
(function (ZL) {
  let THREE = null, loading = null;
  function load() {
    if (THREE) return Promise.resolve(THREE);
    if (window.THREE) return Promise.resolve(THREE = window.THREE);
    if (!loading) {
      loading = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'vendor/three.min.js';
        s.onload = () => (window.THREE ? res(THREE = window.THREE) : rej(new Error('three')));
        s.onerror = () => { loading = null; rej(new Error('three')); };
        document.head.appendChild(s);
      });
    }
    return loading;
  }
  function canRun() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  const PI = Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const rng = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  const BRUSH = "'Ma Shan Zheng','STXingkai','STKaiti','KaiTi',serif";

  function make(THREE, renderer, seed) {
    const R = rng(seed);
    const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const disposables = [];
    const keep = x => (disposables.push(x), x);

    // ---------- 贴图 ----------
    function tex(w, h, draw, repeat) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      draw(c.getContext('2d'), w, h);
      const t = keep(new THREE.CanvasTexture(c));
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
      if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    }
    const speckle = (g, w, h, n, colors, alpha, s0, s1) => {
      for (let i = 0; i < n; i++) {
        g.globalAlpha = alpha * (0.3 + 0.7 * R()); g.fillStyle = colors[(R() * colors.length) | 0];
        const s = s0 + R() * (s1 - s0); g.fillRect(R() * w, R() * h, s, s);
      }
      g.globalAlpha = 1;
    };
    const blotches = (g, w, h, n, rgb, alpha, r0, r1) => {
      for (let i = 0; i < n; i++) {
        const x = R() * w, y = R() * h, rad = r0 + R() * (r1 - r0), gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, `rgba(${rgb},${alpha})`); gr.addColorStop(1, `rgba(${rgb},0)`);
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    };
    const T = {};
    // 黄土地：斑驳、草皮、碎石
    T.ground = tex(512, 512, (g, w, h) => {
      g.fillStyle = '#9C8058'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 40, '118,128,62', 0.22, 30, 110);
      blotches(g, w, h, 26, '70,52,32', 0.12, 20, 80);
      blotches(g, w, h, 18, '210,185,140', 0.10, 30, 90);
      speckle(g, w, h, 5000, ['#B39668', '#7A6242', '#8E9A55', '#5E6B36', '#C9B590'], 0.5, 1, 2.5);
      g.strokeStyle = 'rgba(92,110,48,0.55)'; g.lineWidth = 1;
      for (let i = 0; i < 900; i++) { const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 3, y - 2 - R() * 4); g.stroke(); }
    }, true);
    // 青砖：错缝砌，灰缝，每块砖深浅不一
    T.brick = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#8D8A82'; g.fillRect(0, 0, w, h);
      const bw = 32, bh = 14;
      for (let r = 0; r < h / bh; r++) for (let c = -1; c < w / bw + 1; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh, l = 98 + R() * 30;
        g.fillStyle = `rgb(${l},${l - 2},${l - 8})`; g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
        g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(x + 1, y + 1, bw - 2, 2);
      }
      blotches(g, w, h, 12, '40,46,36', 0.12, 20, 70);
      speckle(g, w, h, 1600, ['#A9A69D', '#5F5D58'], 0.4, 1, 2);
    }, true);
    // 筒瓦：一垄一垄的瓦，瓦垄方向沿屋坡
    T.roof = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#2E3034'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 16) {
        const lg = g.createLinearGradient(x, 0, x + 16, 0);
        lg.addColorStop(0, '#1E2023'); lg.addColorStop(0.35, '#5B5F66'); lg.addColorStop(0.55, '#474A50'); lg.addColorStop(1, '#1A1B1E');
        g.fillStyle = lg; g.fillRect(x, 0, 16, h);
      }
      for (let y = 0; y < h; y += 22) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 2); g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, y + 2, w, 1); }
      blotches(g, w, h, 10, '90,100,70', 0.12, 10, 40);
    }, true);
    // 木纹
    T.wood = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#6A4428'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(${R() < 0.5 ? '40,24,12' : '150,104,66'},${0.15 + R() * 0.2})`; g.lineWidth = 0.6 + R() * 1.6;
        const x = R() * w; g.beginPath(); g.moveTo(x, 0);
        for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.05 + i) * 3, y);
        g.stroke();
      }
      for (let x = 0; x < w; x += 64) { g.fillStyle = 'rgba(20,10,5,0.5)'; g.fillRect(x, 0, 2, h); }
    }, true);
    // 城门：朱漆木板、铁箍、九路门钉
    T.door = tex(256, 512, (g, w, h) => {
      g.fillStyle = '#6E2316'; g.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 42) { g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, 0, 2, h); }
      speckle(g, w, h, 1200, ['#8A3020', '#4E160C'], 0.3, 1, 3);
      for (const y of [0.18, 0.5, 0.82]) { g.fillStyle = '#2C2622'; g.fillRect(0, y * h - 6, w, 12); }
      for (let r = 0; r < 9; r++) for (let c = 0; c < 5; c++) {
        const x = 30 + c * 49, y = 40 + r * 52, gr = g.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
        gr.addColorStop(0, '#F3D88C'); gr.addColorStop(0.6, '#B88A3A'); gr.addColorStop(1, '#5A3E14');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 8, 0, 2 * PI); g.fill();
      }
    });
    // 水面
    T.water = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#3F5D58'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 20, '20,40,40', 0.25, 20, 70);
      g.strokeStyle = 'rgba(220,235,225,0.35)';
      for (let i = 0; i < 140; i++) { g.lineWidth = 0.5 + R(); const x = R() * w, y = R() * h; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 6, y - 2, x + 12 + R() * 10, y); g.stroke(); }
    }, true);
    // 粉墙
    T.plaster = tex(128, 128, (g, w, h) => {
      g.fillStyle = '#DDD2BC'; g.fillRect(0, 0, w, h);
      blotches(g, w, h, 10, '120,100,70', 0.08, 10, 40); speckle(g, w, h, 600, ['#C9BDA4', '#EFE6D4'], 0.4, 1, 2);
      g.fillStyle = 'rgba(90,70,50,0.25)'; g.fillRect(0, h - 10, w, 10);
    }, true);
    // 道路（两道车辙，边缘渐隐）
    T.road = tex(128, 512, (g, w, h) => {
      const lg = g.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, 'rgba(150,120,82,0)'); lg.addColorStop(0.2, 'rgba(150,120,82,0.9)'); lg.addColorStop(0.8, 'rgba(150,120,82,0.9)'); lg.addColorStop(1, 'rgba(150,120,82,0)');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
      for (const x of [0.36, 0.64]) { g.fillStyle = 'rgba(90,68,44,0.45)'; g.fillRect(x * w - 3, 0, 6, h); }
      speckle(g, w, h, 1500, ['#7D6444', '#B79F78'], 0.35, 1, 2);
    }, true);
    // 田垄
    T.field = tex(256, 256, (g, w, h) => {
      g.fillStyle = '#7F8B44'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 10) { g.fillStyle = y % 20 ? 'rgba(60,70,26,0.5)' : 'rgba(170,170,90,0.35)'; g.fillRect(0, y, w, 4); }
      blotches(g, w, h, 8, '150,120,60', 0.25, 20, 60); speckle(g, w, h, 1200, ['#9AA556', '#5E6B30'], 0.5, 1, 2);
    }, true);
    // 天空：上方黛青，近地平线金黄（午后斜阳）
    T.sky = tex(8, 512, (g, w, h) => {
      const lg = g.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, '#4E6782'); lg.addColorStop(0.32, '#8FA4B4'); lg.addColorStop(0.47, '#E8C595'); lg.addColorStop(0.52, '#DDB283'); lg.addColorStop(1, '#8C7254');
      g.fillStyle = lg; g.fillRect(0, 0, w, h);
    });
    const soft = (inner, outer) => tex(64, 64, (g) => { const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32); rg.addColorStop(0, inner); rg.addColorStop(1, outer); g.fillStyle = rg; g.fillRect(0, 0, 64, 64); });
    T.fire = soft('rgba(255,236,170,1)', 'rgba(255,90,20,0)');
    T.smoke = soft('rgba(64,56,50,0.9)', 'rgba(64,56,50,0)');
    T.dust = soft('rgba(214,190,150,0.85)', 'rgba(214,190,150,0)');
    T.glow = soft('rgba(255,236,190,1)', 'rgba(255,200,130,0)');
    T.cloud = tex(256, 128, (g) => {
      for (let i = 0; i < 22; i++) {
        const x = 40 + R() * 176, y = 50 + R() * 40, r = 18 + R() * 30, rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, 'rgba(255,248,236,0.55)'); rg.addColorStop(1, 'rgba(255,248,236,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    // 旗：势力色底、深色牙边、书法大字，下沿锯齿（火焰牙）
    const banner = (color, ch, big) => tex(256, 192, (g, w, h) => {
      const fh = h - 26;
      g.fillStyle = color; g.fillRect(0, 0, w, fh);
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 0, w, 10); g.fillRect(0, fh - 10, w, 10); g.fillRect(w - 10, 0, 10, fh);
      g.beginPath(); g.moveTo(0, fh);
      for (let x = 0; x < w; x += 32) { g.lineTo(x + 16, h - 2); g.lineTo(x + 32, fh); }
      g.lineTo(w, fh); g.fillStyle = 'rgba(0,0,0,0.42)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.10)'; g.beginPath(); g.arc(w * 0.46, fh / 2, fh * 0.38, 0, 2 * PI); g.fill();
      g.fillStyle = '#F2E6CA'; g.font = `${big ? 118 : 104}px ${BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(ch || '', w * 0.46, fh / 2 + 6);
      blotches(g, w, fh, 6, '0,0,0', 0.1, 20, 60);
    });
    // 匾额：深蓝底、金框、金字
    const plaque = text => tex(256, 96, (g, w, h) => {
      g.fillStyle = '#1C2838'; g.fillRect(0, 0, w, h);
      g.strokeStyle = '#C8A04A'; g.lineWidth = 8; g.strokeRect(6, 6, w - 12, h - 12);
      g.fillStyle = '#E6C670'; g.font = `62px ${BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText((text || '').split('').join(' '), w / 2, h / 2 + 4);
    });

    // ---------- 材质 ----------
    const std = o => keep(new THREE.MeshStandardMaterial(Object.assign({ envMapIntensity: 0.75 }, o)));
    const repeat = (t, x, y) => { const c = keep(t.clone()); c.needsUpdate = true; c.repeat.set(x, y); return c; };
    const M = {
      brick: std({ map: T.brick, roughness: 0.88 }),
      wallBrick: std({ map: T.brick, roughness: 0.9, color: '#D8CDB8' }),
      brickW: std({ map: repeat(T.brick, 0.22, 0.22), roughness: 0.88 }),
      roof: std({ map: T.roof, roughness: 0.6, metalness: 0.1, side: THREE.DoubleSide }),
      eave: std({ color: '#3A2A1E', roughness: 0.8, side: THREE.DoubleSide }),
      ridge: std({ color: '#25272B', roughness: 0.55, metalness: 0.15 }),
      wood: std({ map: T.wood, roughness: 0.78 }),
      lacquer: std({ color: '#8E2B1A', roughness: 0.42 }),
      plaster: std({ map: T.plaster, roughness: 0.92 }),
      door: std({ map: repeat(T.door, 1 / 3, 1 / 7.2), roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide }),
      water: std({ map: T.water, roughness: 0.08, metalness: 0.25, color: '#9FB6AE' }),
      stone: std({ color: '#9C9688', roughness: 0.85 }),
      iron: std({ color: '#55585C', roughness: 0.4, metalness: 0.75 }),
      bronze: std({ color: '#A57B3E', roughness: 0.35, metalness: 0.85 }),
      hide: std({ color: '#6E5538', roughness: 1, side: THREE.DoubleSide }),
      gold: std({ color: '#C9A04A', roughness: 0.3, metalness: 0.9 }),
      road: std({ map: T.road, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }),
      field: std({ map: T.field, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }),
    };
    const flagMat = t => std({ map: t, side: THREE.DoubleSide, roughness: 0.85, alphaTest: 0.4 });

    // ---------- 几何 ----------
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const mat4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
    const add = (geo, mat, x, y, z, parent, shadow = true) => {
      const m = new THREE.Mesh(keep(geo), mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); return m;
    };
    // 盒子：UV 按世界尺寸铺，贴图不会被拉伸（s = 一张贴图对应几米）
    function sbox(w, h, d, s = 4) {
      const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / s, uv.getY(k) * dims[f][1] / s); }
      return g;
    }
    // 合并几何体，每块带自己的顶点色（士兵、树、云梯用）
    function merge(parts) {
      const pos = [], nor = [], col = [];
      for (const [g0, c, m] of parts) {
        const g = g0.index ? g0.toNonIndexed() : g0.clone(); if (m) g.applyMatrix4(m);
        const p = g.attributes.position.array, n = g.attributes.normal.array, cc = new THREE.Color(c);
        for (let i = 0; i < p.length; i += 3) { pos.push(p[i], p[i + 1], p[i + 2]); nor.push(n[i], n[i + 1], n[i + 2]); col.push(cc.r, cc.g, cc.b); }
        g.dispose(); g0.dispose();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      return keep(g);
    }
    // 把一组模型按材质合并成几块（保留 UV），沙盘里一种材质一次画完所有城池
    function bake(root) {
      root.updateMatrixWorld(true);
      const byMat = new Map();
      root.traverse(o => {
        if (!o.isMesh) return;
        const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
        if (!byMat.has(o.material)) byMat.set(o.material, []);
        byMat.get(o.material).push(g);
      });
      const out = [];
      for (const [mat, list] of byMat) {
        const pos = [], nor = [], uv = [];
        for (const g of list) {
          pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
          if (g.attributes.uv) uv.push(...g.attributes.uv.array); else for (let i = 0; i < g.attributes.position.count; i++) uv.push(0, 0);
          g.dispose();
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        out.push({ geometry: keep(g), material: mat });
      }
      return out;
    }
    // 庑殿顶：凹曲的屋坡，四角起翘（curl），瓦垄沿坡而下
    function roofGeo(w, d, h, o, curl, tile = 2.2) {
      const Wd = w / 2 + o, D = d / 2 + o, rw = Math.max(0.2, (w - d) / 2);
      const slopes = [
        [[-Wd, D], [Wd, D], [-rw, 0], [rw, 0]], [[Wd, -D], [-Wd, -D], [rw, 0], [-rw, 0]],
        [[Wd, D], [Wd, -D], [rw, 0], [rw, 0]], [[-Wd, -D], [-Wd, D], [-rw, 0], [-rw, 0]],
      ];
      const N = 14, Mv = 9, pos = [], uv = [], idx = [];
      for (const [E0, E1, R0, R1] of slopes) {
        const base = pos.length / 3, eaveLen = Math.hypot(E1[0] - E0[0], E1[1] - E0[1]);
        for (let i = 0; i <= N; i++) {
          const u = i / N, ex = lerp(E0[0], E1[0], u), ez = lerp(E0[1], E1[1], u), rx = lerp(R0[0], R1[0], u), rz = lerp(R0[1], R1[1], u);
          const slopeLen = Math.hypot(rx - ex, rz - ez, h);
          for (let j = 0; j <= Mv; j++) {
            const v = j / Mv, lift = curl * Math.pow(1 - v, 2.2) * Math.pow(Math.abs(2 * u - 1), 6);
            pos.push(lerp(ex, rx, v), h * Math.pow(v, 1.55) + lift, lerp(ez, rz, v));
            uv.push(u * eaveLen / tile, v * slopeLen / tile);
          }
        }
        for (let i = 0; i < N; i++) for (let j = 0; j < Mv; j++) {
          const a = base + i * (Mv + 1) + j, c = a + Mv + 1;
          idx.push(a, c, a + 1, a + 1, c, c + 1);
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals();
      return g;
    }
    function roof(parent, x, y, z, w, d, h, o, curl, mat = M.roof) {
      const grp = new THREE.Group(); grp.position.set(x, y, z); parent.add(grp);
      add(roofGeo(w, d, h, o, curl), mat, 0, 0, 0, grp);
      add(roofGeo(w, d, h * 0.92, o, curl), M.eave, 0, -0.22, 0, grp, false);
      const rw = Math.max(0.2, (w - d) / 2);
      add(new THREE.BoxGeometry(rw * 2 + 0.6, 0.45, 0.5), M.ridge, 0, h + 0.15, 0, grp);
      for (const s of [-1, 1]) {   // 正脊两端的鸱吻
        const k = add(new THREE.BoxGeometry(0.35, 0.9, 0.5), M.ridge, s * (rw + 0.25), h + 0.55, 0, grp);
        k.rotation.z = s * 0.25;
      }
      return grp;
    }
    // 楼阁：台基、朱漆柱、粉墙、一到两层屋檐，可挂匾
    function pavilion(parent, x, y, z, w, d, tiers, plaqueMat) {
      const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
      add(sbox(w + 1, 0.6, d + 1, 3), M.stone, 0, 0.3, 0, g);
      const colH = 3.4, cols = Math.max(2, Math.round(w / 2.8));
      for (let i = 0; i <= cols; i++) for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.22, 0.25, colH, 10), M.lacquer, lerp(-w / 2, w / 2, i / cols), 0.6 + colH / 2, s * d / 2, g);
      add(sbox(w - 0.4, colH - 0.6, d - 0.6, 3), M.plaster, 0, 0.6 + colH / 2 - 0.2, 0, g);
      add(new THREE.BoxGeometry(w + 0.2, 0.5, d + 0.2), M.lacquer, 0, 0.6 + colH - 0.1, 0, g);
      let top = 0.6 + colH;
      if (tiers === 2) {
        roof(g, 0, top, 0, w, d, 1.5, 1.5, 0.8);
        add(sbox(w * 0.78, 2.4, d * 0.7, 3), M.plaster, 0, top + 1.6, 0, g);
        add(new THREE.BoxGeometry(w * 0.78 + 0.3, 0.4, d * 0.7 + 0.3), M.lacquer, 0, top + 2.9, 0, g);
        if (plaqueMat) add(new THREE.PlaneGeometry(3.2, 1.2), plaqueMat, 0, top + 1.8, d * 0.35 + 0.02, g, false);
        top += 3.1;
        roof(g, 0, top, 0, w * 0.78, d * 0.7, 2.8, 1.7, 1.15);
      } else roof(g, 0, top, 0, w, d, 2.3, 1.2, 0.85);
      return g;
    }

    // ---------- 天空、阳光、环境反射 ----------
    function sky(scene, o = {}) {
      const sunDir = (o.sunDir || V(-0.72, 0.36, 0.42)).clone().normalize(), ext = o.shadow || 110, radius = o.radius || 900;
      scene.fog = new THREE.Fog(new THREE.Color('#D9B78C'), o.fogNear || 160, o.fogFar || 620);
      scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(radius, 32, 16)), keep(new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false }))));
      const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: T.glow, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.9 })));
      glow.position.copy(sunDir).multiplyScalar(radius * 0.88); glow.scale.setScalar(radius * 0.29); scene.add(glow);
      const hemi = new THREE.HemisphereLight('#C9D7E4', '#6A5034', 0.9); scene.add(hemi);
      const sun = new THREE.DirectionalLight('#FFD2A0', o.sunIntensity || 3.4);
      sun.position.copy(sunDir).multiplyScalar(ext * 1.5); sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
      Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: ext * 4 });
      scene.add(sun); scene.add(sun.target);
      const pmrem = new THREE.PMREMGenerator(renderer), envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(10, 32, 16)), keep(new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide }))));
      const envSun = new THREE.Mesh(keep(new THREE.SphereGeometry(1.2, 16, 8)), keep(new THREE.MeshBasicMaterial({ color: '#FFE7C0' })));
      envSun.position.copy(sunDir).multiplyScalar(8); envScene.add(envSun);
      scene.environment = keep(pmrem.fromScene(envScene, 0.04)).texture;
      pmrem.dispose();
      return { sun, hemi, sunDir };
    }

    return { THREE, R, keep, disposables, tex, speckle, blotches, T, banner, plaque, std, repeat, M, flagMat, V, mat4, add, sbox, merge, bake, roofGeo, roof, pavilion, sky,
      dispose() { disposables.forEach(d => d.dispose && d.dispose()); } };
  }

  ZL.Kit3D = { load, canRun, make, rng, clamp, lerp, BRUSH };
})(globalThis.ZL = globalThis.ZL || {});
