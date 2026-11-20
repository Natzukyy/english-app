// Tarea 7: auditoría de accesibilidad por pantalla (celular 390x844). Playwright MCP, con filename.
// Mide: objetos táctiles <44px, controles sin nombre accesible, roles de grupos, anillo de foco
// al navegar con Tab (visible y no solo el de por defecto), orden de foco vs. orden visual.
async (page) => {
  const browser = page.context().browser();
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    await window.App.Datos.guardarDiagnostico({ porHabilidad: { lectura: { nivelCEFR: 'A2' }, habla: { nivelCEFR: 'A2' }, escucha: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } });
  });
  const rutas = ['inicio', 'repaso', 'diagnostico', 'progreso', 'ajustes', 'habla', 'conversacion', 'practicar', 'lectura', 'escucha', 'escritura'];
  const res = {};
  for (const r of rutas) {
    await p.goto('http://localhost:8000/#/' + r); await p.waitForTimeout(1100);
    res[r] = await p.evaluate(() => {
      const vis = e => { const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const nombre = e => (e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || e.textContent || e.getAttribute('title') || e.getAttribute('placeholder') || (e.id && document.querySelector('label[for="' + e.id + '"]')?.textContent) || '').trim();
      const desc = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '');
      const inter = [...document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [tabindex]:not([tabindex="-1"])')].filter(vis);
      const chicos = inter.filter(e => { const b = e.getBoundingClientRect(); return (b.width < 44 || b.height < 44) && !e.closest('.lectura-texto, .lectura-tarjeta-texto, p'); })
        .map(e => { const b = e.getBoundingClientRect(); return desc(e) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height); });
      const sinNombre = inter.filter(e => !nombre(e)).map(desc);
      const inlineVocab = inter.filter(e => e.closest('p, .lectura-texto')).length;
      const grupos = [...document.querySelectorAll('[role=radiogroup], [role=group], [role=tablist]')].length;
      const opciones = [...document.querySelectorAll('.diagnostico-opcion')].length;
      const opcionesConRol = [...document.querySelectorAll('.diagnostico-opcion')].filter(e => e.getAttribute('role') || e.hasAttribute('aria-pressed') || e.hasAttribute('aria-checked') || e.hasAttribute('aria-current')).length;
      const imgsSinAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
      const svgSueltos = [...document.querySelectorAll('svg')].filter(s => !s.closest('button, a, [aria-hidden=true]') && !s.getAttribute('aria-hidden') && !s.getAttribute('aria-label')).length;
      return { interactivos: inter.length, chicos, sinNombre, inlineVocab, grupos, opciones, opcionesConRol, imgsSinAlt, svgSueltosSinOcultar: svgSueltos, lang: document.documentElement.lang, titulo: document.title };
    });
  }
  // Foco con Tab: anillo visible y orden lógico (por pantalla, hasta 25 tabulaciones)
  const foco = {};
  for (const r of ['inicio', 'repaso', 'diagnostico', 'ajustes', 'practicar']) {
    await p.goto('http://localhost:8000/#/' + r); await p.waitForTimeout(1000);
    await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
    const pasos = [];
    for (let i = 0; i < 25; i++) {
      await p.keyboard.press('Tab');
      pasos.push(await p.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return null;
        const cs = getComputedStyle(e); const b = e.getBoundingClientRect();
        const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
        const sombraFoco = cs.boxShadow && cs.boxShadow !== 'none';
        return { el: e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : ''), outline, ancho: cs.outlineWidth, color: cs.outlineColor, offset: cs.outlineOffset, y: Math.round(b.y), x: Math.round(b.x), enNav: !!e.closest('nav') };
      }));
    }
    const validos = pasos.filter(Boolean);
    const sinAnillo = validos.filter(s => !s.outline).map(s => s.el);
    // orden visual: dentro de #pantalla, ¿el foco avanza hacia abajo/derecha sin saltos grandes hacia atrás?
    const enPantalla = validos.filter(s => !s.enNav);
    let saltosAtras = 0; for (let i = 1; i < enPantalla.length; i++) { if (enPantalla[i].y < enPantalla[i - 1].y - 40) saltosAtras++; }
    foco[r] = { tabulaciones: validos.length, sinAnillo, saltosAtras, primeros: validos.slice(0, 6).map(s => s.el), anillo: validos[0] && { ancho: validos[0].ancho, color: validos[0].color, offset: validos[0].offset } };
  }
  await ctx.close();
  return { res, foco, errs };
}
