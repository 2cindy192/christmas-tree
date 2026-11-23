(function () {
'use strict';

var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
var TAU = Math.PI * 2;
var W, H, dpr, focal;
var CAM_D = 34;
var CAM_Y = -1;

var treePoints = [], orbitPoints = [], snowflakes = [], petals = [], meteors = [];
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

// ---- 樱花花瓣配色 ----
var SAKURA_COLORS = ['#ffd9e8', '#ffc4da', '#ff9ecb', '#ffe8f1', '#ffb3d1'];

// ---- 信藏在星星里（点击树顶星星打开） ----
var starPos = { x: 0, y: 0, s: 1, visible: false, ready: false, hovered: false };
var mouse = { x: -9999, y: -9999 };

// ---- 开场：两条反向的星星轨迹 ----
// 轨迹一（克莱因蓝）：盘旋上升，逐一点亮轨道上的年份文字
var SPIRAL_START = 0.6;
var TEXT_DUR = 5.4;
var TRAIL_TURNS = 4;
// 轨迹二（紫色）：自顶端反向下行，点亮圣诞树主体（不超前于轨迹范围）
var STAR_T = SPIRAL_START + TEXT_DUR;   // 顶端汇合成星
var TREE_START = STAR_T + 0.35;
var TREE_DUR = 6.5;

// ---- 星星轨道上的文字：一年、两年……直到十年，被轨迹一逐一点亮 ----
var ORBIT_TEXT = ['一年', '两年', '三年', '四年', '五年', '六年', '七年', '八年', '九年', '十年'];
var ORBIT_T0 = 0.12;
var ORBIT_SPAN = 0.76;

// ---- 开场文字（树点亮后逐一浮现，保留不消失） ----
var OPEN_TEXT = '不论如何我努力了';
var OPEN_T0 = TREE_START + TREE_DUR + 0.6;
var OPEN_CHAR = 0.16;

// ---- 树周围的五个闪光小星星（可点开查看图片） ----
var GIFT_SRCS = ['gifts/star1.png', 'gifts/star2.png', 'gifts/star3.png', 'gifts/star4.png', 'gifts/star5.png'];
var GIFT_STARS = [];
var giftReadyNow = false;

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

function roundRectPath(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
}

function buildGiftStars() {
    var cfg = [
        { r: 7.8, y: -7.2, spd: 0.5 },
        { r: 7.2, y: -4.2, spd: -0.42 },
        { r: 6.6, y: -1.2, spd: 0.56 },
        { r: 6.0, y: 1.8, spd: -0.48 },
        { r: 5.4, y: 4.8, spd: 0.62 }
    ];
    GIFT_STARS = [];
    for (var i = 0; i < cfg.length; i++) {
        GIFT_STARS.push({
            r: cfg[i].r,
            y: cfg[i].y,
            spd: cfg[i].spd,
            a0: rand(TAU),
            ph: rand(TAU),
            sx: 0, sy: 0, rad: 28,
            vis: false, hover: false
        });
    }
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

    snowflakes = [];
    for (var s = 0; s < 130; s++) {
        snowflakes.push({
            x: rand(W), y: rand(H),
            size: rand(6, 1.6),
            speed: rand(0.8, 0.25),
            swayA: rand(0.9, 0.15),
            swayF: rand(1.6, 0.5),
            swayP: rand(TAU),
            rot: rand(TAU),
            rs: rand(0.6, -0.6),
            alpha: rand(0.85, 0.35)
        });
    }

    petals = [];
    for (var p = 0; p < 90; p++) {
        petals.push({
            x: rand(W), y: rand(H),
            r: rand(4.5, 1.8), sp: rand(1.5, 0.4),
            sw: rand(TAU), rot: rand(TAU), rs: rand(0.05, -0.05),
            ci: Math.floor(Math.random() * SAKURA_COLORS.length)
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
    buildGiftStars();
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

    // 雪花：白色、旋转飘落
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < snowflakes.length; i++) {
        var f = snowflakes[i];
        f.y += f.speed * dt * 60;
        f.x += Math.sin(f.swayF * time + f.swayP) * f.swayA;
        f.rot += f.rs * dt * 60;
        if (f.y > H + 12) { f.y = -12; f.x = rand(W); }
        drawSnowflake(f);
    }
}

function drawSnowflake(f) {
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalAlpha = f.alpha;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ffffff';
    if (f.size > 4.2) {
        // 六臂大雪花
        ctx.lineWidth = 1;
        for (var k = 0; k < 3; k++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -f.size);
            ctx.moveTo(0, -f.size * 0.55);
            ctx.lineTo(f.size * 0.18, -f.size * 0.78);
            ctx.moveTo(0, -f.size * 0.55);
            ctx.lineTo(-f.size * 0.18, -f.size * 0.78);
            ctx.stroke();
        }
    } else {
        // 小雪花光点
        ctx.beginPath();
        ctx.arc(0, 0, f.size * 0.42, 0, TAU);
        ctx.fill();
    }
    ctx.restore();
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

function drawGroundGlow(time, intro) {
    if (intro <= 0.01) return;
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
    ctx.globalAlpha = intro;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    ctx.restore();
}

function drawTree(time, angle, treeT) {
    if (treeT <= 0.001) return;
    ctx.globalCompositeOperation = 'lighter';
    var pts = treePoints;
    var breathe = 1 + 0.07 * Math.sin(time * 0.9);
    var heartbeat = 0.9 + 0.1 * Math.pow(Math.max(0, Math.sin(time * 1.8)), 6);
    var headH = 1 - treeT; // 轨迹头部高度（自顶向下）
    for (var i = 0; i < pts.length; i++) {
        var pt = pts[i];
        // 下行点亮：轨迹降到该高度以下时才亮，紧贴轨迹范围
        var d = pt.t - headH;
        var lit;
        if (treeT >= 1) lit = 1;
        else if (d <= -0.05) lit = 0;
        else if (d >= 0.08) lit = 1;
        else lit = (d + 0.05) / 0.13;
        if (lit <= 0.002) continue;

        var p = project(pt.x * breathe, pt.y, pt.z * breathe, angle);
        var depth = (p.z + 8) / 15;
        if (depth < 0) depth = 0;
        if (depth > 1) depth = 1;
        var twinkle = 0.5 + 0.5 * Math.sin(time * 4 + pt.phase);
        var wave = 0.5 + 0.5 * Math.sin(time * 3.5 - pt.t * 26);
        var spark = Math.pow(Math.max(0, Math.sin(time * 2.2 + pt.phase * 2)), 16);
        // 轨迹经过时额外增亮（点亮波）
        var boost = 0;
        if (treeT < 1 && d > -0.04 && d < 0.12) boost = 1.2 * Math.max(0, 1 - Math.abs(d - 0.01) / 0.09);
        var glow = (0.4 + 0.35 * twinkle + 0.45 * wave * wave + 0.6 * spark) * heartbeat * (1 + boost);
        var size = pt.base * p.scale * (0.8 + 0.4 * twinkle + 0.3 * wave + 0.5 * spark);
        if (size < 1) size = 1;
        ctx.globalAlpha = Math.min(1, glow * (0.4 + 0.6 * depth) * pt.fade * lit);
        ctx.drawImage(sprites[pt.c], p.x - size / 2, p.y - size / 2, size, size);
    }
}

function drawOrbits(time, angle, intro) {
    if (intro <= 0.005) return;
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

function sakuraPath(c, r) {
    c.beginPath();
    c.moveTo(0, r);
    c.bezierCurveTo(-r * 0.85, r * 0.5, -r * 0.7, -r * 0.45, -r * 0.14, -r * 0.5);
    c.bezierCurveTo(-r * 0.06, -r * 0.38, -r * 0.02, -r * 0.32, 0, -r * 0.28);
    c.bezierCurveTo(r * 0.02, -r * 0.32, r * 0.06, -r * 0.38, r * 0.14, -r * 0.5);
    c.bezierCurveTo(r * 0.7, -r * 0.45, r * 0.85, r * 0.5, 0, r);
    c.closePath();
}

function drawPetals(dt) {
    ctx.globalCompositeOperation = 'source-over';
    for (var i = 0; i < petals.length; i++) {
        var p = petals[i];
        p.y += p.sp * dt * 60;
        p.x += Math.sin(p.sw + p.y * 0.01) * 0.5;
        p.rot += p.rs * dt * 60;
        if (p.y > H + 14) { p.y = -14; p.x = rand(W); }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = SAKURA_COLORS[p.ci];
        sakuraPath(ctx, p.r);
        ctx.fill();
        ctx.restore();
    }
}

// 轨迹一：浅紫色碎星盘旋上升，点亮年份文字
function drawTextTrail(time, angle, textT) {
    if (textT <= 0.001 || textT >= 1) return;
    drawTrailPath(time, angle, textT, starSprites, false);
}

// 轨迹二：紫色碎星自顶端反向下降，点亮树身
function drawTreeTrail(time, angle, treeT) {
    if (treeT <= 0.001 || treeT >= 1) return;
    drawTrailPath(time, angle, 1 - treeT, starSprites, true);
}

function drawTrailPath(time, angle, headT, sprArr, reverse) {
    var breathe = 1 + 0.07 * Math.sin(time * 0.9);
    var tailLen = 0.3;
    var N = 60;
    ctx.globalCompositeOperation = 'lighter';

    // 碎星轨迹：头部亮、尾部渐隐的离散光点
    for (var i = 0; i <= N; i++) {
        var tt = headT - tailLen * (i / N);
        if (tt < 0 || tt > 1) break;
        var r = 6.9 * Math.pow(1 - tt, 0.85) + 0.45;
        var a = (reverse ? -1 : 1) * tt * TRAIL_TURNS * TAU;
        var p = project(Math.cos(a) * r * breathe, -9 + tt * 15.2, Math.sin(a) * r * breathe, angle);
        var k = 1 - i / N;
        var alpha = k * k;
        if (alpha <= 0.02) continue;
        var size = p.scale * 0.34 * (0.35 + 0.65 * k) * (i === 0 ? 1.6 : 1) + 2;
        ctx.globalAlpha = Math.min(1, alpha);
        var spr = sprArr[i % 2 === 0 ? 0 : 1];
        ctx.drawImage(spr, p.x - size / 2, p.y - size / 2, size, size);
    }

    // 头部大光晕
    var r0 = 6.9 * Math.pow(1 - headT, 0.85) + 0.45;
    var a0 = (reverse ? -1 : 1) * headT * TRAIL_TURNS * TAU;
    var ph = project(Math.cos(a0) * r0 * breathe, -9 + headT * 15.2, Math.sin(a0) * r0 * breathe, angle);
    var gw = ph.scale * 1.15;
    ctx.globalAlpha = 0.85;
    ctx.drawImage(sprArr[0], ph.x - gw / 2, ph.y - gw / 2, gw, gw);
}

// 四角闪光星（年份文字的标记）
function drawSparkleStar(x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = 'rgba(235,215,255,0.85)';
    ctx.shadowBlur = s * 0.6;
    ctx.strokeStyle = '#f6eeff';
    ctx.lineWidth = Math.max(1, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.12, s, 0);
    ctx.quadraticCurveTo(s * 0.12, s * 0.12, 0, s);
    ctx.quadraticCurveTo(-s * 0.12, s * 0.12, -s, 0);
    ctx.quadraticCurveTo(-s * 0.12, -s * 0.12, 0, -s);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248,240,255,0.95)';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawOrbitText(time, angle, textT) {
    if (textT <= 0.001) return;
    var breathe = 1 + 0.07 * Math.sin(time * 0.9);
    var gapT = ORBIT_SPAN / (ORBIT_TEXT.length - 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var i = 0; i < ORBIT_TEXT.length; i++) {
        var ti = ORBIT_T0 + gapT * i;
        var d = textT - ti;
        var lit;
        if (textT >= 1) lit = 1;
        else if (d <= 0) lit = 0;
        else lit = Math.min(1, d / 0.14);
        if (lit <= 0.01) continue;
        // 轨迹经过时闪亮，之后保持柔和呼吸
        var flash = 1 + 1.8 * Math.max(0, 1 - Math.abs(d - 0.03) / 0.12);
        var r = 6.9 * Math.pow(1 - ti, 0.85) + 0.45;
        var a = ti * TRAIL_TURNS * TAU;
        var p = project(Math.cos(a) * r * breathe, -9 + ti * 15.2, Math.sin(a) * r * breathe, angle);
        var depth = (p.z + 8) / 15;
        if (depth < 0) depth = 0;
        if (depth > 1) depth = 1;
        var size = p.scale * 0.62;
        ctx.font = 'bold ' + size + 'px "STKaiti","KaiTi","FangSong","Microsoft YaHei",serif';
        var pulse = 0.9 + 0.1 * Math.sin(time * 2 + i);
        ctx.globalAlpha = Math.min(1, lit * (0.45 + 0.55 * depth) * pulse);
        // 绯红色标记 + 暖红光晕
        ctx.shadowColor = 'rgba(255,80,110,0.95)';
        ctx.shadowBlur = 28 * flash;
        ctx.fillStyle = '#DC143C';
        ctx.fillText(ORBIT_TEXT[i], p.x, p.y);

        // 年份两侧的小星星标记（浅紫白闪光星）
        ctx.shadowBlur = 0;
        var tw = ctx.measureText(ORBIT_TEXT[i]).width;
        var twk = 0.5 + 0.5 * Math.sin(time * 3 + i * 1.7);
        var ss = size * 0.34 * (0.7 + 0.6 * twk);
        var ox = tw / 2 + ss * 1.1;
        var starA = Math.min(1, lit * (0.45 + 0.55 * depth) * twk);
        drawSparkleStar(p.x - ox, p.y, ss, starA);
        drawSparkleStar(p.x + ox, p.y, ss, starA);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

function drawGiftStars(time, angle, appear) {
    for (var i = 0; i < GIFT_STARS.length; i++) {
        var o = GIFT_STARS[i];
        if (appear <= 0.02) { o.vis = false; continue; }
        var a = o.a0 + time * o.spd;
        var p = project(Math.cos(a) * o.r, o.y, Math.sin(a) * o.r, angle);
        var depth = (p.z + 8) / 15;
        if (depth < 0) depth = 0;
        if (depth > 1) depth = 1;
        o.sx = p.x;
        o.sy = p.y;
        o.rad = Math.max(28, p.scale * 0.55);
        o.vis = true;

        var twk = 0.5 + 0.5 * Math.sin(time * 2.2 + o.ph);
        ctx.globalCompositeOperation = 'lighter';
        var gw = p.scale * 0.55;
        ctx.globalAlpha = appear * (0.35 + 0.25 * twk) * (0.4 + 0.6 * depth);
        ctx.drawImage(starSprites[0], o.sx - gw / 2, o.sy - gw / 2, gw, gw);

        var s = p.scale * 0.3 * (0.85 + 0.5 * twk) * (o.hover ? 1.25 : 1);
        drawSparkleStar(o.sx, o.sy, s, Math.min(1, appear * (0.4 + 0.6 * depth) * (0.55 + 0.45 * twk)));
    }
}

function drawStar(time, angle) {
    starPos.visible = false;
    starPos.ready = false;
    var starIn = Math.min(1, Math.max(0, (time - (STAR_T - 0.4)) / 0.4));
    if (starIn <= 0.01) return;
    var p = project(0, 7.7, 0, angle);
    var pulse = 1 + 0.14 * Math.sin(time * 3.2);
    starPos.x = p.x;
    starPos.y = p.y;
    starPos.s = focal * 0.05;
    starPos.visible = true;
    starPos.ready = starIn >= 0.99;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(p.x, p.y);
    ctx.scale(pulse * (starPos.hovered ? 1.12 : 1), pulse * (starPos.hovered ? 1.12 : 1));

    // 柔和的紫色光晕打底
    var R = focal * 0.2;
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    g.addColorStop(0, 'rgba(240,228,255,0.55)');
    g.addColorStop(0.35, 'rgba(214,188,255,0.2)');
    g.addColorStop(1, 'rgba(196,160,255,0)');
    ctx.globalAlpha = starIn;
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
        ctx.globalAlpha = Math.min(1, starIn * (0.4 + 0.45 * tw + 0.5 * spark));
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
        ctx.globalAlpha = starIn * (0.35 + 0.5 * tw2);
        ctx.drawImage(starSprites[o.c], ox - sz / 2, oy - sz / 2, sz, sz);
    }

    // 中心亮点
    var cs = sr * 0.55 * (1 + 0.2 * Math.sin(time * 3.2));
    ctx.globalAlpha = starIn * 0.95;
    ctx.drawImage(starSprites[starSprites.length - 1], -cs / 2, -cs / 2, cs, cs);

    ctx.restore();

    // 悬停提示：信藏在星星里
    if (starPos.hovered && starPos.ready) {
        var label = '💌 打开圣诞信';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.font = '600 14px "Microsoft YaHei","PingFang SC",sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        var tw2 = ctx.measureText(label).width;
        var bx = p.x, by = p.y + focal * 0.09;
        roundRectPath(ctx, bx - tw2 / 2 - 12, by - 14, tw2 + 24, 28, 14);
        ctx.fillStyle = 'rgba(22,11,36,0.85)';
        ctx.fill();
        ctx.fillStyle = '#e8dcff';
        ctx.fillText(label, bx, by + 1);
    }
}

function drawGreeting(time, intro) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = intro;
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

function drawOpening(time) {
    if (time < OPEN_T0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    var size = Math.max(24, Math.min(46, W * 0.065));
    ctx.font = size + 'px "STKaiti","KaiTi","FangSong","Microsoft YaHei",serif';

    var chars = OPEN_TEXT.split('');
    var widths = [], gap = size * 0.22, totalW = 0;
    for (var i = 0; i < chars.length; i++) {
        widths[i] = ctx.measureText(chars[i]).width;
        totalW += widths[i] + gap;
    }
    totalW -= gap;

    var x0 = W / 2 - totalW / 2;
    var y = H * 0.19;
    var glowPulse = 1 + 0.05 * Math.sin(time * 2);

    for (var i = 0; i < chars.length; i++) {
        var ct = OPEN_T0 + OPEN_CHAR * i;
        if (time < ct) continue;
        var cAlpha = Math.min(1, (time - ct) / 0.35);
        var rise = (1 - cAlpha) * 10;
        var cx = x0;
        for (var j = 0; j < i; j++) cx += widths[j] + gap;
        cx += widths[i] / 2;
        ctx.globalAlpha = cAlpha;
        ctx.shadowColor = 'rgba(205,165,255,0.85)';
        ctx.shadowBlur = 20 * glowPulse;
        ctx.fillStyle = '#faf6ff';
        ctx.fillText(chars[i], cx, y - rise);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
}

var last = 0;
var startTime = 0;

function render() {
    var now = (window.performance && performance.now) ? performance.now() : Date.now();
    if (!startTime) startTime = now;
    var time = (now - startTime) / 1000;
    var dt = last ? Math.min(0.05, time - last) : 0.016;
    last = time;

    var textT = Math.min(1, Math.max(0, (time - SPIRAL_START) / TEXT_DUR));
    var treeT = Math.min(1, Math.max(0, (time - TREE_START) / TREE_DUR));
    var angle = time * 0.35 + Math.sin(time * 0.4) * 0.1;
    var glowIn = Math.min(1, Math.max(0, (treeT - 0.7) / 0.3));
    var orbitIn = Math.min(1, Math.max(0, (treeT - 0.8) / 0.25));
    var greetIn = Math.min(1, Math.max(0, (treeT - 0.9) / 0.2));
    var giftIn = Math.min(1, Math.max(0, (treeT - 0.85) / 0.25));

    drawBackground(time, dt);
    drawMeteors(time);
    drawGroundGlow(time, glowIn);
    drawTree(time, angle, treeT);
    drawOrbits(time, angle, orbitIn);
    drawPetals(dt);
    drawTextTrail(time, angle, textT);
    drawTreeTrail(time, angle, treeT);
    drawOrbitText(time, angle, textT);
    drawStar(time, angle);
    drawGiftStars(time, angle, giftIn);
    drawGreeting(time, greetIn);
    drawOpening(time);
    giftReadyNow = time >= TREE_START + TREE_DUR;
    updateStarHit();
    updateGiftHit();
}

function rafLoop() {
    render();
    requestAnimationFrame(rafLoop);
}

// ---- 圣诞信弹窗 ----
var overlay = document.getElementById('letter-overlay');
var closeBtn = document.getElementById('letter-close');

function openLetter() {
    if (!starPos.ready) return;
    overlay.hidden = false;
    startMusic();
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
        if (e.key !== 'Escape') return;
        if (photoOverlay && !photoOverlay.hidden) closePhoto();
        else if (!overlay.hidden) closeLetter();
    });
}

// ---- 环绕小星星：点开看图片 ----
var photoOverlay = document.getElementById('photo-overlay');
var photoClose = document.getElementById('photo-close');
var photoImg = document.getElementById('photo-img');

function openPhoto(i) {
    if (!photoImg || !photoOverlay) return;
    photoImg.src = GIFT_SRCS[i];
    photoOverlay.hidden = false;
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            photoOverlay.classList.add('open');
        });
    });
}

function closePhoto() {
    if (!photoOverlay) return;
    photoOverlay.classList.remove('open');
    setTimeout(function () {
        if (!photoOverlay.classList.contains('open')) photoOverlay.hidden = true;
    }, 360);
}

if (photoOverlay && photoClose) {
    photoClose.addEventListener('click', closePhoto);
    photoOverlay.addEventListener('click', function (e) {
        if (e.target === photoOverlay) closePhoto();
    });
}

// ---- 背景音乐：点开信时播放 ----
var bgm = document.getElementById('bgm');
var musicBtn = document.getElementById('music-toggle');

function startMusic() {
    if (!bgm) return;
    bgm.volume = 0.55;
    var p = bgm.play();
    if (p && p.then) {
        p.then(function () {
            if (musicBtn) {
                musicBtn.hidden = false;
                musicBtn.textContent = '🎵';
            }
        }).catch(function (err) {
            console.warn('音乐播放被浏览器阻止:', err);
            if (musicBtn) {
                musicBtn.hidden = false;
                musicBtn.textContent = '🔇';
            }
        });
    }
}

function toggleMusic() {
    if (!bgm) return;
    if (bgm.paused) {
        var p = bgm.play();
        if (p && p.then) p.then(function () { musicBtn.textContent = '🎵'; }).catch(function () {});
    } else {
        bgm.pause();
        musicBtn.textContent = '🔇';
    }
}

if (musicBtn) musicBtn.addEventListener('click', toggleMusic);

// 兜底：信开着且音乐没响时，页面任意点击都会重试播放
document.addEventListener('click', function () {
    if (bgm && bgm.paused && overlay && !overlay.hidden) {
        var p = bgm.play();
        if (p && p.then) p.then(function () {
            if (musicBtn) musicBtn.textContent = '🎵';
        }).catch(function () {});
    }
});

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
    var r = canvas.getBoundingClientRect();
    // 环绕小星星 → 打开图片
    if (giftReadyNow) {
        for (var i = 0; i < GIFT_STARS.length; i++) {
            var o = GIFT_STARS[i];
            if (!o.vis) continue;
            var gdx = e.clientX - r.left - o.sx;
            var gdy = e.clientY - r.top - o.sy;
            if (gdx * gdx + gdy * gdy < o.rad * o.rad) { openPhoto(i); return; }
        }
    }
    // 树顶星星 → 打开信
    if (!starPos.visible || !starPos.ready) return;
    var dx = e.clientX - r.left - starPos.x;
    var dy = e.clientY - r.top - starPos.y;
    var hit = Math.max(40, starPos.s * 1.5);
    if (dx * dx + dy * dy < hit * hit) openLetter();
});

function updateStarHit() {
    if (!starPos.visible) {
        if (starPos.hovered) {
            starPos.hovered = false;
            canvas.style.cursor = 'default';
        }
        return;
    }
    var dx = mouse.x - starPos.x;
    var dy = mouse.y - starPos.y;
    var hit = starPos.ready && dx * dx + dy * dy < Math.pow(Math.max(40, starPos.s * 1.3), 2);
    if (hit !== starPos.hovered) {
        starPos.hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : 'default';
    }
}

function updateGiftHit() {
    var any = false;
    for (var i = 0; i < GIFT_STARS.length; i++) {
        var o = GIFT_STARS[i];
        var h = false;
        if (o.vis && giftReadyNow) {
            var dx = mouse.x - o.sx;
            var dy = mouse.y - o.sy;
            h = dx * dx + dy * dy < o.rad * o.rad;
        }
        if (h) any = true;
        o.hover = h;
    }
    if (any) canvas.style.cursor = 'pointer';
}

for (var i = 0; i < PALETTE.length; i++) sprites.push(makeSprite(PALETTE[i]));
for (var j = 0; j < STAR_PALETTE.length; j++) starSprites.push(makeSprite(STAR_PALETTE[j]));
window.addEventListener('resize', resize);
resize();
requestAnimationFrame(rafLoop);
})();
