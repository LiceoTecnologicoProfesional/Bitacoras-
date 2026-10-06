(function (global) {
  "use strict";

  function escapeHtml(t) {
    return String(t || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function horaActual() {
    return new Date().toLocaleTimeString("es-MX", { hour12: false });
  }

  function fechaActual() {
    return new Date().toLocaleDateString("es-MX");
  }

  function mostrarAviso(nodo, texto, tipo) {
    if (!nodo) return;
    nodo.innerHTML = texto ? '<div class="aviso ' + (tipo || "") + '">' + texto + "</div>" : "";
  }

  function fechaCorta(valor) {
    var s = String(valor || "").trim();
    if (/1899/.test(s)) {
      var h = s.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
      return h ? h[1] : s;
    }
    var m = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (!m) return s;
    var d = ("0" + m[1]).slice(-2);
    var mo = ("0" + m[2]).slice(-2);
    var y = m[3].length === 2 ? "20" + m[3] : m[3];
    return d + "/" + mo + "/" + y;
  }

  function horaCorta(valor) {
    var s = String(valor || "").trim();
    var h = s.match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    if (/1899/.test(s)) return h ? h[1] : "";
    return h ? h[1] : s;
  }

  function normTxt(s) {
    return String(s || "").toLowerCase()
      .replace(/á/g, "a").replace(/é/g, "e").replace(/í/g, "i")
      .replace(/ó/g, "o").replace(/ú/g, "u").replace(/ü/g, "u")
      .replace(/\s+/g, " ").trim();
  }

  var ALIAS_MAESTROS = {
    "karen coque": "Zaida Peralta"
  };

  function nombreMaestroCanon(nombre) {
    var t = String(nombre || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    var alias = ALIAS_MAESTROS[normTxt(t)];
    return alias || t;
  }

  function iconoMic() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
      '<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z" fill="currentColor"/>' +
      '<path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
      "</svg>";
  }

  function horaCorta5(v) {
    var s = String(v || "");
    var m = s.match(/(\d{1,2}):(\d{2})/);
    if (!m) return s.slice(0, 5);
    return ("0" + m[1]).slice(-2) + ":" + m[2];
  }

  var GRADOS_DIARIO = ["1ro. Básico", "2do. Básico", "3ro. Básico", "4to. Bach", "5to. Bach", "4to. Perito", "5to. Perito", "6to. Perito", "4to. Secre", "5to. Secre", "6to. Secre", "4to. MEIBI", "5to. MEIBI", "6to. MEIBI"];
  var GRADOS_SABADO = ["1ro. Básico", "2do. Básico", "3ro. Básico", "1ro. Año", "2do. Año", "4to. Bach", "5to. Bach", "4to. Perito", "5to. Perito", "6to. Perito", "4to. Secre", "5to. Secre", "6to. Secre", "4to. BACO", "5to. BACO"];
  var GRADOS_PRIMARIA = ["Párvulos", "Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto"];
  var BLOQUES_TURNO = {
    diario: [
      ["07:00", "07:45"], ["07:45", "08:30"], ["08:30", "09:15"], ["09:15", "10:00"],
      ["10:00", "10:30", "receso"], ["10:30", "11:15"], ["11:15", "12:00"], ["12:00", "12:45"]
    ],
    sabado: [
      ["07:00", "07:40"], ["07:40", "08:20"], ["08:20", "09:00"], ["09:00", "09:30", "receso"],
      ["09:30", "10:10"], ["10:10", "10:50"], ["10:50", "11:30"], ["11:30", "12:10"],
      ["12:10", "12:50", "receso"], ["12:50", "13:30"], ["13:30", "14:10"], ["14:10", "14:50"],
      ["14:50", "15:30"], ["15:30", "16:00"]
    ],
    primaria: [
      ["13:10", "13:50"], ["13:50", "14:30"], ["14:30", "15:10"], ["15:10", "15:50", "receso"],
      ["15:50", "16:30"], ["16:30", "17:00"], ["17:00", "17:30"]
    ]
  };

  function minutosTxt(v) {
    var m = String(v || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) return -1;
    return (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
  }

  function encajarBloque(ini, fin, bloques) {
    var i;
    for (i = 0; i < bloques.length; i++) {
      if (bloques[i][0] === ini && bloques[i][1] === fin) return i;
    }
    for (i = 0; i < bloques.length; i++) {
      if (bloques[i][0] === ini) return i;
    }
    return -1;
  }

  function turnoDeHorario(h) {
    if (normTxt(h.dia) === "sabado") return "sabado";
    var g = normTxt(h.grado);
    var i;
    for (i = 0; i < GRADOS_PRIMARIA.length; i++) {
      if (normTxt(GRADOS_PRIMARIA[i]) === g) return "primaria";
    }
    var ini = horaCorta5(h.horaInicio);
    if (ini && ini >= "13:00") return "primaria";
    return "diario";
  }

  var GRADOS_POR_TURNO = {
    diario: GRADOS_DIARIO,
    sabado: GRADOS_SABADO,
    primaria: GRADOS_PRIMARIA
  };

  function plantillaMaestros() {
    return (typeof PLANTILLA_MAESTROS !== "undefined" && PLANTILLA_MAESTROS) || {};
  }

  function colorDeMaestro(nombre, turnoId) {
    var n = normTxt(nombreMaestroCanon(nombre));
    if (!n) return "";
    var src = plantillaMaestros();
    var mapas = [];
    if (turnoId === "diario" && src.coloresDiario) mapas.push(src.coloresDiario);
    else if (turnoId === "sabado") mapas.push(src.colores || {});
    else if (turnoId === "primaria" && src.coloresPrimaria) mapas.push(src.coloresPrimaria);
    else {
      if (src.coloresDiario) mapas.push(src.coloresDiario);
      if (src.colores) mapas.push(src.colores);
    }
    if (src.colores && mapas.indexOf(src.colores) < 0) mapas.push(src.colores);
    if (src.coloresDiario && mapas.indexOf(src.coloresDiario) < 0) mapas.push(src.coloresDiario);
    var i;
    var j;
    var keys;
    for (i = 0; i < mapas.length; i++) {
      keys = Object.keys(mapas[i] || {});
      for (j = 0; j < keys.length; j++) {
        if (normTxt(keys[j]) === n) return String(mapas[i][keys[j]] || "").trim();
      }
    }
    return "";
  }

  function materiaPlantilla(turnoId, dia, ini, grado) {
    var raiz = (typeof PLANTILLA_HORARIOS !== "undefined" && PLANTILLA_HORARIOS) || {};
    var t = raiz[turnoId] || {};
    var diaKey = "";
    Object.keys(t).forEach(function (d) {
      if (normTxt(d) === normTxt(dia)) diaKey = d;
    });
    if (!diaKey) return "";
    var fila = t[diaKey][horaCorta5(ini)];
    if (!fila || !fila.length) return "";
    var grados = GRADOS_POR_TURNO[turnoId] || [];
    var i = -1;
    grados.forEach(function (g, idx) {
      if (normTxt(g) === normTxt(grado)) i = idx;
    });
    if (i < 0) return "";
    return String(fila[i] || "").trim();
  }

  function materiaDeCelda(h) {
    var actual = String((h && h.materia) || "").trim();
    var hueca = !actual || actual === "#Prueba" || normTxt(actual) === "prueba";
    if (!hueca) return actual;
    if (!h) return "";
    return materiaPlantilla(turnoDeHorario(h), h.dia, h.horaInicio, h.grado) || "";
  }

  function minutosDe(txt) {
    var m = String(txt || "").match(/(\d{1,2}):(\d{2})/);
    if (!m) return -1;
    return (parseInt(m[1], 10) || 0) * 60 + (parseInt(m[2], 10) || 0);
  }

  function diaHoyNombreCli(preferido) {
    if (preferido) return preferido;
    return ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][new Date().getDay()];
  }

  function claveSlot(h) {
    return [
      horaCorta5(h && h.horaInicio),
      horaCorta5(h && h.horaFin),
      normTxt(h && h.grado),
      normTxt(h && h.materia)
    ].join("|");
  }

  function slotsPlantillaDeMaestro(maestro, dia) {
    var out = [];
    var n = normTxt(nombreMaestroCanon(maestro));
    if (!n || !dia) return out;
    ["diario", "sabado", "primaria"].forEach(function (turnoId) {
      var grados = GRADOS_POR_TURNO[turnoId] || [];
      var bloques = BLOQUES_TURNO[turnoId] || [];
      bloques.forEach(function (b) {
        if (b[2] === "receso") return;
        grados.forEach(function (g) {
          var nom = nombreMaestroCanon(maestroPlantilla(turnoId, dia, b[0], g));
          if (normTxt(nom) !== n) return;
          var mat = materiaPlantilla(turnoId, dia, b[0], g);
          if (!mat) return;
          out.push({
            maestro: nom,
            materia: mat,
            dia: dia,
            horaInicio: b[0],
            horaFin: b[1],
            grado: g
          });
        });
      });
    });
    return out;
  }

  function slotsDeMaestro(maestro, dia, lista) {
    var n = normTxt(nombreMaestroCanon(maestro));
    var mapa = {};
    (lista || []).forEach(function (h) {
      if (normTxt(h.dia) && normTxt(h.dia) !== normTxt(dia)) return;
      var nom = maestroDeCelda(h) || nombreMaestroCanon(String(h.maestro || "").trim());
      if (normTxt(nom) !== n) return;
      var mat = materiaDeCelda(h) || String(h.materia || "").trim();
      if (!mat) return;
      var item = {
        maestro: nom || maestro,
        materia: mat,
        dia: h.dia || dia,
        horaInicio: horaCorta5(h.horaInicio),
        horaFin: horaCorta5(h.horaFin),
        grado: String(h.grado || "").trim(),
        llenado: h.llenado || h.estado === "llenado",
        estado: h.estado || ""
      };
      mapa[claveSlot(item)] = item;
    });
    slotsPlantillaDeMaestro(maestro, dia).forEach(function (h) {
      var k = claveSlot(h);
      if (!mapa[k]) mapa[k] = h;
    });
    var out = Object.keys(mapa).map(function (k) { return mapa[k]; });
    out.sort(function (a, b) {
      return String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""));
    });
    return out;
  }

  function resumirSlotCli(h) {
    var ini = horaCorta5(h.horaInicio);
    var fin = horaCorta5(h.horaFin);
    return {
      maestro: h.maestro,
      materia: h.materia,
      grado: h.grado || "",
      dia: h.dia,
      horaInicio: ini,
      horaFin: fin,
      etiqueta: ini + " - " + fin,
      llenado: !!h.llenado,
      estado: h.estado || ""
    };
  }

  function completarEstadoPanel(data, maestro) {
    data = data || {};
    maestro = String(maestro || data.maestro || "").trim();
    var dia = diaHoyNombreCli(data.dia);
    var now = minutosDe(horaActual());
    var slots = slotsDeMaestro(maestro, dia, data.horariosHoy || []);
    var actual = null;
    var proximo = null;
    var horariosHoy = [];
    slots.forEach(function (h) {
      var s = resumirSlotCli(h);
      var ini = minutosDe(s.horaInicio);
      var fin = minutosDe(s.horaFin);
      if (now >= ini && now <= fin) {
        s.estado = s.llenado ? "llenado" : "en_curso";
        s.minutosRestantes = fin - now;
        if (!actual) actual = s;
      } else if (now < ini) {
        if (!s.estado) s.estado = "pendiente";
        if (!proximo) {
          proximo = s;
          proximo.minutosParaInicio = ini - now;
        }
      } else if (!s.estado) {
        s.estado = s.llenado ? "llenado" : "sin_justificacion";
      }
      horariosHoy.push(s);
    });
    if (data.slotActual && data.slotActual.llenado && actual &&
        normTxt(data.slotActual.materia) === normTxt(actual.materia) &&
        horaCorta5(data.slotActual.horaInicio) === actual.horaInicio) {
      actual.llenado = true;
      actual.estado = "llenado";
    }
    data.ok = data.ok !== false;
    data.maestro = maestro;
    data.dia = dia;
    data.slotActual = actual;
    data.proximoSlot = proximo;
    data.horariosHoy = horariosHoy;
    return data;
  }

  function maestroPlantilla(turnoId, dia, ini, grado) {
    var raiz = plantillaMaestros();
    var t = raiz[turnoId] || {};
    var diaKey = "";
    Object.keys(t).forEach(function (d) {
      if (normTxt(d) === normTxt(dia)) diaKey = d;
    });
    if (!diaKey) return "";
    var fila = t[diaKey][horaCorta5(ini)];
    if (!fila || !fila.length) return "";
    var grados = GRADOS_POR_TURNO[turnoId] || [];
    var i = -1;
    grados.forEach(function (g, idx) {
      if (normTxt(g) === normTxt(grado)) i = idx;
    });
    if (i < 0) return "";
    return String(fila[i] || "").trim();
  }

  function maestroDeCelda(h) {
    var actual = nombreMaestroCanon(String((h && h.maestro) || "").trim());
    if (actual) return actual;
    if (!h) return "";
    return nombreMaestroCanon(maestroPlantilla(turnoDeHorario(h), h.dia, h.horaInicio, h.grado));
  }

  function aplicarColorMaestroNodo(nodo, nombre, turnoId) {
    if (!nodo || !nodo.style) return;
    var hex = colorDeMaestro(nombre, turnoId);
    if (hex) {
      nodo.style.setProperty("--color-maestro", hex);
      nodo.classList.add("con-color");
    } else {
      nodo.style.removeProperty("--color-maestro");
      nodo.classList.remove("con-color");
    }
  }

  function leyendaMaestrosHtml(turnoId) {
    var src = plantillaMaestros();
    var mapa = (turnoId === "diario" && src.coloresDiario) ||
      (turnoId === "primaria" && src.coloresPrimaria) ||
      src.colores || {};
    var keys = Object.keys(mapa);
    if (!keys.length) return "";
    var html = '<div class="leyenda-maestros" role="list">';
    keys.forEach(function (n) {
      html += '<span class="leyenda-maestro" role="listitem" style="--color-maestro:' +
        escapeHtml(mapa[n]) + '"><i aria-hidden="true"></i>' + escapeHtml(n) + "</span>";
    });
    html += "</div>";
    return html;
  }

  function gradosDeFilas(filas, plantilla) {
    var orden = plantilla.slice();
    var vistos = {};
    orden.forEach(function (g) { vistos[normTxt(g)] = true; });
    filas.forEach(function (h) {
      var g = String(h.grado || "").trim();
      if (!g || normTxt(g) === "sin periodo") return;
      if (!vistos[normTxt(g)]) {
        orden.push(g);
        vistos[normTxt(g)] = true;
      }
    });
    return orden;
  }

  function tablaGradosHorario(filas, destacado, plantilla, bloques, turnoId) {
    var grados = gradosDeFilas(filas, plantilla);
    bloques = bloques || [];
    var diaFila = (filas && filas[0] && filas[0].dia) || "";
    turnoId = turnoId || (filas && filas[0] ? turnoDeHorario(filas[0]) : "");
    var rows = bloques.map(function (b) {
      return { ini: b[0], fin: b[1], receso: b[2] === "receso", mapa: {} };
    });
    filas.forEach(function (h) {
      var ini = horaCorta5(h.horaInicio);
      var fin = horaCorta5(h.horaFin);
      var g = String(h.grado || "").trim();
      var recesoLibre = /^(receso|recreo)$/.test(normTxt(h.materia)) && !g;
      var idx = encajarBloque(ini, fin, bloques);
      if (recesoLibre) {
        if (idx >= 0 && bloques[idx][2] === "receso") rows[idx].receso = true;
        return;
      }
      if (!g) return;
      if (/^(receso|recreo)$/.test(normTxt(h.materia))) return;
      if (idx >= 0) {
        if (bloques[idx][2] === "receso") return;
        rows[idx].mapa[normTxt(g)] = h;
      }
    });
    var html = '<div class="horario-wrap"><table class="tabla-horario tabla-horario-vista tabla-horario-vista-primaria">';
    html += "<thead><tr><th>Hora</th>";
    grados.forEach(function (g) { html += "<th>" + escapeHtml(g) + "</th>"; });
    html += "</tr></thead><tbody>";
    rows.forEach(function (fila) {
      var hora = fila.ini + " - " + fila.fin;
      if (fila.receso) {
        html += '<tr class="fila-receso"><td>' + escapeHtml(hora) + "</td>" +
          '<td colspan="' + grados.length + '"><span class="marca-receso">Receso</span></td></tr>';
        return;
      }
      html += "<tr><td>" + escapeHtml(hora) + "</td>";
      grados.forEach(function (g) {
        var h = fila.mapa[normTxt(g)];
        var sheetMat = String((h && h.materia) || "").trim();
        var sheetMae = String((h && h.maestro) || "").trim();
        var hueca = !sheetMat || sheetMat === "#Prueba" || normTxt(sheetMat) === "prueba";
        var base = {
          dia: diaFila || (h && h.dia) || "",
          horaInicio: fila.ini,
          horaFin: fila.fin,
          grado: g,
          materia: hueca ? "" : sheetMat,
          maestro: sheetMae
        };
        var materia = materiaDeCelda(base);
        if (!materia && !hueca) materia = sheetMat;
        if (!materia) materia = materiaPlantilla(turnoId, base.dia, fila.ini, g) || "";
        var maestro = sheetMae;
        if (!maestro && materia) maestro = maestroPlantilla(turnoId, base.dia, fila.ini, g) || "";
        var mia = destacado && normTxt(maestro) === destacado;
        var hex = colorDeMaestro(maestro, turnoId);
        var clases = [];
        if (mia) clases.push("celda-mia");
        if (hex) clases.push("con-color");
        html += "<td" + (clases.length ? ' class="' + clases.join(" ") + '"' : "") +
          (hex ? ' style="--color-maestro:' + escapeHtml(hex) + '"' : "") + ">";
        if (!materia) {
          html += "—";
        } else {
          html += "<strong>" + escapeHtml(materia) + "</strong>";
          html += "<small>" + escapeHtml(maestro || "Sin asignar") + "</small>";
        }
        html += "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table></div>";
    return html;
  }

  function pintarHorarioGeneral(nodo, horarios, opts) {
    if (!nodo) return;
    opts = opts || {};
    var dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    var lista = horarios || [];
    var destacado = normTxt(opts.maestro || "");
    var diaHoy = normTxt(opts.diaHoy || "");
    if (!diaHoy) {
      diaHoy = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"][new Date().getDay()];
    }
    if (!lista.length) {
      nodo.innerHTML = '<div class="caja-estado"><strong>Sin horario</strong>Administración aún no cargó el horario general.</div>';
      return;
    }
    var abierto = dias[0];
    dias.forEach(function (dia) {
      if (normTxt(dia) === diaHoy) abierto = dia;
    });
    var html = "";
    if (diaHoy === "domingo") {
      html += '<div class="caja-estado"><strong>Hoy es domingo</strong>No hay horario escolar. Los días de clase están cerrados.</div>';
    }
    html += '<div class="pestanas pestanas-dias" role="tablist">';
    dias.forEach(function (dia) {
      var on = dia === abierto;
      html += '<button type="button" class="pestana' + (on ? " activa" : "") +
        (normTxt(dia) === diaHoy ? " pestana-hoy" : "") +
        '" role="tab" data-dia="' + escapeHtml(dia) + '" aria-selected="' +
        (on ? "true" : "false") + '">' + escapeHtml(dia) +
        (normTxt(dia) === diaHoy ? " · Hoy" : "") + "</button>";
    });
    html += "</div>";
    dias.forEach(function (dia) {
      var on = dia === abierto;
      var filas = lista.filter(function (h) { return normTxt(h.dia) === normTxt(dia); });
      filas.sort(function (a, b) {
        return String(a.horaInicio || "").localeCompare(String(b.horaInicio || ""));
      });
      var manana = filas.filter(function (h) { return turnoDeHorario(h) === "diario"; });
      var vespertino = filas.filter(function (h) { return turnoDeHorario(h) === "primaria"; });
      var sabado = filas.filter(function (h) { return turnoDeHorario(h) === "sabado"; });
      html += '<section class="dia-horario' + (on ? " abierto" : "") +
        (normTxt(dia) === diaHoy ? " dia-hoy" : "") + '" data-dia="' + escapeHtml(dia) + '">';
      html += '<div class="dia-horario-cuerpo">';
      if (!filas.length) {
        html += '<p class="intro">No hay clases este día.</p>';
      } else {
        if (manana.length) {
          if (vespertino.length) html += '<p class="kicker">Mañana · básico y diversificado</p>';
          html += leyendaMaestrosHtml("diario");
          html += tablaGradosHorario(manana, destacado, GRADOS_DIARIO, BLOQUES_TURNO.diario, "diario");
        }
        if (vespertino.length) {
          if (manana.length) html += '<p class="kicker">Primaria</p>';
          html += tablaGradosHorario(vespertino, destacado, GRADOS_PRIMARIA, BLOQUES_TURNO.primaria, "primaria");
        }
        if (sabado.length) {
          html += '<p class="kicker">Fin de semana</p>';
          html += leyendaMaestrosHtml("sabado");
          html += tablaGradosHorario(sabado, destacado, GRADOS_SABADO, BLOQUES_TURNO.sabado, "sabado");
        }
      }
      html += "</div></section>";
    });
    nodo.classList.add("vista-horario-dias");
    nodo.innerHTML = html;
    nodo.onclick = function (ev) {
      var tab = ev.target.closest(".pestana");
      if (!tab || !nodo.contains(tab)) return;
      var dia = tab.getAttribute("data-dia");
      nodo.querySelectorAll(".pestana").forEach(function (p) {
        var sel = p === tab;
        p.classList.toggle("activa", sel);
        p.setAttribute("aria-selected", sel ? "true" : "false");
      });
      nodo.querySelectorAll(".dia-horario").forEach(function (sec) {
        sec.classList.toggle("abierto", sec.getAttribute("data-dia") === dia);
      });
    };
  }

  global.LITPA_UTIL = {
    CLAVE_MAESTRO: "litpa_maestro",
    CLAVE_SESION_MAESTRO: "litpa_maestro_ok",
    CLAVE_CURSO: "litpa_ultimo_curso",
    escapeHtml: escapeHtml,
    horaActual: horaActual,
    fechaActual: fechaActual,
    fechaCorta: fechaCorta,
    horaCorta: horaCorta,
    mostrarAviso: mostrarAviso,
    normTxt: normTxt,
    iconoMic: iconoMic,
    pintarHorarioGeneral: pintarHorarioGeneral,
    colorDeMaestro: colorDeMaestro,
    nombreMaestroCanon: nombreMaestroCanon,
    maestroPlantilla: maestroPlantilla,
    maestroDeCelda: maestroDeCelda,
    materiaPlantilla: materiaPlantilla,
    materiaDeCelda: materiaDeCelda,
    completarEstadoPanel: completarEstadoPanel,
    slotsDeMaestro: slotsDeMaestro,
    aplicarColorMaestroNodo: aplicarColorMaestroNodo,
    leyendaMaestrosHtml: leyendaMaestrosHtml
  };

  (function dictado() {
    var rec = null;
    var activo = null;
    var escuchando = false;

    function API() {
      return global.SpeechRecognition || global.webkitSpeechRecognition;
    }

    function estadoNodo() {
      return document.getElementById("estado-mic");
    }

    function setEstado(txt) {
      var el = estadoNodo();
      if (el) el.textContent = txt;
    }

    function apagarBoton() {
      if (activo && activo.btn) {
        activo.btn.classList.remove("activo");
        activo.btn.setAttribute("aria-pressed", "false");
      }
    }

    function detener() {
      escuchando = false;
      if (rec) {
        try { rec.onend = null; rec.stop(); } catch (err) { /* ya parado */ }
      }
      apagarBoton();
      activo = null;
      rec = null;
    }

    function iniciar(campo, btn) {
      var Ctor = API();
      if (!Ctor) {
        setEstado("Este navegador no admite dictado. Usa Chrome o Edge, o escribe a mano.");
        return;
      }
      if (!(global.isSecureContext || location.protocol === "https:")) {
        setEstado("El micrófono necesita HTTPS (GitHub Pages o un servidor local).");
        return;
      }
      if (activo && activo.campo === campo && escuchando) {
        detener();
        setEstado("Dictado detenido. Pulsa de nuevo el micrófono para continuar.");
        return;
      }
      detener();
      rec = new Ctor();
      rec.lang = "es-MX";
      rec.continuous = true;
      rec.interimResults = true;
      var base = String(campo.value || "");
      if (base && !/\s$/.test(base)) base += " ";
      activo = { campo: campo, btn: btn, base: base };
      escuchando = true;
      btn.classList.add("activo");
      btn.setAttribute("aria-pressed", "true");
      setEstado("Escuchando... pulsa otra vez el micrófono para detener.");

      rec.onresult = function (evento) {
        if (!activo) return;
        var finalTxt = "";
        var interino = "";
        for (var i = evento.resultIndex; i < evento.results.length; i++) {
          var t = evento.results[i][0].transcript;
          if (evento.results[i].isFinal) finalTxt += t + " ";
          else interino += t;
        }
        if (finalTxt) activo.base += finalTxt;
        activo.campo.value = (activo.base + interino).replace(/\s+/g, " ").trimStart();
        activo.campo.dispatchEvent(new Event("input", { bubbles: true }));
      };
      rec.onerror = function (evento) {
        if (evento.error === "no-speech" || evento.error === "aborted") return;
        setEstado(evento.error === "not-allowed"
          ? "Permiso denegado. Permite el micrófono en el navegador y vuelve a pulsar."
          : "Micrófono: " + evento.error);
        escuchando = false;
        apagarBoton();
      };
      rec.onend = function () {
        if (escuchando && rec) {
          try { rec.start(); } catch (err) { detener(); }
          return;
        }
        apagarBoton();
      };
      try {
        rec.start();
      } catch (err) {
        detener();
        setEstado("No se pudo iniciar el micrófono. Revisa el permiso del navegador.");
      }
    }

    function enlazar(btn, campo) {
      if (!btn || !campo) return;
      btn.innerHTML = iconoMic() + "<span>Dictar</span>";
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        iniciar(campo, btn);
      });
    }

    global.LITPA_DICTADO = {
      disponible: function () { return !!API(); },
      enlazar: enlazar,
      detener: detener
    };
  })();
})(window);
