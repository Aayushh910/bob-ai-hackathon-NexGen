import React, { useEffect, useRef } from 'react';

export default function TacticalBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Particle / Sensor Node Definition (Pure Monochromatic Tactical)
    const nodeCount = Math.min(50, Math.floor((width * height) / 26000));
    const nodes = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() > 0.85 ? 1.8 : 1.2,
        isBeacon: Math.random() > 0.82,
        pulseRadius: 0,
        pulseAlpha: 0,
      });
    }

    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('resize', handleResize);

    // Main Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Subtle Monochrome Connection Vectors
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < 130) {
            const alpha = (1 - dist / 130) * 0.08;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // 2. Draw Nodes & Gentle Pulses (Monochromatic White / Subtle Emerald)
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Update position
        n.x += n.vx;
        n.y += n.vy;

        // Bounce off edges
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        // Mouse gentle push
        const mdx = n.x - mouse.x;
        const mdy = n.y - mouse.y;
        const mdist = Math.hypot(mdx, mdy);
        if (mdist < 100) {
          const force = (1 - mdist / 100) * 0.6;
          n.x += (mdx / (mdist || 1)) * force;
          n.y += (mdy / (mdist || 1)) * force;
        }

        // Draw node
        if (n.isBeacon) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6;
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw radar pulse for beacon nodes
        if (n.isBeacon) {
          n.pulseRadius += 0.35;
          n.pulseAlpha = Math.max(0, 0.35 * (1 - n.pulseRadius / 28));

          if (n.pulseRadius > 28) {
            n.pulseRadius = 0;
            n.pulseAlpha = 0.35;
          }

          ctx.strokeStyle = `rgba(255, 255, 255, ${n.pulseAlpha * 0.6})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.pulseRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="tactical-bg-root" aria-hidden="true">
      {/* Pure Black Grid Pattern */}
      <div className="tactical-grid-overlay" />
      {/* Tactical Deep Black Vignette */}
      <div className="tactical-ambient-vignette" />
      {/* Dynamic Monochromatic Sensor Node Canvas */}
      <canvas ref={canvasRef} className="tactical-canvas" />
    </div>
  );
}
