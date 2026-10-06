(function (global) {
  "use strict";

  var PATH_ESCUDO =
    "m 592.29924,1258.75 c -2.07369,-1.7875 -4.71894,-4.15 -5.87834,-5.25 -1.1594,-1.1 -6.75425,-6.275 -12.43299,-11.5 -5.67875,-5.225 -10.81165,-9.9682 -11.40645,-10.5404 -7.59158,-7.3037 -27.28788,-21.5439 -37.58146,-27.171 -27.96637,-15.2881 -52.15572,-20.5662 -120.5,-26.293 -43.39966,-3.6366 -62.63379,-7.0176 -88.25388,-15.5137 -19.96897,-6.6221 -33.34716,-12.3864 -48.75001,-21.0052 -35.06437,-19.6204 -66.58951,-49.2473 -87.64956,-82.3718 -2.30961,-3.6327 -5.47819,-8.607 -7.04128,-11.0541 -8.62073,-13.4958 -24.28719,-49.18581 -30.74946,-70.0508 -1.78862,-5.775 -3.85327,-12.34098 -4.5881,-14.59106 -3.75618,-11.50157 -10.98165,-50.10542 -13.64635,-72.90894 -1.68013,-14.37795 -1.68583,-62.54881 -0.009,-77 6.03358,-52.00185 14.34438,-86.00905 31.89206,-130.5 27.09609,-68.70031 40.15856,-112.91922 45.85908,-155.24161 7.89794,-58.63675 -4.86883,-138.67223 -33.53914,-210.25839 -10.76507,-26.87902 -28.1472,-57.5499 -47.84742,-84.42711 -7.77477,-10.6072 -8.0154,-13.06437 -1.94339,-19.84523 15.78455,-17.62727 43.86823,-46.92844 89.81845,-93.71224 70.3435,-71.6196 68.13873,-69.460555 71.59346,-70.108666 4.06186,-0.762009 4.76008,-0.339655 23.81223,14.403906 C 350.57533,100.27288 386.4841,114 434.74788,114 c 50.01671,0 87.79122,-13.87913 143.64026,-52.776366 8.31152,-5.788733 16.27,-10.975871 17.6855,-11.526973 3.88215,-1.511444 6.54579,-0.399999 16.92636,7.062777 54.15484,38.932878 80.67029,51.284942 120,55.901312 15.87577,1.86343 43.16151,1.34272 57.5,-1.09731 36.38378,-6.19155 68.46076,-21.477437 117.23974,-55.869149 C 911.56415,52.997887 914.00903,52 916.79098,52 c 3.55747,0 4.60799,0.816407 15.76295,12.25 6.5733,6.7375 19.56803,20.35 28.87717,30.25 9.30915,9.9 32.32412,33.3 51.1444,52 18.8203,18.7 37.7284,38.275 42.0181,43.5 4.2897,5.225 12.0976,13.91193 17.3509,19.30428 5.2533,5.39236 9.9205,10.79236 10.3715,12 1.3499,3.61484 0.05,7.11491 -5.302,14.27435 -7.8401,10.48821 -21.61,32.47136 -29.6968,47.40978 -32.9059,60.78559 -53.44729,138.49033 -55.02899,208.16556 -1.19388,52.59149 4.87244,82.62457 27.74229,137.34603 19.4177,46.46134 28.4833,71.1659 37.4299,102 18.2258,62.81436 22.7715,117.38596 14.4522,173.5 -7.1069,47.93573 -19.3128,88.6826 -38.0705,127.0908 -29.8723,61.1667 -75.75,104.0669 -136.59004,127.7252 -30.15891,11.7276 -58.94978,17.4403 -106.75206,21.1817 -14.49524,1.1345 -40.74847,3.6943 -46,4.4853 -30.19443,4.5477 -48.22435,9.8063 -68.32073,19.9267 -18.14143,9.1359 -29.90413,18.0571 -56.05632,42.5151 -6.80738,6.3664 -13.55738,12.3597 -15,13.3186 -4.12937,2.7447 -8.49715,2.236 -12.82371,-1.4934 z";

  function logoSrc() {
    var scripts = document.getElementsByTagName("script");
    var src = "";
    for (var i = 0; i < scripts.length; i++) {
      if ((scripts[i].src || "").indexOf("splash.js") >= 0) src = scripts[i].src;
    }
    if (src) return src.replace(/splash\.js.*$/, "Logo.png");
    return "comun/Logo.png";
  }

  function htmlSplash(opts) {
    var titulo = opts.titulo || "LITPA";
    var sub = opts.subtitulo || "Liceo Tecnológico Profesional de Palencia";
    return (
      '<div class="splash" id="litpa-splash" role="dialog" aria-label="Pantalla de inicio">' +
        '<div class="splash-pts" id="splash-pts"></div>' +
        '<div class="splash-stage">' +
          '<div class="splash-3d">' +
            '<div class="splash-3d-inner">' +
              '<div class="splash-wrap">' +
                '<img class="splash-img" src="' + logoSrc() + '" alt="Escudo LITPA">' +
                '<svg class="splash-draw" viewBox="0 0 1178 1335" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
                  '<path class="splash-trace" d="' + PATH_ESCUDO + '"></path>' +
                "</svg>" +
              "</div>" +
            "</div>" +
            '<div class="splash-shadow" aria-hidden="true"></div>' +
          "</div>" +
          '<p class="splash-kicker">LITPA</p>' +
          '<h2 class="splash-title">' + titulo.replace(/</g, "") + "</h2>" +
          '<p class="splash-sub">' + sub.replace(/</g, "") + "</p>" +
        "</div>" +
      "</div>"
    );
  }

  function particulas(caja) {
    for (var i = 0; i < 10; i++) {
      var p = document.createElement("div");
      p.className = "splash-dot";
      p.style.left = Math.random() * 100 + "%";
      p.style.animationDuration = 8 + Math.random() * 10 + "s";
      p.style.animationDelay = Math.random() * 6 + "s";
      caja.appendChild(p);
    }
  }

  function show(opts) {
    opts = opts || {};
    var dur = opts.duration || 3800;
    var wrap = document.createElement("div");
    wrap.innerHTML = htmlSplash(opts);
    var el = wrap.firstChild;
    document.body.appendChild(el);
    document.body.classList.add("splash-on");
    particulas(document.getElementById("splash-pts"));
    var extraP = opts.until
      ? Promise.resolve(opts.until).then(function (v) { return v; }, function () { return null; })
      : Promise.resolve(null);
    var minWait = new Promise(function (r) { setTimeout(r, dur); });
    return new Promise(function (resolve) {
      var valor = null;
      var extraListo = false;
      var minListo = false;
      var cerrado = false;
      function cerrar(ya) {
        if (cerrado) return;
        cerrado = true;
        if (ya) {
          if (el.parentNode) el.remove();
          document.body.classList.remove("splash-on");
          resolve(valor);
          return;
        }
        el.classList.add("sale");
        setTimeout(function () {
          if (el.parentNode) el.remove();
          document.body.classList.remove("splash-on");
          resolve(valor);
        }, 520);
      }
      function intentar() {
        if (!extraListo || cerrado) return;
        if (valor && valor.abortSplash) {
          cerrar(true);
          return;
        }
        if (minListo) cerrar(false);
      }
      extraP.then(function (v) {
        valor = v;
        extraListo = true;
        intentar();
      });
      minWait.then(function () {
        minListo = true;
        intentar();
      });
    });
  }

  global.LITPA_SPLASH = { show: show };
})(window);
