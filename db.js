// js/db.js
// Conexión a los datos del sistema. Todo lo que se guarda o se lee (inventario, pedidos y cuentas
// de usuario) pasa por este archivo.
//
// Hoy los datos se guardan en el navegador con localStorage. Las claves usadas son:
//   fixlab_warehouse_v1   -> inventario, compras y pedidos del almacén   (js/almacen.js)
//   fixlab.usuarios.v1    -> cuentas creadas para ingresar al sistema     (js/usuarios.js)
//
// Si más adelante conectas una base de datos real (Firebase, Supabase, un servidor propio),
// solo necesitas cambiar las dos funciones de este archivo; el resto del sistema no cambia.
window.FixDB = (() => {
  'use strict';
  return {
    getItem(key) {
      return window.localStorage.getItem(key);
    },
    setItem(key, value) {
      window.localStorage.setItem(key, value);
    }
  };
})();
