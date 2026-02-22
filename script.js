const ENABLE_PCB_ANIMATION = true;

(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();

(() => {
  const canvas = document.getElementById("pcb-canvas");
  if (!canvas) {
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldAnimate = ENABLE_PCB_ANIMATION && !reducedMotion;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let segments = [];
  let pulses = [];
  let rafId = 0;
  let running = false;
  let lastTime = 0;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function snap(value, step) {
    return Math.round(value / step) * step;
  }

  function addSegment(x1, y1, x2, y2) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 8) {
      return;
    }

    segments.push({ x1, y1, x2, y2, length });
  }

  function createNetwork() {
    segments = [];
    pulses = [];

    const step = 46;
    const trackCount = Math.max(16, Math.min(44, Math.floor((width * height) / 45000)));

    for (let i = 0; i < trackCount; i += 1) {
      const horizontal = Math.random() > 0.34;

      if (horizontal) {
        const y = snap(rand(36, height - 36), step);
        const xStart = snap(rand(-70, width * 0.52), step);
        const xMid = snap(xStart + rand(130, 320), step);
        const yTurn = snap(y + rand(-180, 180), step);
        const xEnd = snap(xMid + rand(120, 260), step);

        addSegment(xStart, y, xMid, y);
        addSegment(xMid, y, xMid, yTurn);
        addSegment(xMid, yTurn, xEnd, yTurn);
      } else {
        const x = snap(rand(36, width - 36), step);
        const yStart = snap(rand(-70, height * 0.5), step);
        const yMid = snap(yStart + rand(130, 300), step);
        const xTurn = snap(x + rand(-180, 180), step);
        const yEnd = snap(yMid + rand(120, 250), step);

        addSegment(x, yStart, x, yMid);
        addSegment(x, yMid, xTurn, yMid);
        addSegment(xTurn, yMid, xTurn, yEnd);
      }
    }

    const pulseCount = Math.max(24, Math.min(86, Math.floor(segments.length * 1.2)));
    for (let i = 0; i < pulseCount; i += 1) {
      pulses.push({
        segmentIndex: Math.floor(Math.random() * segments.length),
        t: Math.random(),
        speed: rand(0.11, 0.29),
        size: rand(2.1, 3.6)
      });
    }
  }

  function pointOnSegment(segment, t) {
    return {
      x: segment.x1 + (segment.x2 - segment.x1) * t,
      y: segment.y1 + (segment.y2 - segment.y1) * t
    };
  }

  function drawTracks() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = "rgba(255, 95, 209, 0.16)";

    for (const segment of segments) {
      ctx.beginPath();
      ctx.moveTo(segment.x1, segment.y1);
      ctx.lineTo(segment.x2, segment.y2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(255, 153, 227, 0.2)";
    for (let i = 0; i < segments.length; i += 4) {
      const segment = segments[i];
      ctx.beginPath();
      ctx.arc(segment.x1, segment.y1, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPulses(deltaSeconds) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.lineCap = "round";

    for (const pulse of pulses) {
      const segment = segments[pulse.segmentIndex];
      if (!segment) {
        continue;
      }

      if (shouldAnimate) {
        const normalizedSpeed = pulse.speed / Math.max(0.6, segment.length / 180);
        pulse.t += normalizedSpeed * deltaSeconds;
        if (pulse.t > 1) {
          pulse.t -= 1;
        }
      }

      const head = pointOnSegment(segment, pulse.t);
      const tail = pointOnSegment(segment, Math.max(0, pulse.t - 0.1));

      ctx.strokeStyle = "rgba(255, 125, 219, 0.58)";
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();

      const glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, pulse.size * 3.3);
      glow.addColorStop(0, "rgba(255, 194, 240, 0.9)");
      glow.addColorStop(0.45, "rgba(255, 125, 219, 0.44)");
      glow.addColorStop(1, "rgba(255, 125, 219, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(head.x, head.y, pulse.size * 3.3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFrame(deltaSeconds) {
    ctx.clearRect(0, 0, width, height);
    drawTracks();
    drawPulses(deltaSeconds);
  }

  function loop(timestamp) {
    if (!running) {
      return;
    }

    if (!lastTime) {
      lastTime = timestamp;
    }
    const deltaSeconds = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;

    drawFrame(deltaSeconds);
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (!shouldAnimate || running) {
      return;
    }
    running = true;
    lastTime = 0;
    rafId = window.requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    createNetwork();
    drawFrame(0);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeCanvas, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (!shouldAnimate) {
      return;
    }
    if (document.hidden) {
      stop();
      return;
    }
    start();
  });

  resizeCanvas();
  start();
})();
