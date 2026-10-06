(function (global) {
  "use strict";

  var COLEGIO = "Liceo Tecnológico Profesional de Palencia";
  var SIGLAS = "LITPA";
  var FUENTE = '"Cooper Black", CooperBlack, Georgia, serif';
  var FALTAS = [
    { id: "tarde", label: "Se presentó tarde a clase", linea: "Se presentó tarde a clase ___________________________ " },
    { id: "utiles", label: "No presentó útiles", linea: "No presentó útiles _________________________________ " },
    { id: "tarea", label: "No presentó tarea", linea: "No presentó tarea __________________________________ " },
    { id: "fuera", label: "Permaneció fuera de clase", linea: "Permaneció fuera de clase __________________________ " },
    { id: "respeto", label: "Faltó el respeto a:", linea: "Faltó el respeto a:  _________________________________ " },
    { id: "instrumentos", label: "Portó instrumentos prohibidos", linea: "Portó instrumentos prohibidos ____________________ " },
    { id: "uniforme", label: "Se presentó con uniforme incompleto", linea: "Se presentó con uniforme incompleto ______________ " },
    { id: "vocabulario", label: "Mal vocabulario en clase", linea: "Mal vocabulario en clase ___________________________ " },
    { id: "agresion", label: "Agresión física a:", linea: "Agresión física a: __________________________________ " },
    { id: "otra", label: "Otra falta cometida:", linea: "Otra falta cometida: _______________________________ " }
  ];
  var LINEA_EXTRA = " _____________________________________________________________ ";

  function assetUrl(nombre) {
    try {
      return new URL("../comun/" + nombre, global.location.href).href;
    } catch (err) {
      return "../comun/" + nombre;
    }
  }

  function leerDetalle(datos) {
    try {
      var o = JSON.parse(datos && datos.observaciones ? datos.observaciones : "");
      if (o && typeof o === "object") {
        return {
          faltas: o.faltas || [],
          respeto: o.respeto || "",
          agresion: o.agresion || "",
          otra: o.otra || "",
          telefono: o.telefono || String((datos && datos.telefono) || "")
        };
      }
    } catch (err) { /* texto plano */ }
    var tipo = String((datos && datos.tipo) || "");
    var ids = [];
    FALTAS.forEach(function (f) {
      if (tipo.indexOf(f.label.replace(":", "")) >= 0) ids.push(f.id);
    });
    return { faltas: ids, respeto: "", agresion: "", otra: String((datos && datos.motivo) || ""), telefono: String((datos && datos.telefono) || "") };
  }

  function tiene(det, id) {
    return det.faltas.indexOf(id) >= 0;
  }

  function strBytes(s) {
    var u = new Uint8Array(s.length);
    var i;
    for (i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255;
    return u;
  }

  function concatBytes(parts) {
    var total = 0;
    var i;
    for (i = 0; i < parts.length; i++) total += parts[i].length;
    var out = new Uint8Array(total);
    var o = 0;
    for (i = 0; i < parts.length; i++) {
      out.set(parts[i], o);
      o += parts[i].length;
    }
    return out;
  }

  var logoImg = null;
  var logoListo = false;
  var logoPromesa = null;
  var fuentePromesa = null;

  function loadLogo() {
    if (logoListo) return Promise.resolve(logoImg);
    if (logoPromesa) return logoPromesa;
    logoPromesa = new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        logoImg = img;
        logoListo = true;
        resolve(img);
      };
      img.onerror = function () {
        logoImg = null;
        logoListo = true;
        resolve(null);
      };
      img.src = assetUrl("Logo.png");
    });
    return logoPromesa;
  }

  function loadFuente() {
    if (fuentePromesa) return fuentePromesa;
    if (!(document.fonts && global.FontFace)) {
      fuentePromesa = Promise.resolve(false);
      return fuentePromesa;
    }
    var face = new FontFace("Cooper Black", "url(" + assetUrl("CooperBlack.ttf") + ")");
    fuentePromesa = face.load().then(function (f) {
      document.fonts.add(f);
      return true;
    }).catch(function () {
      return false;
    });
    return fuentePromesa;
  }

  function esperarFuentes() {
    return loadFuente().then(function () {
      if (document.fonts && document.fonts.load) {
        return Promise.all([
          document.fonts.load("24px " + FUENTE),
          document.fonts.load("14px " + FUENTE),
          document.fonts.load("12px " + FUENTE),
          document.fonts.ready
        ]).then(function () { return true; }).catch(function () { return true; });
      }
      return true;
    });
  }

  loadLogo();
  esperarFuentes();

  function setFont(ctx, px) {
    ctx.font = px + "px " + FUENTE;
  }

  function hexagono(ctx, x, y, w, h) {
    var inset = w * (1350 / 21600);
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x + inset, y);
    ctx.lineTo(x + w - inset, y);
    ctx.lineTo(x + w, y + h / 2);
    ctx.lineTo(x + w - inset, y + h);
    ctx.lineTo(x + inset, y + h);
    ctx.closePath();
  }

  function pintarCheck(ctx, x, y, w, h) {
    ctx.save();
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.22, y + h * 0.55);
    ctx.lineTo(x + w * 0.40, y + h * 0.78);
    ctx.lineTo(x + w * 0.78, y + h * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  function rellenarGuiones(ctx, plantilla, valores, x, y) {
    var k = 0;
    var i = 0;
    while (i < plantilla.length) {
      if (plantilla.charAt(i) === "_") {
        var j = i;
        while (j < plantilla.length && plantilla.charAt(j) === "_") j++;
        var val = valores[k++] || "";
        if (val) {
          var gx = x + ctx.measureText(plantilla.slice(0, i)).width;
          var gw = ctx.measureText(plantilla.slice(i, j)).width;
          var t = String(val);
          while (t.length && ctx.measureText(t).width > gw - 2) t = t.slice(0, -1);
          ctx.fillText(t, gx + 1, y);
        }
        i = j;
      } else {
        i++;
      }
    }
  }

  function anchoGuiones(ctx, plantilla) {
    var i = plantilla.indexOf("_");
    if (i < 0) return 0;
    var j = i;
    while (j < plantilla.length && plantilla.charAt(j) === "_") j++;
    return Math.max(0, ctx.measureText(plantilla.slice(i, j)).width - 4);
  }

  function partirPorAnchos(ctx, texto, anchos) {
    var words = String(texto || "").split(/\s+/).filter(Boolean);
    var lines = [];
    var cur = "";
    var li = 0;
    var i;
    for (i = 0; i < words.length; i++) {
      var maxW = anchos[Math.min(li, anchos.length - 1)];
      var trial = cur ? cur + " " + words[i] : words[i];
      if (!cur || ctx.measureText(trial).width <= maxW) {
        cur = trial;
      } else {
        lines.push(cur);
        li++;
        cur = words[i];
      }
    }
    if (cur) lines.push(cur);
    while (lines.length < anchos.length) lines.push("");
    return lines.slice(0, anchos.length);
  }

  function pintarHoja(datos, logo) {
    var det = leerDetalle(datos || {});
    var scale = 2.5;
    var PW = 612;
    var PH = 792;
    var c = document.createElement("canvas");
    c.width = Math.round(PW * scale);
    c.height = Math.round(PH * scale);
    var ctx = c.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, PW, PH);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";

    ctx.save();
    ctx.translate(PW / 2, PH / 2);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.fillStyle = "rgba(192, 192, 192, 0.45)";
    ctx.font = '700 72px Calibri, "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var marca = "LICEO TECNOLÓGICO";
    var tw = ctx.measureText(marca).width || 1;
    ctx.save();
    ctx.scale(524.6 / tw, 98.35 / 72);
    ctx.fillText(marca, 0, 0);
    ctx.restore();
    ctx.restore();
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (logo) {
      var lh = 66;
      var lw = logo.width && logo.height ? lh * (logo.width / logo.height) : 58;
      ctx.drawImage(logo, 104.21, 70.85, lw, lh);
    }

    ctx.fillStyle = "#000000";
    setFont(ctx, 24);
    ctx.fillText("CONTROL DISCIPLINARIO", 176.18, 136.8);

    var mx = 85.1;
    setFont(ctx, 14);
    ctx.fillText("S", mx, 169.3);
    setFont(ctx, 12);
    ctx.fillText("eñores padres de familia y/o encargado(a) le informamos que su", 94.22, 169.3);

    var hijo = "hijo(a) _____________________________________    de    _______________   grado";
    setFont(ctx, 12);
    ctx.fillText(hijo, mx, 186.0);
    rellenarGuiones(ctx, hijo, [
      String((datos && datos.alumno) || ""),
      String((datos && (datos.grado || datos.curso)) || "")
    ], mx, 186.0);

    var dia = "El día________________________infringió el reglamento y normas internas";
    ctx.fillText(dia, mx, 211.8);
    rellenarGuiones(ctx, dia, [
      String((datos && (datos.fechaFalta || datos.fecha)) || "")
    ], mx, 211.8);

    ctx.fillText("del establecimiento según falta a continuación indicada:", mx, 227.7);

    var boxes = [
      [450.75, 243.58],
      [451.50, 270.53],
      [451.50, 298.34],
      [450.75, 327.57],
      [451.50, 357.54],
      [450.75, 383.09],
      [451.50, 412.31],
      [450.75, 440.02],
      [450.75, 469.34],
      [451.50, 497.81]
    ];
    var bases = [255.3, 283.7, 312.3, 340.7, 369.2, 397.6, 426.2, 454.6, 483.1, 511.5];
    var i;
    setFont(ctx, 14);
    for (i = 0; i < FALTAS.length; i++) {
      var f = FALTAS[i];
      ctx.fillStyle = "#000000";
      ctx.fillText(f.linea, mx, bases[i]);
      var extra = "";
      if (f.id === "respeto") extra = det.respeto || "";
      if (f.id === "agresion") extra = det.agresion || "";
      if (f.id === "otra") extra = "";
      if (extra) rellenarGuiones(ctx, f.linea, [extra], mx, bases[i]);

      var bx = boxes[i][0];
      var by = boxes[i][1];
      ctx.save();
      hexagono(ctx, bx, by, 60, 15);
      ctx.fillStyle = "#b6dde8";
      ctx.strokeStyle = "#f79646";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      if (tiene(det, f.id)) pintarCheck(ctx, bx, by, 60, 15);
    }

    setFont(ctx, 14);
    var extrasY = [540.0, 568.5, 597.0, 625.4];
    var lineasOtra = partirPorAnchos(ctx, det.otra || "", [
      anchoGuiones(ctx, FALTAS[9].linea),
      anchoGuiones(ctx, LINEA_EXTRA),
      anchoGuiones(ctx, LINEA_EXTRA),
      anchoGuiones(ctx, LINEA_EXTRA),
      anchoGuiones(ctx, LINEA_EXTRA)
    ]);
    ctx.fillStyle = "#000000";
    rellenarGuiones(ctx, FALTAS[9].linea, [lineasOtra[0] || ""], mx, bases[9]);
    for (i = 0; i < extrasY.length; i++) {
      ctx.fillText(LINEA_EXTRA, mx, extrasY[i]);
      if (lineasOtra[i + 1]) rellenarGuiones(ctx, LINEA_EXTRA, [lineasOtra[i + 1]], mx, extrasY[i]);
    }

    var firmaY = 678;
    ctx.fillText("_________________________", mx, firmaY);
    ctx.fillText("______________________", 367.9, firmaY);
    rellenarGuiones(ctx, "_________________________", [String((datos && datos.maestro) || "")], mx, firmaY);
    rellenarGuiones(ctx, "______________________", [String((datos && datos.encargado) || "")], 367.9, firmaY);

    ctx.fillText(" Maestro(a)  que reporta", mx, 704);
    ctx.fillText("padre  de  familia  y/o", 367.9, 704);
    ctx.fillText("Encargado", 367.9, 724);

    var telY = 758;
    var telLinea = "______________________";
    ctx.fillText(telLinea, 367.9, telY);
    rellenarGuiones(ctx, telLinea, [det.telefono || String((datos && datos.telefono) || "")], 367.9, telY);
    ctx.fillText("Teléfono", 367.9, 778);

    var raw = atob(c.toDataURL("image/jpeg", 0.95).split(",")[1]);
    var bytes = new Uint8Array(raw.length);
    for (i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return { bytes: bytes, w: c.width, h: c.height };
  }

  function armarPdf(img) {
    var W = 612;
    var H = 792;
    var stream = "q " + W + " 0 0 " + H + " 0 0 cm /Im1 Do Q";
    var streamBytes = strBytes(stream);
    var objs = [];
    objs.push("<< /Type /Catalog /Pages 2 0 R >>");
    objs.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + W + " " + H + "] /Resources << /XObject << /Im1 4 0 R >> >> /Contents 5 0 R >>");
    objs.push({
      head: "<< /Type /XObject /Subtype /Image /Width " + img.w + " /Height " + img.h +
        " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + img.bytes.length + " >>\nstream\n",
      bin: img.bytes,
      tail: "\nendstream"
    });
    objs.push({
      head: "<< /Length " + streamBytes.length + " >>\nstream\n",
      bin: streamBytes,
      tail: "\nendstream"
    });

    var parts = [strBytes("%PDF-1.4\n")];
    var offsets = [0];
    var pos = parts[0].length;
    var n;
    for (n = 0; n < objs.length; n++) {
      offsets.push(pos);
      var body = objs[n];
      var chunk;
      if (typeof body === "string") {
        chunk = strBytes((n + 1) + " 0 obj\n" + body + "\nendobj\n");
      } else {
        chunk = concatBytes([
          strBytes((n + 1) + " 0 obj\n" + body.head),
          body.bin,
          strBytes(body.tail + "\nendobj\n")
        ]);
      }
      parts.push(chunk);
      pos += chunk.length;
    }
    var xrefPos = pos;
    var xref = "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n";
    for (n = 1; n < offsets.length; n++) {
      xref += ("0000000000" + offsets[n]).slice(-10) + " 00000 n \n";
    }
    xref += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xrefPos + "\n%%EOF";
    parts.push(strBytes(xref));
    return concatBytes(parts);
  }

  function archivoNombre(datos) {
    var n = String((datos && datos.alumno) || "estudiante")
      .replace(/[\\/:*?"<>|]+/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40);
    return "Control-disciplinario-" + (n || "estudiante") + ".pdf";
  }

  function bajar(bytes, nombre) {
    var blob = new Blob([bytes], { type: "application/pdf" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 1200);
  }

  function descargar(datos, boton) {
    var prev = boton ? boton.textContent : "";
    if (boton) {
      boton.disabled = true;
      boton.textContent = "Descargando...";
    }
    function listo(logo) {
      bajar(armarPdf(pintarHoja(datos || {}, logo)), archivoNombre(datos));
      if (boton) {
        boton.disabled = false;
        boton.textContent = prev;
      }
    }
    return Promise.all([esperarFuentes(), loadLogo()]).then(function (res) {
      listo(res[1]);
    }).catch(function () {
      if (boton) {
        boton.disabled = false;
        boton.textContent = prev;
      }
      global.alert("No se pudo crear el PDF. Inténtalo de nuevo.");
    });
  }

  function generar(datos) {
    return Promise.all([esperarFuentes(), loadLogo()]).then(function (res) {
      var img = pintarHoja(datos || {}, res[1]);
      return {
        pdf: armarPdf(img),
        jpeg: img.bytes,
        nombre: archivoNombre(datos)
      };
    });
  }

  global.LITPA_REPORTE = {
    colegio: COLEGIO,
    siglas: SIGLAS,
    faltas: FALTAS,
    descargar: descargar,
    imprimir: descargar,
    generar: generar
  };
})(window);
