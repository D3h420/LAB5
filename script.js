const ENABLE_BACKGROUND_ANIMATION = true;

(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
})();

(() => {
  const copyButton = document.getElementById("copy-email");
  const copyStatus = document.getElementById("copy-status");
  if (!copyButton || !copyStatus) {
    return;
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "absolute";
    textArea.style.left = "-9999px";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }

  copyButton.addEventListener("click", async () => {
    const email = copyButton.dataset.email;
    if (!email) {
      return;
    }

    try {
      await copyText(email);
      copyStatus.textContent = "Email copied.";
    } catch (error) {
      copyStatus.textContent = "Copy failed.";
    }

    window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1700);
  });
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

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let frameId = 0;

  function createParticles() {
    const amount = Math.max(22, Math.min(54, Math.floor((width * height) / 34000)));
    particles = Array.from({ length: amount }, () => {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        size: 0.8 + Math.random() * 1.9
      };
    });
  }

  function drawBackdrop() {
    const gradient = context.createRadialGradient(
      width * 0.2,
      height * 0.18,
      40,
      width * 0.2,
      height * 0.18,
      Math.max(width, height)
    );
    gradient.addColorStop(0, "rgba(65, 222, 255, 0.08)");
    gradient.addColorStop(0.45, "rgba(15, 47, 89, 0.02)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  function drawFrame() {
    context.clearRect(0, 0, width, height);
    drawBackdrop();

    const maxDist = Math.min(170, Math.max(100, width * 0.14));
    const maxDistSquared = maxDist * maxDist;

    for (let i = 0; i < particles.length; i += 1) {
      const particle = particles[i];

      if (shouldAnimate) {
        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < -5) particle.x = width + 5;
        if (particle.x > width + 5) particle.x = -5;
        if (particle.y < -5) particle.y = height + 5;
        if (particle.y > height + 5) particle.y = -5;
      }

      for (let j = i + 1; j < particles.length; j += 1) {
        const other = particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const distSquared = dx * dx + dy * dy;

        if (distSquared > maxDistSquared) {
          continue;
        }

        const alpha = 0.18 * (1 - distSquared / maxDistSquared);
        context.strokeStyle = `rgba(81, 197, 255, ${alpha.toFixed(3)})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(particle.x, particle.y);
        context.lineTo(other.x, other.y);
        context.stroke();
      }
    }

    for (const particle of particles) {
      context.fillStyle = "rgba(159, 222, 255, 0.8)";
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
  }

  function tick() {
    drawFrame();
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

    createParticles();
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
