// Auditoría automática de márgenes (D33). Sin dependencias: usa el Playwright del MCP (o el que ya
// tengas). Recorre todas las pantallas y estados y mide, en cada tarjeta/contenedor (borde, fondo o
// sombra con texto o controles dentro):
//   interior  : distancia contenido→borde < 12 px (< 8 px en pastillas/chips)
//   pantalla  : texto/controles a < 16 px del borde de la pantalla (solo móvil)
//   desborde  : contenido que se sale o se corta
//   hermanas  : tarjetas hermanas a < 8 px o tocándose
//   hueco     : aire real entre hermanos CON sombra dura y rotación incluidas (< 12 px; < 16 px bajo un hero) (D35)
//   tactil    : botones de menos de 44 px de alto o ancho
//   contraste : texto con < 4.5:1 contra su fondo real (< 3:1 si es grande: >= 24 px, o >= 18.7 px en negrita) (D37)
// Tema: CFG.tema = 'light' | 'dark' emula prefers-color-scheme del sistema con la preferencia en "Sistema";
// CFG.contraste = true activa la regla `contraste` (tema claro y oscuro).
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
    tema: null, // 'light' | 'dark' | null (null = el navegador por defecto)
    contraste: true,
    sufijo: 'despues',
    salida: 'auditoria' // nombre del archivo que guarda el receptor
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
    // ---- Regla 'hueco' (D35): aire REAL entre hermanos contando la sombra dura (box-shadow: offset, blur,
    // spread) y la rotación (transform). Se mide ANTES de apagar los transforms: solo se apagan animaciones,
    // transiciones y opacidad para que las entradas no falseen la medida.
    const estiloAnim = document.createElement('style');
    estiloAnim.textContent = '[class*="pop-entrada"], [class*="pop-entrada"] > * { animation: none !important; transition: none !important; opacity: 1 !important; }';
    document.head.appendChild(estiloAnim);
    const extension = (e) => {
      const sombra = getComputedStyle(e).boxShadow;
      const ex = { t: 0, r: 0, b: 0, l: 0 };
      if (!sombra || sombra === 'none') return ex;
      const partes = []; let prof = 0, ini = 0;
      for (let i = 0; i < sombra.length; i++) { const c = sombra[i]; if (c === '(') prof++; else if (c === ')') prof--; else if (c === ',' && prof === 0) { partes.push(sombra.slice(ini, i)); ini = i + 1; } }
      partes.push(sombra.slice(ini));
      partes.forEach((s) => {
        if (/inset/.test(s)) return;
        const n = (s.replace(/rgba?\([^)]*\)/g, '').match(/-?[\d.]+px/g) || []).map(parseFloat);
        const [ox = 0, oy = 0, blur = 0, spread = 0] = n;
        ex.l = Math.max(ex.l, blur + spread - ox); ex.r = Math.max(ex.r, blur + spread + ox);
        ex.t = Math.max(ex.t, blur + spread - oy); ex.b = Math.max(ex.b, blur + spread + oy);
      });
      return ex;
    };
    const rectExt = (e) => { const r = e.getBoundingClientRect(); const x = extension(e); return { top: r.top - x.t, bottom: r.bottom + x.b, left: r.left - x.l, right: r.right + x.r, sombra: x.t + x.r + x.b + x.l > 0, rot: getComputedStyle(e).transform !== 'none' }; };
    const esVisibleRaw = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0.05; };
    const selH = (e) => { const partes = []; let n = e; for (let i = 0; i < 3 && n && n.nodeType === 1 && n.id !== 'pantalla'; i++) { const c = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.'); partes.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (c ? '.' + c : '')); n = n.parentElement; } return partes.join(' > '); };
    const huecos = [];
    {
      const zonas0 = [document.getElementById('pantalla')].filter(Boolean);
      zonas0.forEach((z) => z.querySelectorAll('*').forEach((e) => {
        if (!esVisibleRaw(e) || e.closest('svg') || !e.parentElement) return;
        const re = rectExt(e);
        if (!(re.sombra || re.rot)) return;                       // solo elementos que "crecen" con sombra o rotación
        const re0 = e.getBoundingClientRect();
        if (re0.width < 80 || re0.height < 36) return;
        const hero = /hero|hoy|cta/i.test(typeof e.className === 'string' ? e.className : '');
        [...e.parentElement.children].forEach((h) => {
          if (h === e || !esVisibleRaw(h) || /^(script|style)$/i.test(h.tagName)) return;
          const rh = rectExt(h); const rh0 = h.getBoundingClientRect();
          if (rh0.width < 1 || rh0.height < 1) return;
          if (getComputedStyle(h).position === 'fixed' || getComputedStyle(h).position === 'absolute') return;
          const solapeX = Math.min(re.right, rh.right) - Math.max(re.left, rh.left);
          const solapeY = Math.min(re.bottom, rh.bottom) - Math.max(re.top, rh.top);
          let gap = null;
          if (solapeX > 8) gap = Math.max(re.top, rh.top) - Math.min(re.bottom, rh.bottom);
          else if (solapeY > 8) gap = Math.max(re.left, rh.left) - Math.min(re.right, rh.right);
          if (gap === null) return;
          const min = (hero && rh0.top > re0.top) ? 16 : 12;
          if (gap < min - 0.5) huecos.push({ regla: 'hueco', selector: selH(e) + '  ↔  ' + selH(h), medida: Math.round(gap * 10) / 10 + 'px de aire real con sombra/rotación (mín ' + min + ')', sev: gap < 4 ? 'alta' : 'media' });
        });
        // Lo mismo subiendo por los ancestros: un hijo con sombra o rotación que sobresale de su contenedor
        // (p. ej. un paso rotado dentro de "Tu ruta de hoy") cuenta contra los hermanos del contenedor.
        for (let anc = e.parentElement; anc && anc !== z && anc.parentElement && anc.parentElement !== z; anc = anc.parentElement) {
          const ra = rectExt(anc);
          const u = { top: Math.min(ra.top, re.top), bottom: Math.max(ra.bottom, re.bottom), left: Math.min(ra.left, re.left), right: Math.max(ra.right, re.right) };
          if (u.top >= ra.top - 0.5 && u.bottom <= ra.bottom + 0.5 && u.left >= ra.left - 0.5 && u.right <= ra.right + 0.5) continue; // no sobresale del contenedor: ya lo cubre la comparación de hermanos
          [...anc.parentElement.children].forEach((h) => {
            if (h === anc || !esVisibleRaw(h) || /^(script|style)$/i.test(h.tagName)) return;
            const rh = rectExt(h); const rh0 = h.getBoundingClientRect();
            if (rh0.width < 1 || rh0.height < 1) return;
            const ps = getComputedStyle(h).position; if (ps === 'fixed' || ps === 'absolute') return;
            const sX = Math.min(u.right, rh.right) - Math.max(u.left, rh.left);
            const sY = Math.min(u.bottom, rh.bottom) - Math.max(u.top, rh.top);
            let gap = null;
            if (sX > 8) gap = Math.max(u.top, rh.top) - Math.min(u.bottom, rh.bottom);
            else if (sY > 8) gap = Math.max(u.left, rh.left) - Math.min(u.right, rh.right);
            if (gap === null) return;
            if (gap < 11.5) huecos.push({ regla: 'hueco', selector: selH(e) + '  (dentro de ' + selH(anc) + ')  ↔  ' + selH(h), medida: Math.round(gap * 10) / 10 + 'px de aire real (hijo con sombra/rotación vs hermano del contenedor, mín 12)', sev: gap < 4 ? 'alta' : 'media' });
          });
        }
      }));
    }
    estiloAnim.remove();
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
        // Cara de la tarjeta de repaso que no se ve (el volteo 3D la deja detrás): no cuenta.
        const marco = pe.closest('.repaso-marco');
        if (marco && ((pe.closest('.repaso-cara-frente') && marco.classList.contains('revelada')) || (pe.closest('.repaso-cara-atras') && !marco.classList.contains('revelada')))) continue;
        const r = document.createRange(); r.selectNodeContents(t);
        // Líneas recortadas por un ancestro con overflow hidden (p. ej. line-clamp) no se ven: no cuentan.
        let recorte = null;
        for (let a = pe; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a); if (/(hidden|clip)/.test(o.overflowY)) { recorte = a.getBoundingClientRect(); break; } }
        [...r.getClientRects()].forEach((q) => { if (q.width > 0 && q.height > 0 && !(recorte && (q.top >= recorte.bottom - 1 || q.bottom <= recorte.top + 1))) rs.push(q); });
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
      // Insignia: círculo/cuadrito de ≤ 44 px con UN glifo centrado (letra A-D, número de paso, icono): ahí 3 px bastan.
      const insignia = r.width <= 44 && r.height <= 44;
      const pastilla = r.height <= 40 || (e.tagName === 'BUTTON' && r.height <= 56 && !e.querySelector('p'));
      // Compactos (≤ 72 px en su lado menor): fichas, filas de una línea, mosaicos de la ruta: 8 px.
      const compacto = Math.min(r.width, r.height) <= 72;
      const lim = insignia ? 3 : (pastilla || compacto) ? 8 : 12;
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
    out.push(...huecos);
    // ---- Regla 'contraste' (D37): color del texto contra el fondo REAL (se compone la transparencia de
    // los ancestros; si hay degradado/imagen en el camino se mide contra el color de fondo base y se omite
    // el caso dudoso). Se desactivan animaciones de entrada para medir el color final.
    if (meta.contraste) {
      const num = (c) => { const m = c.match(/(?:rgba?|color)\(([^)]+)\)/); if (!m) return null; let t = m[1].replace('srgb', '').replace('/', ' ').split(/[\s,]+/).filter(Boolean).map(Number); if (/color\(/.test(c)) { t = [t[0] * 255, t[1] * 255, t[2] * 255, t.length > 3 ? t[3] : 1]; } return { r: t[0], g: t[1], b: t[2], a: t.length > 3 ? t[3] : 1 }; };
      const mezcla = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lumi = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
      const razon = (a, b) => { const x = lumi(a), y = lumi(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
      const fondoDe = (e) => {
        const capas = []; let n = e; let dudoso = false;
        while (n && n.nodeType === 1) { const cs = getComputedStyle(n); if (cs.backgroundImage && cs.backgroundImage !== 'none') dudoso = true; const c = num(cs.backgroundColor); if (c && c.a > 0) { capas.push(c); if (c.a >= 0.999) break; } n = n.parentElement; }
        let base = num(getComputedStyle(document.body).backgroundColor); if (!base || base.a < 1) base = { r: 255, g: 255, b: 255, a: 1 };
        let col = capas.length && capas[capas.length - 1].a >= 0.999 ? capas.pop() : base;
        for (let i = capas.length - 1; i >= 0; i--) col = mezcla(capas[i], col);
        return { col, dudoso };
      };
      const textoDirecto = (e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
      document.querySelectorAll('#pantalla *, nav *').forEach((e) => {
        if (!esVisibleRaw(e) || !textoDirecto(e) || e.closest('svg, [aria-hidden="true"]')) return;
        const cs = getComputedStyle(e);
        const fg0 = num(cs.color); if (!fg0) return;
        const { col, dudoso } = fondoDe(e);
        const fg = mezcla(fg0, col);
        const px = parseFloat(cs.fontSize); const peso = parseInt(cs.fontWeight, 10) || 400;
        const grande = px >= 24 || (px >= 18.66 && peso >= 700);
        const umbral = grande ? 3 : 4.5;
        const r = razon(fg, col);
        if (r + 1e-6 < umbral) out.push({ regla: 'contraste', selector: selH(e), medida: r.toFixed(2) + ':1 (mín ' + umbral + ') "' + e.textContent.trim().slice(0, 24) + '"' + (dudoso ? ' [fondo con degradado: dudoso]' : ''), sev: r < umbral - 1 ? 'alta' : 'baja' });
      });
    }
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
    ['escritura-confirmacion', 'datos', async (p) => { await p.evaluate(async () => { for (let i = 0; i < 10; i++) await window.App.Datos.registrarRespuestaAvance('escritura', 'A2', 1, 1, new Date()); }); await modo(p, { tipo: 'confirmacion', habilidad: 'escritura' }); await ir(p, 'escritura'); }],
    ['celebracion-y-lluvia', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(() => { window.App.Util.mostrarCelebracion('¡Nuevo nivel de inglés: B1', true); }); await p.waitForTimeout(500); }],
    ['lluvia-dia-completo', 'diag', async (p) => { await ir(p, 'inicio'); await p.evaluate(() => { window.App.Util.lluviaCalcomanias(); }); await p.waitForTimeout(600); }]
  ];

  const filtro = CFG.estados;
  for (const nivel of CFG.niveles) {
    for (const [vpNombre, [w, h]] of Object.entries(CFG.views)) {
      const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block', viewport: { width: w, height: h } }, CFG.tema ? { colorScheme: CFG.tema } : {}));
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
          // La captura va ANTES de medir: medir apaga las animaciones de entrada y al quitarlas se reinician.
          if (CFG.capturas && nivel === 0 && vpNombre !== '360x740') await p.screenshot({ path: CFG.capturas + nombre + '-' + CFG.sufijo + '-' + vpNombre + '.png', fullPage: true });
          const r = await p.evaluate(medir, { pantalla, estado: nombre, viewport: vpNombre, nivel, tema: CFG.tema || 'dark', contraste: CFG.contraste });
          filas.push(...r);
        } catch (e) { errores.push(nivel + '/' + vpNombre + '/' + nombre + ': ' + e.message.slice(0, 120)); }
      }
      await ctx.close();
    }
  }
  const resultado = { filas, errores, total: filas.length };
  try { await fetch(CFG.receptor + CFG.salida, { method: 'POST', body: JSON.stringify(resultado) }); } catch (e) { resultado.receptorFalla = String(e); }
  const porPantalla = {}; filas.forEach((f) => { porPantalla[f.pantalla] = (porPantalla[f.pantalla] || 0) + 1; });
  return { total: filas.length, porPantalla, errores: errores.slice(0, 20), receptorFalla: resultado.receptorFalla || null };
}
