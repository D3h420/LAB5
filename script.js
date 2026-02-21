const ENABLE_BACKGROUND_ANIMATION = true;

(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();

(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shouldAnimate = ENABLE_BACKGROUND_ANIMATION && !reducedMotion;
  const GRID_STEP = 44;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let nodes = [];
  let traces = [];
  let sparks = [];
  let frameId = 0;

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function spawnSparks(x, y, intensity = 1) {
    const count = 4 + Math.floor(Math.random() * (4 * intensity));
    for (let i = 0; i < count; i += 1) {
      sparks.push({
        x,
        y,
        vx: rand(-2.5, 2.5) * intensity,
        vy: rand(-2.5, 2.5) * intensity,
        life: 1,
        decay: rand(0.02, 0.045),
        size: rand(0.9, 2.3)
      });
    }
  }

  function createNodes() {
    const amount = Math.max(34, Math.min(96, Math.floor((width * height) / 15000)));
    nodes = Array.from({ length: amount }, (_, index) => {
      const x = Math.round((Math.random() * width) / GRID_STEP) * GRID_STEP + rand(-9, 9);
      const y = Math.round((Math.random() * height) / GRID_STEP) * GRID_STEP + rand(-9, 9);

      return {
        x: Math.max(0, Math.min(width, x)),
        y: Math.max(0, Math.min(height, y)),
        vx: rand(-0.85, 0.85),
        vy: rand(-0.85, 0.85),
        radius: rand(1.1, 2.6),
        phase: Math.random() * Math.PI * 2 + index * 0.07
      };
    });
  }

  function createTraces() {
    const amount = Math.max(28, Math.min(80, Math.floor((width * height) / 24000)));
    traces = Array.from({ length: amount }, () => {
      const horizontal = Math.random() > 0.5;
      const length = GRID_STEP * (2 + Math.floor(Math.random() * 4));
      const x = Math.round((Math.random() * width) / GRID_STEP) * GRID_STEP;
      const y = Math.round((Math.random() * height) / GRID_STEP) * GRID_STEP;

      return {
        x,
        y,
        length,
        horizontal,
        pulse: Math.random(),
        pulseSpeed: rand(0.013, 0.036),
        drift: rand(0.35, 1.2),
        phase: Math.random() * Math.PI * 2
      };
    });
  }

  function createScene() {
    createNodes();
    createTraces();
    sparks = [];
  }

  function drawBackdrop(seconds) {
    const energy = 0.5 + 0.5 * Math.sin(seconds * 1.8);
    const primary = context.createRadialGradient(
      width * 0.2,
      height * 0.16,
      36,
      width * 0.2,
      height * 0.16,
      Math.max(width, height)
    );
    primary.addColorStop(0, `rgba(70, 255, 194, ${(0.16 + energy * 0.12).toFixed(3)})`);
    primary.addColorStop(0.3, "rgba(44, 167, 138, 0.11)");
    primary.addColorStop(0.68, "rgba(10, 65, 52, 0.08)");
    primary.addColorStop(1, "rgba(0, 0, 0, 0)");

    const secondary = context.createRadialGradient(
      width * 0.78,
      height * 0.12,
      24,
      width * 0.78,
      height * 0.12,
      Math.max(width, height) * 0.86
    );
    secondary.addColorStop(0, `rgba(105, 220, 255, ${(0.1 + energy * 0.1).toFixed(3)})`);
    secondary.addColorStop(0.45, "rgba(45, 136, 168, 0.08)");
    secondary.addColorStop(1, "rgba(0, 0, 0, 0)");

    context.fillStyle = primary;
    context.fillRect(0, 0, width, height);
    context.fillStyle = secondary;
    context.fillRect(0, 0, width, height);
  }

  function updateNodes(seconds) {
    if (!shouldAnimate) {
      return;
    }

    for (const node of nodes) {
      node.x += node.vx + Math.sin(seconds * 2.5 + node.phase) * 0.06;
      node.y += node.vy + Math.cos(seconds * 2.2 + node.phase) * 0.06;

      if (node.x < 0 || node.x > width) {
        node.vx *= -1;
        node.x = Math.max(0, Math.min(width, node.x));
      }

      if (node.y < 0 || node.y > height) {
        node.vy *= -1;
        node.y = Math.max(0, Math.min(height, node.y));
      }
    }
  }

  function drawTraces(seconds) {
    context.save();
    context.lineCap = "round";
    context.globalCompositeOperation = "screen";

    for (const trace of traces) {
      if (shouldAnimate) {
        const driftStep = trace.drift * 0.22;
        if (trace.horizontal) {
          trace.x += driftStep;
          if (trace.x - trace.length > width + GRID_STEP) {
            trace.x = -GRID_STEP;
          }
        } else {
          trace.y += driftStep;
          if (trace.y - trace.length > height + GRID_STEP) {
            trace.y = -GRID_STEP;
          }
        }
        trace.pulse = (trace.pulse + trace.pulseSpeed) % 1;
      }

      const startX = trace.x;
      const startY = trace.y;
      const endX = trace.horizontal ? trace.x + trace.length : trace.x;
      const endY = trace.horizontal ? trace.y : trace.y + trace.length;

      const shimmer = 0.42 + 0.58 * Math.sin(seconds * 6 + trace.phase);
      const alpha = 0.14 + shimmer * 0.26;
      context.strokeStyle = `rgba(120, 255, 224, ${alpha.toFixed(3)})`;
      context.lineWidth = 1.15;
      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();

      const pulseX = trace.horizontal ? trace.x + trace.length * trace.pulse : trace.x;
      const pulseY = trace.horizontal ? trace.y : trace.y + trace.length * trace.pulse;
      const pulseGlow = 0.55 + 0.45 * Math.sin(seconds * 10 + trace.phase);
      context.fillStyle = `rgba(171, 255, 237, ${(0.45 + pulseGlow * 0.4).toFixed(3)})`;
      context.shadowColor = "rgba(115, 255, 220, 0.95)";
      context.shadowBlur = 12 + pulseGlow * 10;
      context.beginPath();
      context.arc(pulseX, pulseY, 1.4 + pulseGlow * 1.6, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function drawConnections(seconds) {
    const maxDist = Math.min(166, Math.max(108, width * 0.15));
    const maxDistSquared = maxDist * maxDist;

    context.save();
    context.lineCap = "round";

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];

      for (let j = i + 1; j < nodes.length; j += 1) {
        const other = nodes[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > maxDistSquared) {
          continue;
        }

        const ratio = 1 - distSquared / maxDistSquared;
        const flicker = 0.45 + 0.55 * Math.sin(seconds * 11 + i * 0.4 + j * 0.3);
        const alpha = 0.06 + ratio * 0.28 * flicker;
        context.strokeStyle = `rgba(104, 215, 255, ${alpha.toFixed(3)})`;
        context.lineWidth = 0.8 + ratio;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      }
    }

    context.restore();
  }

  function drawNodes(seconds) {
    context.save();
    context.globalCompositeOperation = "lighter";

    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const pulse = 0.5 + 0.5 * Math.sin(seconds * 8 + node.phase + i * 0.04);
      const radius = node.radius + pulse * 1.45;
      context.fillStyle = `rgba(165, 255, 231, ${(0.36 + pulse * 0.52).toFixed(3)})`;
      context.shadowColor = "rgba(116, 255, 220, 0.9)";
      context.shadowBlur = 8 + pulse * 12;
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function maybeSparkBurst(seconds) {
    if (!shouldAnimate || nodes.length === 0) {
      return;
    }

    const chance = 0.018 + 0.012 * (0.5 + 0.5 * Math.sin(seconds * 4));
    if (Math.random() >= chance) {
      return;
    }

    const emitter = nodes[Math.floor(Math.random() * nodes.length)];
    spawnSparks(emitter.x, emitter.y, 1 + Math.random() * 0.9);
  }

  function updateAndDrawSparks() {
    context.save();
    context.globalCompositeOperation = "lighter";

    for (let i = sparks.length - 1; i >= 0; i -= 1) {
      const spark = sparks[i];

      if (shouldAnimate) {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vx *= 0.97;
        spark.vy *= 0.97;
        spark.life -= spark.decay;
      }

      if (spark.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }

      const alpha = Math.max(0, spark.life);
      context.fillStyle = `rgba(199, 255, 243, ${alpha.toFixed(3)})`;
      context.shadowColor = "rgba(149, 255, 226, 0.9)";
      context.shadowBlur = 10 + spark.life * 14;
      context.beginPath();
      context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }

  function drawFrame(now = performance.now()) {
    const seconds = now * 0.001;
    context.clearRect(0, 0, width, height);
    drawBackdrop(seconds);
    drawTraces(seconds);
    updateNodes(seconds);
    drawConnections(seconds);
    drawNodes(seconds);
    maybeSparkBurst(seconds);
    updateAndDrawSparks();
  }

  function tick(now) {
    drawFrame(now);
    if (shouldAnimate) {
      frameId = window.requestAnimationFrame(tick);
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
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    createScene();
    drawFrame();
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
      window.cancelAnimationFrame(frameId);
      return;
    }

    frameId = window.requestAnimationFrame(tick);
  });

  resizeCanvas();
  if (shouldAnimate) {
    frameId = window.requestAnimationFrame(tick);
  }
})();
