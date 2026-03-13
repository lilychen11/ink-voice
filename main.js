/* ============================================
   言墨 · JavaScript
   - 水墨 Canvas 背景
   - Navbar scroll effect
   - Scroll reveal animations
   ============================================ */

/* ---- Ink Canvas ---- */
(function () {
  const canvas = document.getElementById('ink-canvas');
  const ctx = canvas.getContext('2d');
  let width, height;
  let drops = [];
  let animId;

  function resize() {
    width  = canvas.width  = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  /* A single ink wash drop */
  class InkDrop {
    constructor() { this.reset(true); }

    reset(initial) {
      this.x  = Math.random() * width;
      this.y  = initial ? Math.random() * height : -50;
      this.r  = 60 + Math.random() * 120;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = 0.08 + Math.random() * 0.12;
      this.alpha = 0;
      this.maxAlpha = 0.03 + Math.random() * 0.045;
      this.growing = true;
      this.life = 0;
      this.maxLife = 900 + Math.random() * 600;
      /* slight hue shift: warm black / sepia */
      const tones = ['10,8,6', '20,15,10', '30,22,14', '15,10,8'];
      this.color = tones[Math.floor(Math.random() * tones.length)];
    }

    update() {
      this.life++;
      this.x += this.vx;
      this.y += this.vy;

      if (this.life < 120) {
        this.alpha = (this.life / 120) * this.maxAlpha;
      } else if (this.life > this.maxLife - 180) {
        this.alpha = ((this.maxLife - this.life) / 180) * this.maxAlpha;
      } else {
        this.alpha = this.maxAlpha;
      }

      if (this.life >= this.maxLife || this.y - this.r > height + 50) {
        this.reset(false);
      }
    }

    draw(ctx) {
      const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.r);
      grad.addColorStop(0,   `rgba(${this.color}, ${this.alpha})`);
      grad.addColorStop(0.5, `rgba(${this.color}, ${this.alpha * 0.4})`);
      grad.addColorStop(1,   `rgba(${this.color}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, this.r * (0.7 + Math.random() * 0.06), this.r, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initDrops() {
    drops = [];
    const count = 0;
    for (let i = 0; i < count; i++) drops.push(new InkDrop());
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);
    drops.forEach(d => { d.update(); d.draw(ctx); });
    animId = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', () => {
    cancelAnimationFrame(animId);
    resize();
    initDrops();
    tick();
  });

  resize();
  initDrops();
  tick();
})();

/* ---- Navbar Scroll ---- */
(function () {
  const nav = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();

/* ---- Wheel Step Section Scroll ---- */
(function () {
  const sections = Array.from(document.querySelectorAll('section'))
    .filter((el, idx, arr) => arr.indexOf(el) === idx)
    .sort((a, b) => a.offsetTop - b.offsetTop);

  if (!sections.length) return;

  let isAnimating = false;
  let gestureLocked = false;
  let deltaBuffer = 0;
  let releaseTimer = null;
  const STEP_THRESHOLD = 80;
  const WHEEL_IDLE_MS = 170;

  function scheduleGestureRelease() {
    if (releaseTimer) window.clearTimeout(releaseTimer);
    releaseTimer = window.setTimeout(() => {
      if (isAnimating) {
        scheduleGestureRelease();
        return;
      }
      gestureLocked = false;
      deltaBuffer = 0;
    }, WHEEL_IDLE_MS);
  }

  function findScrollableAncestor(el) {
    let node = el;
    while (node && node !== document.body) {
      if (!(node instanceof HTMLElement)) {
        node = node.parentElement;
        continue;
      }
      const style = window.getComputedStyle(node);
      const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight;
      if (canScrollY) return node;
      node = node.parentElement;
    }
    return null;
  }

  function shouldKeepNativeScroll(target, direction) {
    const container = findScrollableAncestor(target);
    if (!container) return false;

    const atTop = container.scrollTop <= 0;
    const atBottom = Math.ceil(container.scrollTop + container.clientHeight) >= container.scrollHeight;

    if (direction > 0 && !atBottom) return true;
    if (direction < 0 && !atTop) return true;
    return false;
  }

  function currentSectionIndex() {
    const probeY = window.scrollY + window.innerHeight * 0.45;
    let idx = 0;
    for (let i = 0; i < sections.length; i += 1) {
      if (sections[i].offsetTop <= probeY) idx = i;
      else break;
    }
    return idx;
  }

  function scrollToSection(index) {
    const clamped = Math.max(0, Math.min(sections.length - 1, index));
    const target = sections[clamped];
    const sectionHeight = target.offsetHeight;
    const centeredTop = target.offsetTop - Math.max(0, (window.innerHeight - sectionHeight) / 2);
    const maxScrollTop = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const top = Math.max(0, Math.min(maxScrollTop, centeredTop));
    isAnimating = true;
    gestureLocked = true;
    window.scrollTo({ top, behavior: 'smooth' });

    window.setTimeout(() => {
      isAnimating = false;
    }, 650);
  }

  window.addEventListener('wheel', (e) => {
    const direction = Math.sign(e.deltaY);
    if (!direction) return;

    if (shouldKeepNativeScroll(e.target, direction)) return;

    scheduleGestureRelease();

    if (isAnimating || gestureLocked) {
      e.preventDefault();
      return;
    }

    if (deltaBuffer && Math.sign(deltaBuffer) !== direction) {
      deltaBuffer = 0;
    }

    deltaBuffer += e.deltaY;
    if (Math.abs(deltaBuffer) < STEP_THRESHOLD) {
      e.preventDefault();
      return;
    }

    const step = deltaBuffer > 0 ? 1 : -1;
    deltaBuffer = 0;

    const next = currentSectionIndex() + step;
    if (next < 0 || next >= sections.length) return;

    e.preventDefault();
    scrollToSection(next);
  }, { passive: false });
})();

/* ---- Scroll Reveal ---- */
(function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
})();

/* ---- Tone Badge Interaction ---- */
(function () {
  const badges = document.querySelectorAll('.tone-badge');
  badges.forEach(badge => {
    badge.addEventListener('click', () => {
      badges.forEach(b => b.classList.remove('active'));
      badge.classList.add('active');
    });
  });
})();

/* ---- FAQ Smooth Open ---- */
(function () {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        // close others
        document.querySelectorAll('.faq-item[open]').forEach(other => {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });
})();

/* ---- Theme Picker ---- */
(function () {
  const pickerBtn = document.getElementById('themePickerBtn');
  const panel     = document.getElementById('themePanel');
  if (!pickerBtn || !panel) return;

  const THEMES = ['ink'];
  const DEFAULT = 'ink';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    panel.querySelectorAll('.theme-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.theme === theme);
    });
  }

  function openPanel() {
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    pickerBtn.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    pickerBtn.setAttribute('aria-expanded', 'false');
  }

  // Restore saved theme
  const stored = localStorage.getItem('theme');
  applyTheme(THEMES.includes(stored) ? stored : DEFAULT);

  pickerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.contains('open') ? closePanel() : openPanel();
  });

  panel.querySelectorAll('.theme-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      applyTheme(swatch.dataset.theme);
      closePanel();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#themePicker')) closePanel();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });
})();


(function () {
  const orb = document.querySelector('.mic-orb');
  if (!orb) return;
  window.addEventListener('mousemove', (e) => {
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;
    const dx = (e.clientX - cx) / cx;
    const dy = (e.clientY - cy) / cy;
    orb.style.transform = `translate(${dx * 8}px, ${dy * 8}px)`;
  }, { passive: true });
})();
