(function (global) {
  "use strict";

  var deferred = null;
  var modal = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
  });

  function esIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function yaInstalada() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function pasos(app) {
    var nombre = app === "admin" ? "LITPA Administración" : "LITPA";
    if (esIOS()) {
      return [
        "Toca el botón Compartir (el cuadrado con la flecha hacia arriba).",
        'Elige "Agregar a pantalla de inicio".',
        "Confirma con Agregar. " + nombre + " quedará en tu pantalla."
      ];
    }
    if (/android/i.test(navigator.userAgent)) {
      return [
        "Toca los tres puntos ⋮ arriba a la derecha.",
        'Elige "Instalar aplicación" o "Agregar a la pantalla principal".',
        "Confirma. " + nombre + " quedará como una app aparte."
      ];
    }
    return [
      "Si aparece una ventana, pulsa Instalar.",
      "Si no aparece, mira el icono de instalación (+) en la barra de direcciones.",
      "O menú del navegador → Instalar " + nombre + "."
    ];
  }

  function asegurarModal() {
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "instalar-modal";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="instalar-caja" role="dialog" aria-labelledby="instalar-titulo">' +
        "<h2 id=\"instalar-titulo\">Añadir al escritorio o pantalla de inicio</h2>" +
        '<p id="instalar-texto">Así abres LITPA como una app, sin buscar en el navegador.</p>' +
        '<button class="btn btn-maroon btn-ancho" type="button" id="instalar-ahora">Instalar ahora</button>' +
        '<ol class="instalar-pasos"></ol>' +
        '<button class="btn btn-ghost oscuro btn-ancho" type="button" id="instalar-cerrar">Cerrar</button>' +
      "</div>";
    document.body.appendChild(modal);
    modal.addEventListener("click", function (ev) {
      if (ev.target === modal) cerrar();
    });
    document.getElementById("instalar-cerrar").addEventListener("click", cerrar);
    document.getElementById("instalar-ahora").addEventListener("click", function () {
      intentarInstalar(true);
    });
    return modal;
  }

  function pintarModal(app) {
    asegurarModal();
    var esAdmin = app === "admin";
    document.getElementById("instalar-titulo").textContent = esAdmin
      ? "Añadir Administración a la pantalla de inicio"
      : "Añadir al escritorio o pantalla de inicio";
    document.getElementById("instalar-texto").textContent = esAdmin
      ? "Queda como una app aparte para dirección. Cada vez que se abra pedirá la contraseña."
      : "Así abres LITPA como una app, sin buscar en el navegador.";
    modal.querySelector(".instalar-pasos").innerHTML = pasos(app).map(function (p) {
      return "<li>" + p + "</li>";
    }).join("");
  }

  function abrir(app) {
    pintarModal(app);
    modal.hidden = false;
  }

  function cerrar() {
    if (modal) modal.hidden = true;
  }

  async function intentarInstalar(desdeModal) {
    if (deferred) {
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
      cerrar();
      return;
    }
    if (!desdeModal) {
      asegurarModal();
      modal.hidden = false;
    }
  }

  function registrarSW() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }

  function enlazar(boton) {
    if (!boton || yaInstalada()) {
      if (boton && yaInstalada()) boton.hidden = true;
      return;
    }
    boton.addEventListener("click", function () {
      pintarModal(boton.getAttribute("data-app") || "");
      intentarInstalar(false);
    });
  }

  function iniciar() {
    registrarSW();
    document.querySelectorAll("[data-instalar]").forEach(enlazar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  global.LITPA_INSTALL = { enlazar: enlazar, abrir: abrir };
})(window);
