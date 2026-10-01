import { useEffect, useRef, useState } from 'react';
import { CloudRain } from 'lucide-react';

/**
 * Decorative weather layer shown on every dashboard page:
 *   - wind-driven rain steered by the cursor:
 *       cursor left/right of centre -> rain slants that way
 *       fast cursor movement        -> gusts (faster, more slanted rain)
 * Purely visual: pointer-events are off, so the page underneath works exactly as before.
 * Respects "reduce motion" (static storm, no flashes) and has an on/off switch remembered per browser.
 */

interface Drop { x: number; y: number; len: number; speed: number; alpha: number; width: number }


const STORAGE_KEY = 'cyclone-weather-effects';
const readPref = () => {
  try { return localStorage.getItem(STORAGE_KEY) !== 'off'; } catch { return true; }
};

export function RainStormEffect({ density = 1 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [enabled, setEnabled] = useState<boolean>(readPref);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off'); } catch { /* private mode */ }
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;


    let w = 0, h = 0, dpr = 1;
    let drops: Drop[] = [];

    const makeDrop = (anyY: boolean): Drop => ({
      x: Math.random() * (w + 400) - 200,
      y: anyY ? Math.random() * h : -20 - Math.random() * 120,
      len: 10 + Math.random() * 18,
      speed: 0.55 + Math.random() * 0.6,
      alpha: 0.18 + Math.random() * 0.3,
      width: Math.random() < 0.2 ? 1.4 : 0.9,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops = Array.from({ length: Math.min(Math.round((w * h) / 9000 * density), 420) }, () => makeDrop(true));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // cursor-driven wind
    let targetWind = 0, wind = 0, gust = 0;
    let lastX = 0, lastY = 0, lastT = 0;
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      targetWind = (e.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2.2;
      if (lastT) {
        const dt = Math.max(now - lastT, 1);
        const vx = (e.clientX - lastX) / dt, vy = (e.clientY - lastY) / dt;
        gust = Math.min(2.5, gust + Math.hypot(vx, vy) * 0.35);
        targetWind += Math.max(-1, Math.min(1, vx * 0.6));
      }
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0, prev = performance.now();
    const frame = (now: number) => {
      const dtMs = Math.min(now - prev, 50);
      const dt = dtMs / 16.7;
      prev = now;
      wind += (targetWind - wind) * 0.05 * dt;
      targetWind *= Math.pow(0.985, dt);
      gust *= Math.pow(0.95, dt);


      ctx.clearRect(0, 0, w, h);

      // rain
      const fall = 9 * (1 + gust * 0.6);
      const slant = wind * (1 + gust * 0.3);
      ctx.lineCap = 'round';
      for (const d of drops) {
        const vy = fall * d.speed, vx = slant * fall * d.speed * 0.35;
        d.x += vx * dt; d.y += vy * dt;
        if (d.y > h + 30 || d.x < -220 || d.x > w + 220) Object.assign(d, makeDrop(false));
        const k = d.len / Math.hypot(vx, vy);
        ctx.strokeStyle = `rgba(70,110,140,${Math.min(0.85, d.alpha)})`;
        ctx.lineWidth = d.width;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - vx * k, d.y - vy * k); ctx.stroke();
      }

      raf = requestAnimationFrame(frame);
    };

    if (!reduceMotion) raf = requestAnimationFrame(frame);   // reduced motion: nothing moves or flashes

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
      ctx.clearRect(0, 0, w, h);
    };
  }, [enabled, density]);

  return (
    <>
      <div aria-hidden="true" style={{ position: 'sticky', top: 0, height: 0, zIndex: 30, pointerEvents: 'none' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100dvh', pointerEvents: 'none', display: enabled ? 'block' : 'none' }}
        />
      </div>
      <button
        type="button"
        onClick={() => setEnabled((v) => !v)}
        aria-pressed={enabled}
        title={enabled ? 'Turn weather effects off' : 'Turn weather effects on'}
        style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 1000 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#c9dfe8] bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-[#234b60] shadow-lg backdrop-blur hover:bg-[#edf6fa]"
      >
        <CloudRain className="w-3.5 h-3.5 text-[#227896]" /> {enabled ? 'Weather effects on' : 'Weather effects off'}
      </button>
    </>
  );
}

export default RainStormEffect;
