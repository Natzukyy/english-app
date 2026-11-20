/* App.Storage — capa de persistencia local (IndexedDB) + exportar/importar respaldo en JSON.
   Sin dependencias. Namespace global para poder cargarse con <script> clásico.

   crear(nombreDB, version) fabrica una instancia independiente de esta misma API, apuntando
   a su propia base de IndexedDB. global.App.Storage es la instancia real de la app
   ("app-ingles"); tests/integracion.html usa App.Storage.crear(...) con otro nombre para no
   tocar los datos reales de Alex (ver DECISIONES.md D19). */
(function (global) {
  "use strict";

  var DB_NAME_POR_DEFECTO = "app-ingles";
  var DB_VERSION_POR_DEFECTO = 3; // v2: store "plan" (ruta guiada diaria); v3: store "avance" (ventanas por habilidad, D29)

  // Un solo lugar que define los "stores" de la base. Si se agrega uno nuevo,
  // subir la versión y agregarlo también aquí para que el export/import lo incluya.
  var STORES = [
    "settings", // clave -> valor (meta diaria, idioma, overrides de umbrales, etc.)
    "racha", // un solo registro con id "actual"
    "xp", // un solo registro con id "actual"
    "srs_cards", // tarjetas de repaso espaciado, por id
    "diagnostico_resultados", // historial de diagnósticos, por id (timestamp)
    "sesiones", // historial de sesiones de estudio, por id (timestamp)
    "plan", // ruta guiada del día, un registro por fecha YYYY-MM-DD (ver App.Plan/App.Datos)
    "avance" // una fila por habilidad (id = "lectura"...): nivel, ventana de respuestas, confirmación (D29)
  ];

  function crear(nombreDB, version) {
    var DB_NAME = nombreDB || DB_NAME_POR_DEFECTO;
    var DB_VERSION = version || DB_VERSION_POR_DEFECTO;
    var dbPromise = null;

    function openDB() {
      if (dbPromise) return dbPromise;
      dbPromise = new Promise(function (resolve, reject) {
        if (!global.indexedDB) {
          reject(new Error("IndexedDB no disponible en este entorno"));
          return;
        }
        var req = global.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function () {
          var db = req.result;
          STORES.forEach(function (name) {
            if (!db.objectStoreNames.contains(name)) {
              db.createObjectStore(name, { keyPath: "id" });
            }
          });
        };
        req.onsuccess = function () {
          resolve(req.result);
        };
        req.onerror = function () {
          reject(req.error);
        };
      });
      return dbPromise;
    }

    function withStore(storeName, mode, fn) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(storeName, mode);
          var store = tx.objectStore(storeName);
          var result;
          try {
            result = fn(store);
          } catch (err) {
            reject(err);
            return;
          }
          tx.oncomplete = function () {
            resolve(result);
          };
          tx.onerror = function () {
            reject(tx.error);
          };
        });
      });
    }

    function put(storeName, value) {
      if (!value || typeof value.id === "undefined") {
        return Promise.reject(new Error("put() requiere un objeto con 'id'"));
      }
      return withStore(storeName, "readwrite", function (store) {
        store.put(value);
      });
    }

    function get(storeName, id) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(storeName, "readonly");
          var req = tx.objectStore(storeName).get(id);
          req.onsuccess = function () {
            resolve(req.result || null);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      });
    }

    function getAll(storeName) {
      return openDB().then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(storeName, "readonly");
          var req = tx.objectStore(storeName).getAll();
          req.onsuccess = function () {
            resolve(req.result || []);
          };
          req.onerror = function () {
            reject(req.error);
          };
        });
      });
    }

    function remove(storeName, id) {
      return withStore(storeName, "readwrite", function (store) {
        store.delete(id);
      });
    }

    function clearStore(storeName) {
      return withStore(storeName, "readwrite", function (store) {
        store.clear();
      });
    }

    // Respaldo completo: { version, exportadoEn, datos: { storeName: [registros] } }
    function exportBackup() {
      return Promise.all(
        STORES.map(function (name) {
          return getAll(name).then(function (rows) {
            return [name, rows];
          });
        })
      ).then(function (pairs) {
        var datos = {};
        pairs.forEach(function (pair) {
          datos[pair[0]] = pair[1];
        });
        return {
          app: "app-ingles",
          version: DB_VERSION,
          exportadoEn: new Date().toISOString(),
          datos: datos
        };
      });
    }

    function importBackup(backup) {
      if (!backup || typeof backup !== "object" || !backup.datos) {
        return Promise.reject(new Error("Respaldo inválido: falta 'datos'"));
      }
      var nombres = Object.keys(backup.datos).filter(function (n) {
        return STORES.indexOf(n) !== -1;
      });
      // Un respaldo de una versión anterior (sin "avance") se restaura tal cual: el avance
      // continuo vuelve a empezar vacío, derivado de su diagnóstico (D29) -- si no, quedarían
      // niveles/ventanas más nuevos mezclados con un diagnóstico viejo.
      if (nombres.indexOf("avance") === -1) nombres.push("avance");
      return Promise.all(
        nombres.map(function (name) {
          return clearStore(name).then(function () {
            var filas = backup.datos[name] || [];
            return Promise.all(
              filas.map(function (fila) {
                return put(name, fila);
              })
            );
          });
        })
      ).then(function () {
        return { importados: nombres };
      });
    }

    function eliminarBaseDeDatos() {
      return new Promise(function (resolve, reject) {
        var req = global.indexedDB.deleteDatabase(DB_NAME);
        req.onsuccess = function () {
          resolve();
        };
        req.onerror = function () {
          reject(req.error);
        };
        req.onblocked = function () {
          resolve(); // sigue bloqueada por otra pestaña; no es un error nuestro, no nos colgamos
        };
      });
    }

    return {
      NOMBRE_DB: DB_NAME,
      STORES: STORES.slice(),
      openDB: openDB,
      put: put,
      get: get,
      getAll: getAll,
      remove: remove,
      clearStore: clearStore,
      exportBackup: exportBackup,
      importBackup: importBackup,
      eliminarBaseDeDatos: eliminarBaseDeDatos
    };
  }

  global.App = global.App || {};
  global.App.Storage = crear(DB_NAME_POR_DEFECTO, DB_VERSION_POR_DEFECTO);
  global.App.Storage.crear = crear;
})(typeof window !== "undefined" ? window : globalThis);
