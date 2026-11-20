// Auditoría automática de márgenes (D33). Sin dependencias: usa el Playwright del MCP (o el que ya
// tengas). Recorre todas las pantallas y estados y mide, en cada tarjeta/contenedor (borde, fondo o
// sombra con texto o controles dentro):
//   interior  : distancia contenido→borde < 12 px (< 8 px en pastillas/chips)
//   pantalla  : texto/controles a < 16 px del borde de la pantalla (solo móvil)
//   desborde  : contenido que se sale o se corta
//   hermanas  : tarjetas hermanas a < 8 px o tocándose
//   tactil    : botones de menos de 44 px de alto o ancho
// Cómo se corre (servidor local en 8001 y receptor de resultados, ver tools/auditoria-margenes.md):
//   browser_run_code_unsafe con filename: tools/auditoria-margenes.js
// Para correr solo una parte edita AJUSTES al inicio de la función ({views, niveles, estados, capturas, base, receptor}).
async (page) => {
  // Para correr solo una parte, cambia AJUSTES (p. ej. {niveles:[0], views:{'390x844':[390,844]}, estados:['progreso-datos']}).
  const AJUSTES = {};
  const CFG = Object.assign({
    base: 'http://localhost:8001/',
    receptor: 'http://127.0.0.1:8010/',
    niveles: [0, 3],
    views: { '390x844': [390, 844], '360x740': [360, 740], '1440x900': [1440, 900] },
    estados: null,
    capturas: null, // carpeta para guardar capturas (solo nivel 0, 390x844 y 1440x900)
    sufijo: 'despues'
  }, AJUSTES);
  const browser = page.context().browser();
  const filas = [];
  const errores = [];

  const STUB = "window.__rec={modo:'ok',texto:'Could you send me the file when you get a chance?'};" +
    "class FakeRec{constructor(){this._l={}}addEventListener(t,f){(this._l[t]=this._l[t]||[]).push(f)}" +
    "start(){const s=this,m=window.__rec;Promise.resolve().then(()=>{const e=(t,ev)=>(s._l[t]||[]).forEach(f=>f(ev||{}));" +
    "e('result',{resultIndex:0,results:[Object.assign([{transcript:m.texto}],{isFinal:true})]});e('end');});}stop(){}abort(){}}" +
    "window.SpeechRecognition=FakeRec;window.webkitSpeechRecognition=FakeRec;";

  // ------------------------------------------------------------------ medición (corre en la página)
  const medir = (meta) => {
    const out = [];
    const vw = window.innerWidth;
    // Se mide sin rotación ni animaciones de entrada (las calcomanías giran ±1° y eso agranda el rectángulo).
    const estiloMedicion = document.createElement('style');
    estiloMedicion.textContent = '.calcomania, .superficie-oscura, [class*="pop-entrada"] > *, [class*="pop-entrada"] { transform: none !important; animation: none !important; transition: none !important; opacity: 1 !important; }';
    document.head.appendChild(estiloMedicion);
    const esVisible = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
    const sel = (e) => {
      const partes = [];
      let n = e;
      for (let i = 0; i < 3 && n && n.nodeType === 1 && n.id !== 'pantalla'; i++) {
        const c = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        partes.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (c ? '.' + c : ''));
        n = n.parentElement;
      }
      return partes.join(' > ');
    };
    const alfa = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(',').map(Number); return p.length === 4 ? p[3] : 1; };
    const esTarjeta = (e) => {
      const cs = getComputedStyle(e);
      // Borde en los 4 lados: una línea divisoria (solo border-top) no es una tarjeta.
      const lados = ['Top', 'Right', 'Bottom', 'Left'].filter((l) => parseFloat(cs['border' + l + 'Width']) > 0 && cs['border' + l + 'Style'] !== 'none' && alfa(cs['border' + l + 'Color']) > 0.05).length;
      const borde = lados >= 3;
      const sombra = cs.boxShadow !== 'none';
      const p = e.parentElement ? getComputedStyle(e.parentElement) : null;
      const fondo = alfa(cs.backgroundColor) > 0.05 && (!p || cs.backgroundColor !== p.backgroundColor);
      return borde || sombra || fondo;
    };
    const rangoTexto = (nodo) => {
      const rs = [];
      const w = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT);
      let t;
      while ((t = w.nextNode())) {
        if (!t.textContent.trim()) continue;
        const pe = t.parentElement;
        if (!pe || !esVisible(pe)) continue;
        const r = document.createRange(); r.selectNodeContents(t);
        [...r.getClientRects()].forEach((q) => { if (q.width > 0 && q.height > 0) rs.push(q); });
      }
      return rs;
    };
    const contenido = (e) => {
      const rs = rangoTexto(e);
      e.querySelectorAll('svg, img, button, input, select, textarea, .barra-progreso, canvas').forEach((c) => {
        if (esVisible(c)) rs.push(c.getBoundingClientRect());
      });
      return rs;
    };
    const raiz = document.getElementById('pantalla');
    const extra = [...document.querySelectorAll('.celebracion, .aviso-celebracion, .toast, [role="dialog"], [role="alert"], .lluvia-calcomanias')];
    const zonas = [raiz, ...extra].filter(Boolean);
    const candidatos = [];
    zonas.forEach((z) => z.querySelectorAll('*').forEach((e) => {
      if (!esVisible(e) || /^(path|circle|rect|line|polyline|g|use|span)$/i.test(e.tagName) && e.tagName.toLowerCase() !== 'span') return;
      if (e.closest('svg')) return;
      if (e.classList.contains('lectura-termino') || e.classList.contains('lluvia-pieza') || e.classList.contains('confeti')) return;
      if (!esTarjeta(e)) return;
      candidatos.push(e);
    }));
    candidatos.forEach((e) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      const bw = { t: parseFloat(cs.borderTopWidth) || 0, r: parseFloat(cs.borderRightWidth) || 0, b: parseFloat(cs.borderBottomWidth) || 0, l: parseFloat(cs.borderLeftWidth) || 0 };
      const cont = contenido(e).filter((q) => !(q.width >= r.width - 1 && q.height >= r.height - 1));
      if (!cont.length) return;
      // Insignia: círculo/cuadrito de ≤ 44 px con UN glifo centrado (letra A-D, número de paso, icono): ahí 4 px bastan.
      const insignia = r.width <= 44 && r.height <= 44;
      const pastilla = r.height <= 40 || (e.tagName === 'BUTTON' && r.height <= 56 && !e.querySelector('p'));
      // Compactos (≤ 72 px en su lado menor): fichas, filas de una línea, mosaicos de la ruta: 8 px.
      const compacto = Math.min(r.width, r.height) <= 72;
      const lim = insignia ? 4 : (pastilla || compacto) ? 8 : 12;
      const ancho = r.width < 6 || r.height < 6;
      if (ancho) return;
      const u = { t: Math.min(...cont.map((q) => q.top)), b: Math.max(...cont.map((q) => q.bottom)), l: Math.min(...cont.map((q) => q.left)), r: Math.max(...cont.map((q) => q.right)) };
      const d = { arriba: u.t - (r.top + bw.t), abajo: (r.bottom - bw.b) - u.b, izquierda: u.l - (r.left + bw.l), derecha: (r.right - bw.r) - u.r };
      Object.keys(d).forEach((lado) => {
        if (d[lado] < lim - 0.5) out.push({ regla: 'interior', selector: sel(e), medida: Math.round(d[lado] * 10) / 10 + 'px ' + lado + ' (mín ' + lim + ')', sev: d[lado] < 4 ? 'alta' : d[lado] < lim * 0.7 ? 'media' : 'baja' });
      });
      // desborde
      if (e.scrollWidth > e.clientWidth + 2 && /(hidden|auto|scroll|clip)/.test(cs.overflowX)) out.push({ regla: 'desborde', selector: sel(e), medida: 'scrollWidth ' + e.scrollWidth + ' > ' + e.clientWidth, sev: 'alta' });
      if (e.scrollHeight > e.clientHeight + 2 && /(hidden|clip)/.test(cs.overflowY) && cs.overflowY !== 'visible') out.push({ regla: 'desborde', selector: sel(e), medida: 'scrollHeight ' + e.scrollHeight + ' > ' + e.clientHeight, sev: 'alta' });
      const fuera = cont.some((q) => q.right > r.right + 2 || q.left < r.left - 2);
      if (fuera) out.push({ regla: 'desborde', selector: sel(e), medida: 'contenido fuera del borde horizontal', sev: 'alta' });
    });
    // texto o controles cerca del borde de la pantalla (móvil)
    if (vw < 900) {
      const vistos = new Set();
      zonas.forEach((z) => {
        rangoTexto(z).forEach((q) => { if ((q.left < 15.5 || q.right > vw - 15.5) && !vistos.has(Math.round(q.left) + ',' + Math.round(q.top))) { vistos.add(Math.round(q.left) + ',' + Math.round(q.top)); out.push({ regla: 'pantalla', selector: 'texto @' + Math.round(q.left) + ',' + Math.round(q.top), medida: Math.round(Math.min(q.left, vw - q.right)) + 'px del borde de la pantalla', sev: 'media' }); } });
      });
    }
    if (document.documentElement.scrollWidth > vw + 1) out.push({ regla: 'desborde', selector: 'html', medida: 'scroll horizontal ' + document.documentElement.scrollWidth + ' > ' + vw, sev: 'alta' });
    // hermanas
    const porPadre = new Map();
    candidatos.forEach((e) => { if (!e.parentElement) return; if (!porPadre.has(e.parentElement)) porPadre.set(e.parentElement, []); porPadre.get(e.parentElement).push(e); });
    porPadre.forEach((hijos) => {
      const grandes = hijos.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 80 && r.height > 36; });
      for (let i = 0; i < grandes.length; i++) for (let j = i + 1; j < grandes.length; j++) {
        const a = grandes[i].getBoundingClientRect(), b = grandes[j].getBoundingClientRect();
        const solapeX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const solapeY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        let gap = null;
        if (solapeX > 8) gap = Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom);
        else if (solapeY > 8) gap = Math.max(a.left, b.left) - Math.min(a.right, b.right);
        if (gap !== null && gap < 7.5) out.push({ regla: 'hermanas', selector: sel(grandes[i]) + '  ↔  ' + sel(grandes[j]), medida: Math.round(gap * 10) / 10 + 'px entre tarjetas', sev: gap <= 0 ? 'alta' : 'media' });
      }
    });
    // áreas táctiles
    zonas.forEach((z) => z.querySelectorAll('button, [role="button"], [role="radio"], a[href], input:not([type=hidden]), select, summary').forEach((e) => {
      if (!esVisible(e) || e.classList.contains('lectura-termino')) return;
      // Casilla dentro de un <label> de ≥ 44 px: el área táctil es toda la fila.
      const lab = e.closest('label, .escritura-criterio');
      if (lab && (e.type === 'checkbox' || e.type === 'radio') && lab.getBoundingClientRect().height >= 43.5) return;
      const r = e.getBoundingClientRect();
      if (r.height < 43.5 || r.width < 43.5) out.push({ regla: 'tactil', selector: sel(e), medida: Math.round(r.width) + '×' + Math.round(r.height) + 'px (mín 44)', sev: Math.min(r.width, r.height) < 32 ? 'alta' : 'baja' });
    }));
    estiloMedicion.remove();
    // quitar repetidos
    const vistos = new Set();
    return out.filter((f) => { const k = f.regla + f.selector + f.medida; if (vistos.has(k)) return false; vistos.add(k); return true; }).map((f) => Object.assign(f, meta));
  };

  // ------------------------------------------------------------------ escenarios
  const DIAG = { porHabilidad: { lectura: { nivelCEFR: 'B1' }, escucha: { nivelCEFR: 'A2' }, vocabulario_gramatica: { nivelCEFR: 'B2' }, habla: { nivelCEFR: 'A2' }, escritura: { nivelCEFR: 'A2' } } };
  async function sembrar(p, nivel, tipo) {
    await p.evaluate(async ({ nivel, tipo, DIAG }) => {
      const S = window.App.Storage; for (const st of S.STORES) await S.clearStore(st); localStorage.clear();
      const dias = { 0: 0, 3: 90 }[nivel];
      for (let i = 0; i < dias; i++) await S.put('sesiones', { id: window.App.Fecha.hoyISO(new Date(Date.now() - i * 86400000)), minutos: 15, metaCumplida: true, ejerciciosCorrectos: 3 });
      if (tipo === 'vacio') return;
      await window.App.Datos.guardarDiagnostico(DIAG);
      const R = (h, n, v, niv) => { let p2 = Promise.resolve(); for (let i = 0; i < n; i++) p2 = p2.then(() => window.App.Datos.registrarRespuestaAvance(h, niv, typeof v === 'function' ? v(i) : v, 1, new Date())); return p2; };
      if (tipo === 'datos' || tipo === 'techo') {
        await R('lectura', 30, 1, 'B1');          // lista para confirmar
        await R('escucha', 22, 1, 'A2');          // faltan 8
        await R('habla', 30, 0.2, 'A2');          // necesitas aciertos
        if (tipo === 'techo') await S.put('avance', { id: 'escritura', nivel: 'C2', ventana: [], listaParaConfirmar: false, listaDesde: null, ultimoFallo: null }); // nivel máximo
      }
    }, { nivel, tipo, DIAG });
  }
  const ir = async (p, ruta, ms) => { await p.goto(CFG.base + '#/' + ruta, { waitUntil: 'networkidle' }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(ms || 1100); };
  const clic = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (e && !e.disabled) { e.click(); return true; } return false; }, sel);
  const clicTexto = (p, rx) => p.evaluate((src) => { const b = [...document.querySelectorAll('#pantalla button')].find((x) => !x.disabled && new RegExp(src, 'i').test(x.textContent.trim())); if (b) { b.click(); return true; } return false; }, rx);
  const modo = (p, m) => p.evaluate((m) => { localStorage.removeItem('heyModoPaso'); if (m) localStorage.setItem('heyModoPaso', JSON.stringify(Object.assign({ fecha: window.App.Fecha.hoyISO() }, m))); }, m || null);
  async function responder(p, maxPasos) {
    for (let i = 0; i < maxPasos; i++) {
      const hay = await p.evaluate(() => [...document.querySelectorAll('.diagnostico-opcion')].some((x) => !x.disabled));
      if (hay) { await p.evaluate(() => { [...document.querySelectorAll('.diagnostico-opcion')].filter((x) => !x.disabled)[0].click(); }); await p.waitForTimeout(60); }
      const ok = await clicTexto(p, '^(Siguiente|Next|Ver resultado|See result|Responder|Answer|Ver preguntas|View questions|Comprobar|Check)');
      if (!hay && !ok) break;
      await p.waitForTimeout(60);
    }
  }

  // [nombre de estado, tipo de siembra, función que deja la pantalla lista]
  const ESTADOS = [
    ['inicio-sin-diagnostico', 'vacio', async (p) => { await ir(p, 'inicio'); }],
    ['inicio-plan-activo', 'diag', async (p) => { await ir(p, 'inicio'); }],
    ['inicio-con-confirmacion', 'datos', async (p) => { await ir(p, 'inicio'); await p.evaluate(async () => { const h = window.App.Fecha.hoyISO(); const pl = await window.App.Storage.get('plan', h); pl.pasos.forEach((x) => { if (x.tipo !== 'confirmacion') x.completado = true; }); await window.App.Storage.put('plan', pl); }); await ir(p, 'inicio'); }],
    ['inicio-plan-completado', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(async () => { const h = window.App.Fecha.hoyISO(); const pl = await window.App.Storage.get('plan', h); pl.pasos.forEach((x) => { x.completado = true; }); await window.App.Storage.put('plan', pl); }); await ir(p, 'inicio'); }],
    ['inicio-dia-completo', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(async () => { const h = window.App.Fecha.hoyISO(); const pl = await window.App.Storage.get('plan', h); const n = pl.pasos.length - 1; pl.pasos.forEach((x, i) => { if (i < n) x.completado = true; }); await window.App.Storage.put('plan', pl); const u = pl.pasos[n]; localStorage.setItem('heyFlujoEnCurso', JSON.stringify({ fecha: h, indice: n, tipo: u.tipo, habilidad: u.habilidad || null })); localStorage.setItem('heyPasoTerminado', u.tipo === 'practica' ? u.habilidad : u.tipo === 'reevaluacion' ? 'diagnostico' : u.tipo); }); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200); }],
    ['practicar', 'datos', async (p) => { await ir(p, 'practicar'); }],
    ['repaso-frente', 'diag', async (p) => { await ir(p, 'repaso'); }],
    ['repaso-reverso', 'diag', async (p) => { await ir(p, 'repaso'); await p.evaluate(() => { const c = document.querySelector('.tarjeta-repaso, .repaso-marco, #tarjeta'); if (c) c.click(); }); await clicTexto(p, 'Mostrar|Revelar|Show|Reveal|Flip|Ver'); await p.keyboard.press('Space'); await p.waitForTimeout(900); }],
    ['repaso-fin', 'diag', async (p) => { await ir(p, 'repaso'); for (let i = 0; i < 40; i++) { const hecho = await p.evaluate(() => !document.querySelector('.tarjeta-repaso, .repaso-marco, #tarjeta')); if (hecho) break; await p.keyboard.press('Space'); await p.waitForTimeout(80); await p.keyboard.press('3'); await p.waitForTimeout(420); } await p.waitForTimeout(800); }],
    ['diagnostico-pregunta', 'vacio', async (p) => { await ir(p, 'diagnostico'); }],
    ['diagnostico-pregunta-escucha', 'vacio', async (p) => { await ir(p, 'diagnostico'); for (let i = 0; i < 40; i++) { const esc = await p.evaluate(() => !!document.querySelector('#btn-reproducir')); if (esc) break; await responder(p, 2); } }],
    ['diagnostico-autoevaluacion', 'vacio', async (p) => { await ir(p, 'diagnostico'); await responder(p, 200); await p.waitForTimeout(500); }],
    ['diagnostico-resultado', 'vacio', async (p) => { await ir(p, 'diagnostico'); await responder(p, 200); for (let i = 0; i < 2; i++) { await clic(p, '.diagnostico-rubrica-fila'); await p.waitForTimeout(400); } await p.waitForTimeout(1500); }],
    ['confirmacion-pregunta', 'datos', async (p) => { await modo(p, { tipo: 'confirmacion', habilidad: 'lectura' }); await ir(p, 'confirmacion'); }],
    ['confirmacion-resultado', 'datos', async (p) => { await modo(p, { tipo: 'confirmacion', habilidad: 'lectura' }); await ir(p, 'confirmacion'); await responder(p, 60); await p.waitForTimeout(1500); }],
    ['progreso-datos', 'datos', async (p) => { await ir(p, 'progreso', 1500); }],
    ['progreso-nivel-maximo', 'techo', async (p) => { await ir(p, 'progreso', 1500); }],
    ['progreso-sin-datos', 'diag', async (p) => { await ir(p, 'progreso', 1500); }],
    ['ajustes', 'datos', async (p) => { await ir(p, 'ajustes'); }],
    ['ajustes-import-invalido', 'datos', async (p) => { await ir(p, 'ajustes'); await p.setInputFiles('#input-importar', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('no es json') }); await p.waitForTimeout(700); }],
    ['habla-inicio', 'diag', async (p) => { await ir(p, 'habla'); }],
    ['habla-resultado', 'diag', async (p) => { await ir(p, 'habla'); await clic(p, '#btn-hablar'); await p.waitForTimeout(1200); }],
    ['habla-confirmacion', 'datos', async (p) => { await modo(p, { tipo: 'confirmacion', habilidad: 'habla' }); await ir(p, 'habla'); }],
    ['conversacion', 'diag', async (p) => { await ir(p, 'conversacion'); }],
    ['lectura-texto', 'diag', async (p) => { await ir(p, 'lectura'); }],
    ['lectura-pregunta', 'diag', async (p) => { await ir(p, 'lectura'); await clicTexto(p, '^(Ver preguntas|View questions)'); await p.waitForTimeout(500); }],
    ['lectura-resultado', 'diag', async (p) => { await ir(p, 'lectura'); await responder(p, 60); await p.waitForTimeout(800); }],
    ['escucha-inicio', 'diag', async (p) => { await ir(p, 'escucha'); }],
    ['escucha-pregunta', 'diag', async (p) => { await ir(p, 'escucha'); await clicTexto(p, '^(Ver preguntas|View questions|Responder|Answer)'); await clic(p, '#btn-escuchar, #btn-reproducir'); await p.waitForTimeout(600); await responder(p, 1); }],
    ['escucha-resultado', 'diag', async (p) => { await ir(p, 'escucha'); await p.evaluate(() => { const e = document.querySelector('#pantalla'); }); await responder(p, 60); await p.waitForTimeout(800); }],
    ['escritura-escribiendo', 'diag', async (p) => { await ir(p, 'escritura'); }],
    ['escritura-revision', 'diag', async (p) => { await ir(p, 'escritura'); await p.evaluate(() => { const t = document.querySelector('textarea'); if (t) { t.value = 'I usually wake up at seven and have breakfast. Then I go to work.'; t.dispatchEvent(new Event('input', { bubbles: true })); } }); await clicTexto(p, '^(Terminar de escribir|Finish writing|Terminar|Finish)'); await p.waitForTimeout(800); }],
    ['escritura-confirmacion', 'datos', async (p) => { await p.evaluate(async () => { for (let i = 0; i < 60; i++) await window.App.Datos.registrarRespuestaAvance('escritura', 'A2', 1, 0.5, new Date()); }); await modo(p, { tipo: 'confirmacion', habilidad: 'escritura' }); await ir(p, 'escritura'); }],
    ['celebracion-y-lluvia', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(() => { window.App.Util.mostrarCelebracion('¡Nuevo nivel de inglés: B1', true); }); await p.waitForTimeout(500); }],
    ['lluvia-dia-completo', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(() => { window.App.Util.lluviaCalcomanias(); }); await p.waitForTimeout(600); }]
  ];

  const filtro = CFG.estados;
  for (const nivel of CFG.niveles) {
    for (const [vpNombre, [w, h]] of Object.entries(CFG.views)) {
      const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height: h } });
      await ctx.addInitScript(STUB);
      const p = await ctx.newPage();
      p.on('pageerror', (e) => errores.push(nivel + '/' + vpNombre + ': ' + String(e)));
      await p.goto(CFG.base + '#/inicio', { waitUntil: 'networkidle' });
      let ultimaSiembra = null;
      for (const [nombre, tipo, preparar] of ESTADOS) {
        if (filtro && !filtro.includes(nombre)) continue;
        try {
          await sembrar(p, nivel, tipo);
          await p.evaluate(() => { localStorage.removeItem('heyFlujoEnCurso'); localStorage.removeItem('heyPasoTerminado'); });
          await preparar(p);
          await p.waitForTimeout(400);
          const pantalla = nombre.split('-')[0];
          const r = await p.evaluate(medir, { pantalla, estado: nombre, viewport: vpNombre, nivel });
          filas.push(...r);
          if (CFG.capturas && nivel === 0 && vpNombre !== '360x740') await p.screenshot({ path: CFG.capturas + nombre + '-' + vpNombre + '-' + CFG.sufijo + '.png', fullPage: true });
        } catch (e) { errores.push(nivel + '/' + vpNombre + '/' + nombre + ': ' + e.message.slice(0, 120)); }
      }
      await ctx.close();
    }
  }
  const resultado = { filas, errores, total: filas.length };
  try { await fetch(CFG.receptor, { method: 'POST', body: JSON.stringify(resultado) }); } catch (e) { resultado.receptorFalla = String(e); }
  const porPantalla = {}; filas.forEach((f) => { porPantalla[f.pantalla] = (porPantalla[f.pantalla] || 0) + 1; });
  return { total: filas.length, porPantalla, errores: errores.slice(0, 20), receptorFalla: resultado.receptorFalla || null };
}
