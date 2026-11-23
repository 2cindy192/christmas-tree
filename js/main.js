(function () {
'use strict';

var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var TAU = Math.PI * 2;
var W, H, dpr, focal;
var CAM_D = 34;
var CAM_Y = -1;

var treePoints = [], orbitPoints = [], sparkles = [], petals = [], meteors = [];
var sprites = [];
var starSprites = [];
var starParticles = [], starRing = [];
var STAR_PALETTE = [
    [216, 191, 255], [232, 216, 255], [244, 236, 255], [200, 166, 255]
];
var PALETTE = [
    [206, 172, 255], [230, 214, 255], [244, 238, 255],
    [180, 130, 255], [212, 190, 246], [216, 160, 255]
];

// ---- 树上信封挂饰（点击打开圣诞信） ----
var ENV_T = 0.46;
var ENV_PH = Math.PI * 1.35;
var envPos = { x: 0, y: 0, s: 1, visible: false, ready: false, hovered: false, depth: 1 };
var mouse = { x: -9999, y: -9999 };

function rand(max, min) {
    if (min === undefined) min = 0;
    return min + Math.random() * (max - min);
}

function edgePos() {
    var e = Math.random();
    if (e < 0.25) return [rand(W * 1.2, -W * 0.1), rand(-H * 0.12, -H * 0.02)];
    if (e < 0.5) return [rand(W * 1.2, -W * 0.1), rand(H * 1.12, H * 1.02)];
    if (e < 0.75) return [rand(-W * 0.12, -W * 0.02), rand(H * 1.2, -H * 0.2)];
    return [rand(W * 1.02, W * 1.12), rand(H * 1.2, -H * 0.2)];
}

function makeSprite(rgb) {
    var s = 64, cv = document.createElement('canvas');
    cv.width = cv.height = s;
    var g = cv.getContext('2d');
    var grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.13, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.95)');
    grad.addColorStop(0.38, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0.3)');
    grad.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
    return cv;
}

function buildStar() {
    starParticles = [];
    // 五角星轮廓（外径 1，内径 0.42）
    var verts = [];
    for (var k = 0; k < 10; k++) {
        var a0 = (k % 2 === 0 ? -90 + (k / 2) * 72 : -54 + ((k - 1) / 2) * 72) * Math.PI / 180;
        var r0 = k % 2 === 0 ? 1 : 0.42;
        verts.push([Math.cos(a0) * r0, Math.sin(a0) * r0]);
    }
    function inside(x, y) {
        var ok = false;
        for (var i = 0, j = 9; i < 10; j = i++) {
            var xi = verts[i][0], yi = verts[i][1], xj = verts[j][0], yj = verts[j][1];
            if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
        }
        return ok;
    }
    var count = 560, tries = 0;
    while (starParticles.length < count && tries < count * 10) {
        tries++;
        var x = rand(1, -1), y = rand(1, -1);
        if (!inside(x, y)) continue;
        var d = Math.sqrt(x * x + y * y);
        starParticles.push({
            x: x, y: y,
            c: Math.floor(Math.random() * starSprites.length),
            phase: rand(TAU),
            ts: rand(2.5, 0.8),
            size: rand(0.16, 0.055) * (1 - d * 0.35)
        });
    }
    starRing = [];
    for (var r = 0; r < 26; r++) {
        starRing.push({
            a: rand(TAU),
            r: rand(1.32, 1.02),
            spd: rand(0.9, 0.35) * (Math.random() < 0.5 ? -1 : 1),
            phase: rand(TAU),
            c: Math.floor(Math.random() * starSprites.length),
            size: rand(0.14, 0.06)
        });
    }
}

function buildEnvelope() {
    var r = 6.9 * Math.pow(1 - ENV_T, 0.85) + 0.45;
    envPos.lx = Math.cos(ENV_PH) * r;
    envPos.lz = Math.sin(ENV_PH) * r;
    envPos.ly = -9 + ENV_T * 15.2;
}

function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
}

function heartPath(c, x, y, s) {
    c.beginPath();
    c.moveTo(x, y + s * 0.3);
    c.bezierCurveTo(x - s * 1.15, y - s * 0.4, x - s * 0.55, y - s * 1.0, x, y - s * 0.32);
    c.bezierCurveTo(x + s * 0.55, y - s * 1.0, x + s * 1.15, y - s * 0.4, x, y + s * 0.3);
    c.closePath();
}

function buildScene() {
    treePoints = [];
    var total = 7200;
    var strings = 3, turns = 27;
    for (var i = 0; i < total; i++) {
        var st = i % strings;
        var t = Math.floor(i / strings) / (total / strings);
        var radius = 6.9 * Math.pow(1 - t, 0.85) + 0.45;
        var ang = t * turns * TAU + st * TAU / strings;
        var j = 0.14;
        var ep = edgePos();
        var ornament = Math.random() < 0.035;
        treePoints.push({
            x: Math.cos(ang) * radius + rand(j, -j),
            y: -9 + t * 15.2 + rand(j, -j),
            z: Math.sin(ang) * radius + rand(j, -j),
            t: t,
            c: Math.floor(Math.random() * PALETTE.length),
            base: ornament ? rand(0.9, 1.25) : rand(0.15, 0.3),
            phase: rand(TAU),
            fade: t > 0.9 ? 1 - (t - 0.9) / 0.1 * 0.6 : 1,
            sx: ep[0],
            sy: ep[1]
        });
    }

    orbitPoints = [];
    for (var o = 0; o < 520; o++) {
        orbitPoints.push({
            a0: rand(TAU),
            r: rand(7.6, 2.2),
            y: rand(5.5, -8.5),
            spd: rand(0.9, 0.25) * (Math.random() < 0.5 ? -1 : 1),
            ws: rand(1.2, 0.3),
            ph: rand(TAU),
            c: Math.floor(Math.random() * PALETTE.length),
            size: rand(0.34, 0.14)
        });
    }

    sparkles = [];
    for (var s = 0; s < 150; s++) {
        sparkles.push({
            x: rand(W, -W * 0.1), y: rand(H, -H * 0.2),
            r: rand(30, 6), speed: rand(0.6, 0.12),
            drift: rand(TAU), alpha: rand(0.3, 0.06)
        });
    }

    petals = [];
    for (var p = 0; p < 90; p++) {
        petals.push({
            x: rand(W), y: rand(H),
            r: rand(4.5, 1.8), sp: rand(1.5, 0.4),
            sw: rand(TAU), rot: rand(TAU), rs: rand(0.05, -0.05)
        });
    }

    meteors = [];
    for (var m = 0; m < 4; m++) {
        meteors.push({
            t0: rand(9), dur: 1.1,
            x0: rand(W * 0.85, W * 0.2), y0: rand(H * 0.25, -H * 0.1),
            dx: rand(-0.42, -0.24) * W, dy: rand(0.45, 0.28) * H
        });
    }

    buildStar();
    buildEnvelope();
}

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    focal = Math.max(760, H * 1.3);
    buildScene();
}

function project(x, y, z, angle) {
    var ca = Math.cos(angle), sa = Math.sin(angle);
    var xr = x * ca - z * sa;
    var zr = x * sa + z * ca;
    var scale = focal / (CAM_D - zr);
    return {
        x: W / 2 + xr * scale,
        y: H / 2 - (y - CAM_Y) * scale,
        scale: scale,
        z: zr
    };
}

function drawBackground(time, dt) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.75);
    g.addColorStop(0, '#2a0d24');
    g.addColorStop(0.5, '#150616');
    g.addColorStop(1, '#080209');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < sparkles.length; i++) {
        var f = sparkles[i];
        f.y -= f.speed * dt * 60;
        f.x += Math.sin(f.drift + f.y * 0.008) * 0.4;
        if (f.y < -f.r) { f.y = H + f.r; f.x = rand(W, -W * 0.1); }
        var size = f.r * 2;
        var flick = 0.7 + 0.3 * Math.sin(time * 1.2 + f.drift);
        var flare = Math.pow(Math.max(0, Math.sin(time * 0.7 + f.drift * 3)), 12);
        ctx.globalAlpha = Math.min(1, f.alpha * (flick + flare));
        ctx.drawImage(sprites[0], f.x - size / 2, f.y - size / 2, size, size);
    }
}

function drawMeteors(time) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < meteors.length; i++) {
        var m = meteors[i];
        var ph = (time + m.t0) % 9;
        if (ph > m.dur) continue;
        var k = ph / m.dur;
        var x = m.x0 + m.dx * k;
        var y = m.y0 + m.dy * k;
        var tailX = x - m.dx * 0.12;
        var tailY = y - m.dy * 0.12;
        var a = Math.sin(k * Math.PI);
        var lg = ctx.createLinearGradient(tailX, tailY, x, y);
        lg.addColorStop(0, 'rgba(190,150,255,0)');
        lg.addColorStop(1, 'rgba(232,220,255,' + (0.9 * a) + ')');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = lg;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(x, y);
        ctx.stroke();
        var sz = 16 * a;
        ctx.globalAlpha = a;
        ctx.drawImage(sprites[0], x - sz / 2, y - sz / 2, sz, sz);
    }
}

function drawGroundGlow(time) {
    var p = project(0, -10.2, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(W / 2, p.y);
    ctx.scale(1, 0.17);
    var pulse = 1 + 0.14 * Math.sin(time * 1.6);
    var R = focal * 0.44 * pulse;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, 'rgba(200,150,255,0.36)');
    g.addColorStop(0.45, 'rgba(160,100,240,0.13)');
    g.addColorStop(1, 'rgba(150,90,230,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.restore();
}

function drawTree(time, angle, intro) {
    ctx.globalCompositeOperation = 'lighter';
    var pts = treePoints;
    var breathe = 1 + 0.07 * Math.sin(time * 0.9);
    var heartbeat = 0.9 + 0.1 * Math.pow(Math.max(0, Math.sin(time * 1.8)), 6);
    for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        var p = project(pt.x * breathe, pt.y, pt.z * breathe, angle);
        var px = W / 2 + (p.x - W / 2) * intro;
        var py = H / 2 + (p.y - H / 2) * intro;
        var cx = pt.sx + (px - pt.sx) * intro;
        var cy = pt.sy + (py - pt.sy) * intro;
        var drift = (1 - intro) * 6;
        cx += Math.sin(time * 2.5 + pt.phase) * drift;
        cy += Math.cos(time * 2.1 + pt.phase) * drift;

        var depth = (p.z + 8) / 15;
        if (depth < 0) depth = 0;
        if (depth > 1) depth = 1;
        var twinkle = 0.5 + 0.5 * Math.sin(time * 4 + pt.phase);
        var wave = 0.5 + 0.5 * Math.sin(time * 3.5 - pt.t * 26);
        var spark = Math.pow(Math.max(0, Math.sin(time * 2.2 + pt.phase * 2)), 16);
        var glow = (0.4 + 0.35 * twinkle + 0.45 * wave * wave + 0.6 * spark) * heartbeat;
        var size = pt.base * p.scale * (0.8 + 0.4 * twinkle + 0.3 * wave + 0.5 * spark);
        if (size < 1) size = 1;
        ctx.globalAlpha = Math.min(1, glow * (0.4 + 0.6 * depth) * pt.fade * (0.4 + 0.6 * intro));
        ctx.drawImage(sprites[pt.c], cx - size / 2, cy - size / 2, size, size);
    }
}

function drawOrbits(time, angle) {
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < orbitPoints.length; i++) {
        var o = orbitPoints[i];
        var a = o.a0 + time * o.spd;
        var yy = o.y + Math.sin(time * o.ws + o.ph) * 0.6;
        var p = project(Math.cos(a) * o.r, yy, Math.sin(a) * o.r, angle);
        var tw = 0.5 + 0.5 * Math.sin(time * 3 + o.ph);
        var size = o.size * p.scale * (0.8 + 0.5 * tw);
        ctx.globalAlpha = (0.35 + 0.5 * tw) * 0.85;
        ctx.drawImage(sprites[o.c], p.x - size / 2, p.y - size / 2, size, size);
    }
}

function drawPetals(dt) {
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < petals.length; i++) {
        var p = petals[i];
        p.y += p.sp * dt * 60;
        p.x += Math.sin(p.sw + p.y * 0.01) * 0.5;
        p.rot += p.rs;
        if (p.y > H + 10) { p.y = -10; p.x = rand(W); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#d8c3ff';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }
}

function drawStar(time, angle) {
    var p = project(0, 7.7, 0, angle);
    var pulse = 1 + 0.14 * Math.sin(time * 3.2);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);

    // 柔和的紫色光晕打底
    var R = focal * 0.2;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, 'rgba(240,228,255,0.55)');
    g.addColorStop(0.35, 'rgba(214,188,255,0.2)');
    g.addColorStop(1, 'rgba(196,160,255,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();

    ctx.rotate(-time * 0.3);
    var sr = focal * 0.05;

    // 星星本体：五角星轮廓内的粒子群
    for (var i = 0; i < starParticles.length; i++) {
        var pt = starParticles[i];
        var breathe = 1 + 0.05 * Math.sin(time * 2.2 + pt.phase);
        var px = pt.x * sr * breathe;
        var py = pt.y * sr * breathe;
        var tw = 0.5 + 0.5 * Math.sin(time * pt.ts + pt.phase);
        var spark = Math.pow(Math.max(0, Math.sin(time * 2 + pt.phase * 2)), 18);
        var size = pt.size * sr * (0.7 + 0.7 * tw + 0.8 * spark);
        ctx.globalAlpha = Math.min(1, 0.4 + 0.45 * tw + 0.5 * spark);
        ctx.drawImage(starSprites[pt.c], px - size / 2, py - size / 2, size, size);
    }

    // 环绕星光的粒子环
    for (var j = 0; j < starRing.length; j++) {
        var o = starRing[j];
        var a = o.a + time * o.spd;
        var rr = o.r * sr * (1 + 0.08 * Math.sin(time * 1.6 + o.phase));
        var ox = Math.cos(a) * rr;
        var oy = Math.sin(a) * rr;
        var tw2 = 0.5 + 0.5 * Math.sin(time * 2.5 + o.phase);
        var sz = o.size * sr * (0.6 + 0.8 * tw2);
        ctx.globalAlpha = 0.35 + 0.5 * tw2;
        ctx.drawImage(starSprites[o.c], ox - sz / 2, oy - sz / 2, sz, sz);
    }

    // 中心亮点
    var cs = sr * 0.55 * (1 + 0.2 * Math.sin(time * 3.2));
    ctx.globalAlpha = 0.95;
    ctx.drawImage(starSprites[starSprites.length - 1], -cs / 2, -cs / 2, cs, cs);

    ctx.restore();
}

function drawGreeting(time) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var size = Math.max(38, Math.min(92, W * 0.08));
    ctx.font = 'italic bold ' + size + 'px "Brush Script MT","Segoe Script","Snell Roundhand",cursive';
    var y = H * 0.9;
    var shift = 0.5 + 0.5 * Math.sin(time * 0.9);
    var g = ctx.createLinearGradient(0, y - size / 2, 0, y + size / 2);
    g.addColorStop(0, '#f4eeff');
    g.addColorStop(0.35 + shift * 0.2, '#c9a6ff');
    g.addColorStop(0.7, '#9d6bff');
    g.addColorStop(1, '#6d3fd1');
    ctx.fillStyle = g;
    ctx.shadowColor = 'rgba(170,120,255,0.8)';
    ctx.shadowBlur = 28 + 12 * Math.sin(time * 2);
    ctx.fillText('Merry Christmas', W / 2, y);
    ctx.shadowBlur = 0;
}

function drawEnvelope(time, angle, intro) {
    envPos.visible = false;
    envPos.ready = intro >= 1;
    if (intro <= 0.02) return;
    var breathe = 1 + 0.07 * Math.sin(time * 0.9);
    var p = project(envPos.lx * breathe, envPos.ly, envPos.lz * breathe, angle);
    var depth = (p.z + 8) / 15;
    if (depth < 0) depth = 0;
    if (depth > 1) depth = 1;
    var alpha = Math.min(1, intro * (0.45 + 0.55 * depth));
    if (alpha <= 0.03) return;

    envPos.visible = true;
    envPos.x = p.x;
    envPos.y = p.y;
    envPos.s = p.scale;
    envPos.depth = depth;

    var u = p.scale * 0.5;
    var pulse = 1 + 0.08 * Math.sin(time * 2.4);
    var k = (envPos.hovered ? 1.2 : 1) * pulse;

    // 光晕
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 * alpha;
    var gw = u * 5.2 * k;
    ctx.drawImage(starSprites[0], p.x - gw / 2, p.y - gw / 2, gw, gw);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(k, k);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;

    // 挂绳
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.95);
    ctx.lineTo(0, -u * 0.95 - u * 0.55);
    ctx.strokeStyle = 'rgba(216,194,255,0.55)';
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.stroke();

    // 信封主体
    var w = u * 2.7, h = u * 1.9;
    roundRectPath(ctx, -w / 2, -h / 2, w, h, u * 0.22);
    ctx.fillStyle = 'rgba(48,28,78,0.95)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, u * 0.09);
    ctx.strokeStyle = 'rgba(216,194,255,0.9)';
    ctx.stroke();

    // 封舌
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2);
    ctx.lineTo(0, h * 0.05);
    ctx.lineTo(w / 2, -h / 2);
    ctx.fillStyle = 'rgba(96,58,150,0.95)';
    ctx.fill();

    // 封口爱心
    heartPath(ctx, 0, h * 0.05, u * 0.34);
    ctx.fillStyle = '#e8d5ff';
    ctx.fill();

    ctx.restore();

    // 悬停提示
    if (envPos.hovered && intro >= 1) {
        var label = '💌 打开圣诞信';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.font = '600 14px "Microsoft YaHei","PingFang SC",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var tw2 = ctx.measureText(label).width;
        var bx = p.x, by = p.y + u * 2.6;
        roundRectPath(ctx, bx - tw2 / 2 - 12, by - 14, tw2 + 24, 28, 14);
        ctx.fillStyle = 'rgba(22,11,36,0.85)';
        ctx.fill();
        ctx.fillStyle = '#e8dcff';
        ctx.fillText(label, bx, by + 1);
    }
}

var last = 0;
var startTime = 0;

function render() {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!startTime) startTime = now;
    var time = (now - startTime) / 1000;
    var dt = last ? Math.min(0.05, time - last) : 0.016;
    last = time;

    var intro = Math.min(1, time / 2.4);
    intro = 1 - Math.pow(1 - intro, 3);
    var angle = time * 0.35 + Math.sin(time * 0.4) * 0.1;

    drawBackground(time, dt);
    drawMeteors(time);
    drawGroundGlow(time);
    drawTree(time, angle, intro);
    drawOrbits(time, angle);
    drawPetals(dt);
    drawStar(time, angle);
    drawEnvelope(time, angle, intro);
    drawGreeting(time);
    updateEnvelopeHit();
}

function rafLoop() {
    render();
    requestAnimationFrame(rafLoop);
}

// ---- 圣诞信弹窗 ----
var overlay = document.getElementById('letter-overlay');
var closeBtn = document.getElementById('letter-close');

function openLetter() {
    if (!envPos.ready) return;
    overlay.hidden = false;
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            overlay.classList.add('open');
        });
    });
}

function closeLetter() {
    overlay.classList.remove('open');
    setTimeout(function () {
        if (!overlay.classList.contains('open')) overlay.hidden = true;
    }, 360);
}

if (overlay && closeBtn) {
    closeBtn.addEventListener('click', closeLetter);
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLetter();
    });
    window.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !overlay.hidden) closeLetter();
    });
}

canvas.addEventListener('mousemove', function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
});
canvas.addEventListener('mouseleave', function () {
    mouse.x = -9999;
    mouse.y = -9999;
});
canvas.addEventListener('click', function (e) {
    if (!envPos.visible || !envPos.ready) return;
    var r = canvas.getBoundingClientRect();
    var dx = e.clientX - r.left - envPos.x;
    var dy = e.clientY - r.top - envPos.y;
    var hit = Math.max(30, envPos.s * 0.8);
    if (dx * dx + dy * dy < hit * hit) openLetter();
});

function updateEnvelopeHit() {
    if (!envPos.visible) return;
    var dx = mouse.x - envPos.x;
    var dy = mouse.y - envPos.y;
    var hit = envPos.ready && dx * dx + dy * dy < Math.pow(Math.max(26, envPos.s * 0.7), 2);
    if (hit !== envPos.hovered) {
        envPos.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : 'default';
    }
}

for (var i = 0; i < PALETTE.length; i++) sprites.push(makeSprite(PALETTE[i]));
for (var j = 0; j < STAR_PALETTE.length; j++) starSprites.push(makeSprite(STAR_PALETTE[j]));
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(rafLoop);
})();
