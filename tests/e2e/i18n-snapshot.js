// Foto del texto visible de TODAS las pantallas (interfaz en español, 390x844) para comprobar que
// mover el texto a data/i18n no cambia nada. Determinista: Math.random con semilla, reloj fijo,
// reconocimiento de voz simulado. Playwright MCP: browser_run_code_unsafe con filename.
// Guarda el resultado en tests/e2e/<DESTINO> vía un receptor local (127.0.0.1:8010, ver README del
// proceso); compara con: python3 scripts/comparar_snapshots.py antes despues
async (page) => {
  const DESTINO = 'i18n-despues.json';
  const browser = page.context().browser();
  const out = {}; const errs = [];
  const SEED = "(()=>{let s=12345;Math.random=()=>{s=(s*1664525+1013904223)%4294967296;return s/4294967296;};})();";
  const STUB_REC = "window.__rec={modo:'ok',texto:''};" +
    "class FakeRec{constructor(){this._l={}}addEventListener(t,f){(this._l[t]=this._l[t]||[]).push(f)}" +
    "start(){const self=this;const m=window.__rec;if(m.modo==='colgado')return;Promise.resolve().then(()=>Promise.resolve()).then(()=>{" +
    "const emit=(t,ev)=>(self._l[t]||[]).forEach(f=>f(ev||{}));" +
    "if(m.modo==='ok'){emit('result',{resultIndex:0,results:[Object.assign([{transcript:m.texto}],{isFinal:true})]});}else{emit('error',{error:m.modo});}" +
    "emit('end');});}stop(){}abort(){}}" +
    "window.SpeechRecognition=FakeRec;window.webkitSpeechRecognition=FakeRec;";
  const SIN_REC = "window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;";
  const DIAG = { porHabilidad: { lectura:{nivelCEFR:'B1',porcentajeHaciaB2:50}, escucha:{nivelCEFR:'A2',porcentajeHaciaB2:20}, vocabulario_gramatica:{nivelCEFR:'B2',porcentajeHaciaB2:100}, habla:{nivelCEFR:'A2',porcentajeHaciaB2:0}, escritura:{nivelCEFR:'A1',porcentajeHaciaB2:0} } };

  async function nuevo(conRec) {
    const ctx = await browser.newContext({ serviceWorkers:'block', viewport:{width:390,height:844} });
    await ctx.addInitScript(SEED); await ctx.addInitScript(conRec ? STUB_REC : SIN_REC);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(String(e)));
    await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
    return { ctx, p };
  }
  const esperar = (p, ms) => p.waitForTimeout(ms || 700);
  const snap = async (p, nombre) => {
    out[nombre] = await p.evaluate(() => {
      const b = document.getElementById('banner-plan');
      const t = document.getElementById('pantalla').innerText.replace(/\s+/g, ' ').trim();
      return b && !b.hidden ? t + ' ## BANNER: ' + b.innerText.replace(/\s+/g, ' ').trim() : t;
    });
  };
  const ir = async (p, ruta) => { await p.goto('http://localhost:8000/#/' + ruta); await p.reload({ waitUntil: 'networkidle' }); await esperar(p, 900); };
  const clickTexto = (p, rx) => p.evaluate((src) => { const b=[...document.querySelectorAll('#pantalla button')].find(x=>!x.disabled && new RegExp(src,'i').test(x.textContent.trim())); if(b){b.click(); return true;} return false; }, rx);
  const clickSel = (p, sel) => p.evaluate((s) => { const e=document.querySelector(s); if(e&&!e.disabled){e.click(); return true;} return false; }, sel);
  const hash = (p) => p.evaluate(() => location.hash);
  const sembrar = (p, diag) => p.evaluate(async (d) => { if (d) await window.App.Datos.guardarDiagnostico(d); localStorage.removeItem('rumboFlujoEnCurso'); localStorage.removeItem('rumboPasoTerminado'); }, diag || null);
  const prefs = (p, extra) => p.evaluate(async (e) => { await window.App.Datos.guardarPreferencias(Object.assign({}, await window.App.Datos.obtenerPreferencias(), e)); }, extra);
  async function responderPreguntas(p, prefijo, soloPrimeras) {
    let n = 0;
    for (let i = 0; i < 12; i++) {
      const hayOpc = await p.evaluate(() => [...document.querySelectorAll('.diagnostico-opcion')].some(x => !x.disabled));
      if (!hayOpc && !(await clickTexto(p, '^(Siguiente|Ver resultado|Responder|Comprobar)'))) break;
      if (hayOpc) { await p.evaluate(() => { const o=[...document.querySelectorAll('.diagnostico-opcion')].filter(x=>!x.disabled); o[0].click(); }); await esperar(p, 250); if (n === 0) await snap(p, prefijo + '_seleccionada'); await clickTexto(p, '^(Responder|Comprobar)'); await esperar(p, 400); if (n === 0) await snap(p, prefijo + '_comprobada'); n++; await clickTexto(p, '^(Siguiente|Ver resultado)'); await esperar(p, 400); }
      if (soloPrimeras && n >= soloPrimeras) break;
    }
  }

  // ====== ESCENARIO 1: sin reconocimiento de voz ======
  { const { ctx, p } = await nuevo(false);
    await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' }); await esperar(p, 900);
    await snap(p, 'inicio_sin_diagnostico');
    await ir(p, 'practicar'); await snap(p, 'practicar_sin_datos');
    await ir(p, 'progreso'); await snap(p, 'progreso_sin_diag');
    await ir(p, 'ajustes'); await snap(p, 'ajustes');
    await p.setInputFiles('#input-importar', { name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('esto no es json') }); await esperar(p, 600); await snap(p, 'ajustes_import_invalido');
    await ir(p, 'conversacion'); await snap(p, 'conversacion_no_config');
    // Diagnóstico completo (con teclado)
    await ir(p, 'diagnostico'); await snap(p, 'diag_pregunta1');
    await p.keyboard.press('c'); await esperar(p, 250); await snap(p, 'diag_seleccionada');
    await p.keyboard.press('Enter'); await esperar(p, 400); await snap(p, 'diag_comprobada');
    await p.keyboard.press('Enter'); await esperar(p, 300);
    let escuchaVista = false;
    for (let i = 0; i < 60; i++) {
      if (!await p.$('.diagnostico-opcion')) break;
      if (!escuchaVista && await p.$('#btn-reproducir')) { await snap(p, 'diag_escucha'); escuchaVista = true; }
      await p.keyboard.press('a'); await p.keyboard.press('Enter'); await esperar(p, 70); await p.keyboard.press('Enter'); await esperar(p, 70);
    }
    await esperar(p, 400); await snap(p, 'diag_autoeval_habla');
    await p.evaluate(() => document.querySelector('.diagnostico-rubrica-fila')?.click()); await esperar(p, 500);
    await snap(p, 'diag_autoeval_escritura');
    await p.evaluate(() => document.querySelector('.diagnostico-rubrica-fila')?.click()); await esperar(p, 800); await snap(p, 'diag_resultado');
    await sembrar(p, DIAG);
    // Inicio y plan con diagnóstico
    const estados = {
      diagnostico: [{tipo:'diagnostico',minutos:15}],
      repaso: [{tipo:'repaso',minutos:8,tarjetasVencidas:12,tarjetasNuevas:3},{tipo:'practica',habilidad:'lectura',minutos:7,nivelCEFR:'A2'}],
      repaso1: [{tipo:'repaso',minutos:5,tarjetasVencidas:1,tarjetasNuevas:0}],
      lectura: [{tipo:'practica',habilidad:'lectura',minutos:10,nivelCEFR:'A2'}],
      escucha: [{tipo:'practica',habilidad:'escucha',minutos:10,nivelCEFR:'B1'}],
      habla: [{tipo:'practica',habilidad:'habla',minutos:10,nivelCEFR:'B2'}],
      escritura: [{tipo:'practica',habilidad:'escritura',minutos:10,nivelCEFR:'A2'}],
      conversacion: [{tipo:'conversacion',minutos:10}],
      reevaluacion: [{tipo:'reevaluacion',minutos:15}],
      continuar: [{tipo:'repaso',minutos:8,tarjetasVencidas:5,tarjetasNuevas:0,completado:true},{tipo:'conversacion',minutos:10}],
      completado: [{tipo:'repaso',minutos:8,completado:true},{tipo:'practica',habilidad:'habla',minutos:10,completado:true}]
    };
    for (const [nombre, pasos] of Object.entries(estados)) {
      await p.evaluate(async ([pasos]) => { const hoy = window.App.Fecha.hoyISO(new Date()); pasos.forEach(x => { if (x.completado === undefined) x.completado = false; }); await window.App.Storage.put('plan', { id: hoy, pasos, totalMinutos: pasos.reduce((a, x) => a + x.minutos, 0) }); }, [pasos]);
      await ir(p, 'inicio'); await snap(p, 'inicio_' + nombre);
    }
    // Interstitials del flujo guiado
    await p.evaluate(async () => { const hoy = window.App.Fecha.hoyISO(new Date()); await window.App.Storage.put('plan', { id: hoy, totalMinutos: 18, pasos: [{tipo:'repaso',minutos:8,completado:false},{tipo:'practica',habilidad:'habla',minutos:10,completado:false}] }); localStorage.setItem('rumboFlujoEnCurso', JSON.stringify({ fecha: hoy, indice: 0, tipo: 'repaso', habilidad: null })); localStorage.setItem('rumboPasoTerminado', 'repaso'); });
    await ir(p, 'inicio'); await snap(p, 'inicio_listo_siguiente');
    await p.evaluate(async () => { const hoy = window.App.Fecha.hoyISO(new Date()); await window.App.Storage.put('plan', { id: hoy, totalMinutos: 18, pasos: [{tipo:'repaso',minutos:8,completado:true},{tipo:'practica',habilidad:'habla',minutos:10,completado:false}] }); localStorage.setItem('rumboFlujoEnCurso', JSON.stringify({ fecha: hoy, indice: 1, tipo: 'practica', habilidad: 'habla' })); localStorage.setItem('rumboPasoTerminado', 'habla'); });
    await ir(p, 'inicio'); await snap(p, 'inicio_dia_completo');
    await p.evaluate(() => { localStorage.removeItem('rumboFlujoEnCurso'); localStorage.removeItem('rumboPasoTerminado'); });
    // Banner de paso en curso
    await p.evaluate(async () => { const hoy = window.App.Fecha.hoyISO(new Date()); await window.App.Storage.put('plan', { id: hoy, totalMinutos: 18, pasos: [{tipo:'repaso',minutos:8,completado:false},{tipo:'practica',habilidad:'lectura',minutos:10,completado:false}] }); localStorage.setItem('rumboFlujoEnCurso', JSON.stringify({ fecha: hoy, indice: 0, tipo: 'repaso', habilidad: null })); });
    await ir(p, 'repaso'); await snap(p, 'repaso_con_banner');
    await p.evaluate(() => localStorage.removeItem('rumboFlujoEnCurso'));
    // Repaso: frente, revelado, fin
    await ir(p, 'repaso'); await snap(p, 'repaso_frente');
    await p.keyboard.press('Space'); await esperar(p, 700); await snap(p, 'repaso_revelado');
    for (let i = 0; i < 15; i++) { await p.keyboard.press('Space'); await esperar(p, 150); await p.keyboard.press('3'); await esperar(p, 480); }
    await esperar(p, 900); await snap(p, 'repaso_fin');
    // Progreso y practicar con datos
    await p.evaluate(async () => { const hoy = new Date(); const f = n => window.App.Fecha.hoyISO(new Date(hoy.getTime() - n * 86400000)); await window.App.Storage.put('settings', { id: 'ultimaPracticaHabilidad', fechas: { lectura: f(0), habla: f(1), escucha: f(3) } }); });
    await ir(p, 'progreso'); await snap(p, 'progreso_con_diag');
    await ir(p, 'practicar'); await snap(p, 'practicar_con_datos');
    // Ajustes con conversación activada
    await prefs(p, { conversacionActivada: true, conversacionWorkerUrl: 'http://127.0.0.1:9/' });
    await ir(p, 'ajustes'); await snap(p, 'ajustes_conv_activada');
    // Lectura
    await ir(p, 'lectura'); await snap(p, 'lectura_texto');
    await p.evaluate(() => document.querySelector('.lectura-termino')?.click()); await esperar(p, 300); await snap(p, 'lectura_vocab');
    await clickSel(p, '#btn-empezar-preguntas'); await esperar(p, 500); await snap(p, 'lectura_pregunta');
    await responderPreguntas(p, 'lectura'); await esperar(p, 600); await snap(p, 'lectura_resultado');
    // Escucha
    await ir(p, 'escucha'); await snap(p, 'escucha_inicio');
    await clickSel(p, '#btn-escuchar'); await esperar(p, 300); await snap(p, 'escucha_escuchado');
    await clickSel(p, '#btn-escuchar-lento'); await esperar(p, 300);
    await clickSel(p, '#btn-empezar-preguntas'); await esperar(p, 500); await snap(p, 'escucha_pregunta');
    await responderPreguntas(p, 'escucha'); await esperar(p, 600); await snap(p, 'escucha_resultado');
    await clickTexto(p, 'transcrip'); await esperar(p, 400); await snap(p, 'escucha_transcripcion');
    // Escritura
    await ir(p, 'escritura'); await snap(p, 'escritura_inicio');
    await p.evaluate(() => { const t = document.getElementById('campo-escritura'); t.value = 'Hello, my name is Alex and I live in Mexico.'; t.dispatchEvent(new Event('input', { bubbles: true })); }); await esperar(p, 300); await snap(p, 'escritura_escrito');
    await clickSel(p, '#btn-terminar-escribir'); await esperar(p, 600); await snap(p, 'escritura_revision');
    await clickTexto(p, 'correcci'); await esperar(p, 1500); await snap(p, 'escritura_correccion_ia');
    // Habla sin reconocimiento (autoevaluación)
    await ir(p, 'habla'); await snap(p, 'habla_inicio');
    await clickSel(p, '#btn-hablar'); await esperar(p, 500); await snap(p, 'habla_sin_reconocimiento');
    await clickSel(p, '#btn-auto-bien'); await esperar(p, 500); await snap(p, 'habla_autoeval_registrada');
    // Conversación sin reconocimiento: selector, chat por escenario, entrada de texto, error de red
    await ir(p, 'conversacion'); await snap(p, 'conv_selector');
    const claves = await p.evaluate(() => [...document.querySelectorAll('[data-escenario]')].map(e => e.getAttribute('data-escenario')));
    for (const c of claves) { await ir(p, 'conversacion'); await p.evaluate((k) => document.querySelector('[data-escenario="' + k + '"]').click(), c); await esperar(p, 700); await snap(p, 'conv_chat_' + c); }
    await clickSel(p, '#btn-hablar'); await esperar(p, 500); await snap(p, 'conv_entrada_texto');
    await p.evaluate(() => { document.getElementById('input-texto-conversacion').value = 'Hello'; }); await clickSel(p, '#btn-enviar-texto'); await esperar(p, 1800); await snap(p, 'conv_error_red');
    await ctx.close(); }

  // ====== ESCENARIO 2: reconocimiento de voz simulado (Habla y Conversación) ======
  { const { ctx, p } = await nuevo(true);
    await p.goto('http://localhost:8000/#/inicio', { waitUntil: 'networkidle' });
    await sembrar(p, DIAG);
    await prefs(p, { conversacionActivada: true, conversacionWorkerUrl: 'http://127.0.0.1:9/' });
    await ir(p, 'habla');
    await p.evaluate(() => { window.__rec.modo = 'colgado'; }); await clickSel(p, '#btn-hablar'); await esperar(p, 400); await snap(p, 'habla_escuchando');
    for (const modo of ['no-speech', 'not-allowed', 'permission-denied', 'network', 'raro']) {
      await ir(p, 'habla'); await p.evaluate((m) => { window.__rec.modo = m; }, modo); await clickSel(p, '#btn-hablar'); await esperar(p, 500); await snap(p, 'habla_error_' + modo);
    }
    await ir(p, 'habla');
    for (let i = 0; i < 6; i++) {
      const frase = await p.evaluate(() => (document.querySelector('.habla-frase') || {}).textContent || '');
      await p.evaluate(([f, parcial]) => { window.__rec.modo = 'ok'; window.__rec.texto = parcial ? f.split(' ').slice(0, 2).join(' ') : f; }, [frase, i % 2 === 1]);
      await clickSel(p, '#btn-hablar'); await esperar(p, 900); await snap(p, 'habla_resultado_' + i);
      await clickSel(p, '#btn-siguiente'); await esperar(p, 500);
    }
    // Conversación
    for (const modo of ['no-speech', 'not-allowed', 'network', 'raro']) {
      await ir(p, 'conversacion'); await p.evaluate(() => document.querySelector('[data-escenario]').click()); await esperar(p, 600);
      await p.evaluate((m) => { window.__rec.modo = m; }, modo); await clickSel(p, '#btn-hablar'); await esperar(p, 600); await snap(p, 'conv_error_' + modo);
    }
    await ir(p, 'conversacion'); await p.evaluate(() => document.querySelector('[data-escenario]').click()); await esperar(p, 600);
    await p.evaluate(() => { window.__rec.modo = 'colgado'; }); await clickSel(p, '#btn-hablar'); await esperar(p, 400); await snap(p, 'conv_escuchando');
    await ir(p, 'conversacion'); await p.evaluate(() => document.querySelector('[data-escenario]').click()); await esperar(p, 600);
    await p.evaluate(() => { window.__rec.modo = 'ok'; window.__rec.texto = 'Hello there'; }); await clickSel(p, '#btn-hablar'); await esperar(p, 1800); await snap(p, 'conv_error_red_voz');
    await ctx.close(); }

  const json = JSON.stringify({ estados: out, errores: errs }, null, 1);
  const r = await page.context().request.post('http://127.0.0.1:8010/?f=' + DESTINO, { data: json, headers: { 'Content-Type': 'text/plain' } });
  return { estados: Object.keys(out).length, errs, guardado: r.status() };
}
