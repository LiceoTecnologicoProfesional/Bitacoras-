(function (global) {
  "use strict";

  var SESION = "litpa_admin_ok";
  var DEFAULT = "LITPA";

  async function verificar(clave) {
    clave = String(clave || "").trim();
    if (!global.LITPA || !LITPA.configurado || !LITPA.configurado()) {
      return clave === DEFAULT;
    }
    var res = await LITPA.verificarClaveAdmin(clave);
    return !!(res && res.ok);
  }

  async function cambiar(actual, nueva) {
    nueva = String(nueva || "").trim();
    if (nueva.length < 4) return { ok: false, error: "La nueva contraseña debe tener al menos 4 caracteres." };
    if (!global.LITPA || !LITPA.cambiarClaveAdmin) {
      return { ok: false, error: "No se pudo guardar en la base de datos." };
    }
    return LITPA.cambiarClaveAdmin(actual, nueva);
  }

  function sesionOk() {
    return sessionStorage.getItem(SESION) === "1";
  }

  function entrar() {
    sessionStorage.setItem(SESION, "1");
  }

  function salir() {
    sessionStorage.removeItem(SESION);
  }

  global.LITPA_AUTH = {
    verificar: verificar,
    cambiar: cambiar,
    sesionOk: sesionOk,
    entrar: entrar,
    salir: salir
  };
})(window);
