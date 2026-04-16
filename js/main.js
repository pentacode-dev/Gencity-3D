/**
 * GENCITY 3D — Main Application Script
 * Project: Gencity 3D · Team Pentacode
 * Description: Page routing, custom cursor, particle system, UI interactions
 */

/* ══════════════════════════════════════════════════
   PAGE ROUTING
══════════════════════════════════════════════════ */
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === name);
  });
  window.scrollTo(0, 0);
  setTimeout(() => { initObservers(); initStatCounters(); }, 100);
  // Boot Procity the first time the page is shown
  if (name === 'procity' && !window._procityBooted) {
    window._procityBooted = true;
    bootProcity();
  }
}

/* ── CUSTOM CURSOR ── */
const cursor = document.getElementById('cursor');
const dot = cursor.querySelector('.dot');
const ring = cursor.querySelector('.ring');
let mx = 0, my = 0, rx = 0, ry = 0;

document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });

function bindHover() {
  document.querySelectorAll('a,button,.feat-card,.member-card,.tech-item,.roadmap-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width = '58px';
      ring.style.height = '58px';
      ring.style.borderColor = 'var(--blue-1)';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width = '34px';
      ring.style.height = '34px';
      ring.style.borderColor = 'rgba(0,200,255,.3)';
    });
  });
}
bindHover();

(function animCursor() {
  rx += (mx - rx) * .12;
  ry += (my - ry) * .12;
  cursor.style.transform = `translate(${mx}px,${my}px)`;
  ring.style.transform = `translate(calc(${rx - mx}px - 50%),calc(${ry - my}px - 50%))`;
  requestAnimationFrame(animCursor);
})();

/* ── CANVAS PARTICLES ── */
const bgCanvas = document.getElementById('canvas');
const ctx = bgCanvas.getContext('2d');
let W, H, mouse = { x: -999, y: -999 };

function resize() {
  W = bgCanvas.width = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);
document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

class Particle {
  constructor() { this.reset(true); }
  reset(init) {
    this.x = Math.random() * W;
    this.y = init ? Math.random() * H : H + 10;
    this.r = Math.random() * 1.6 + 0.3;
    this.vx = (Math.random() - .5) * .25;
    this.vy = -(Math.random() * .45 + .08);
    this.alpha = Math.random() * .55 + .08;
    this.pulse = Math.random() * Math.PI * 2;
    this.ps = .01 + Math.random() * .02;
    const cols = ['0,200,255', '0,170,255', '61,224,255', '100,240,255'];
    this.color = cols[Math.floor(Math.random() * cols.length)];
  }
  update() {
    this.pulse += this.ps;
    const a = this.alpha * (.6 + .4 * Math.sin(this.pulse));
    const dx = this.x - mouse.x, dy = this.y - mouse.y, dist = Math.hypot(dx, dy);
    if (dist < 110) {
      const f = (110 - dist) / 110;
      this.x += dx / dist * f * 1.8;
      this.y += dy / dist * f * 1.8;
    }
    this.x += this.vx;
    this.y += this.vy;
    if (this.y < -20 || this.x < -20 || this.x > W + 20) this.reset(false);
    return a;
  }
  draw(a) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${this.color},${a})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * 3, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r * 3);
    g.addColorStop(0, `rgba(${this.color},${a * .35})`);
    g.addColorStop(1, `rgba(${this.color},0)`);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

const particles = [];
for (let i = 0; i < 140; i++) particles.push(new Particle());
let ripples = [];
document.addEventListener('click', e => { ripples.push({ x: e.clientX, y: e.clientY, r: 0, a: .45 }); });

(function drawFrame() {
  ctx.clearRect(0, 0, W, H);
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y, d = Math.hypot(dx, dy);
      if (d < 85) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(0,200,255,${.045 * (1 - d / 85)})`;
        ctx.lineWidth = .5;
        ctx.stroke();
      }
    }
  }
  particles.forEach(p => { const a = p.update(); p.draw(a); });
  ripples = ripples.filter(r => r.a > 0);
  ripples.forEach(r => {
    r.r += 3; r.a -= .014;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(0,200,255,${r.a})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  });
  requestAnimationFrame(drawFrame);
})();

/* ── SCROLL METER ── */
const smFill = document.getElementById('smFill');
window.addEventListener('scroll', () => {
  const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
  smFill.style.height = pct + '%';
});

/* ── INTERSECTION OBSERVERS ── */
function initObservers() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); } });
  }, { threshold: .12 });
  document.querySelectorAll('.feat-card,.member-card,.step,.tech-item,.roadmap-item').forEach(el => {
    if (!el.classList.contains('visible')) obs.observe(el);
  });
  bindHover();
}

/* ── STAT COUNTERS ── */
function initStatCounters() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseFloat(el.dataset.target) || 0;
      let val = 0;
      const step = target / 55;
      const iv = setInterval(() => {
        val += step;
        if (val >= target) { val = target; clearInterval(iv); }
        el.childNodes[0].nodeValue = Number.isInteger(target) ? Math.floor(val) : val.toFixed(0);
      }, 18);
      obs.unobserve(el);
    });
  }, { threshold: .4 });
  document.querySelectorAll('.stat-num[data-target]').forEach(el => obs.observe(el));
}

/* ── CONTACT FORM ── */
function submitForm(btn) {
  btn.textContent = 'Sent ✓';
  btn.style.background = 'rgba(0,200,255,.3)';
  btn.disabled = true;
}

// Initialise on first load
initObservers();
initStatCounters();
