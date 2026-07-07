import * as THREE from 'three';
import { initAudio, setWind, clack, collectSfx, dropCry, fanfare } from './audio.js';

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

// ===== コース(3D曲線)=====
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const curve = new THREE.CatmullRomCurve3([
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
const trackLen = curve.getLength();

// 最高地点(リフトの頂上)を探す
let uTop = 0, yMax = 0;
for (let i = 0; i <= 1000; i++) {
  const p = curve.getPointAt(i / 1000);
  if (p.y > yMax) { yMax = p.y; uTop = i / 1000; }
}

// ===== コースの見た目 =====
// レール(赤いチューブ)
scene.add(new THREE.Mesh(
  new THREE.TubeGeometry(curve, 400, 0.18, 8),
  new THREE.MeshLambertMaterial({ color: 0xe74c3c })
));

// まくら木
{
  const n = Math.floor(trackLen / 2.2);
  const ties = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.15, 0.1, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x8d5524 }),
    n
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = curve.getPointAt(t);
    dummy.position.copy(p);
    dummy.position.y -= 0.22;
    dummy.lookAt(p.clone().add(curve.getTangentAt(t)));
    dummy.updateMatrix();
    ties.setMatrixAt(i, dummy.matrix);
  }
  scene.add(ties);
}

// 支柱
{
  const n = Math.floor(trackLen / 9);
  const geo = new THREE.CylinderGeometry(0.16, 0.16, 1, 6);
  geo.translate(0, 0.5, 0); // 原点を根元に
  const pillars = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0x9aa5ab }), n);
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

// ===== まわりの景色 =====
// 地面
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
    const x = (Math.random() - 0.5) * 400 - 25;
    const z = -Math.random() * 350 + 30;
    // コースの真下付近は避ける(ざっくり)
    let near = false;
    for (let i = 0; i <= 20; i++) {
      const p = curve.getPointAt(i / 20);
      if ((p.x - x) ** 2 + (p.z - z) ** 2 < 36) { near = true; break; }
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

// 雲
const clouds = [];
{
  // Lambertだと下面が半球ライトの地面色(緑)に染まるのでBasicで真っ白に
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(5, 10, 8), mat);
    c.scale.set(1.6, 0.5, 0.9);
    c.position.set((Math.random() - 0.5) * 350 - 25, 42 + Math.random() * 25, -Math.random() * 320 + 20);
    clouds.push(c);
    scene.add(c);
  }
}

// ===== ⭐(タップで集める)=====
const stars = [];
{
  const geo = new THREE.OctahedronGeometry(0.9);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffd93d });
  const count = 12;
  for (let i = 0; i < count; i++) {
    const u = uTop + 0.04 + (i / (count - 1)) * (0.92 - uTop - 0.04);
    const p = curve.getPointAt(u);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x, p.y + 1.8, p.z);
    scene.add(m);
    stars.push({ mesh: m, u, taken: false, popT: 0 });
  }
}

// ===== ゲーム状態 =====
const G = 9.8;
const LIFT_SPEED = 9.0; // 頂上まで約11秒。遅いと4歳児が飽きる
const V_MIN = 5, V_MAX = 26;

let state = 'title';        // title | ride | goal
let u = 0;                  // コース上の進行度 0〜1
let speed = LIFT_SPEED;
let phase = 'lift';         // lift | pause | run
let pauseTimer = 0;
let starCount = 0;
let lastClack = 0;

const $ = id => document.getElementById(id);
const hud = $('hud');

function updateHud() { hud.textContent = '⭐' + starCount; }

function startRide() {
  initAudio();
  u = 0;
  speed = LIFT_SPEED;
  phase = 'lift';
  starCount = 0;
  stars.forEach(s => {
    s.taken = false;
    s.popT = 0;
    s.mesh.visible = true;
    s.mesh.scale.setScalar(1);
    const p = curve.getPointAt(s.u);
    s.mesh.position.set(p.x, p.y + 1.8, p.z);
  });
  updateHud();
  $('title').classList.add('hidden');
  $('goal').classList.add('hidden');
  hud.classList.remove('hidden');
  state = 'ride';
}

function finishRide() {
  state = 'goal';
  setWind(0);
  fanfare();
  hud.classList.add('hidden');
  $('goalStars').textContent = starCount > 0 ? '⭐'.repeat(starCount) : '👍';
  $('goal').classList.remove('hidden');
}

$('startBtn').addEventListener('pointerdown', startRide);
$('againBtn').addEventListener('pointerdown', startRide);

// ライド中: 画面のどこをタップしても、近くの⭐をゲット(判定は激甘)
renderer.domElement.addEventListener('pointerdown', () => {
  if (state !== 'ride') return;
  let best = null;
  for (const s of stars) {
    if (s.taken) continue;
    const dist = (s.u - u) * trackLen;
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

function update(dt) {
  if (state !== 'ride') return;

  // --- 速度の計算(物理エンジンなしの自前モデル) ---
  const pos = curve.getPointAt(u);
  if (phase === 'lift') {
    speed = LIFT_SPEED;
    // カタカタ音
    lastClack += dt;
    if (lastClack > 0.24) { lastClack = 0; clack(); }
    if (u >= uTop) { phase = 'pause'; pauseTimer = 0.8; }
  } else if (phase === 'pause') {
    // 頂上でためる一瞬
    speed = 0.6;
    pauseTimer -= dt;
    if (pauseTimer <= 0) { phase = 'run'; dropCry(); }
  } else {
    // エネルギー保存っぽい式: 低いところほど速い
    speed = Math.sqrt(Math.max(V_MIN * V_MIN, 2 * G * (yMax + 1.5 - pos.y)));
    speed = Math.min(speed, V_MAX);
    // ゴール手前はゆっくりブレーキ
    if (u > 0.965) speed = Math.min(speed, 4 + (1 - u) / 0.035 * 12);
  }

  u += (speed * dt) / trackLen;
  if (u >= 0.999) { u = 0.999; finishRide(); return; }

  // --- カメラ(臨場感の核) ---
  const p = curve.getPointAt(u);
  // 注視点はやや遠め+高めにして、急降下でも空と地平線が視界に残るようにする(3D酔い対策)
  const ahead = curve.getPointAt(Math.min(u + 10 / trackLen, 1));
  const v01 = THREE.MathUtils.clamp((speed - V_MIN) / (V_MAX - V_MIN), 0, 1);

  // 高速時のカメラシェイク
  const shake = phase === 'run' ? v01 * 0.12 : 0;
  camera.position.set(
    p.x + (Math.random() - 0.5) * shake,
    p.y + 1.6 + (Math.random() - 0.5) * shake,
    p.z + (Math.random() - 0.5) * shake
  );
  // 下りでは注視点を少し持ち上げ、地平線と空が視界に残るようにする
  const horizonLift = Math.max(0, p.y - ahead.y) * 0.45;
  camera.lookAt(ahead.x, ahead.y + 1.6 + horizonLift, ahead.z);

  // 速いほど画角を広げる(疾走感)
  camera.fov = 66 + v01 * 28;
  camera.updateProjectionMatrix();

  // 風切り音
  setWind(phase === 'run' ? v01 : 0);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  update(dt);

  // ⭐のくるくる・ぷかぷか、ゲット時のポップ演出
  for (const s of stars) {
    if (!s.mesh.visible) continue;
    s.mesh.rotation.y = t * 2;
    if (s.taken) {
      s.popT += dt;
      s.mesh.position.y += dt * 6;
      s.mesh.scale.setScalar(Math.max(0.01, 1 - s.popT * 2.5));
      if (s.popT > 0.4) s.mesh.visible = false;
    } else {
      s.mesh.position.y += Math.sin(t * 3 + s.u * 50) * dt * 0.5;
    }
  }

  // 雲はゆっくり流れる
  for (const c of clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 180) c.position.x = -230;
  }

  // タイトル画面のあいだは上空をゆっくり旋回して全景を見せる
  if (state !== 'ride') {
    const a = t * 0.08;
    camera.position.set(Math.sin(a) * 65 - 25, 38, Math.cos(a) * 65 - 90);
    camera.lookAt(-15, 12, -95);
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
