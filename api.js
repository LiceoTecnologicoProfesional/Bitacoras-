(function (global) {
  "use strict";

  function limpiarUrl(url) {
    var u = String(url || "").trim().replace(/[<>"]/g, "");
    if (!u) return "";
    u = u.split("#")[0];
    if (/script\.google\.com\/macros\/s\//i.test(u) && !/\/exec\/?$/i.test(u.split("?")[0])) {
      u = u.replace(/\/+$/, "") + "/exec";
    }
    return u;
  }

  function scriptUrl() {
    var desdeConfig = (global.LITPA_CONFIG && global.LITPA_CONFIG.SCRIPT_URL) || "";
    return limpiarUrl(desdeConfig);
  }

  function configurado() {
    return Boolean(scriptUrl());
  }

  function armarUrl(action, extra) {
    var base = scriptUrl();
    if (!base) throw new Error("Falta la URL de Apps Script.");
    var partes = ["action=" + encodeURIComponent(action), "t=" + Date.now()];
    extra = extra || {};
    Object.keys(extra).forEach(function (k) {
      if (extra[k] == null || extra[k] === "") return;
      partes.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(extra[k])));
    });
    return base + (base.indexOf("?") >= 0 ? "&" : "?") + partes.join("&");
  }

  var MEMO = {};
  var MEMO_MS = 12000;
  var INFLIGHT = {};
  var colaEscritura = Promise.resolve();

  function encolarEscritura(fn) {
    var run = colaEscritura.then(fn, fn);
    colaEscritura = run.then(function () {}, function () {});
    return run;
  }

  function claveMemo(action, extra) {
    return String(action || "") + ":" + JSON.stringify(extra || {});
  }

  function leerMemo(action, extra) {
    var k = claveMemo(action, extra);
    var item = MEMO[k];
    if (item) return item;
    try {
      item = JSON.parse(sessionStorage.getItem("litpa_m_" + k) || "null");
      if (item) MEMO[k] = item;
    } catch (err) { item = null; }
    return item;
  }

  function guardarMemo(action, extra, data) {
    var k = claveMemo(action, extra);
    var item = { t: Date.now(), data: data };
    MEMO[k] = item;
    try { sessionStorage.setItem("litpa_m_" + k, JSON.stringify(item)); } catch (err) { /* cuota */ }
  }

  function invalidarMemo() {
    MEMO = {};
    try {
      Object.keys(sessionStorage).forEach(function (k) {
        if (k.indexOf("litpa_m_") === 0) sessionStorage.removeItem(k);
      });
    } catch (err) { /* ok */ }
  }

  function jsonp(action, extra, opts) {
    extra = extra || {};
    opts = opts || {};
    var timeoutMs = opts.timeout || 28000;
    return new Promise(function (resolve, reject) {
      var cb = "litpa_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1000000);
      var script = document.createElement("script");
      var done = false;
      var timer = 0;
      var extraConCb = Object.assign({ callback: cb }, extra || {});

      function cleanup() {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        global[cb] = function () {};
        setTimeout(function () {
          try { delete global[cb]; } catch (err) { global[cb] = undefined; }
        }, 8000);
        if (script.parentNode) script.parentNode.removeChild(script);
      }

      global[cb] = function (data) {
        cleanup();
        resolve(data);
      };

      script.async = true;
      script.charset = "UTF-8";
      script.onerror = function () {
        cleanup();
        reject(new Error("No se pudo conectar con Google Sheets. Publica Apps Script (Nueva versión) y deja el acceso en Cualquiera."));
      };

      try {
        script.src = armarUrl(action, extraConCb);
      } catch (err) {
        cleanup();
        reject(err);
        return;
      }

      document.head.appendChild(script);
      timer = setTimeout(function () {
        if (!done) {
          cleanup();
          reject(new Error("Google Sheets tardó demasiado. Espera un momento e inténtalo de nuevo."));
        }
      }, timeoutMs);
    });
  }

  async function jsonpConReintento(action, extra, opts) {
    opts = opts || {};
    var ultimo = null;
    var n;
    for (n = 0; n < 3; n++) {
      try {
        return await jsonp(action, extra, Object.assign({}, opts, {
          timeout: Math.max(opts.timeout || 28000, 28000 + n * 12000)
        }));
      } catch (err) {
        ultimo = err;
        await esperar(600 + n * 700);
      }
    }
    throw ultimo || new Error("No se pudo conectar con Google Sheets.");
  }

  async function getJSON(action, extra, opts) {
    extra = extra || {};
    opts = opts || {};
    var memoMs = opts.memoMs || MEMO_MS;
    if (action === "horarios" || action === "admin" || action === "tablero") {
      memoMs = Math.max(memoMs, 12000);
    }
    if (!opts.sinCache && !opts.forzar) {
      var cached = leerMemo(action, extra);
      if (cached && cached.data && Date.now() - cached.t < memoMs) return cached.data;
    }
    var k = claveMemo(action, extra);
    if (INFLIGHT[k]) return INFLIGHT[k];
    var p = jsonpConReintento(action, extra, opts).then(function (data) {
      if (data && data.ok !== false && !opts.sinCache) guardarMemo(action, extra, data);
      return data;
    });
    INFLIGHT[k] = p;
    try {
      return await p;
    } finally {
      if (INFLIGHT[k] === p) delete INFLIGHT[k];
    }
  }

  function postFormulario(payload, opts) {
    opts = opts || {};
    var waitMs = opts.wait || 1800;
    return new Promise(function (resolve) {
      var iframe = document.createElement("iframe");
      iframe.name = "litpa_iframe_" + Date.now();
      iframe.setAttribute("style", "display:none;width:0;height:0;border:0");
      document.body.appendChild(iframe);

      var form = document.createElement("form");
      form.method = "POST";
      form.action = scriptUrl();
      form.target = iframe.name;
      form.style.display = "none";

      Object.keys(payload).forEach(function (k) {
        if (payload[k] == null) return;
        var input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = String(payload[k]);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();
      setTimeout(function () {
        if (form.parentNode) form.parentNode.removeChild(form);
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        resolve({ ok: true, pendiente: true });
      }, waitMs);
    });
  }

  async function postJSON(payload) {
    invalidarMemo();
    return postFormulario(payload);
  }

  function esperar(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function payloadCorto(obj) {
    try {
      return JSON.stringify(obj).length < 1600;
    } catch (err) {
      return false;
    }
  }

  function toHex(buf) {
    return Array.from(new Uint8Array(buf)).map(function (b) {
      return b.toString(16).padStart(2, "0");
    }).join("");
  }

  async function hashLitpa(texto) {
    var s = "litpa:" + String(texto || "");
    if (global.crypto && crypto.subtle) {
      var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
      return toHex(buf);
    }
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return "x" + (h >>> 0).toString(16);
  }

  function esAccionFaltante(data) {
    return !!(data && /no v[aá]lida/i.test(String(data.error || "")));
  }

  async function postOJsonp(action, extra) {
    extra = extra || {};
    var payload = Object.assign({ action: action }, extra);
    try {
      var res = await fetch(scriptUrl(), { method: "POST", body: JSON.stringify(payload) });
      var data = await res.json();
      if (data && (data.ok === true || data.ok === false)) {
        invalidarMemo();
        return data;
      }
    } catch (err) { /* CORS: se intenta JSONP */ }
    return getJSON(action, extra, { sinCache: true, forzar: true, timeout: 28000 });
  }

  async function verificarClaveAdmin(clave) {
    var hash = await hashLitpa(String(clave || "").trim());
    var data;
    try {
      data = await getJSON("verificarClaveAdmin", { hash: hash }, { sinCache: true, forzar: true });
    } catch (err) {
      return { ok: false, error: err.message || "No se pudo verificar." };
    }
    if (data && data.ok) return data;
    if (esAccionFaltante(data)) {
      return { ok: String(clave || "").trim() === "LITPA", legado: true };
    }
    return data || { ok: false, error: "Contraseña incorrecta." };
  }

  async function cambiarClaveAdmin(actual, nueva) {
    nueva = String(nueva || "").trim();
    if (nueva.length < 4) return { ok: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
    var extra = {
      actualHash: await hashLitpa(String(actual || "").trim()),
      nuevaHash: await hashLitpa(nueva),
      nueva: nueva
    };
    var data = await postOJsonp("cambiarClaveAdmin", extra);
    if (esAccionFaltante(data)) {
      return { ok: false, error: "Hay que publicar el Código.gs (Nueva versión) para guardar la contraseña en la base de datos." };
    }
    return data || { ok: false, error: "No se pudo guardar la contraseña." };
  }

  async function verificarMaestro(nombre, clave) {
    nombre = String(nombre || "").replace(/\s+/g, " ").trim();
    var hash = await hashLitpa(String(clave || "").trim());
    var data;
    try {
      data = await getJSON("verificarMaestro", { nombre: nombre, hash: hash }, { sinCache: true, forzar: true });
    } catch (err) {
      return { ok: false, error: err.message || "No se pudo verificar." };
    }
    if (data && data.ok) return data;
    if (esAccionFaltante(data)) {
      return {
        ok: String(clave || "").trim() === "LITPA",
        legado: true,
        nombre: nombre,
        claveCambiada: false
      };
    }
    return data || { ok: false, error: "Contraseña incorrecta." };
  }

  async function cambiarClaveMaestro(nombre, actual, nueva) {
    nueva = String(nueva || "").trim();
    if (nueva.length < 4) return { ok: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
    var extra = {
      nombre: String(nombre || "").trim(),
      actualHash: await hashLitpa(String(actual || "").trim()),
      nuevaHash: await hashLitpa(nueva),
      nueva: nueva
    };
    var data = await postOJsonp("cambiarClaveMaestro", extra);
    if (esAccionFaltante(data)) {
      return { ok: false, error: "Hay que publicar el Código.gs (Nueva versión) para guardar la contraseña." };
    }
    return data || { ok: false, error: "No se pudo guardar la contraseña." };
  }

  async function ping() {
    try {
      var data = await getJSON("ping");
      if (data && data.ok) return data;
    } catch (err) {
      /* instalación anterior: no tenía ping */
    }
    var lista = await getJSON("maestros");
    if (lista && lista.ok !== false) return { ok: true, servicio: "LITPA", legado: true };
    throw new Error((lista && lista.error) || "Apps Script no respondió.");
  }

  async function crearMaestro(nombre) {
    var data = await getJSON("crearMaestro", { nombre: nombre }, { sinCache: true });
    if (data && data.ok) {
      invalidarMemo();
      return data;
    }
    if (data && data.ok === false) return data;

    var envio = await postJSON({ action: "crearMaestro", nombre: nombre });
    if (envio && envio.ok === false && !envio.pendiente) return envio;

    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        var lista = await getJSON("maestros");
        var maestros = (lista && lista.maestros) || [];
        var existe = maestros.some(function (m) {
          return String(m.nombre || "").toLowerCase() === String(nombre).trim().toLowerCase();
        });
        if (existe) {
          invalidarMemo();
          return { ok: true, maestros: maestros, yaExistia: true };
        }
      } catch (err) { /* reintento */ }
    }
    return { ok: false, error: (data && data.error) || "No se confirmó el maestro en Google Sheets." };
  }

  async function guardarRegistro(datos) {
    var cuerpo = Object.assign({ action: "guardarRegistro" }, datos);
    var envio;
    if (payloadCorto(cuerpo)) {
      envio = await getJSON("guardarRegistro", datos, { sinCache: true });
      if (envio && envio.ok) {
        invalidarMemo();
        return envio;
      }
      if (envio && envio.ok === false) return envio;
    }
    envio = await postJSON(cuerpo);
    if (envio && envio.ok && !envio.pendiente) return envio;
    if (envio && envio.ok === false && !envio.pendiente) return envio;

    await esperar(1600);
    try {
      var lista = await getJSON("registros");
      var regs = (lista && lista.registros) || [];
      var ok = regs.some(function (r) {
        return String(r.maestro || "").toLowerCase() === String(datos.maestro || "").toLowerCase() &&
          String(r.horaEnvio || "") === String(datos.horaEnvio || "") &&
          String(r.tema || "") === String(datos.tema || "");
      });
      if (ok) {
        invalidarMemo();
        return { ok: true };
      }
    } catch (err) { /* si no se pudo leer, se confirma abajo */ }
    return { ok: false, error: "No se confirmó el registro. Si el horario ya cerró, envía una justificación." };
  }

  async function obtenerMaestros(forzar) {
    var data = await getJSON("maestros", {}, { forzar: !!forzar });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudieron leer los maestros.");
    }
    return data.maestros || [];
  }

  async function obtenerMaterias(forzar) {
    var data = await getJSON("materias", {}, { forzar: !!forzar });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudieron leer las materias.");
    }
    return data.materias || [];
  }

  async function obtenerRegistros(forzar) {
    var data = await getJSON("registros", {}, { forzar: !!forzar });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudieron leer los registros.");
    }
    return data.registros || [];
  }

  async function confirmarLista(action, extra, prueba) {
    var data = await getJSON(action, extra, { sinCache: true });
    if (data && data.ok && !data.pendiente) return data;
    if (data && data.ok === false) return data;
    var cuerpo = Object.assign({ action: action }, extra || {});
    var envio = await postJSON(cuerpo);
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        if (await prueba()) {
          invalidarMemo();
          return { ok: true };
        }
      } catch (err) { /* reintento */ }
    }
    return data && data.ok === false ? data : { ok: true };
  }

  async function eliminarMaestro(nombre) {
    var data = await getJSON("eliminarMaestro", { nombre: nombre }, { sinCache: true });
    if (data && data.ok) {
      invalidarMemo();
      return data;
    }
    var envio = await postJSON({ action: "eliminarMaestro", nombre: nombre });
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        var lista = await obtenerMaestros();
        var sigue = lista.some(function (m) {
          return String(m.nombre || "").toLowerCase() === String(nombre).trim().toLowerCase();
        });
        if (!sigue) {
          invalidarMemo();
          return { ok: true };
        }
      } catch (err) { /* reintento */ }
    }
    return { ok: false, error: (data && data.error) || "No se confirmó la baja del maestro." };
  }

  async function crearMaterias(nombres) {
    var lista = Array.isArray(nombres) ? nombres.join("\n") : String(nombres || "");
    var envio = await postJSON({ action: "crearMaterias", lista: lista });
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    if (envio && envio.ok && !envio.pendiente) {
      invalidarMemo();
      return envio;
    }
    var data = await getJSON("crearMaterias", { lista: lista }, { sinCache: true });
    if (data && data.ok && !data.pendiente) {
      invalidarMemo();
      return data;
    }
    if (data && data.ok === false) return data;
    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        var actual = await obtenerMaterias();
        if (actual && actual.length) {
          invalidarMemo();
          return { ok: true, agregadas: actual.length, total: actual.length };
        }
      } catch (err) { /* reintento */ }
    }
    return { ok: false, error: (data && data.error) || "No se confirmó la lista de materias. Publica una nueva versión de Codigo.gs." };
  }

  async function crearMateria(nombre) {
    var data = await getJSON("crearMateria", { nombre: nombre }, { sinCache: true });
    if (data && data.ok) {
      invalidarMemo();
      return data;
    }
    if (data && data.ok === false) return data;

    var envio = await postJSON({ action: "crearMateria", nombre: nombre });
    if (envio && envio.ok === false && !envio.pendiente) return envio;

    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        var lista = await getJSON("materias");
        var materias = (lista && lista.materias) || [];
        var existe = materias.some(function (m) {
          return String(m.nombre || "").toLowerCase() === String(nombre).trim().toLowerCase();
        });
        if (existe) {
          invalidarMemo();
          return { ok: true, materias: materias, yaExistia: true };
        }
      } catch (err) { /* reintento */ }
    }
    return { ok: false, error: (data && data.error) || "No se confirmó la materia en Google Sheets. Publica una nueva versión de Codigo.gs." };
  }

  async function eliminarMateria(nombre) {
    var data = await getJSON("eliminarMateria", { nombre: nombre }, { sinCache: true });
    if (data && data.ok) {
      invalidarMemo();
      return data;
    }
    var envio = await postJSON({ action: "eliminarMateria", nombre: nombre });
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    for (var i = 0; i < 5; i++) {
      await esperar(900);
      try {
        var lista = await obtenerMaterias();
        var sigue = lista.some(function (m) {
          return String(m.nombre || "").toLowerCase() === String(nombre).trim().toLowerCase();
        });
        if (!sigue) {
          invalidarMemo();
          return { ok: true };
        }
      } catch (err) { /* reintento */ }
    }
    return { ok: false, error: (data && data.error) || "No se confirmó la baja de la materia." };
  }

  async function obtenerHorarios(forzar) {
    var data = await getJSON("horarios", {}, { forzar: !!forzar, timeout: 35000 });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudieron leer los horarios.");
    }
    return data.horarios || [];
  }

  async function guardarSemana(slots, turno) {
    return encolarEscritura(function () {
      return guardarSemanaAhora(slots, turno);
    });
  }

  async function guardarSemanaPorPartes(compactos, turno) {
    var inicio = await getJSON("guardarTurnoInicio", { turno: String(turno) }, {
      sinCache: true,
      forzar: true,
      timeout: 30000
    });
    if (!inicio || !inicio.ok || !inicio.token) {
      return inicio && inicio.ok === false
        ? inicio
        : { ok: false, error: (inicio && inicio.error) || "No se pudo iniciar el guardado." };
    }
    var token = String(inicio.token);
    var tam = 18;
    var i;
    for (i = 0; i < compactos.length; i += tam) {
      var trozo = compactos.slice(i, i + tam);
      var chunk = await getJSON("guardarTurnoChunk", {
        token: token,
        cuadricula: JSON.stringify(trozo)
      }, { sinCache: true, forzar: true, timeout: 35000 });
      if (!chunk || !chunk.ok) {
        return chunk && chunk.ok === false
          ? chunk
          : { ok: false, error: (chunk && chunk.error) || "Falló un bloque del horario." };
      }
    }
    var fin = await getJSON("guardarTurnoFin", { token: token }, {
      sinCache: true,
      forzar: true,
      timeout: 60000
    });
    if (fin && fin.ok) {
      invalidarMemo();
      return fin;
    }
    return fin && fin.ok === false
      ? fin
      : { ok: false, error: (fin && fin.error) || "No se confirmó el guardado del horario." };
  }

  async function confirmarTurnoGuardado(turno, esperados) {
    var n;
    for (n = 0; n < 10; n++) {
      await esperar(900 + n * 200);
      try {
        var resumen = await getJSON("resumenHorarios", {}, { sinCache: true, forzar: true, timeout: 25000 });
        if (!resumen || !resumen.ok) continue;
        if (!turno) return { ok: true, total: resumen.total, turno: "" };
        var got = Number(resumen[turno]) || 0;
        if (got === esperados) return { ok: true, total: resumen.total, turno: turno };
        if (esperados > 0 && Math.abs(got - esperados) <= Math.max(2, Math.floor(esperados * 0.02))) {
          return { ok: true, total: resumen.total, turno: turno };
        }
      } catch (err) { /* reintento */ }
    }
    return null;
  }

  async function guardarSemanaAhora(slots, turno) {
    var objetos = (slots || []).map(function (s) {
      return {
        maestro: String(s.maestro || ""),
        materia: String(s.materia || ""),
        dia: String(s.dia || ""),
        horaInicio: String(s.horaInicio || "").slice(0, 5),
        horaFin: String(s.horaFin || "").slice(0, 5),
        grado: String(s.grado || "")
      };
    });
    var compactos = objetos.map(function (s) {
      return [s.maestro, s.materia, s.dia, s.horaInicio, s.horaFin, s.grado];
    });
    turno = turno ? String(turno) : "";

    if (turno && (turno === "diario" || turno === "sabado" || turno === "primaria")) {
      try {
        var porPartes = await guardarSemanaPorPartes(compactos, turno);
        if (porPartes && porPartes.ok) return porPartes;
        if (porPartes && porPartes.ok === false && !esAccionFaltante(porPartes)) return porPartes;
      } catch (errPartes) {
        if (compactos.length > 40) {
          return { ok: false, error: (errPartes && errPartes.message) || "No se pudo guardar el horario." };
        }
      }
    }

    var payload = turno
      ? { action: "guardarSemana", turno: turno, cuadricula: JSON.stringify(compactos) }
      : { action: "guardarSemana", cuadricula: JSON.stringify(objetos) };

    try {
      var res = await fetch(scriptUrl(), { method: "POST", body: JSON.stringify(payload) });
      var data = await res.json();
      if (data && data.ok) {
        invalidarMemo();
        return data;
      }
      if (data && data.ok === false) return data;
    } catch (err) { /* CORS: formulario o JSONP */ }

    if (payloadCorto(payload)) {
      try {
        var envio = await getJSON("guardarSemana", {
          turno: turno || "",
          cuadricula: turno ? JSON.stringify(compactos) : JSON.stringify(objetos)
        }, { sinCache: true, forzar: true, timeout: 45000 });
        if (envio && envio.ok) {
          invalidarMemo();
          return envio;
        }
        if (envio && envio.ok === false) return envio;
      } catch (err2) { /* formulario */ }
    }

    await postFormulario(payload, { wait: compactos.length > 80 ? 5000 : 2800 });
    invalidarMemo();
    var confirmado = await confirmarTurnoGuardado(turno, compactos.length);
    if (confirmado) return confirmado;

    return {
      ok: false,
      error: "No se confirmó el guardado. Publica Codigo.gs (Nueva versión) e inténtalo otra vez."
    };
  }

  async function guardarCeldaHorario(datos) {
    var extra = {
      maestro: String((datos && datos.maestro) || ""),
      materia: String((datos && datos.materia) || ""),
      dia: String((datos && datos.dia) || ""),
      horaInicio: String((datos && datos.horaInicio) || "").slice(0, 5),
      horaFin: String((datos && datos.horaFin) || "").slice(0, 5),
      grado: String((datos && datos.grado) || "")
    };
    return encolarEscritura(async function () {
      var data;
      try {
        data = await getJSON("guardarCeldaHorario", extra, { sinCache: true, forzar: true, timeout: 28000 });
      } catch (err) {
        data = null;
      }
      if (data && data.ok) {
        invalidarMemo();
        return data;
      }
      if (data && data.ok === false && !esAccionFaltante(data)) return data;
      try {
        data = await getJSON("guardarHorario", extra, { sinCache: true, forzar: true, timeout: 28000 });
      } catch (err2) {
        return { ok: false, error: (err2 && err2.message) || "No se pudo guardar la celda." };
      }
      if (data && data.ok) {
        invalidarMemo();
        return data;
      }
      return data || { ok: false, error: "No se pudo guardar la celda." };
    });
  }

  async function guardarHorario(datos) {
    return guardarCeldaHorario(datos);
  }

  async function eliminarHorario(id) {
    var data = await getJSON("eliminarHorario", { id: id }, { sinCache: true });
    if (data && data.ok) {
      invalidarMemo();
      return data;
    }
    return confirmarLista("eliminarHorario", { id: id }, async function () {
      var lista = await obtenerHorarios();
      return !lista.some(function (h) { return String(h.id) === String(id); });
    });
  }

  async function estadoPanel(maestro, forzar) {
    var data = await getJSON("estadoPanel", { maestro: maestro }, { forzar: !!forzar });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudo leer el horario del maestro.");
    }
    return data;
  }

  async function obtenerAlertas(forzar) {
    var data = await getJSON("alertas", {}, { forzar: !!forzar });
    if (!data || data.ok === false) {
      throw new Error((data && data.error) || "No se pudieron leer los mensajes.");
    }
    return data.alertas || [];
  }

  async function guardarNoAsistio(datos) {
    var extra = {
      maestro: datos.maestro,
      fecha: datos.fecha || ""
    };
    var envio = await getJSON("guardarNoAsistio", extra, { sinCache: true });
    if (envio && envio.ok) {
      invalidarMemo();
      return envio;
    }
    if (envio && envio.ok === false) return envio;
    envio = await postJSON(Object.assign({ action: "guardarNoAsistio" }, extra));
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    await esperar(1600);
    try {
      var lista = await obtenerAlertas();
      var ok = lista.some(function (m) {
        return String(m.maestro || "").toLowerCase() === String(datos.maestro || "").toLowerCase() &&
          String(m.tipo || "").toLowerCase().indexOf("asist") >= 0;
      });
      if (ok) {
        invalidarMemo();
        return { ok: true };
      }
    } catch (err) { /* confirmación */ }
    return { ok: false, error: "No se confirmó la inasistencia. Inténtalo de nuevo." };
  }

  async function guardarMensaje(datos) {
    var cuerpo = Object.assign({ action: "guardarMensaje" }, datos);
    var envio;
    if (payloadCorto(cuerpo)) {
      envio = await getJSON("guardarMensaje", datos, { sinCache: true });
      if (envio && envio.ok) {
        invalidarMemo();
        return envio;
      }
      if (envio && envio.ok === false) return envio;
    }
    envio = await postJSON(cuerpo);
    if (envio && envio.ok && !envio.pendiente) return envio;
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    await esperar(1600);
    try {
      var lista = await obtenerAlertas();
      var ok = lista.some(function (m) {
        return String(m.maestro || "").toLowerCase() === String(datos.maestro || "").toLowerCase() &&
          String(m.texto || "") === String(datos.texto || "");
      });
      if (ok) {
        invalidarMemo();
        return { ok: true };
      }
    } catch (err) { /* confirmación */ }
    return { ok: false, error: "No se confirmó la justificación. Inténtalo de nuevo." };
  }

  async function guardarReporte(datos) {
    var cuerpo = Object.assign({ action: "guardarReporte" }, datos);
    var envio;
    if (payloadCorto(cuerpo)) {
      envio = await getJSON("guardarReporte", datos, { sinCache: true });
      if (envio && envio.ok) {
        invalidarMemo();
        return envio;
      }
      if (envio && envio.ok === false) return envio;
    }
    envio = await postJSON(cuerpo);
    if (envio && envio.ok && !envio.pendiente) {
      invalidarMemo();
      return envio;
    }
    if (envio && envio.ok === false && !envio.pendiente) return envio;
    await esperar(1600);
    try {
      var data = await getJSON("reportes", {}, { sinCache: true });
      var lista = (data && data.reportes) || [];
      var ok = lista.some(function (r) {
        return String(r.maestro || "").toLowerCase() === String(datos.maestro || "").toLowerCase() &&
          String(r.alumno || "").toLowerCase() === String(datos.alumno || "").toLowerCase() &&
          String(r.motivo || "") === String(datos.motivo || "");
      });
      if (ok) {
        invalidarMemo();
        return Object.assign({ ok: true }, datos);
      }
    } catch (err) { /* confirmación */ }
    return { ok: false, error: "No se confirmó el reporte. Inténtalo de nuevo." };
  }

  function peek(action, extra) {
    var cached = leerMemo(action, extra || {});
    return cached && cached.data ? cached.data : null;
  }

  async function obtenerAdmin(forzar) {
    try {
      var data = await getJSON("admin", {}, { forzar: !!forzar, timeout: 45000 });
      if (data && data.ok && (data.maestros || data.horarios || data.alertas || data.materias)) {
        return {
          maestros: data.maestros || [],
          materias: Array.isArray(data.materias) ? data.materias : undefined,
          horarios: data.horarios || [],
          alertas: data.alertas || [],
          reportes: data.reportes || []
        };
      }
      if (data && data.ok === false && String(data.error || "").indexOf("no válida") === -1) {
        throw new Error(data.error || "No se pudieron leer los datos de administración.");
      }
    } catch (err) { /* se lee por partes */ }
    var maestros = await obtenerMaestros(true);
    var horarios = await obtenerHorarios(true);
    var alertas = [];
    try { alertas = await obtenerAlertas(true); } catch (err2) { /* ok */ }
    var materias = [];
    try { materias = await obtenerMaterias(true); } catch (err3) { /* legado */ }
    var reportes = [];
    try {
      var rep = await getJSON("reportes", {}, { forzar: true, timeout: 25000 });
      if (rep && rep.ok && Array.isArray(rep.reportes)) reportes = rep.reportes;
    } catch (err4) { /* ok */ }
    return { maestros: maestros, materias: materias, horarios: horarios, alertas: alertas, reportes: reportes };
  }

  async function obtenerTablero(forzar) {
    var data = await getJSON("tablero", {}, { forzar: !!forzar, timeout: 35000 });
    if (data && data.ok && Array.isArray(data.registros)) {
      return {
        fecha: data.fecha || "",
        hora: data.hora || "",
        minutos: data.minutos,
        dia: data.dia || "",
        registros: data.registros || [],
        registrosSemana: data.registrosSemana || data.registros || [],
        horarios: data.horarios || []
      };
    }
    if (data && data.ok === false && String(data.error || "").indexOf("no válida") === -1) {
      throw new Error(data.error || "No se pudo leer el tablero.");
    }
    var registros = await obtenerRegistros(true);
    var horarios = [];
    try { horarios = await obtenerHorarios(true); } catch (err) { /* legado */ }
    return { registros: registros, horarios: horarios };
  }

  global.LITPA = {
    scriptUrl: scriptUrl,
    configurado: configurado,
    ping: ping,
    peek: peek,
    crearMaestro: crearMaestro,
    eliminarMaestro: eliminarMaestro,
    crearMateria: crearMateria,
    crearMaterias: crearMaterias,
    eliminarMateria: eliminarMateria,
    guardarRegistro: guardarRegistro,
    obtenerMaestros: obtenerMaestros,
    obtenerMaterias: obtenerMaterias,
    obtenerRegistros: obtenerRegistros,
    obtenerHorarios: obtenerHorarios,
    guardarHorario: guardarHorario,
    guardarCeldaHorario: guardarCeldaHorario,
    guardarSemana: guardarSemana,
    eliminarHorario: eliminarHorario,
    estadoPanel: estadoPanel,
    obtenerAlertas: obtenerAlertas,
    obtenerAdmin: obtenerAdmin,
    obtenerTablero: obtenerTablero,
    guardarMensaje: guardarMensaje,
    guardarNoAsistio: guardarNoAsistio,
    guardarReporte: guardarReporte,
    verificarClaveAdmin: verificarClaveAdmin,
    cambiarClaveAdmin: cambiarClaveAdmin,
    verificarMaestro: verificarMaestro,
    cambiarClaveMaestro: cambiarClaveMaestro
  };
})(window);
