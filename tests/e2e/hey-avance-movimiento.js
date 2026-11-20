// Verifica en un navegador real que (1) la barra "hacia el siguiente nivel" se mueve tras una sesión
// de práctica (Lectura) y se ANIMA (se ve la transición intermedia), y (2) con prefers-reduced-motion
// no queda ninguna animación/transición larga. Servidor local en 8001; MCP de Playwright.
async (page) => {
  const BASE = 'http://localhost:8001/';
  const browser = page.context().browser();
  const salida = {};
  async function nuevo(reducir) {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, reducedMotion: reducir ? 'reduce' : 'no-preference' });
    const p = await ctx.newPage();
    await p.goto(BASE + '#/inicio', { waitUntil: 'networkidle' });
    await p.evaluate(async () => {
      const S = window.App.Storage; for (const st of S.STORES) await S.clearStore(st); localStorage.clear();
      await window.App.Datos.guardarDiagnostico({ porHabilidad: { lectura: { nivelCEFR: 'A2' }, escucha: { nivelCEFR: 'A2' }, vocabulario_gramatica: { nivelCEFR: 'A2' }, habla: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } });
    });
    return { ctx, p };
  }
  const barra = (p, h) => p.evaluate((hab) => { const b = document.querySelector('.progreso-tarjeta-habilidad .barra-nivel[data-habilidad="' + hab + '"] > span'); return b ? { destino: b.getAttribute('data-destino'), transform: getComputedStyle(b).transform } : null; }, h);

  // ---- 1) la barra se mueve tras una sesión de Lectura
  { const { ctx, p } = await nuevo(false);
    await p.goto(BASE + '#/progreso'); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
    salida.antes = await barra(p, 'lectura');
    await p.goto(BASE + '#/lectura'); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
    // contesta todas las preguntas (siempre la opción A; da igual cuántas acierte, la fracción sube con lo que acierte)
    for (let i = 0; i < 30; i++) {
      const hayOpc = await p.evaluate(() => [...document.querySelectorAll('.diagnostico-opcion')].some((x) => !x.disabled));
      if (hayOpc) { await p.evaluate(() => { [...document.querySelectorAll('.diagnostico-opcion')].filter((x) => !x.disabled)[0].click(); }); await p.waitForTimeout(150); }
      const avanzo = await p.evaluate(() => { const b = [...document.querySelectorAll('#pantalla button')].find((x) => !x.disabled && /^(Siguiente|Ver resultado|Ver preguntas|Responder|Empezar|View questions|Start|Next|Answer|See result)/i.test(x.textContent.trim())); if (b) { b.click(); return true; } return false; });
      if (!avanzo && !hayOpc) break;
      await p.waitForTimeout(150);
    }
    await p.waitForTimeout(500);
    salida.respuestasGuardadas = await p.evaluate(async () => (await window.App.Datos.obtenerEstadosAvance()).lectura.ventana.length);
    await p.goto(BASE + '#/progreso'); await p.reload({ waitUntil: 'domcontentloaded' });
    // muestrea la barra durante la animación: debe pasar por valores intermedios
    const muestras = [];
    for (let i = 0; i < 8; i++) { muestras.push(await p.evaluate(() => { const b = document.querySelector('.progreso-tarjeta-habilidad .barra-nivel[data-habilidad="lectura"] > span'); return b ? Number(getComputedStyle(b).transform.replace(/matrix\(([^,]+).*/, '$1')) : null; })); await p.waitForTimeout(90); }
    salida.muestrasTransform = muestras.map((x) => (x === null || isNaN(x) ? x : Math.round(x * 100) / 100));
    await p.waitForTimeout(900);
    salida.despues = await barra(p, 'lectura');
    await ctx.close(); }

  // ---- 2) prefers-reduced-motion: sin animaciones/transiciones largas
  { const { ctx, p } = await nuevo(true);
    for (const ruta of ['inicio', 'progreso', 'repaso', 'practicar', 'lectura']) {
      await p.goto(BASE + '#/' + ruta); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);
      salida['reducido_' + ruta] = await p.evaluate(() => {
        const largas = [];
        document.getAnimations().forEach((a) => { const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null; if (t && (t.duration > 50 || t.endTime > 50) && a.playState === 'running') largas.push((a.animationName || a.transitionProperty || 'anim') + ':' + Math.round(t.endTime)); });
        let transicionesLargas = 0;
        document.querySelectorAll('*').forEach((e) => { const cs = getComputedStyle(e); cs.transitionDuration.split(',').forEach((d) => { if (parseFloat(d) > 0.05) transicionesLargas++; }); });
        return { animacionesLargasEnCurso: largas.slice(0, 5), elementosConTransicionLarga: transicionesLargas };
      });
    }
    await ctx.close(); }
  return salida;
}
