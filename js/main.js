import * as THREE from 'three';
import { initAudio, setWind, setWater, stopWater, clack, collectSfx, dropCry, fanfare, zabun, speakEn } from './audio.js';

// ===== 基本セットアップ =====
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaee7ff);
scene.fog = new THREE.Fog(0xaee7ff, 90, 400);

const camera = new THREE.PerspectiveCamera(66, window.innerWidth / window.innerHeight, 0.1, 500);

scene.add(new THREE.HemisphereLight(0xcfefff, 0x7ec850, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.4);
sun.position.set(40, 80, 20);
scene.add(sun);

const v = (x, y, z) => new THREE.Vector3(x, y, z);

// 曲線の長さ・最高地点を調べる
function analyze(curve) {
  let uTop = 0, yMax = 0;
  for (let i = 0; i <= 1000; i++) {
    const p = curve.getPointAt(i / 1000);
    if (p.y > yMax) { yMax = p.y; uTop = i / 1000; }
  }
  return { len: curve.getLength(), uTop, yMax };
}

// ===== 🎢 ジェットコースターのコース =====
const coasterCurve = new THREE.CatmullRomCurve3([
  v(0, 3, 0),        // スタート駅
  v(0, 3, -15),
  v(0, 6, -30),      // リフト開始
  v(0, 30, -80),     // カタカタ登り
  v(0, 32, -92),     // 頂上!
  v(0, 4, -120),     // 急降下びゅーん
  v(0, 3, -135),     // 谷
  v(0, 14, -155),    // 小さな山
  v(-10, 12, -170),  // 左カーブ開始
  v(-30, 8, -175),
  v(-45, 10, -160),
  v(-50, 6, -140),
  v(-45, 8, -120),
  v(-30, 4, -105),   // 小さなくぼみ
  v(-15, 5, -95),
  v(-8, 3, -75),
  v(-8, 3, -55),     // ゴール
]);

// ===== 🛝 ウォータースライダーのコース =====
const slideCurve = new THREE.CatmullRomCurve3([
  v(25, 24, -18),    // タワーの上
  v(25, 23, -30),
  v(32, 20, -45),    // 右へ
  v(40, 17, -60),
  v(35, 14, -78),    // 左へ
  v(22, 11, -90),
  v(15, 9, -105),
  v(22, 7, -122),    // くねくね
  v(35, 5.5, -135),
  v(42, 4, -150),
  v(35, 2.5, -165),
  v(24, 1.6, -172),
  v(16, 1.0, -177),  // プールへザッブーン
]);

// ===== コースターの見た目 =====
{
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(coasterCurve, 400, 0.18, 8),
    new THREE.MeshLambertMaterial({ color: 0xe74c3c })
  ));

  const info = analyze(coasterCurve);
  const nTies = Math.floor(info.len / 2.2);
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.15, 0.1, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x8d5524 }),
    nTies
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < nTies; i++) {
    const t = i / (nTies - 1);
    const p = coasterCurve.getPointAt(t);
    dummy.position.copy(p);
    dummy.position.y -= 0.22;
    dummy.lookAt(p.clone().add(coasterCurve.getTangentAt(t)));
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
  }
  scene.add(ties);
}

// 支柱(コースター・スライダー共用の関数)
function addPillars(curve, len, color, every, radius) {
  const n = Math.floor(len / every);
  const geo = new THREE.CylinderGeometry(radius, radius, 1, 6);
  geo.translate(0, 0.5, 0); // 原点を根元に
  const pillars = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color }), n);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const p = curve.getPointAt(i / (n - 1));
    dummy.position.set(p.x, 0, p.z);
    dummy.scale.set(1, Math.max(0.5, p.y - 0.4), 1);
    dummy.updateMatrix();
    pillars.setMatrixAt(i, dummy.matrix);
  }
  scene.add(pillars);
}
addPillars(coasterCurve, analyze(coasterCurve).len, 0x9aa5ab, 9, 0.16);
addPillars(slideCurve, analyze(slideCurve).len, 0xffb74d, 13, 0.22);

// ===== スライダーの見た目 =====
const pool = new THREE.Mesh(
  new THREE.CylinderGeometry(8, 8, 0.5, 24),
  new THREE.MeshLambertMaterial({ color: 0x29b6f6 })
);
const splash = new THREE.Mesh(
  new THREE.SphereGeometry(1, 12, 10),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
);
{
  // 半透明の青いチューブ(中をくぐる)
  scene.add(new THREE.Mesh(
    new THREE.TubeGeometry(slideCurve, 300, 1.1, 10),
    new THREE.MeshPhongMaterial({
      color: 0x4fc3f7, transparent: true, opacity: 0.35,
      side: THREE.DoubleSide, depthWrite: false,
    })
  ));

  // チューブの中に青いリングを並べる(くぐり抜ける速度感の核)
  const info = analyze(slideCurve);
  const nRings = Math.floor(info.len / 6);
  const rings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1.18, 0.07, 6, 16),
    new THREE.MeshLambertMaterial({ color: 0x0288d1 }),
    nRings
  );
  const rd = new THREE.Object3D();
  for (let i = 0; i < nRings; i++) {
    const t = i / (nRings - 1);
    const p = slideCurve.getPointAt(t);
    rd.position.copy(p);
    rd.lookAt(p.clone().add(slideCurve.getTangentAt(t)));
    rd.updateMatrix();
    rings.setMatrixAt(i, rd.matrix);
  }
  scene.add(rings);

  // スタートのタワー台
  const top = slideCurve.getPointAt(0);
  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.4, 12),
    new THREE.MeshLambertMaterial({ color: 0xffd54f })
  );
  deck.position.set(top.x, top.y - 1.2, top.z + 1.5);
  scene.add(deck);

  // 着水プール
  const end = slideCurve.getPointAt(1);
  pool.position.set(end.x - 3, 0.25, end.z - 3);
  scene.add(pool);

  splash.visible = false;
  splash.position.copy(end).setY(0.6);
  scene.add(splash);
}

// 水しぶきパーティクル(スライダー滑走中のみ)
const SPRAY_N = 100;
const sprayData = Array.from({ length: SPRAY_N }, () => ({ p: new THREE.Vector3(0, -999, 0), v: new THREE.Vector3(), life: 0 }));
const sprayGeo = new THREE.BufferGeometry();
sprayGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPRAY_N * 3), 3));
// 丸くて柔らかい粒のテクスチャ(素のPointsは四角く描かれる)
function softCircleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const sprayPts = new THREE.Points(sprayGeo, new THREE.PointsMaterial({
  color: 0xe1f5fe, size: 0.3, map: softCircleTexture(),
  transparent: true, opacity: 0.85, depthWrite: false,
}));
sprayPts.frustumCulled = false;
sprayPts.visible = false;
scene.add(sprayPts);

// ===== まわりの景色 =====
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(700, 700),
  new THREE.MeshLambertMaterial({ color: 0x7ec850 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 木(ローポリ)
{
  const n = 60;
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.3, 0.4, 2, 6),
    new THREE.MeshLambertMaterial({ color: 0x8d5524 }), n);
  const tops = new THREE.InstancedMesh(
    new THREE.ConeGeometry(2.2, 5, 7),
    new THREE.MeshLambertMaterial({ color: 0x2e9e4f }), n);
  const dummy = new THREE.Object3D();
  let placed = 0, tries = 0;
  while (placed < n && tries < 500) {
    tries++;
    const x = (Math.random() - 0.5) * 400 - 10;
    const z = -Math.random() * 350 + 30;
    // どちらのコースの真下付近も避ける(ざっくり)
    let near = false;
    for (const curve of [coasterCurve, slideCurve]) {
      for (let i = 0; i <= 20; i++) {
        const p = curve.getPointAt(i / 20);
        if ((p.x - x) ** 2 + (p.z - z) ** 2 < 36) { near = true; break; }
      }
      if (near) break;
    }
    if (near) continue;
    dummy.position.set(x, 1, z);
    dummy.updateMatrix();
    trunks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 4.2;
    const s = 0.7 + Math.random() * 0.8;
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    tops.setMatrixAt(placed, dummy.matrix);
    dummy.scale.setScalar(1);
    placed++;
  }
  trunks.count = placed;
  tops.count = placed;
  scene.add(trunks, tops);
}

// 雲(Lambertだと下面が地面色に染まるのでBasicで真っ白に)
const clouds = [];
{
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), mat);
    c.scale.set(1.6, 0.5, 0.9);
    c.position.set((Math.random() - 0.5) * 350 - 10, 42 + Math.random() * 25, -Math.random() * 320 + 20);
    clouds.push(c);
    scene.add(c);
  }
}

// ===== ⭐(タップで集める)=====
function makeStars(curve, info, fromU, upOffset, size, count) {
  const geo = new THREE.OctahedronGeometry(size);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd93d });
  const stars = [];
  for (let i = 0; i < count; i++) {
    const u = fromU + (i / (count - 1)) * (0.92 - fromU);
    const p = curve.getPointAt(u);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, p.y + upOffset, p.z);
    scene.add(m);
    stars.push({ mesh: m, u, taken: false, popT: 0, baseY: p.y + upOffset });
  }
  return stars;
}

// ===== ライド設定 =====
const G = 9.8;
const coasterInfo = analyze(coasterCurve);
const slideInfo = analyze(slideCurve);

const RIDES = {
  coaster: {
    curve: coasterCurve, info: coasterInfo,
    lift: true, liftSpeed: 9.0,          // 頂上まで約11秒。遅いと4歳児が飽きる
    vMin: 5, vMax: 26, fric: 1,
    camUp: 1.6, starUp: 1.8, lookAhead: 10,
    stars: makeStars(coasterCurve, coasterInfo, coasterInfo.uTop + 0.04, 1.8, 0.9, 12),
    goalEmoji: '🎉',
  },
  slide: {
    curve: slideCurve, info: slideInfo,
    lift: false,
    vMin: 2.5, vMax: 16, fric: 0.5,      // 水の摩擦でコースターよりマイルド
    camUp: 0.5, starUp: 0.25,            // チューブ(半径1.1)の中に収める
    lookAhead: 5,                        // 長いと急カーブで壁越しに外を見てしまう
    stars: makeStars(slideCurve, slideInfo, 0.1, 0.25, 0.5, 10),
    goalEmoji: '💦',
  },
};

// ===== ゲーム状態 =====
let state = 'title';        // title | ride | splash | goal
let rideKey = 'coaster';
let u = 0;
let speed = 0;
let phase = 'lift';         // lift | pause | run
let pauseTimer = 0;
let splashTimer = 0;
let starCount = 0;
let lastClack = 0;

const $ = id => document.getElementById(id);
const hud = $('hud');

function updateHud() { hud.textContent = '⭐' + starCount; }

// ⭐コレクション(localStorageに累計を保存)
const STARS_KEY = 'byunpark.totalStars';
let totalStars = parseInt(localStorage.getItem(STARS_KEY) || '0', 10) || 0;

function updateTotalStars() {
  $('totalStars').textContent = '⭐' + totalStars;
}
updateTotalStars();

// ゴールの紙吹雪(絵文字がひらひら降る)
function confetti() {
  const box = $('confetti');
  box.textContent = '';
  const emojis = ['🎉', '⭐', '🎈', '✨'];
  for (let i = 0; i < 24; i++) {
    const s = document.createElement('span');
    s.textContent = emojis[i % emojis.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = Math.random() * 1.2 + 's';
    s.style.animationDuration = 2 + Math.random() * 2 + 's';
    box.appendChild(s);
  }
}

function startRide(key) {
  initAudio();
  rideKey = key;
  const cfg = RIDES[key];
  u = 0;
  phase = cfg.lift ? 'lift' : 'run';
  speed = cfg.lift ? cfg.liftSpeed : cfg.vMin;
  starCount = 0;
  cfg.stars.forEach(s => {
    s.taken = false;
    s.popT = 0;
    s.mesh.visible = true;
    s.mesh.scale.setScalar(1);
    s.mesh.position.y = s.baseY;
  });
  updateHud();
  $('title').classList.add('hidden');
  $('goal').classList.add('hidden');
  hud.classList.remove('hidden');
  splash.visible = false;
  state = 'ride';
  speakEn("Let's go!");
}

function finishRide() {
  state = 'goal';
  setWind(0);
  stopWater();
  sprayPts.visible = false;
  fanfare();
  speakEn('You did it!');
  totalStars += starCount;
  localStorage.setItem(STARS_KEY, String(totalStars));
  updateTotalStars();
  hud.classList.add('hidden');
  $('goalLogo').textContent = RIDES[rideKey].goalEmoji;
  $('goalStars').textContent = starCount > 0 ? '⭐'.repeat(starCount) : '👍';
  confetti();
  $('goal').classList.remove('hidden');
}

function goHome() {
  state = 'title';
  $('goal').classList.add('hidden');
  $('title').classList.remove('hidden');
}

$('coasterBtn').addEventListener('pointerdown', () => startRide('coaster'));
$('slideBtn').addEventListener('pointerdown', () => startRide('slide'));
$('againBtn').addEventListener('pointerdown', () => startRide(rideKey));
$('homeBtn').addEventListener('pointerdown', goHome);

// ライド中: 画面のどこをタップしても、近くの⭐をゲット(判定は激甘)
renderer.domElement.addEventListener('pointerdown', () => {
  if (state !== 'ride') return;
  const cfg = RIDES[rideKey];
  let best = null;
  for (const s of cfg.stars) {
    if (s.taken) continue;
    const dist = (s.u - u) * cfg.info.len;
    if (dist > -1 && dist < 20 && (!best || s.u < best.u)) best = s;
  }
  if (best) {
    best.taken = true;
    best.popT = 0.001;
    starCount++;
    updateHud();
    collectSfx();
  }
});

// ===== 毎フレーム更新 =====
const clock = new THREE.Clock();
const lastCamPos = new THREE.Vector3();

function update(dt) {
  const cfg = RIDES[rideKey];

  if (state === 'splash') {
    // 着水演出: 水柱がふくらんで消える
    splashTimer += dt;
    const k = splashTimer / 0.9;
    splash.scale.setScalar(0.5 + k * 6);
    splash.material.opacity = Math.max(0, 0.9 - k);
    camera.position.set(
      lastCamPos.x + (Math.random() - 0.5) * 0.2,
      lastCamPos.y + (Math.random() - 0.5) * 0.2,
      lastCamPos.z + (Math.random() - 0.5) * 0.2
    );
    if (splashTimer > 0.9) finishRide();
    return;
  }

  if (state !== 'ride') return;

  // --- 速度の計算(物理エンジンなしの自前モデル) ---
  const pos = cfg.curve.getPointAt(u);
  if (phase === 'lift') {
    speed = cfg.liftSpeed;
    lastClack += dt;
    if (lastClack > 0.24) { lastClack = 0; clack(); }
    if (u >= cfg.info.uTop) { phase = 'pause'; pauseTimer = 0.8; }
  } else if (phase === 'pause') {
    speed = 0.6;
    pauseTimer -= dt;
    if (pauseTimer <= 0) { phase = 'run'; dropCry(); }
  } else {
    // エネルギー保存っぽい式: 低いところほど速い(スライダーは摩擦でマイルド)
    speed = Math.sqrt(Math.max(cfg.vMin * cfg.vMin, 2 * G * cfg.fric * (cfg.info.yMax + 1.5 - pos.y)));
    speed = Math.min(speed, cfg.vMax);
    if (rideKey === 'coaster' && u > 0.965) speed = Math.min(speed, 4 + (1 - u) / 0.035 * 12);
  }

  u += (speed * dt) / cfg.info.len;
  if (u >= 0.999) {
    u = 0.999;
    if (rideKey === 'slide') {
      // ザッブーン!
      state = 'splash';
      splashTimer = 0;
      splash.visible = true;
      splash.scale.setScalar(0.5);
      splash.material.opacity = 0.9;
      zabun();
      stopWater();
      sprayPts.visible = false;
      lastCamPos.copy(camera.position);
    } else {
      finishRide();
    }
    return;
  }

  // --- カメラ(臨場感の核) ---
  const p = cfg.curve.getPointAt(u);
  const ahead = cfg.curve.getPointAt(Math.min(u + cfg.lookAhead / cfg.info.len, 1));
  const v01 = THREE.MathUtils.clamp((speed - cfg.vMin) / (cfg.vMax - cfg.vMin), 0, 1);

  const shake = phase === 'run' ? v01 * 0.12 : 0;
  camera.position.set(
    p.x + (Math.random() - 0.5) * shake,
    p.y + cfg.camUp + (Math.random() - 0.5) * shake,
    p.z + (Math.random() - 0.5) * shake
  );
  // 下りでは注視点を少し持ち上げ、地平線と空が視界に残るようにする
  const horizonLift = Math.max(0, p.y - ahead.y) * 0.45;
  camera.lookAt(ahead.x, ahead.y + cfg.camUp + horizonLift, ahead.z);

  camera.fov = 66 + v01 * 28;
  camera.updateProjectionMatrix();

  // --- 音 ---
  if (rideKey === 'slide') {
    setWater(v01);
    setWind(v01 * 0.3);
  } else {
    setWind(phase === 'run' ? v01 : 0);
  }

  // --- 水しぶき(スライダーのみ) ---
  if (rideKey === 'slide') {
    sprayPts.visible = true;
    const tan = cfg.curve.getTangentAt(u);
    const side = new THREE.Vector3().crossVectors(tan, new THREE.Vector3(0, 1, 0)).normalize();
    const arr = sprayGeo.attributes.position.array;
    for (let i = 0; i < SPRAY_N; i++) {
      const s = sprayData[i];
      if (s.life <= 0) {
        // カメラより少し前方・下、チューブの底あたりに湧く(近すぎると巨大な粒になる)
        const d = 2.5 + Math.random() * 4;
        s.p.copy(p).addScaledVector(tan, d).addScaledVector(side, (Math.random() - 0.5) * 0.9);
        s.p.y += -0.35 + Math.random() * 0.25;
        s.v.copy(tan).multiplyScalar(speed * 0.2);
        s.v.y = 0.5 + Math.random() * 0.8;
        s.life = 0.25 + Math.random() * 0.3;
      }
      s.v.y -= 6 * dt;
      s.p.addScaledVector(s.v, dt);
      s.life -= dt;
      arr[i * 3] = s.p.x;
      arr[i * 3 + 1] = s.life > 0 ? s.p.y : -999;
      arr[i * 3 + 2] = s.p.z;
    }
    sprayGeo.attributes.position.needsUpdate = true;
  }
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  update(dt);

  // ⭐のくるくる・ぷかぷか、ゲット時のポップ演出
  for (const key of ['coaster', 'slide']) {
    for (const s of RIDES[key].stars) {
      if (!s.mesh.visible) continue;
      s.mesh.rotation.y = t * 2;
      if (s.taken) {
        s.popT += dt;
        s.mesh.position.y += dt * 6;
        s.mesh.scale.setScalar(Math.max(0.01, 1 - s.popT * 2.5));
        if (s.popT > 0.4) s.mesh.visible = false;
      } else {
        s.mesh.position.y = s.baseY + Math.sin(t * 3 + s.u * 50) * 0.15;
      }
    }
  }

  // 雲はゆっくり流れる
  for (const c of clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 180) c.position.x = -230;
  }

  // タイトル画面のあいだは上空をゆっくり旋回して全景を見せる
  if (state === 'title' || state === 'goal') {
    const a = t * 0.08;
    camera.position.set(Math.sin(a) * 70 - 5, 38, Math.cos(a) * 70 - 90);
    camera.lookAt(-5, 12, -95);
    camera.fov = 60;
    camera.updateProjectionMatrix();
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
