// Recorre TODAS las pantallas en los niveles de interfaz 1, 2 y 3 (y 0 si se pide) en 390x844, 360x740 y
// 1440x900. Guarda capturas docs/design-review/hey/<pantalla>-n<nivel>-<viewport>.png y devuelve la lista
// de problemas detectados automáticamente: desborde horizontal, texto cortado, claves de i18n o
// {marcadores} a la vista, "Rumbo" en pantalla, falta de "Hey!", tarjeta "HOY TE TOCA" aplastada y
// elementos que se salen del viewport.
// Cómo se corre: servidor local (python3 -m http.server 8001) y el MCP de Playwright
// (browser_run_code_unsafe con este archivo). NIVELES permite dividir la corrida (cada nivel tarda ~1 min).
async (page) => {
  const NIVELES = (globalThis.__NIVELES) || [1, 2, 3];
  const BASE = 'http://localhost:8001/';
  const OUT = '/Users/alex/Proyectos/app-ingles/docs/design-review/hey/';
  const VIEWS = { '390x844': [390, 844], '360x740': [360, 740], '1440x900': [1440, 900] };
  const DIAS = { 0: 0, 1: 14, 2: 40, 3: 90 };
  const PANTALLAS = ['inicio', 'practicar', 'repaso', 'diagnostico', 'progreso', 'ajustes', 'habla', 'conversacion', 'lectura', 'escucha', 'escritura', 'confirmacion'];
  const browser = page.context().browser();
  const problemas = [];
  let capturas = 0;

  const revisar = () => {
    const out = [];
    const vw = window.innerWidth;
    const visible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    if (document.documentElement.scrollWidth > vw + 1) out.push('scroll horizontal de la página: ' + document.documentElement.scrollWidth + ' > ' + vw);
    document.querySelectorAll('#pantalla *, nav.tabs *, #banner-plan *').forEach((e) => {
      if (!visible(e)) return;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const txt = (e.childElementCount === 0 ? e.textContent : '').trim().slice(0, 50);
      if (r.right > vw + 1 && !e.closest('[style*="overflow"]') && cs.position !== 'fixed') out.push('se sale del viewport por la derecha: <' + e.tagName.toLowerCase() + ' class="' + e.className + '"> ' + txt);
      if (cs.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1) out.push('texto cortado con puntos suspensivos: ' + txt);
      if (e.childElementCount === 0 && txt && (cs.overflow === 'hidden' || cs.overflowX === 'hidden') && e.scrollWidth > e.clientWidth + 1) out.push('texto recortado (overflow hidden): ' + txt);
      if ((e.tagName === 'BUTTON' || e.classList.contains('calcomania')) && e.scrollHeight > e.clientHeight + 3 && cs.overflowY !== 'visible') out.push('contenido recortado en vertical en ' + e.tagName.toLowerCase() + ': ' + txt);
    });
    const texto = (document.getElementById('pantalla').innerText + ' ' + document.querySelector('nav.tabs').innerText);
    const claves = texto.match(/\b[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,}\b/g);
    if (claves) out.push('posible clave de i18n a la vista: ' + [...new Set(claves)].slice(0, 5).join(', '));
    if (/\{\w+\}/.test(texto)) out.push('marcador sin reemplazar: ' + texto.match(/\{\w+\}/)[0]);
    if (/Rumbo/.test(texto + document.title)) out.push('aparece "Rumbo"');
    if (document.title !== 'Hey!') out.push('<title> no es "Hey!": ' + document.title);
    const marca = document.getElementById('marca-sidebar');
    if (vw >= 900 && (!marca || marca.textContent.trim() !== 'Hey!')) out.push('logo de la barra lateral no dice "Hey!": ' + (marca && marca.textContent));
    const tp = document.querySelector('.tarjeta-principal');
    if (tp) {
      const r = tp.getBoundingClientRect();
      if (r.height < 120) out.push('tarjeta HOY TE TOCA aplastada: ' + Math.round(r.height) + 'px');
      if (tp.scrollHeight > tp.clientHeight + 3) out.push('tarjeta HOY TE TOCA con contenido recortado');
    }
    const botones = [...document.querySelectorAll('#pantalla button')].filter(visible);
    botones.forEach((b) => { if (b.getBoundingClientRect().height < 40) out.push('botón de menos de 40px de alto: ' + b.textContent.trim().slice(0, 30)); });
    return out;
  };

  for (const nivel of NIVELES) {
    for (const [vpNombre, [w, h]] of Object.entries(VIEWS)) {
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height: h } });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(String(e)));
      await p.goto(BASE + '#/inicio', { waitUntil: 'networkidle' });
      await p.evaluate(async (dias) => {
        const S = window.App.Storage;
        for (const st of S.STORES) await S.clearStore(st);
        localStorage.clear();
        await window.App.Datos.guardarDiagnostico({ porHabilidad: { lectura: { nivelCEFR: 'B1' }, escucha: { nivelCEFR: 'A2' }, vocabulario_gramatica: { nivelCEFR: 'B2' }, habla: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } });
        for (let i = 0; i < dias; i++) {
          const f = window.App.Fecha.hoyISO(new Date(Date.now() - i * 86400000));
          await S.put('sesiones', { id: f, minutos: 15, metaCumplida: true, ejerciciosCorrectos: 3 });
        }
        for (let i = 0; i < 30; i++) await window.App.Datos.registrarRespuestaAvance('lectura', 'B1', 1, 1, new Date()); // lectura lista para confirmar
        for (let i = 0; i < 22; i++) await window.App.Datos.registrarRespuestaAvance('escucha', 'A2', 1, 1, new Date()); // "Faltan 8 respuestas"
      }, DIAS[nivel]);
      for (const pantalla of PANTALLAS) {
        await p.evaluate((nombre) => {
          localStorage.removeItem('heyModoPaso');
          if (nombre === 'confirmacion') localStorage.setItem('heyModoPaso', JSON.stringify({ tipo: 'confirmacion', habilidad: 'lectura', fecha: window.App.Fecha.hoyISO() }));
        }, pantalla);
        await p.goto(BASE + '#/' + pantalla, { waitUntil: 'networkidle' });
        await p.reload({ waitUntil: 'networkidle' });
        await p.waitForTimeout(1100);
        const nivelReal = await p.evaluate(() => { const t = document.querySelector('nav.tabs [data-i18n]'); return t ? t.textContent : ''; });
        const probs = await p.evaluate(revisar);
        probs.forEach((x) => problemas.push({ pantalla, nivel, viewport: vpNombre, problema: x }));
        await p.screenshot({ path: OUT + pantalla + '-n' + nivel + '-' + vpNombre + '.png', fullPage: true });
        capturas++;
      }
      errs.forEach((e) => problemas.push({ pantalla: '*', nivel, viewport: vpNombre, problema: 'error de JS: ' + e }));
      await ctx.close();
    }
  }
  return { capturas, problemas };
}
