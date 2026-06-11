import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* Palette */
const COLOR = {
    skin: 0x6e4a2e,
    skinShadow: 0x593a23,
    hair: 0x0e0d0e,
    shirt: 0x6e1423,
    shirtDark: 0x4d0f1a,
    button: 0x230309,
    pants: 0x111115,
    shoe: 0x0a0a0c,
    eye: 0x070707,
    laptop: 0xb8bcc6,
    laptopDark: 0x3a3a42,
    laptopKeys: 0xe2e4ea,
    screen: 0x6e1423
};

/* Funko-style head proportions, reused by the hair builder */
const HEAD = { w: 1.28, h: 1.36, d: 1.08, cy: 2.16 };

function makeMat(color, roughness = 0.7, metalness = 0.05) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

/* Burgundy fabric with fine, evenly spaced light pin-dots */
function makeDotTexture() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#6e1423';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(228, 222, 226, 0.8)';
    const gap = 24;
    const radius = 2;
    for (let y = gap / 2; y < size; y += gap) {
        const rowOffset = (Math.round(y / gap) % 2) ? gap / 2 : 0;
        for (let x = gap / 2; x < size; x += gap) {
            ctx.beginPath();
            ctx.arc(x + rowOffset, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.6, 1.6);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/* A capsule limb spanning two points in space */
function limb(p1, p2, radius, material) {
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const geo = new THREE.CapsuleGeometry(radius, Math.max(len - radius * 2, 0.001), 6, 14);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(p1).add(p2).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize()
    );
    mesh.quaternion.copy(q);
    return mesh;
}

function v(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

/* Oversized boxy Funko head with big glossy eyes and a painted goatee */
function buildHead() {
    const group = new THREE.Group();
    const skinMat = makeMat(COLOR.skin, 0.6);

    const head = new THREE.Mesh(
        new RoundedBoxGeometry(HEAD.w, HEAD.h, HEAD.d, 6, 0.3),
        skinMat
    );
    head.position.y = HEAD.cy;
    group.add(head);

    const frontZ = HEAD.d / 2 - 0.04;

    // Big, glossy, solid-black Funko eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: COLOR.eye, roughness: 0.12, metalness: 0.25 });
    [-1, 1].forEach((s) => {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 28, 28), eyeMat);
        eye.scale.set(0.82, 1.25, 0.42);
        eye.position.set(s * 0.31, HEAD.cy - 0.08, frontZ);
        group.add(eye);

        // Toy catchlight
        const spark = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), makeMat(0xffffff, 0.2));
        spark.position.set(s * 0.31 - 0.05, HEAD.cy + 0.04, frontZ + 0.05);
        group.add(spark);
    });

    // Eyebrows (subtle, painted)
    [-1, 1].forEach((s) => {
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.04), makeMat(COLOR.hair, 0.6));
        brow.position.set(s * 0.31, HEAD.cy + 0.18, frontZ + 0.02);
        brow.rotation.z = s * 0.06;
        group.add(brow);
    });

    return group;
}

/* Painted goatee + mustache, Funko-flat on the lower face */
function buildBeard() {
    const group = new THREE.Group();
    const beardMat = makeMat(COLOR.hair, 0.55);
    const frontZ = HEAD.d / 2 - 0.02;

    // Chin goatee patch
    const goatee = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 22), beardMat);
    goatee.scale.set(1, 0.8, 0.32);
    goatee.position.set(0, HEAD.cy - 0.5, frontZ - 0.04);
    group.add(goatee);

    // Mustache
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.06), beardMat);
    mustache.position.set(0, HEAD.cy - 0.34, frontZ);
    group.add(mustache);

    // Jawline connectors
    [-1, 1].forEach((s) => {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.08), beardMat);
        side.position.set(s * 0.5, HEAD.cy - 0.38, frontZ - 0.18);
        group.add(side);
    });

    return group;
}

/* Jaw-length black twists, center-parted, framing the big head */
function buildHair() {
    const group = new THREE.Group();
    const hairMat = makeMat(COLOR.hair, 0.5, 0.08);

    // Boxy scalp cap over crown and back, tilted back so the face stays open
    const cap = new THREE.Mesh(
        new RoundedBoxGeometry(HEAD.w + 0.06, 0.82, HEAD.d + 0.06, 5, 0.3),
        hairMat
    );
    cap.position.set(0, HEAD.cy + 0.5, -0.05);
    cap.rotation.x = -0.16;
    group.add(cap);

    // Twists hanging down the sides and back, to about the bottom of the head
    const rx = HEAD.w / 2 * 1.04;
    const rz = HEAD.d / 2 * 1.04;
    const topY = HEAD.cy + 0.52;
    const bottomY = HEAD.cy - 0.62;
    const count = 30;

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const deg = (angle * 180) / Math.PI;

        // Center part across the front (face is around 90deg) keeps the face clear
        if (deg > 52 && deg < 128) continue;

        const topX = Math.cos(angle) * rx;
        const topZ = Math.sin(angle) * rz;
        const top = v(topX, topY, topZ);
        const bottom = v(topX * 1.1, bottomY, topZ * 1.1);

        group.add(limb(top, bottom, 0.05, hairMat));

        // Braid tip bead
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), hairMat);
        tip.position.copy(bottom);
        group.add(tip);
    }

    return group;
}

/* Small Funko body: short-sleeved burgundy micro-dot button-down */
function buildTorso(dotTexture) {
    const group = new THREE.Group();
    const depthScale = 0.82;

    const shirtMat = new THREE.MeshStandardMaterial({
        map: dotTexture,
        color: 0xffffff,
        roughness: 0.72,
        metalness: 0.04
    });

    const torsoGeo = new THREE.CylinderGeometry(0.44, 0.42, 0.8, 28, 1, true);
    torsoGeo.scale(1, 1, depthScale);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 1.12;
    group.add(torso);

    // Shoulder cap
    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), shirtMat);
    shoulderCap.scale.set(1, 0.5, depthScale);
    shoulderCap.position.y = 1.5;
    group.add(shoulderCap);

    // Curved hem
    const hem = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), shirtMat);
    hem.scale.set(1, 0.6, depthScale);
    hem.position.y = 0.74;
    group.add(hem);

    // Short neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.18, 20), makeMat(COLOR.skin, 0.6));
    neck.position.y = 1.52;
    group.add(neck);

    // Collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.05, 12, 28), makeMat(COLOR.shirtDark, 0.7));
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1, depthScale, 1);
    collar.position.y = 1.5;
    group.add(collar);

    [-1, 1].forEach((s) => {
        const point = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), makeMat(COLOR.shirtDark, 0.7));
        point.position.set(s * 0.12, 1.42, 0.32);
        point.rotation.set(Math.PI / 2.2, 0, s * 0.3);
        group.add(point);
    });

    // Button placket + buttons
    const placket = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.74, 0.04), makeMat(COLOR.shirtDark, 0.7));
    placket.position.set(0, 1.1, 0.36);
    group.add(placket);

    for (let i = 0; i < 4; i++) {
        const button = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), makeMat(COLOR.button, 0.4));
        button.position.set(0, 1.36 - i * 0.18, 0.38);
        group.add(button);
    }

    // Subtle chest pocket
    const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.015), shirtMat);
    pocket.position.set(-0.18, 1.26, 0.36);
    group.add(pocket);

    return group;
}

/* Short, stubby Funko arms holding a laptop in front */
function buildArms() {
    const group = new THREE.Group();
    const skinMat = makeMat(COLOR.skin, 0.62);
    const sleeveMat = makeMat(COLOR.shirt, 0.72);

    const poses = [
        {
            shoulder: v(-0.42, 1.46, 0.04),
            elbow: v(-0.46, 1.16, 0.34),
            hand: v(-0.34, 0.96, 0.66)
        },
        {
            shoulder: v(0.42, 1.46, 0.04),
            elbow: v(0.46, 1.16, 0.34),
            hand: v(0.34, 0.96, 0.66)
        }
    ];

    poses.forEach(({ shoulder, elbow, hand }) => {
        const upperEnd = shoulder.clone().lerp(elbow, 0.55);
        group.add(limb(shoulder, upperEnd, 0.15, sleeveMat));
        group.add(limb(shoulder, elbow, 0.1, skinMat));
        group.add(limb(elbow, hand, 0.095, skinMat));

        const mitten = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), skinMat);
        mitten.scale.set(1.05, 0.95, 0.85);
        mitten.position.copy(hand);
        group.add(mitten);
    });

    return group;
}

/* Bright code-editor texture for the laptop screen */
function makeScreenTexture() {
    const w = 320;
    const h = 200;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#120810';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#6e1423';
    ctx.fillRect(0, 0, w, 24);
    ctx.fillStyle = '#c4758a';
    ctx.fillRect(10, 8, 56, 8);

    const lines = [
        { color: '#e8b4c4', width: 180, y: 40 },
        { color: '#c4758a', width: 130, y: 62 },
        { color: '#e8b4c4', width: 200, y: 84 },
        { color: '#8b6f7d', width: 110, y: 106 },
        { color: '#e8b4c4', width: 160, y: 128 },
        { color: '#c4758a', width: 90, y: 150 },
        { color: '#e8b4c4', width: 140, y: 172 }
    ];
    lines.forEach(({ color, width, y }) => {
        ctx.fillStyle = color;
        ctx.fillRect(14, y, width, 9);
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/* Chunky Funko-style open laptop — deck and screen share one hinge so they stay joined.
   Held out away from the body at roughly arm's length. */
function buildComputer() {
    const group = new THREE.Group();

    const bodyMat = makeMat(COLOR.laptop, 0.38, 0.35);
    const darkMat = makeMat(COLOR.laptopDark, 0.55);
    const keyMat = makeMat(COLOR.laptopKeys, 0.45);
    const screenTex = makeScreenTexture();
    const screenMat = new THREE.MeshStandardMaterial({
        map: screenTex,
        emissive: 0x6e1423,
        emissiveMap: screenTex,
        emissiveIntensity: 0.65,
        roughness: 0.2,
        metalness: 0.05
    });

    const W = 0.64;
    const deckDepth = 0.44;
    const lidHeight = 0.46;

    // Hinge axis: the shared joint where deck and screen meet.
    // Pushed forward (z) and away from the chin so it reads as held out.
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.94, 0.62);
    group.add(hinge);

    // --- Keyboard deck: extends forward from the hinge, gently tilted up ---
    const deck = new THREE.Group();
    deck.rotation.x = -0.12;
    hinge.add(deck);

    const base = new THREE.Mesh(
        new RoundedBoxGeometry(W, 0.085, deckDepth, 3, 0.04),
        bodyMat
    );
    base.position.set(0, 0, deckDepth / 2);
    deck.add(base);

    const keyboard = new THREE.Mesh(
        new RoundedBoxGeometry(W - 0.1, 0.014, deckDepth - 0.12, 2, 0.01),
        darkMat
    );
    keyboard.position.set(0, 0.046, deckDepth / 2 - 0.02);
    deck.add(keyboard);

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 9; col++) {
            const key = new THREE.Mesh(
                new THREE.BoxGeometry(0.046, 0.012, 0.028),
                keyMat
            );
            key.position.set(-0.19 + col * 0.047, 0.055, 0.16 + row * 0.034);
            deck.add(key);
        }
    }

    const trackpad = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.01, 0.1),
        keyMat
    );
    trackpad.position.set(0, 0.054, deckDepth - 0.06);
    deck.add(trackpad);

    // --- Screen: rises from the same hinge, leaned back a touch ---
    const screen = new THREE.Group();
    screen.rotation.x = -0.32;
    hinge.add(screen);

    const lid = new THREE.Mesh(
        new RoundedBoxGeometry(W, lidHeight, 0.035, 3, 0.025),
        bodyMat
    );
    lid.position.set(0, lidHeight / 2, 0);
    screen.add(lid);

    const display = new THREE.Mesh(
        new THREE.PlaneGeometry(W - 0.08, lidHeight - 0.08),
        screenMat
    );
    display.position.set(0, lidHeight / 2, 0.022);
    screen.add(display);

    const bezelTop = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.02, 0.01), bodyMat);
    bezelTop.position.set(0, lidHeight - 0.02, 0.02);
    screen.add(bezelTop);
    const bezelBottom = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.02, 0.01), bodyMat);
    bezelBottom.position.set(0, 0.02, 0.02);
    screen.add(bezelBottom);
    [-1, 1].forEach((s) => {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, lidHeight - 0.04, 0.01), bodyMat);
        side.position.set(s * (W / 2 - 0.03), lidHeight / 2, 0.02);
        screen.add(side);
    });

    // Hinge barrel sitting right on the shared axis
    const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, W + 0.02, 12),
        bodyMat
    );
    barrel.rotation.z = Math.PI / 2;
    hinge.add(barrel);

    return group;
}

/* Stubby black slacks and loafers */
function buildLowerBody() {
    const group = new THREE.Group();
    const pantsMat = makeMat(COLOR.pants, 0.7);
    const shoeMat = makeMat(COLOR.shoe, 0.35, 0.12);

    // Hips
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 18), pantsMat);
    pelvis.scale.set(1, 0.62, 0.78);
    pelvis.position.y = 0.74;
    group.add(pelvis);

    const legs = [
        { hip: v(-0.18, 0.76, 0), ankle: v(-0.18, 0.16, 0), toe: v(-0.18, 0.09, 0.16), rot: 0 },
        { hip: v(0.18, 0.76, 0), ankle: v(0.2, 0.16, 0.02), toe: v(0.24, 0.09, 0.13), rot: -0.4 }
    ];

    legs.forEach((leg) => {
        group.add(limb(leg.hip, leg.ankle, 0.16, pantsMat));

        // Loafer
        const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), shoeMat);
        shoe.scale.set(1.05, 0.6, 1.95);
        shoe.position.copy(leg.toe);
        shoe.rotation.y = leg.rot;
        group.add(shoe);

        // Thin sole
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.46), makeMat(0x050506, 0.5));
        sole.position.set(leg.toe.x, 0.02, leg.toe.z + 0.02);
        sole.rotation.y = leg.rot;
        group.add(sole);
    });

    return group;
}

function buildCharacter() {
    const character = new THREE.Group();
    const dotTexture = makeDotTexture();

    character.add(buildLowerBody());
    character.add(buildTorso(dotTexture));
    character.add(buildComputer());
    character.add(buildArms());
    character.add(buildHead());
    character.add(buildBeard());
    character.add(buildHair());

    return character;
}

function initHero3D(container) {
    const canvas = container.querySelector('canvas');
    const hint = container.querySelector('.hero-3d-hint');
    const loading = container.querySelector('.hero-3d-loading');

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (err) {
        if (loading) loading.textContent = '3D preview not supported on this device';
        return () => {};
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.78, 5.5);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.4;
    controls.maxDistance = 8.5;
    controls.minPolarAngle = Math.PI / 3.4;
    controls.maxPolarAngle = Math.PI / 1.7;
    controls.target.set(0, 1.35, 0.35);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.1;
    controls.update();

    // Lighting
    scene.add(new THREE.AmbientLight(0xfff5f0, 0.85));
    scene.add(new THREE.HemisphereLight(0xfff0ea, 0x241015, 0.55));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(2.5, 4.5, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xc4758a, 0.5);
    fillLight.position.set(-3, 2, 2.5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x8b6f7d, 0.45);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Soft floor shadow disc
    const floor = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 48),
        new THREE.MeshStandardMaterial({ color: 0x8b6f7d, transparent: true, opacity: 0.14, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    scene.add(floor);

    let model = null;
    let modelBaseY = 0;
    let animationId = null;
    let idleTime = 0;

    function resize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
    }

    function animate() {
        animationId = requestAnimationFrame(animate);
        idleTime += 0.01;
        if (model) {
            model.position.y = modelBaseY + Math.sin(idleTime) * 0.02;
        }
        controls.update();
        renderer.render(scene, camera);
    }

    // Stop the inviting auto-rotate once the user takes control
    controls.addEventListener('start', () => {
        controls.autoRotate = false;
        if (hint) hint.classList.add('hidden');
    });

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();
    animate();

    try {
        model = buildCharacter();
        modelBaseY = model.position.y;
        scene.add(model);
        if (loading) loading.classList.add('hidden');
        if (hint) hint.classList.remove('hidden');
    } catch (err) {
        if (loading) loading.textContent = 'Unable to build 3D preview';
    }

    return () => {
        cancelAnimationFrame(animationId);
        resizeObserver.disconnect();
        controls.dispose();
        renderer.dispose();
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hero-3d-viewer');
    if (container) {
        initHero3D(container);
    }
});
