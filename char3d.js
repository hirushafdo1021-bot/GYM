/* FitForge 3D — procedural rigged character with muscle highlighting.
   Requires THREE (three.min.js). Exposes window.FF3D. */
(function (global) {
  'use strict';
  var THREE = global.THREE;

  function supported() {
    try {
      if (!THREE) return false;
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
    } catch (e) { return false; }
  }
  if (!THREE) { global.FF3D = { supported: function () { return false; } }; return; }

  var V3 = THREE.Vector3, Q = THREE.Quaternion, M4 = THREE.Matrix4;
  var PI = Math.PI;

  /* ---------- body dimensions (metres) ---------- */
  var SH_X = 0.205, SH_Y = 0.50, HIP_X = 0.095, HIP_DROP = 0.04, ARM_ABD = 0.45;
  var L_UP = 0.33, L_FORE = 0.34, L_THIGH = 0.45, L_SHIN = 0.45;

  var COL = {
    skin: 0xe6c8aa, idle: 0xd4b496, shorts: 0x2b2f37, shoe: 0x3c4149, hair: 0x2a201b,
    prim: 0xff2a1f, primEm: 0xff1208, sec: 0x5e8fd1, secEm: 0x2a5cb4,
    pad: 0x16191d, steel: 0x8c939e, plate: 0x1b1d22, plateEdge: 0x3a3e46,
    floor: 0x181b20, ring: 0xff5b2e
  };

  var SPH = null;
  function sph() { return SPH || (SPH = new THREE.SphereGeometry(1, 22, 16)); }

  /* ---------- character ---------- */
  function buildCharacter(prim, sec) {
    var ch = { muscles: {} };
    var std = function (c, r, m) { return new THREE.MeshStandardMaterial({ color: c, roughness: r === undefined ? 0.65 : r, metalness: m || 0 }); };
    var M = {
      skin: std(COL.skin), idle: std(COL.idle, 0.6), shorts: std(COL.shorts, 0.8), shoe: std(COL.shoe, 0.7),
      hair: std(COL.hair, 0.9),
      prim: new THREE.MeshStandardMaterial({ color: COL.prim, emissive: COL.primEm, emissiveIntensity: 1, roughness: 0.4 }),
      sec: new THREE.MeshStandardMaterial({ color: COL.sec, emissive: COL.secEm, emissiveIntensity: 0.3, roughness: 0.5 }),
      glow: new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })
    };
    ch.M = M;
    function mmat(k) { return prim.indexOf(k) > -1 ? M.prim : (sec.indexOf(k) > -1 ? M.sec : M.idle); }
    function ell(parent, mat, pos, r) {
      var m = new THREE.Mesh(sph(), mat);
      m.position.set(pos[0], pos[1], pos[2]); m.scale.set(r[0], r[1], r[2]); m.castShadow = true; parent.add(m); return m;
    }
    function cap(parent, mat, radius, len, pos) {
      var m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, len - 2 * radius), 4, 12), mat);
      m.position.set(pos[0], pos[1], pos[2]); m.castShadow = true; parent.add(m); return m;
    }
    function muscle(key, parent, pos, r, side) {
      var s = side || 1;
      var m = ell(parent, mmat(key), [pos[0] * s, pos[1], pos[2]], r);
      var rec = { mesh: m, base: m.scale.clone(), primary: prim.indexOf(key) > -1, secondary: sec.indexOf(key) > -1 };
      if (rec.primary) {
        var g = new THREE.Mesh(sph(), M.glow); g.scale.setScalar(1.17); m.add(g); rec.glow = g;
      }
      (ch.muscles[key] = ch.muscles[key] || []).push(rec);
    }

    ch.root = new THREE.Group();
    ch.pelvis = new THREE.Group(); ch.root.add(ch.pelvis);
    ch.spine = new THREE.Group(); ch.pelvis.add(ch.spine);

    // pelvis + shorts
    ell(ch.pelvis, M.shorts, [0, -0.01, 0], [0.175, 0.105, 0.118]);
    muscle('glutes', ch.pelvis, [0.085, -0.02, -0.088], [0.088, 0.092, 0.076], 1);
    muscle('glutes', ch.pelvis, [0.085, -0.02, -0.088], [0.088, 0.092, 0.076], -1);

    // torso
    ell(ch.spine, M.skin, [0, 0.17, 0], [0.145, 0.19, 0.10]);
    ell(ch.spine, M.skin, [0, 0.40, 0], [0.185, 0.17, 0.112]);
    // neck + head
    cap(ch.spine, M.skin, 0.045, 0.14, [0, 0.60, 0.005]);
    ell(ch.spine, M.skin, [0, 0.73, 0.012], [0.098, 0.115, 0.108]);
    var hair = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, PI * 2, 0, PI * 0.55), M.hair);
    hair.position.set(0, 0.735, 0.0); hair.scale.set(0.104, 0.12, 0.114); hair.castShadow = true; ch.spine.add(hair);
    ell(ch.spine, M.skin, [0, 0.715, 0.112], [0.018, 0.022, 0.02]); // nose = facing marker

    // torso muscles
    [1, -1].forEach(function (s) {
      muscle('chest', ch.spine, [0.095, 0.43, 0.088], [0.097, 0.078, 0.05], s);
      muscle('obliques', ch.spine, [0.15, 0.17, 0.045], [0.04, 0.13, 0.075], s);
      muscle('traps', ch.spine, [0.075, 0.555, -0.05], [0.105, 0.05, 0.06], s);
      muscle('lats', ch.spine, [0.145, 0.31, -0.07], [0.065, 0.14, 0.05], s);
      muscle('lowerBack', ch.spine, [0.05, 0.06, -0.097], [0.045, 0.078, 0.04], s);
    });
    muscle('abs', ch.spine, [0, 0.17, 0.098], [0.078, 0.15, 0.036], 1);
    muscle('traps', ch.spine, [0, 0.42, -0.108], [0.125, 0.09, 0.03], 1);

    // arms
    ch.arms = [];
    [1, -1].forEach(function (s) {
      var upper = new THREE.Group(); upper.position.set(s * SH_X, SH_Y, 0); ch.spine.add(upper);
      ell(upper, M.skin, [0, 0, 0], [0.058, 0.058, 0.058]);
      cap(upper, M.skin, 0.043, L_UP, [0, -L_UP / 2, 0]);
      muscle('sideDelt', upper, [0.042, -0.04, 0], [0.047, 0.075, 0.05], s);
      muscle('frontDelt', upper, [0, -0.04, 0.042], [0.052, 0.068, 0.04], 1);
      muscle('rearDelt', upper, [0, -0.04, -0.042], [0.052, 0.068, 0.04], 1);
      muscle('biceps', upper, [0, -0.165, 0.037], [0.034, 0.097, 0.03], 1);
      muscle('triceps', upper, [0, -0.165, -0.041], [0.039, 0.108, 0.034], 1);
      var fore = new THREE.Group(); fore.position.set(0, -L_UP, 0); upper.add(fore);
      ell(fore, M.skin, [0, 0, 0], [0.04, 0.04, 0.04]);
      cap(fore, M.skin, 0.036, 0.31, [0, -0.155, 0]);
      muscle('forearm', fore, [0, -0.125, 0], [0.038, 0.125, 0.04], 1);
      ell(fore, M.skin, [0, -0.335, 0], [0.04, 0.056, 0.03]);
      ch.arms.push({ side: s, upper: upper, fore: fore });
    });

    // legs
    ch.legs = [];
    [1, -1].forEach(function (s) {
      var thigh = new THREE.Group(); thigh.position.set(s * HIP_X, -HIP_DROP, 0); ch.pelvis.add(thigh);
      ell(thigh, M.shorts, [0, -0.03, 0], [0.088, 0.088, 0.088]);
      cap(thigh, M.skin, 0.074, L_THIGH, [0, -L_THIGH / 2, 0]);
      cap(thigh, M.shorts, 0.083, 0.2, [0, -0.1, 0]);
      muscle('quads', thigh, [0, -0.22, 0.05], [0.072, 0.17, 0.056], 1);
      muscle('hamstrings', thigh, [0, -0.22, -0.05], [0.066, 0.17, 0.05], 1);
      var shin = new THREE.Group(); shin.position.set(0, -L_THIGH, 0); thigh.add(shin);
      ell(shin, M.skin, [0, 0, 0], [0.062, 0.062, 0.062]);
      cap(shin, M.skin, 0.054, L_SHIN, [0, -L_SHIN / 2, 0]);
      muscle('calves', shin, [0, -0.15, -0.042], [0.052, 0.12, 0.05], 1);
      var foot = new THREE.Group(); foot.position.set(0, -L_SHIN, 0); shin.add(foot);
      ell(foot, M.skin, [0, 0, 0], [0.045, 0.045, 0.045]);
      var shoe = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.07, 0.275), M.shoe);
      shoe.position.set(0, -0.052, 0.07); shoe.castShadow = true; foot.add(shoe);
      ch.legs.push({ side: s, thigh: thigh, shin: shin, foot: foot });
    });
    return ch;
  }


  /* ---------- realistic skinned body (sculpted offline, loaded from body.bin) ---------- */
  var BODY = { geo: null, promise: null, failed: false, muscles: [] };
  function loadBody(url) {
    if (BODY.promise) return BODY.promise;
    BODY.promise = fetch(url).then(function (r) { if (!r.ok) throw new Error('body.bin ' + r.status); return r.arrayBuffer(); }).then(function (buf) {
      var dv = new DataView(buf), hl = dv.getUint32(0, true);
      var hdr = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
      var off = 4 + hl; off += (4 - (off % 4)) % 4;
      var nV = hdr.nV, nT = hdr.nT;
      var p16 = new Int16Array(buf, off, nV * 3); off += nV * 6; off += (4 - (off % 4)) % 4;
      var n8 = new Int8Array(buf, off, nV * 4); off += nV * 4;
      var si = new Uint8Array(buf, off, nV * 4); off += nV * 4;
      var sw = new Uint8Array(buf, off, nV * 4); off += nV * 4;
      var mk = new Uint8Array(buf, off, nV * 16); off += nV * 16;
      var idx = new Uint32Array(buf, off, nT * 3);
      var pos = new Float32Array(nV * 3), nor = new Float32Array(nV * 3), sIdx = new Uint16Array(nV * 4), sWt = new Float32Array(nV * 4);
      var m = [new Uint8Array(nV * 4), new Uint8Array(nV * 4), new Uint8Array(nV * 4), new Uint8Array(nV * 4)];
      var i, k;
      for (i = 0; i < nV; i++) {
        pos[i * 3] = p16[i * 3] * hdr.scale; pos[i * 3 + 1] = p16[i * 3 + 1] * hdr.scale; pos[i * 3 + 2] = p16[i * 3 + 2] * hdr.scale;
        nor[i * 3] = n8[i * 4] / 127; nor[i * 3 + 1] = n8[i * 4 + 1] / 127; nor[i * 3 + 2] = n8[i * 4 + 2] / 127;
        for (k = 0; k < 4; k++) { sIdx[i * 4 + k] = si[i * 4 + k]; sWt[i * 4 + k] = sw[i * 4 + k] / 255; }
        for (k = 0; k < 16; k++) m[k >> 2][i * 4 + (k & 3)] = mk[i * 16 + k];
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('skinIndex', new THREE.BufferAttribute(sIdx, 4));
      geo.setAttribute('skinWeight', new THREE.BufferAttribute(sWt, 4));
      for (k = 0; k < 4; k++) geo.setAttribute('aM' + k, new THREE.BufferAttribute(m[k], 4, true));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.userData.shared = true;
      BODY.geo = geo; BODY.muscles = hdr.muscles;
      return geo;
    }).catch(function (e) { BODY.failed = true; throw e; });
    return BODY.promise;
  }

  function buildBody(prim, sec) {
    var ch = { muscles: {}, bodyU: null };
    var V4 = THREE.Vector4;
    var uni = { uPA: { value: 0 }, uSA: { value: 0 } };
    ['uP', 'uS'].forEach(function (nm, j) {
      var list = j === 0 ? prim : sec;
      for (var q = 0; q < 4; q++) {
        var v = new V4(0, 0, 0, 0);
        for (var c = 0; c < 4; c++) { if (list.indexOf(BODY.muscles[q * 4 + c]) > -1) v.setComponent(c, 1); }
        uni[nm + q] = { value: v };
      }
    });
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, metalness: 0.0, envMapIntensity: 0.55 });
    mat.onBeforeCompile = function (sh) {
      for (var k in uni) sh.uniforms[k] = uni[k];
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec4 aM0; attribute vec4 aM1; attribute vec4 aM2; attribute vec4 aM3;\nuniform vec4 uP0; uniform vec4 uP1; uniform vec4 uP2; uniform vec4 uP3; uniform vec4 uS0; uniform vec4 uS1; uniform vec4 uS2; uniform vec4 uS3; uniform float uPA;\nvarying vec4 vM0; varying vec4 vM1; varying vec4 vM2; varying vec4 vM3; varying float vP; varying float vS; varying vec3 vBind;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvM0 = aM0; vM1 = aM1; vM2 = aM2; vM3 = aM3; vBind = position;\nvP = clamp(dot(aM0,uP0)+dot(aM1,uP1)+dot(aM2,uP2)+dot(aM3,uP3), 0.0, 1.0);\nvS = clamp(dot(aM0,uS0)+dot(aM1,uS1)+dot(aM2,uS2)+dot(aM3,uS3), 0.0, 1.0);\ntransformed += normalize(normal) * (vP * uPA * 0.008);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uPA; uniform float uSA;\nvarying vec4 vM0; varying vec4 vM1; varying vec4 vM2; varying vec4 vM3; varying float vP; varying float vS; varying vec3 vBind;\nfloat ffEdge(vec4 m){ vec4 e = 1.0 - smoothstep(0.0, 0.2, abs(m - 0.5)); return max(max(e.x, e.y), max(e.z, e.w)); }')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{ float ed = max(max(ffEdge(vM0), ffEdge(vM1)), max(ffEdge(vM2), ffEdge(vM3)));\n  vec3 clay = vec3(0.56, 0.565, 0.575) * (1.0 - 0.22 * ed);\n  float shT = 1.0 - smoothstep(0.062, 0.082, vBind.y); float shB = smoothstep(-0.292, -0.262, vBind.y); float shX = 1.0 - smoothstep(0.20, 0.24, abs(vBind.x));\n  float shorts = shT * shB * shX;\n  vec3 pc = mix(clay, vec3(0.075, 0.08, 0.09), shorts);\n  pc = mix(pc, vec3(1.0, 0.05, 0.04) * (1.0 - 0.15 * ed), clamp(vP * 0.88, 0.0, 1.0));\n  pc = mix(pc, vec3(0.04, 0.38, 1.0) * (1.0 - 0.15 * ed), clamp(vS * 0.8, 0.0, 1.0) * (1.0 - vP));\n  diffuseColor.rgb = pc; }')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nfloat ffFr = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vViewPosition))), 0.0, 1.0), 2.2);\ntotalEmissiveRadiance += vec3(1.0, 0.03, 0.02) * vP * uPA * 1.1 + vec3(0.04, 0.30, 1.0) * vS * uSA * 0.55 + (vec3(1.0, 0.12, 0.06) * vP * uPA + vec3(0.1, 0.4, 1.0) * vS * uSA) * ffFr * 0.55;');
    };
    mat.customProgramCacheKey = function () { return 'ffbody-v2'; };
    ch.bodyU = uni;

    var bone = function () { return new THREE.Bone(); };
    var pelvis = bone(), spine = bone(), head = bone();
    spine.position.set(0, 0, 0); pelvis.add(spine);
    head.position.set(0, 0.575, 0); spine.add(head);
    var bones = [pelvis, spine, head];
    ch.arms = []; ch.legs = [];
    var armB = {}, legB = {};
    [1, -1].forEach(function (s) {
      var upper = bone(), fore = bone();
      upper.position.set(s * SH_X, SH_Y, 0); upper.rotation.z = s * ARM_ABD; spine.add(upper);
      fore.position.set(0, -L_UP, 0); upper.add(fore);
      armB[s] = [upper, fore]; ch.arms.push({ side: s, upper: upper, fore: fore });
    });
    [1, -1].forEach(function (s) {
      var thigh = bone(), shin = bone(), foot = bone();
      thigh.position.set(s * HIP_X, -HIP_DROP, 0); pelvis.add(thigh);
      shin.position.set(0, -L_THIGH, 0); thigh.add(shin);
      foot.position.set(0, -L_SHIN, 0); shin.add(foot);
      legB[s] = [thigh, shin, foot]; ch.legs.push({ side: s, thigh: thigh, shin: shin, foot: foot });
    });
    // order must match the generator: pelvis, spine, head, upper+, fore+, upper-, fore-, thigh+, shin+, foot+, thigh-, shin-, foot-
    bones.push(armB[1][0], armB[1][1], armB[-1][0], armB[-1][1], legB[1][0], legB[1][1], legB[1][2], legB[-1][0], legB[-1][1], legB[-1][2]);
    ch.root = new THREE.Group(); ch.root.add(pelvis);
    ch.pelvis = pelvis; ch.spine = spine; ch.head = head;
    var mesh = new THREE.SkinnedMesh(BODY.geo, mat);
    mesh.frustumCulled = false; mesh.castShadow = true; mesh.receiveShadow = false;
    ch.root.add(mesh);
    ch.root.updateMatrixWorld(true);
    var skel = new THREE.Skeleton(bones);
    mesh.bind(skel, new M4());
    return ch;
  }

  /* ---------- math helpers ---------- */
  function basisQuat(yAxis, zAxis) {
    var y = yAxis.clone().normalize();
    var z = zAxis.clone().sub(y.clone().multiplyScalar(zAxis.dot(y)));
    if (z.lengthSq() < 1e-8) {
      z = Math.abs(y.z) < 0.9 ? new V3(0, 0, 1) : new V3(1, 0, 0);
      z.sub(y.clone().multiplyScalar(z.dot(y)));
    }
    z.normalize();
    var x = new V3().crossVectors(y, z);
    return new Q().setFromRotationMatrix(new M4().makeBasis(x, y, z));
  }
  function setWorldQuat(g, wq) {
    var pq = new Q(); g.parent.getWorldQuaternion(pq);
    g.quaternion.copy(pq.invert().multiply(wq));
    g.updateMatrixWorld(true);
  }
  function solve2(S, T, l1, l2, pole) {
    var d = T.clone().sub(S), dist = d.length(); if (dist < 1e-6) { d.set(0, -1, 0); dist = 1e-6; }
    var u = d.clone().divideScalar(dist);
    var dd = Math.min(l1 + l2 - 1e-4, Math.max(Math.abs(l1 - l2) + 1e-3, dist));
    var a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
    var h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    var p = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u)));
    if (p.lengthSq() < 1e-8) { p = new V3(0, 0, 1).sub(u.clone().multiplyScalar(u.z)); }
    p.normalize();
    var E = S.clone().add(u.clone().multiplyScalar(a)).add(p.clone().multiplyScalar(h));
    var Tc = S.clone().add(u.clone().multiplyScalar(dd));
    return { E: E, T: Tc, p: p };
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function lerpArr(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  /* ---------- pose / motion definitions ---------- */
  function P(o) {
    var d = {
      pelvis: [0, 1.0, 0], rootPitch: 0, spinePitch: 0, shrug: 0,
      mode: 'shoulder', hand: [0.04, -0.58, 0.02], pole: [0, -1, -0.3], arc: [0, 0, 0],
      feet: [0.13, 0.09, 0], feetNeg: null, feetArc: [0, 0, 0], kneePole: [0, 0.15, 1], kneePoleNeg: null,
      plantar: 0, plantarNeg: null
    };
    for (var k in o) d[k] = o[k];
    return d;
  }
  function Q2(a, o) { var d = {}, k; for (k in a) d[k] = a[k]; for (k in o) d[k] = o[k]; return d; }

  var MOTIONS = {};
  function def(id, m) { MOTIONS[id] = m; }
  var STAND_CAM = { t: [0, 0.92, 0], d: 4.4 };

  /* flat bench */
  var BENCH_A = P({ pelvis: [0, 0.58, 0.15], rootPitch: -PI / 2, spinePitch: -0.07, feet: [0.22, 0.09, 0.60], kneePole: [0.1, 1, 0.4], hand: [0.09, 0.14, 0.12], pole: [0.8, -0.6, 0] });
  def('bench_press', { scene: 'bench', prop: { type: 'barbell' }, A: BENCH_A, B: Q2(BENCH_A, { hand: [0.09, 0.58, 0.04], pole: [0.4, -0.6, 0.2] }), peak: 'end', cam: { t: [0, 0.68, -0.12], d: 3.7 }, phases: ['Press up', 'Lower to chest'] });

  var INC_A = P({ pelvis: [0, 0.57, 0.05], rootPitch: -0.96, feet: [0.30, 0.09, 0.55], kneePole: [0.2, 1, 0.3], hand: [0.09, 0.10, 0.19], pole: [0.8, -0.5, -0.3] });
  def('incline_press', { scene: 'incline', incline: 0.96, prop: { type: 'dumbbells', axis: 'x' }, A: INC_A, B: Q2(INC_A, { hand: [0.08, 0.56, 0.14], pole: [0.5, -0.5, -0.2] }), peak: 'end', cam: { t: [0, 0.85, -0.1], d: 3.7 }, phases: ['Press up', 'Lower with control'] });

  var FLY_A = Q2(BENCH_A, { hand: [-0.11, 0.58, 0.05], pole: [0.8, -0.2, 0] });
  def('chest_fly', { scene: 'bench', prop: { type: 'dumbbells', axis: 'z' }, A: FLY_A, B: Q2(FLY_A, { hand: [0.52, 0.02, 0.06], pole: [0.2, -1, 0.2], arc: [0.12, 0.12, 0] }), peak: 'start', cam: { t: [0, 0.8, -0.1], d: 3.7 }, phases: ['Open wide', 'Squeeze together'] });

  var DIP_A = P({ pelvis: [0, 1.185, -0.10], rootPitch: 0.05, spinePitch: 0.25, mode: 'world', hand: [0.28, 1.08, 0], pole: [0.3, -0.2, -1], feet: [0.10, 0.40, -0.28], kneePole: [0, -0.3, 1], plantar: 0.5 });
  def('dips', { scene: 'dipbars', prop: { type: 'none' }, A: DIP_A, B: Q2(DIP_A, { pelvis: [0, 0.95, 0.06], rootPitch: 0.15, spinePitch: 0.35, feet: [0.10, 0.22, -0.34], pole: [0.3, 0, -1] }), peak: 'start', cam: { t: [0, 0.95, 0], d: 4.3 }, phases: ['Lower down', 'Press up'] });

  var PD_A = P({ pelvis: [0, 1.0, -0.03], spinePitch: 0.12, hand: [0.01, -0.22, 0.27], pole: [0.2, -0.2, -1], feet: [0.14, 0.09, 0] });
  def('triceps_pushdown', { scene: 'cable', prop: { type: 'cableBar', anchor: [0, 2.25, 0.42] }, A: PD_A, B: Q2(PD_A, { hand: [0.01, -0.60, 0.07] }), peak: 'end', cam: { t: [0, 1.1, 0.1], d: 4.6 }, phases: ['Push down', 'Control up'] });
  def('rope_pushdown', { scene: 'cable', prop: { type: 'cableRope', anchor: [0, 2.25, 0.42] }, A: Q2(PD_A, { hand: [-0.06, -0.22, 0.27] }), B: Q2(PD_A, { hand: [0.10, -0.60, 0.08] }), peak: 'end', cam: { t: [0, 1.1, 0.1], d: 4.6 }, phases: ['Push down & spread', 'Control up'] });

  var OTE_A = P({ spinePitch: -0.02, hand: [-0.12, 0.10, -0.24], pole: [0.1, 1, 0.2], feet: [0.13, 0.09, 0] });
  def('overhead_triceps_extension', { scene: 'none', prop: { type: 'ezbar', len: 0.7 }, A: OTE_A, B: Q2(OTE_A, { hand: [-0.12, 0.59, 0.02] }), peak: 'end', cam: STAND_CAM, phases: ['Extend overhead', 'Lower behind head'] });

  var DL_A = P({ pelvis: [0, 0.64, -0.28], rootPitch: 0.75, spinePitch: 0.25, mode: 'world', hand: [0.22, 0.225, 0.14], pole: [0, 0, -1], feet: [0.15, 0.09, 0], kneePole: [0, 0.1, 1] });
  def('deadlift', { scene: 'none', prop: { type: 'barbell' }, A: DL_A, B: Q2(DL_A, { pelvis: [0, 1.0, -0.03], rootPitch: 0, spinePitch: 0.05, hand: [0.22, 0.90, 0.10] }), peak: 'end', cam: { t: [0, 0.75, 0], d: 4.4 }, phases: ['Drive up', 'Lower the bar'] });

  var PU_A = P({ pelvis: [0, 1.15, 0.10], mode: 'world', hand: [0.38, 2.25, 0.12], pole: [0.3, -1, 0], feet: [0.09, 0.35, -0.10], kneePole: [0, -0.3, 1], plantar: 0.4 });
  def('pullups', { scene: 'pullupbar', prop: { type: 'none' }, A: PU_A, B: Q2(PU_A, { pelvis: [0, 1.50, 0.12], spinePitch: -0.12, pole: [0.6, -1, -0.2], feet: [0.09, 0.70, -0.15] }), peak: 'end', cam: { t: [0, 1.3, 0], d: 5.0 }, phases: ['Pull up', 'Lower fully'] });

  var ROW_A = P({ pelvis: [0, 0.90, -0.27], rootPitch: 0.55, spinePitch: 0.35, hand: [0.06, -0.60, 0], pole: [0, 0, -1], feet: [0.16, 0.09, 0] });
  def('barbell_row', { scene: 'none', prop: { type: 'barbell' }, A: ROW_A, B: Q2(ROW_A, { hand: [0.06, -0.24, -0.10], pole: [0.3, 0.3, -1] }), peak: 'end', cam: { t: [0, 0.8, 0], d: 4.4 }, phases: ['Row to ribs', 'Lower the bar'] });

  var SR_A = P({ pelvis: [0, 0.54, -0.30], spinePitch: 0.30, hand: [-0.15, -0.24, 0.50], pole: [0.4, 0.1, -1], feet: [0.15, 0.35, 0.35], kneePole: [0, 1, 0.3] });
  def('seated_cable_row', { scene: 'rowmachine', prop: { type: 'cableBar', anchor: [0, 0.42, 1.35], narrow: true }, A: SR_A, B: Q2(SR_A, { spinePitch: -0.10, hand: [-0.15, -0.26, 0.10] }), peak: 'end', cam: { t: [0, 0.8, 0.35], d: 4.6 }, phases: ['Pull to abdomen', 'Reach forward'] });

  var BC_A = P({ hand: [0.0, -0.55, 0.10], pole: [0, -1, -0.3] });
  def('barbell_curl', { scene: 'none', prop: { type: 'barbell' }, A: BC_A, B: Q2(BC_A, { hand: [0.02, -0.04, 0.21], arc: [0, 0.02, 0.14] }), peak: 'end', cam: STAND_CAM, phases: ['Curl up', 'Lower slowly'] });
  var HC_A = P({ hand: [0.05, -0.55, 0.06], pole: [0, -1, -0.3] });
  def('hammer_curl', { scene: 'none', prop: { type: 'dumbbells', axis: 'z' }, A: HC_A, B: Q2(HC_A, { hand: [0.04, -0.06, 0.20], arc: [0, 0.02, 0.14] }), peak: 'end', cam: STAND_CAM, phases: ['Curl up', 'Lower slowly'] });

  var SQ_A = P({ spinePitch: 0.05, mode: 'body', hand: [0.40, 0.53, -0.10], pole: [0.3, -1, -0.7], feet: [0.19, 0.09, 0], kneePole: [0.3, 0.1, 1] });
  def('squats', { scene: 'none', prop: { type: 'barbell' }, A: SQ_A, B: Q2(SQ_A, { pelvis: [0, 0.52, -0.30], rootPitch: 0.45, spinePitch: 0.35 }), peak: 'end', cam: { t: [0, 0.85, 0], d: 4.4 }, phases: ['Sit down & back', 'Drive up'] });

  var LP_A = P({ pelvis: [0, 0.50, -0.50], rootPitch: -1.05, mode: 'world', hand: [0.30, 0.62, -0.62], pole: [0.5, -1, 0], feet: [0.20, 0.80, 0.10], kneePole: [0.2, 1, 0.3] });
  def('leg_press', { scene: 'legpress', prop: { type: 'platform' }, A: LP_A, B: Q2(LP_A, { feet: [0.20, 1.00, 0.22] }), peak: 'end', cam: { t: [0, 0.75, -0.1], d: 4.4 }, phases: ['Press the platform', 'Bend knees slowly'] });

  var RDL_A = P({ hand: [0.01, -0.60, 0.10], pole: [0, 0, -1], feet: [0.13, 0.09, 0] });
  def('romanian_deadlift', { scene: 'none', prop: { type: 'barbell' }, A: RDL_A, B: Q2(RDL_A, { pelvis: [0, 0.93, -0.22], rootPitch: 0.65, spinePitch: 0.25, hand: [0.01, -0.60, 0] }), peak: 'start', cam: { t: [0, 0.85, 0], d: 4.4 }, phases: ['Hinge back', 'Drive hips forward'] });

  var LU_A = P({ pelvis: [0, 0.86, 0], hand: [0.06, -0.58, 0], pole: [0, -1, -0.1], feet: [0.11, 0.09, 0.42], kneePole: [0, 0.1, 1], feetNeg: [-0.11, 0.18, -0.40], kneePoleNeg: [0, -0.6, 0.8], plantarNeg: 0.7 });
  def('walking_lunges', { scene: 'none', prop: { type: 'dumbbells', axis: 'z' }, A: LU_A, B: Q2(LU_A, { pelvis: [0, 0.54, 0] }), peak: 'end', cam: { t: [0, 0.85, 0], d: 4.4 }, phases: ['Lower into lunge', 'Drive up'] });

  var LC_A = P({ pelvis: [0, 0.58, 0], rootPitch: PI / 2, mode: 'world', hand: [0.22, 0.50, 0.88], pole: [0.5, -1, 0], feet: [0.10, 0.56, -0.90], kneePole: [0, -1, -0.6] });
  def('leg_curl', { scene: 'legcurl', prop: { type: 'anklePad' }, A: LC_A, B: Q2(LC_A, { feet: [0.10, 1.02, -0.41], feetArc: [0, 0.135, -0.125], kneePole: [0, -0.64, -0.77] }), peak: 'end', cam: { t: [0, 0.65, -0.2], d: 4.2 }, phases: ['Curl heels to glutes', 'Lower slowly'] });

  var CR_A = P({ pelvis: [0, 1.05, 0], hand: [0.06, -0.56, 0], pole: [0, -0.5, -1], feet: [0.13, 0.108, -0.05], plantar: -0.1 });
  def('standing_calf_raises', { scene: 'calfblock', prop: { type: 'dumbbells', axis: 'z' }, A: CR_A, B: Q2(CR_A, { pelvis: [0, 1.12, 0], feet: [0.13, 0.188, 0.02], plantar: 0.75 }), peak: 'end', cam: STAND_CAM, phases: ['Rise onto toes', 'Lower for a full stretch'] });

  var OHP_A = P({ hand: [0.07, -0.04, 0.14], pole: [0.2, -1, 0.8], feet: [0.13, 0.09, 0] });
  def('overhead_press', { scene: 'none', prop: { type: 'barbell' }, A: OHP_A, B: Q2(OHP_A, { hand: [0.07, 0.60, -0.02], pole: [0.2, -1, 0.2] }), peak: 'end', cam: { t: [0, 1.0, 0], d: 4.6 }, phases: ['Press overhead', 'Lower to shoulders'] });

  var LR_A = P({ hand: [0.06, -0.55, 0.02], pole: [0, -1, -0.1] });
  def('dumbbell_lateral_raise', { scene: 'none', prop: { type: 'dumbbells', axis: 'z' }, A: LR_A, B: Q2(LR_A, { hand: [0.55, 0.0, 0.02], arc: [0.10, -0.095, 0] }), peak: 'end', cam: STAND_CAM, phases: ['Raise to the sides', 'Lower slowly'] });
  var RF_A = P({ pelvis: [0, 0.92, -0.25], rootPitch: 0.70, spinePitch: 0.45, hand: [0.04, -0.58, 0], pole: [0, -1, -0.3], feet: [0.15, 0.09, 0] });
  def('rear_delt_fly', { scene: 'none', prop: { type: 'dumbbells', axis: 'z' }, A: RF_A, B: Q2(RF_A, { hand: [0.56, -0.02, -0.02], arc: [0.10, -0.10, 0] }), peak: 'end', cam: { t: [0, 0.8, 0], d: 4.4 }, phases: ['Fly out wide', 'Lower slowly'] });
  var FR_A = P({ hand: [0.0, -0.56, 0.10], pole: [0, -1, -0.1] });
  def('front_raise', { scene: 'none', prop: { type: 'dumbbells', axis: 'x' }, A: FR_A, B: Q2(FR_A, { hand: [0.04, 0.05, 0.55], arc: [0.02, -0.09, 0.12] }), peak: 'end', cam: STAND_CAM, phases: ['Raise in front', 'Lower slowly'] });
  var SH_A = P({ hand: [0.06, -0.57, 0], pole: [0, -0.5, -1] });
  def('shrugs', { scene: 'none', prop: { type: 'dumbbells', axis: 'z' }, A: SH_A, B: Q2(SH_A, { shrug: 0.05 }), peak: 'end', cam: STAND_CAM, phases: ['Shrug up', 'Lower slowly'] });

  var IC_A = P({ pelvis: [0, 0.54, -0.05], rootPitch: -0.52, hand: [0.06, -0.55, 0.0], pole: [0, -1, -0.3], feet: [0.18, 0.09, 0.38], kneePole: [0.1, 1, 0.3] });
  def('incline_dumbbell_curl', { scene: 'incline', incline: 0.52, prop: { type: 'dumbbells', axis: 'x' }, A: IC_A, B: Q2(IC_A, { hand: [0.02, -0.04, 0.22], arc: [0, 0.0, 0.14] }), peak: 'end', cam: { t: [0, 0.85, -0.1], d: 4.0 }, phases: ['Curl up', 'Lower to full stretch'] });

  var SK_A = Q2(BENCH_A, { hand: [-0.08, 0.58, 0.05], pole: [0.2, 1, 0] });
  def('skull_crushers', { scene: 'bench', prop: { type: 'ezbar', len: 0.8 }, A: SK_A, B: Q2(SK_A, { hand: [-0.08, 0.20, -0.22], pole: [0.2, 1, 0] }), peak: 'start', cam: { t: [0, 0.8, -0.2], d: 3.7 }, phases: ['Lower to forehead', 'Extend arms'] });

  var HL_A = P({ pelvis: [0, 1.20, 0], mode: 'world', hand: [0.30, 2.25, 0.10], pole: [0.3, -1, 0], feet: [0.09, 0.30, 0.0], kneePole: [0, 0.1, 1], plantar: 0.4 });
  def('hanging_leg_raise', { scene: 'pullupbar', prop: { type: 'none' }, A: HL_A, B: Q2(HL_A, { spinePitch: -0.15, feet: [0.09, 1.18, 0.85], feetArc: [0, -0.195, 0.19] }), peak: 'end', cam: { t: [0, 1.25, 0.2], d: 5.0 }, phases: ['Raise legs', 'Lower slowly'] });

  var CC_A = P({ pelvis: [0, 0.55, 0.02], spinePitch: 0.05, mode: 'body', hand: [0.10, 0.62, 0.12], pole: [0.8, -0.3, 0.3], feet: [0.10, 0.12, -0.43], kneePole: [0, -0.7, 0.7], plantar: 1.0 });
  def('cable_crunch', { scene: 'cable', prop: { type: 'cableRope', anchor: [0, 2.25, 0.55], head: true }, A: CC_A, B: Q2(CC_A, { spinePitch: 0.85, rootPitch: 0.1 }), peak: 'end', cam: { t: [0, 0.9, 0.2], d: 4.6 }, phases: ['Crunch down', 'Return up'] });

  var PL_A = P({ pelvis: [0, 0.34, 0], rootPitch: PI / 2 - 0.05, mode: 'world', hand: [0.20, 0.06, 0.83], pole: [0, -0.3, -1], feet: [0.09, 0.20, -0.90], kneePole: [0, 1, 0.3], plantar: 1.0 });
  def('plank', { scene: 'none', prop: { type: 'none' }, A: PL_A, B: PL_A, peak: 'both', still: true, cam: { t: [0, 0.4, -0.1], d: 3.9 }, phases: ['Hold the line', 'Hold the line'] });

  ['bench_press', 'incline_press', 'chest_fly', 'skull_crushers', 'leg_press', 'incline_dumbbell_curl'].forEach(function (k) { MOTIONS[k].head = 1; });
  MOTIONS.leg_curl.head = 0.35; MOTIONS.plank.head = 0.45; MOTIONS.cable_crunch.head = 0.8;

  /* ---------- scene helpers ---------- */
  function box(w, h, d, color, x, y, z, parent, metal) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: color, roughness: metal ? 0.35 : 0.8, metalness: metal ? 0.6 : 0 }));
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function cyl(r, len, color, parent, metal) {
    var m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 16), new THREE.MeshStandardMaterial({ color: color, roughness: metal ? 0.3 : 0.8, metalness: metal ? 0.7 : 0 }));
    m.scale.y = len; m.castShadow = true; if (parent) parent.add(m); return m;
  }
  function cylBetween(m, a, b) {
    var d = b.clone().sub(a), len = d.length();
    m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = Math.max(0.001, len);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  }
  function pelvisFrame(pose) {
    var g = new THREE.Group(); g.position.set(pose.pelvis[0], pose.pelvis[1], pose.pelvis[2]); g.rotation.set(pose.rootPitch, 0, 0); return g;
  }

  function buildScene(motion) {
    var g = new THREE.Group();
    var s = motion.scene;
    var A = motion.A;
    if (s === 'bench') {
      box(0.32, 0.08, 1.15, COL.pad, 0, 0.42, -0.20, g);
      box(0.05, 0.38, 0.05, COL.steel, 0, 0.19, -0.62, g, true); box(0.05, 0.38, 0.05, COL.steel, 0, 0.19, 0.22, g, true);
      box(0.5, 0.04, 0.05, COL.steel, 0, 0.02, -0.62, g, true); box(0.5, 0.04, 0.05, COL.steel, 0, 0.02, 0.22, g, true);
    } else if (s === 'incline') {
      var f = pelvisFrame(A);
      box(0.32, 0.95, 0.07, COL.pad, 0, 0.30, -0.15, f);
      g.add(f);
      box(0.32, 0.08, 0.42, COL.pad, 0, 0.42, 0.12, g);
      box(0.05, 0.38, 0.05, COL.steel, 0, 0.19, 0.28, g, true);
      box(0.05, 0.42, 0.05, COL.steel, 0, 0.21, -0.35, g, true);
      box(0.5, 0.04, 0.05, COL.steel, 0, 0.02, 0.28, g, true); box(0.5, 0.04, 0.05, COL.steel, 0, 0.02, -0.35, g, true);
    } else if (s === 'dipbars') {
      [-1, 1].forEach(function (sx) {
        var bar = cyl(0.018, 0.8, COL.steel, g, true); bar.rotation.x = PI / 2; bar.position.set(sx * 0.28, 1.08, 0);
        [-0.38, 0.38].forEach(function (z) { var p = cyl(0.022, 1.08, COL.steel, g, true); p.position.set(sx * 0.28, 0.54, z); });
        box(0.08, 0.03, 0.9, COL.steel, sx * 0.28, 0.015, 0, g, true);
      });
    } else if (s === 'pullupbar') {
      var cb = cyl(0.018, 2.0, COL.steel, g, true); cb.rotation.z = PI / 2; cb.position.set(0, 2.25, 0.11);
      [-1, 1].forEach(function (sx) { var p = cyl(0.03, 2.35, COL.steel, g, true); p.position.set(sx * 1.0, 1.175, 0.11); box(0.06, 0.03, 0.8, COL.steel, sx * 1.0, 0.015, 0.11, g, true); });
    } else if (s === 'cable') {
      box(0.12, 2.4, 0.12, COL.steel, 0, 1.2, 0.62, g, true);
      box(0.3, 1.5, 0.2, COL.plate, 0, 0.75, 0.78, g);
      box(0.12, 0.12, 0.5, COL.steel, 0, 2.38, 0.42, g, true);
      var pu = cyl(0.045, 0.06, COL.pad, g, true); pu.rotation.z = PI / 2; pu.position.set(0, 2.3, 0.42);
      box(0.6, 0.03, 0.6, COL.pad, 0, 0.015, 0.7, g);
    } else if (s === 'rowmachine') {
      box(0.35, 0.08, 0.42, COL.pad, 0, 0.40, -0.32, g);
      box(0.06, 0.38, 0.06, COL.steel, 0, 0.19, -0.32, g, true);
      var plate = box(0.6, 0.5, 0.05, COL.steel, 0, 0.45, 0.58, g, true); plate.rotation.x = 0.35;
      box(0.1, 0.08, 2.0, COL.steel, 0, 0.1, 0.35, g, true);
      box(0.12, 1.0, 0.12, COL.steel, 0, 0.5, 1.38, g, true);
      var pu2 = cyl(0.05, 0.06, COL.pad, g, true); pu2.rotation.z = PI / 2; pu2.position.set(0, 0.42, 1.34);
    } else if (s === 'calfblock') {
      box(0.55, 0.07, 0.36, COL.pad, 0, 0.035, 0.0, g);
    } else if (s === 'legcurl') {
      box(0.34, 0.08, 1.5, COL.pad, 0, 0.42, 0.28, g);
      box(0.06, 0.38, 0.06, COL.steel, 0, 0.19, 0.9, g, true); box(0.06, 0.38, 0.06, COL.steel, 0, 0.19, -0.2, g, true);
      box(0.5, 0.04, 0.06, COL.steel, 0, 0.02, 0.9, g, true); box(0.5, 0.04, 0.06, COL.steel, 0, 0.02, -0.2, g, true);
      box(0.1, 0.4, 0.1, COL.steel, 0, 0.2, -0.78, g, true);
    } else if (s === 'legpress') {
      var f2 = pelvisFrame(A);
      box(0.34, 0.95, 0.07, COL.pad, 0, 0.30, -0.15, f2);
      g.add(f2);
      box(0.34, 0.08, 0.4, COL.pad, 0, 0.32, -0.45, g);
      [-1, 1].forEach(function (sx) {
        var rail = box(0.06, 0.06, 1.7, COL.steel, sx * 0.34, 0.5, 0.25, g, true);
        rail.rotation.x = -0.65; rail.position.set(sx * 0.34, 0.62, 0.35);
        box(0.06, 0.12, 0.06, COL.steel, sx * 0.34, 0.06, -0.3, g, true); box(0.06, 0.12, 0.06, COL.steel, sx * 0.34, 0.06, 1.1, g, true);
      });
    }
    return g;
  }

  /* ---------- props (follow the hands / feet) ---------- */
  function makeBarbell(len, plateR, plateX, plates) {
    var grp = new THREE.Group();
    var bar = cyl(0.0125, len, COL.steel, grp, true); bar.rotation.z = PI / 2;
    [-1, 1].forEach(function (sx) {
      for (var i = 0; i < plates; i++) {
        var p = cyl(plateR - i * 0.025, 0.035, i ? COL.plateEdge : COL.plate, grp, false); p.userData.fade = true; p.rotation.z = PI / 2; p.position.x = sx * (plateX + i * 0.04);
      }
      var c = cyl(0.025, 0.04, COL.steel, grp, true); c.rotation.z = PI / 2; c.position.x = sx * (plateX + plates * 0.04 + 0.02);
    });
    return grp;
  }
  function makeDumbbell(axis) {
    var grp = new THREE.Group();
    var h = cyl(0.015, 0.15, COL.steel, grp, true); h.rotation.z = PI / 2;
    [-1, 1].forEach(function (sx) { var p = cyl(0.065, 0.045, COL.plate, grp, false); p.rotation.z = PI / 2; p.position.x = sx * 0.085; });
    var outer = new THREE.Group(); outer.add(grp);
    if (axis === 'z') grp.rotation.y = PI / 2;
    return outer;
  }

  function makeProp(motion, scene) {
    var pr = motion.prop || { type: 'none' }, t = pr.type, o = { type: t, parts: [] };
    var line = function () { var m = cyl(0.007, 1, 0x9aa0aa, scene, false); m.castShadow = false; return m; };
    if (t === 'barbell') { o.g = makeBarbell(2.2, 0.225, 0.78, 2); scene.add(o.g); }
    else if (t === 'ezbar') { var L = pr.len || 0.8; o.g = makeBarbell(L, 0.11, L / 2 - 0.06, 1); scene.add(o.g); }
    else if (t === 'dumbbells') { o.d = [makeDumbbell(pr.axis), makeDumbbell(pr.axis)]; o.d.forEach(function (d) { scene.add(d); }); }
    else if (t === 'cableBar') {
      o.bar = cyl(0.014, 1, COL.steel, scene, true); o.bar.rotation.order = 'XYZ';
      o.cable = line(); o.anchor = new V3(pr.anchor[0], pr.anchor[1], pr.anchor[2]);
    } else if (t === 'cableRope') {
      o.h = [cyl(0.02, 0.1, COL.pad, scene, false), cyl(0.02, 0.1, COL.pad, scene, false)];
      o.r = [line(), line()]; o.cable = line(); o.anchor = new V3(pr.anchor[0], pr.anchor[1], pr.anchor[2]);
    } else if (t === 'anklePad') {
      o.pad = cyl(0.045, 0.42, COL.pad, scene, false); o.pad.rotation.z = PI / 2;
    } else if (t === 'platform') {
      o.plate = box(0.7, 0.55, 0.05, COL.steel, 0, 0, 0, scene, true);
    }
    return o;
  }

  function updateProp(o, hands, feet, hasHead) {
    var hp = hands[0], hn = hands[1], mid = hp.clone().add(hn).multiplyScalar(0.5);
    if (o.type === 'barbell' || o.type === 'ezbar') {
      o.g.position.copy(mid);
      var ax = hp.clone().sub(hn); if (ax.lengthSq() < 1e-6) ax.set(1, 0, 0);
      o.g.quaternion.setFromUnitVectors(new V3(1, 0, 0), ax.normalize());
    } else if (o.type === 'dumbbells') {
      o.d[0].position.copy(hp); o.d[1].position.copy(hn);
    } else if (o.type === 'cableBar') {
      var half = o.narrow ? 0.06 : 0.0;
      var a = hp.clone(), b = hn.clone(); var ex = a.clone().sub(b).normalize().multiplyScalar(0.07);
      a.add(ex); b.sub(ex);
      cylBetween(o.bar, b, a);
      cylBetween(o.cable, o.anchor, mid);
    } else if (o.type === 'cableRope') {
      var knot = mid.clone(); knot.y += 0.14;
      o.h[0].position.copy(hp); o.h[1].position.copy(hn);
      o.h.forEach(function (m, i) { m.scale.y = 0.1; });
      cylBetween(o.r[0], knot, hp); cylBetween(o.r[1], knot, hn); cylBetween(o.cable, o.anchor, knot);
    } else if (o.type === 'anklePad') {
      var fm = feet[0].clone().add(feet[1]).multiplyScalar(0.5);
      o.pad.position.set(0, fm.y + 0.075, fm.z + 0.02);
    } else if (o.type === 'platform') {
      var f = feet[0].clone().add(feet[1]).multiplyScalar(0.5);
      var n = new V3(0, 0.67, 0.74).normalize();
      o.plate.position.copy(f).add(n.clone().multiplyScalar(0.085));
      o.plate.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);
    }
  }

  function studioEnv(renderer) {
    var pm = new THREE.PMREMGenerator(renderer);
    var es = new THREE.Scene();
    var sky = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }));
    var pos = sky.geometry.attributes.position, cols = [];
    for (var i = 0; i < pos.count; i++) { var y = pos.getY(i) / 10, v = 0.05 + 0.22 * (y * 0.5 + 0.5); cols.push(v, v, v * 1.06); }
    sky.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); es.add(sky);
    [[0, 6, 4, 8, 5, 0xffffff, 9], [-7, 3, -3, 3, 6, 0xa9c4ff, 5], [7, 2, 2, 2, 5, 0xffffff, 3]].forEach(function (b) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(b[3], b[4]), new THREE.MeshBasicMaterial({ color: new THREE.Color(b[5]).multiplyScalar(b[6]), side: THREE.DoubleSide }));
      m.position.set(b[0], b[1], b[2]); m.lookAt(0, 0, 0); es.add(m);
    });
    var tex = pm.fromScene(es, 0.03).texture; pm.dispose(); return tex;
  }
  function studioBackdrop() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 512;
    var g = cv.getContext('2d'), gr = g.createRadialGradient(128, 200, 20, 128, 260, 360);
    gr.addColorStop(0, '#2c313a'); gr.addColorStop(0.55, '#1a1d23'); gr.addColorStop(1, '#0e1013');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
    return new THREE.CanvasTexture(cv);
  }

  /* ---------- viewer ---------- */
  function create(container, opts) {
    var motion = MOTIONS[opts.exerciseId];
    if (!motion || !supported()) return null;
    var w = container.clientWidth || 300, h = container.clientHeight || 400;

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !!opts.debug });
    renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;cursor:grab;';
    container.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = studioBackdrop();
    
    renderer.toneMapping = THREE.NoToneMapping;
    try { scene.environment = studioEnv(renderer); } catch (e) { }
    var camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);

    scene.add(new THREE.HemisphereLight(0xdfe6f2, 0x2b2f38, 0.55));
    var key = new THREE.DirectionalLight(0xfff4e8, 1.0); key.position.set(2.5, 5, 3.5); key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -3; key.shadow.camera.right = 3; key.shadow.camera.top = 3.5; key.shadow.camera.bottom = -2; key.shadow.camera.near = 1; key.shadow.camera.far = 14; key.shadow.bias = -0.0008;
    scene.add(key);
    var rim = new THREE.DirectionalLight(0x9db8ff, 0.8); rim.position.set(-3, 2.5, -3); scene.add(rim);

    var fcv = document.createElement('canvas'); fcv.width = fcv.height = 256;
    var fg = fcv.getContext('2d'), fgr = fg.createRadialGradient(128, 128, 20, 128, 128, 128);
    fgr.addColorStop(0, '#fff'); fgr.addColorStop(0.55, '#bbb'); fgr.addColorStop(1, '#000'); fg.fillStyle = fgr; fg.fillRect(0, 0, 256, 256);
    var floor = new THREE.Mesh(new THREE.CircleGeometry(4.6, 64), new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.95, envMapIntensity: 0.25, transparent: true, alphaMap: new THREE.CanvasTexture(fcv) }));
    floor.rotation.x = -PI / 2; floor.receiveShadow = true; scene.add(floor);
    var ring = new THREE.Mesh(new THREE.RingGeometry(2.15, 2.2, 64), new THREE.MeshBasicMaterial({ color: COL.ring, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    ring.visible = false;

    var prim = opts.primary || [], sec = opts.secondary || [];
    var ch = null;
    var sceneGroup = buildScene(motion); scene.add(sceneGroup);
    var prop = makeProp(motion, scene);
    var fades = [];
    function collectFades() {
      scene.updateMatrixWorld(true);
      sceneGroup.traverse(function (o) {
        if (!o.isMesh) return;
        var bb = new THREE.Box3().setFromObject(o);
        if (bb.max.y > 0.6) o.userData.fade = true;
      });
      scene.traverse(function (o) {
        if (o.isMesh && o.userData.fade) { o.material.transparent = true; fades.push({ m: o, op: 1 }); }
      });
    }
    collectFades();
    var _fp = new V3(), _ray = new V3(), _c = new V3();
    function updateFades(dt) {
      if (opts.noFade) return;
      _ray.copy(target).sub(camera.position); var rl = _ray.length(); _ray.divideScalar(rl);
      fades.forEach(function (f) {
        f.m.getWorldPosition(_fp); _c.copy(_fp).sub(camera.position);
        var t = _c.dot(_ray), want = 1;
        if (t > 0 && t < rl) { var perp = _c.clone().sub(_ray.clone().multiplyScalar(t)).length(); if (perp < 1.0) want = 0.13; }
        f.op += (want - f.op) * Math.min(1, dt * 10); f.m.material.opacity = f.op;
      });
    }

    /* camera orbit state */
    var cam = { yaw: opts.yaw !== undefined ? opts.yaw : 0.85, pitch: 0.16, dist: motion.cam.d * Math.max(1, Math.pow(h / w, 0.55)) * 1.02 * (opts.distScale || 1), tYaw: null, auto: opts.auto !== false };
    cam.tYaw = cam.yaw;
    var target = new V3(motion.cam.t[0], motion.cam.t[1], motion.cam.t[2]);
    function placeCamera() {
      var cp = Math.cos(cam.pitch);
      camera.position.set(target.x + cam.dist * Math.sin(cam.yaw) * cp, target.y + cam.dist * Math.sin(cam.pitch), target.z + cam.dist * Math.cos(cam.yaw) * cp);
      camera.lookAt(target);
    }

    var A = motion.A, B = motion.B;
    var tempo = motion.tempo || [1.35, 1.5];
    var st = { ready: false, te: 0, time: 0, slow: false, paused: false, rep: 1, phaseT: 0, seg: 0, lastPhase: '', raf: 0, last: 0, manual: false, totalReps: opts.reps || 10, dead: false };

    var v1 = new V3(), v2 = new V3();
    function resolveHand(side, te) {
      var a = A, b = B;
      var off = lerpArr(a.hand, b.hand, te), arc = [b.arc[0] * Math.sin(PI * te), b.arc[1] * Math.sin(PI * te), b.arc[2] * Math.sin(PI * te)];
      var o = [off[0] + arc[0], off[1] + arc[1], off[2] + arc[2]];
      var r = new V3();
      if (a.mode === 'world') { r.set(side * o[0], o[1], o[2]); }
      else if (a.mode === 'body') { r.set(side * o[0], o[1], o[2]); ch.spine.localToWorld(r); }
      else { ch.arms[side === 1 ? 0 : 1].upper.getWorldPosition(r); r.x += side * o[0]; r.y += o[1]; r.z += o[2]; }
      return r;
    }

    function pose(te) {
      var a = A, b = B;
      var pel = lerpArr(a.pelvis, b.pelvis, te);
      ch.pelvis.position.set(pel[0], pel[1], pel[2]);
      ch.pelvis.rotation.set(lerp(a.rootPitch, b.rootPitch, te), 0, 0);
      ch.spine.rotation.set(lerp(a.spinePitch, b.spinePitch, te), 0, 0);
      var sh = lerp(a.shrug, b.shrug, te);
      ch.arms[0].upper.position.y = SH_Y + sh; ch.arms[1].upper.position.y = SH_Y + sh;
      ch.root.updateMatrixWorld(true);
      if (ch.head) {
        var sq = new Q(); ch.spine.getWorldQuaternion(sq);
        var hf = motion.head !== undefined ? motion.head : 0.5;
        setWorldQuat(ch.head, new Q().slerp(sq, hf));
      }

      var handsW = [];
      // arms
      ch.arms.forEach(function (arm, i) {
        var side = arm.side;
        var T = resolveHand(side, te);
        var S = new V3(); arm.upper.getWorldPosition(S);
        var pl = lerpArr(a.pole, b.pole, te);
        var sol = solve2(S, T, L_UP, L_FORE, new V3(side * pl[0], pl[1], pl[2]));
        var yU = S.clone().sub(sol.E);
        setWorldQuat(arm.upper, basisQuat(yU, sol.p.clone().negate()));
        var yF = sol.E.clone().sub(sol.T);
        setWorldQuat(arm.fore, basisQuat(yF, sol.p.clone().negate()));
        var hw = new V3(0, -L_FORE, 0); arm.fore.localToWorld(hw); handsW.push(hw);
      });
      // legs
      var feetW = [];
      ch.legs.forEach(function (leg) {
        var side = leg.side;
        var useNeg = side === -1 && a.feetNeg;
        var fa = useNeg ? a.feetNeg : [side * a.feet[0], a.feet[1], a.feet[2]];
        var fb = useNeg ? (b.feetNeg || a.feetNeg) : [side * b.feet[0], b.feet[1], b.feet[2]];
        if (side === -1 && !a.feetNeg) { fa = [-a.feet[0], a.feet[1], a.feet[2]]; fb = [-b.feet[0], b.feet[1], b.feet[2]]; }
        var fp = lerpArr(fa, fb, te), sa = Math.sin(PI * te);
        var A3 = new V3(fp[0] + side * b.feetArc[0] * sa, fp[1] + b.feetArc[1] * sa, fp[2] + b.feetArc[2] * sa);
        var kpA = (side === -1 && a.kneePoleNeg) ? a.kneePoleNeg : [side * a.kneePole[0], a.kneePole[1], a.kneePole[2]];
        var kpB = (side === -1 && (b.kneePoleNeg || a.kneePoleNeg)) ? (b.kneePoleNeg || a.kneePoleNeg) : [side * b.kneePole[0], b.kneePole[1], b.kneePole[2]];
        var kp = lerpArr(kpA, kpB, te);
        var H = new V3(); leg.thigh.getWorldPosition(H);
        var sol = solve2(H, A3, L_THIGH, L_SHIN, new V3(kp[0], kp[1], kp[2]));
        setWorldQuat(leg.thigh, basisQuat(H.clone().sub(sol.E), sol.p));
        setWorldQuat(leg.shin, basisQuat(sol.E.clone().sub(sol.T), sol.p));
        var pa = (side === -1 && a.plantarNeg !== null) ? a.plantarNeg : a.plantar;
        var pb = (side === -1 && (b.plantarNeg !== null && b.plantarNeg !== undefined)) ? b.plantarNeg : b.plantar;
        if (side === -1 && a.plantarNeg !== null && (b.plantarNeg === null || b.plantarNeg === undefined)) pb = a.plantarNeg;
        var pl2 = lerp(pa, pb, te);
        var fq = new Q().setFromEuler(new THREE.Euler(0, side * 0.2, 0)).multiply(new Q().setFromEuler(new THREE.Euler(pl2, 0, 0)));
        setWorldQuat(leg.foot, fq);
        var fw = new V3(0, 0, 0); leg.foot.localToWorld(fw); feetW.push(fw);
      });
      updateProp(prop, handsW, feetW, motion.prop && motion.prop.head);
      // muscle activation
      var act = motion.peak === 'both' ? 1 : (motion.peak === 'start' ? 1 - te : te);
      var pulse = 0.5 + 0.5 * Math.sin(st.time * 6);
      if (ch.bodyU) {
        ch.bodyU.uPA.value = 0.35 + 0.65 * act + 0.14 * pulse;
        ch.bodyU.uSA.value = 0.3 + 0.7 * act;
      } else {
        ch.M.prim.emissiveIntensity = 0.55 + 1.0 * act + 0.18 * pulse;
        ch.M.glow.opacity = 0.14 + 0.30 * act + 0.06 * pulse;
        ch.M.sec.emissiveIntensity = 0.15 + 0.35 * act;
        for (var k in ch.muscles) ch.muscles[k].forEach(function (rec) {
          if (rec.primary) rec.mesh.scale.copy(rec.base).multiplyScalar(1 + 0.09 * act);
        });
      }
    }

    /* timeline: holdA, A->B, holdB, B->A */
    function timeline(dt) {
      if (motion.still) { st.te = 0; return; }
      var sp = st.slow ? 0.5 : 1;
      st.phaseT += dt * sp;
      var hold = 0.35, up = tempo[0], dn = tempo[1];
      var segs = [hold, up, hold, dn];
      while (st.phaseT >= segs[st.seg]) {
        st.phaseT -= segs[st.seg]; st.seg = (st.seg + 1) % 4;
        if (st.seg === 0) { st.rep++; if (st.rep > st.totalReps) st.rep = 1; if (opts.onRep) opts.onRep(st.rep); }
      }
      var p = st.phaseT / segs[st.seg];
      if (st.seg === 0) st.te = 0; else if (st.seg === 1) st.te = smooth(p); else if (st.seg === 2) st.te = 1; else st.te = 1 - smooth(p);
      var label = st.seg === 1 ? motion.phases[0] : (st.seg === 3 ? motion.phases[1] : (st.seg === 0 ? 'Start position' : 'Peak contraction'));
      if (label !== st.lastPhase) { st.lastPhase = label; if (opts.onPhase) opts.onPhase(label, st.seg); }
    }

    function frame(now) {
      if (st.dead) return;
      var dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
      if (!st.paused && !st.manual) { st.time += dt; timeline(dt); }
      if (cam.auto && !drag.on) cam.tYaw += dt * 0.18;
      var dy = cam.tYaw - cam.yaw; cam.yaw += dy * Math.min(1, dt * 6);
      if (st.ready) pose(st.te);
      placeCamera();
      updateFades(dt);
      renderer.render(scene, camera);
      st.raf = requestAnimationFrame(frame);
    }

    function setup() {
      if (st.dead || ch) return;
      ch = (BODY.geo && !opts.mannequin) ? buildBody(prim, sec) : buildCharacter(prim, sec);
      scene.add(ch.root); st.ready = true;
      if (opts.onReady) opts.onReady(!!ch.bodyU);
    }
    if (BODY.geo || BODY.failed || opts.mannequin || !BODY.promise) setup();
    else BODY.promise.then(setup, setup);

    /* interaction */
    var drag = { on: false, x: 0 };
    var el = renderer.domElement;
    el.addEventListener('pointerdown', function (e) { drag.on = true; drag.x = e.clientX; try { el.setPointerCapture(e.pointerId); } catch (x) { } el.style.cursor = 'grabbing'; });
    el.addEventListener('pointermove', function (e) { if (!drag.on) return; var dx = e.clientX - drag.x; drag.x = e.clientX; cam.tYaw -= dx * 0.01; cam.yaw = cam.tYaw; });
    function up() { drag.on = false; el.style.cursor = 'grab'; }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

    function onResize() {
      var W = container.clientWidth, H = container.clientHeight; if (!W || !H) return;
      renderer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    var ro = null;
    if (global.ResizeObserver) { ro = new ResizeObserver(onResize); ro.observe(container); } else { global.addEventListener('resize', onResize); }

    var api = {
      setView: function (name) {
        var m = { front: 0, side: PI / 2, back: PI, three: 0.85 };
        var base = m[name]; if (base === undefined) return;
        var cur = cam.yaw, k = Math.round((cur - base) / (2 * PI));
        cam.tYaw = base + k * 2 * PI; cam.auto = false;
      },
      setAuto: function (b) { cam.auto = !!b; },
      setSlow: function (b) { st.slow = !!b; },
      setPaused: function (b) { st.paused = !!b; },
      isPaused: function () { return st.paused; },
      destroy: function () {
        st.dead = true; cancelAnimationFrame(st.raf);
        if (ro) ro.disconnect(); else global.removeEventListener('resize', onResize);
        scene.traverse(function (o) { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
        renderer.dispose(); try { renderer.forceContextLoss(); } catch (e) { }
        if (el.parentNode) el.parentNode.removeChild(el);
      },
      /* debug helpers (used for visual verification) */
      debugFrame: function (te, yaw, pitch) {
        st.manual = true; st.te = te; cam.auto = false; cam.yaw = cam.tYaw = yaw; if (pitch !== undefined) cam.pitch = pitch;
        pose(te); placeCamera(); updateFades(1); updateFades(1); renderer.render(scene, camera);
      },
      motion: motion
    };
    st.raf = requestAnimationFrame(frame);
    return api;
  }

  global.FF3D = { supported: supported, loadBody: loadBody, bodyReady: function () { return BODY.promise || Promise.resolve(); }, create: create, MOTIONS: MOTIONS, hasMotion: function (id) { return !!MOTIONS[id]; } };
})(window);
