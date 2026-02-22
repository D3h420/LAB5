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
  let step = 16;
  let traces = [];
  let vias = [];
  let pulses = [];
  let chip = null;
  let rafId = 0;
  let running = false;
  let lastTs = 0;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function snap(value, snapStep) {
    return Math.round(value / snapStep) * snapStep;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function pointKey(x, y) {
    return `${Math.round(x)}|${Math.round(y)}`;
  }

  function addVia(map, x, y) {
    const key = pointKey(x, y);
    if (map.has(key)) {
      return;
    }
    map.add(key);
    vias.push({ x, y });
  }

  function traceLength(points) {
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      total += Math.hypot(b.x - a.x, b.y - a.y);
    }
    return total;
  }

  function addTrace(rawPoints, viaMap) {
    const points = [];

    for (const p of rawPoints) {
      if (points.length === 0) {
        points.push({ x: p.x, y: p.y });
        continue;
      }
      const last = points[points.length - 1];
      if (last.x !== p.x || last.y !== p.y) {
        points.push({ x: p.x, y: p.y });
      }
    }

    if (points.length < 2) {
      return;
    }

    const totalLength = traceLength(points);
    if (totalLength < step * 2) {
      return;
    }

    traces.push({ points, totalLength });

    addVia(viaMap, points[0].x, points[0].y);
    addVia(viaMap, points[points.length - 1].x, points[points.length - 1].y);

    for (let i = 1; i < points.length - 1; i += 1) {
      addVia(viaMap, points[i].x, points[i].y);
    }
  }

  function tracePointAtDistance(trace, distance) {
    const points = trace.points;
    const target = ((distance % trace.totalLength) + trace.totalLength) % trace.totalLength;

    let walked = 0;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (segLen === 0) {
        continue;
      }

      if (walked + segLen >= target) {
        const t = (target - walked) / segLen;
        return {
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t
        };
      }
      walked += segLen;
    }

    const last = points[points.length - 1];
    return { x: last.x, y: last.y };
  }

  function createLayout() {
    traces = [];
    vias = [];
    pulses = [];

    step = clamp(Math.round(Math.min(width, height) / 46), 12, 20);
    const margin = step * 3;
    const viaMap = new Set();

    chip = {
      w: snap(Math.min(width * 0.22, 240), step),
      h: snap(Math.min(height * 0.2, 160), step)
    };
    chip.x = snap(width * 0.58 - chip.w / 2, step);
    chip.y = snap(height * 0.47 - chip.h / 2, step);

    const left = margin;
    const right = width - margin;
    const top = margin;
    const bottom = height - margin;

    const horizontalCount = clamp(Math.floor((height - margin * 2) / (step * 1.18)), 12, 24);
    for (let i = 0; i < horizontalCount; i += 1) {
      const baseY = margin + (i * (height - margin * 2)) / (horizontalCount - 1);
      const y = snap(baseY, step);
      const intersectsChip = y > chip.y - step * 2 && y < chip.y + chip.h + step * 2;

      if (!intersectsChip) {
        addTrace([{ x: left, y }, { x: right, y }], viaMap);
        continue;
      }

      const detourUp = i % 2 === 0;
      let detourY = detourUp
        ? chip.y - step * (3 + (i % 3))
        : chip.y + chip.h + step * (3 + (i % 3));
      detourY = clamp(detourY, top, bottom);

      addTrace(
        [
          { x: left, y },
          { x: chip.x - step * 4, y },
          { x: chip.x - step * 4, y: detourY },
          { x: chip.x + chip.w + step * 4, y: detourY },
          { x: chip.x + chip.w + step * 4, y },
          { x: right, y }
        ],
        viaMap
      );
    }

    const verticalCount = clamp(Math.floor((width - margin * 2) / (step * 4.6)), 4, 9);
    for (let i = 0; i < verticalCount; i += 1) {
      const baseX = margin + (i * (width - margin * 2)) / (verticalCount - 1);
      const x = snap(baseX, step);
      const intersectsChip = x > chip.x - step * 2 && x < chip.x + chip.w + step * 2;

      if (!intersectsChip) {
        const startY = snap(rand(top, chip.y - step * 2), step);
        const endY = clamp(snap(startY + rand(step * 6, step * 13), step), top, bottom);
        addTrace([{ x, y: startY }, { x, y: endY }], viaMap);

        const startY2 = clamp(snap(chip.y + chip.h + rand(step * 1, step * 4), step), top, bottom);
        const endY2 = clamp(snap(startY2 + rand(step * 5, step * 11), step), top, bottom);
        addTrace([{ x, y: startY2 }, { x, y: endY2 }], viaMap);
        continue;
      }

      const detourLeft = i % 2 === 0;
      let detourX = detourLeft
        ? chip.x - step * (3 + (i % 3))
        : chip.x + chip.w + step * (3 + (i % 3));
      detourX = clamp(detourX, left, right);

      addTrace(
        [
          { x, y: top },
          { x, y: chip.y - step * 4 },
          { x: detourX, y: chip.y - step * 4 },
          { x: detourX, y: chip.y + chip.h + step * 4 },
          { x, y: chip.y + chip.h + step * 4 },
          { x, y: bottom }
        ],
        viaMap
      );
    }

    const pinCountTop = 14;
    for (let i = 1; i <= pinCountTop; i += 1) {
      const px = snap(chip.x + (i * chip.w) / (pinCountTop + 1), step / 2);
      const outY = chip.y - step * (2 + (i % 3));
      const outX = px + (i % 2 === 0 ? -step * 2 : step * 2);
      addTrace(
        [
          { x: px, y: chip.y },
          { x: px, y: outY },
          { x: clamp(outX, left, right), y: outY }
        ],
        viaMap
      );
    }

    const pinCountBottom = 14;
    for (let i = 1; i <= pinCountBottom; i += 1) {
      const px = snap(chip.x + (i * chip.w) / (pinCountBottom + 1), step / 2);
      const outY = chip.y + chip.h + step * (2 + (i % 3));
      const outX = px + (i % 2 === 0 ? step * 2 : -step * 2);
      addTrace(
        [
          { x: px, y: chip.y + chip.h },
          { x: px, y: outY },
          { x: clamp(outX, left, right), y: outY }
        ],
        viaMap
      );
    }

    const pinCountSide = 8;
    for (let i = 1; i <= pinCountSide; i += 1) {
      const py = snap(chip.y + (i * chip.h) / (pinCountSide + 1), step / 2);
      const leftOutX = chip.x - step * (2 + (i % 3));
      const leftOutY = py + (i % 2 === 0 ? step * 2 : -step * 2);
      addTrace(
        [
          { x: chip.x, y: py },
          { x: leftOutX, y: py },
          { x: leftOutX, y: clamp(leftOutY, top, bottom) }
        ],
        viaMap
      );

      const rightOutX = chip.x + chip.w + step * (2 + (i % 3));
      const rightOutY = py + (i % 2 === 0 ? -step * 2 : step * 2);
      addTrace(
        [
          { x: chip.x + chip.w, y: py },
          { x: rightOutX, y: py },
          { x: rightOutX, y: clamp(rightOutY, top, bottom) }
        ],
        viaMap
      );
    }

    const pulseCount = clamp(Math.floor(traces.length * 0.46), 20, 58);
    for (let i = 0; i < pulseCount; i += 1) {
      const traceIndex = Math.floor(Math.random() * traces.length);
      const trace = traces[traceIndex];
      if (!trace) {
        continue;
      }

      pulses.push({
        traceIndex,
        distance: Math.random() * trace.totalLength,
        speed: rand(32, 78),
        glow: rand(0.75, 1.3)
      });
    }
  }

  function drawChip() {
    if (!chip) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(13, 33, 55, 0.35)";
    ctx.strokeStyle = "rgba(92, 212, 255, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(chip.x, chip.y, chip.w, chip.h);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 170, 128, 0.6)";
    ctx.lineWidth = 1.1;
    const pinCount = 18;
    for (let i = 1; i <= pinCount; i += 1) {
      const px = chip.x + (i * chip.w) / (pinCount + 1);
      ctx.beginPath();
      ctx.moveTo(px, chip.y);
      ctx.lineTo(px, chip.y - step * 0.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(px, chip.y + chip.h);
      ctx.lineTo(px, chip.y + chip.h + step * 0.9);
      ctx.stroke();
    }

    const sidePins = 10;
    for (let i = 1; i <= sidePins; i += 1) {
      const py = chip.y + (i * chip.h) / (sidePins + 1);
      ctx.beginPath();
      ctx.moveTo(chip.x, py);
      ctx.lineTo(chip.x - step * 0.9, py);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(chip.x + chip.w, py);
      ctx.lineTo(chip.x + chip.w + step * 0.9, py);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawTraces() {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.lineWidth = 3.1;
    ctx.strokeStyle = "rgba(24, 96, 143, 0.34)";
    for (const trace of traces) {
      ctx.beginPath();
      ctx.moveTo(trace.points[0].x, trace.points[0].y);
      for (let i = 1; i < trace.points.length; i += 1) {
        ctx.lineTo(trace.points[i].x, trace.points[i].y);
      }
      ctx.stroke();
    }

    ctx.lineWidth = 1.35;
    ctx.strokeStyle = "rgba(100, 214, 255, 0.45)";
    for (const trace of traces) {
      ctx.beginPath();
      ctx.moveTo(trace.points[0].x, trace.points[0].y);
      for (let i = 1; i < trace.points.length; i += 1) {
        ctx.lineTo(trace.points[i].x, trace.points[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawVias() {
    ctx.save();
    for (const via of vias) {
      ctx.beginPath();
      ctx.fillStyle = "rgba(10, 20, 34, 0.92)";
      ctx.arc(via.x, via.y, 2.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = "rgba(255, 173, 130, 0.55)";
      ctx.lineWidth = 0.9;
      ctx.arc(via.x, via.y, 2.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPulses(deltaSeconds) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    for (const pulse of pulses) {
      const trace = traces[pulse.traceIndex];
      if (!trace) {
        continue;
      }

      if (shouldAnimate) {
        pulse.distance += pulse.speed * deltaSeconds;
        if (pulse.distance > trace.totalLength) {
          pulse.distance -= trace.totalLength;
        }
      }

      const point = tracePointAtDistance(trace, pulse.distance);
      const radius = 1.7 * pulse.glow;
      const glowRadius = 7.4 * pulse.glow;

      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, glowRadius);
      gradient.addColorStop(0, "rgba(190, 246, 255, 0.95)");
      gradient.addColorStop(0.45, "rgba(124, 232, 255, 0.42)");
      gradient.addColorStop(1, "rgba(124, 232, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(point.x, point.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(210, 252, 255, 0.98)";
      ctx.beginPath();
      ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawScene(deltaSeconds) {
    ctx.clearRect(0, 0, width, height);
    drawTraces();
    drawChip();
    drawVias();
    drawPulses(deltaSeconds);
  }

  function loop(ts) {
    if (!running) {
      return;
    }

    if (!lastTs) {
      lastTs = ts;
    }

    const deltaSeconds = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    drawScene(deltaSeconds);
    rafId = window.requestAnimationFrame(loop);
  }

  function start() {
    if (!shouldAnimate || running) {
      return;
    }
    running = true;
    lastTs = 0;
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

    createLayout();
    drawScene(0);
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
