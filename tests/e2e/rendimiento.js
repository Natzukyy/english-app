// Tarea 5: long tasks y layout shifts (Performance API) al recorrer pantallas con animaciones, y
// comportamiento con prefers-reduced-motion emulado. Playwright MCP, con filename.
async (page) => {
  const browser = page.context().browser();
  const out = {};
  for (const reducido of [false, true]) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, reducedMotion: reducido ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(() => {
      window.__perf = { long: [], shifts: 0, shiftList: [] };
      try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__perf.long.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); } catch (e) {}
      try { new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) { window.__perf.shifts += e.value; window.__perf.shiftList.push(+e.value.toFixed(4)); } })).observe({ type: 'layout-shift', buffered: true }); } catch (e) {}
    });
    const p = await ctx.newPage();
    await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
    await p.evaluate(async () => { await window.App.Datos.guardarDiagnostico({ porHabilidad: { lectura: { nivelCEFR: 'A2' }, habla: { nivelCEFR: 'A2' }, escucha: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } }); });
    const por = {};
    for (const r of ['inicio', 'practicar', 'repaso', 'progreso', 'habla', 'lectura', 'diagnostico']) {
      await p.evaluate(() => { window.__perf.long = []; window.__perf.shifts = 0; window.__perf.shiftList = []; });
      await p.goto('http://localhost:8000/#/' + r); await p.waitForTimeout(1600);
      if (r === 'repaso') { await p.keyboard.press('Space'); await p.waitForTimeout(700); await p.keyboard.press('3'); await p.waitForTimeout(700); }
      por[r] = await p.evaluate(() => ({ longTasks: window.__perf.long, cls: +window.__perf.shifts.toFixed(4) }));
    }
    // lluvia bajo medición
    await p.evaluate(() => { window.__perf.long = []; window.__perf.shifts = 0; window.App.Util.anotarCelebracion({ tipo: 'xp', nivel: 2 }); });
    await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2300);
    por.lluvia = await p.evaluate(() => ({ longTasks: window.__perf.long, cls: +window.__perf.shifts.toFixed(4) }));
    // con movimiento reducido: ¿queda alguna animación/transición larga corriendo?
    await p.goto('http://localhost:8000/#/inicio'); await p.waitForTimeout(300);
    por.animacionesActivasInicio = await p.evaluate(() => { return new Promise(r => setTimeout(() => r(document.getAnimations().filter(a => a.playState === 'running').map(a => (a.animationName || a.transitionProperty) + ':' + Math.round(a.effect.getComputedTiming().duration) + 'ms')), 400)); });
    por.estadoFinalLegible = await p.evaluate(() => { const t = document.querySelector('.tarjeta-principal'); const cs = t && getComputedStyle(t); return t && { opacity: cs.opacity, transform: cs.transform.slice(0, 30) }; });
    out[reducido ? 'reducido' : 'normal'] = por;
    await ctx.close();
  }
  return out;
}
