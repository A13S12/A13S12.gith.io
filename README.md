# FixLab · WhatsApp Recoger Equipo

Sistema de gestión del taller: clientes, equipos, pedidos, almacén y cuentas de acceso.

## Estructura

```
FixLab/
├── index.html              Sistema completo (pantalla de ingreso y aplicación)
├── generar-usuario.html    Pantalla sencilla para generar usuarios
├── styles.css              Estilos del sistema
├── generar-usuario.css     Estilos de la pantalla sencilla
├── db.js                   Conexión a los datos (almacenamiento del navegador)
├── app.js                  Interfaz principal (piezas, pedidos, pasos del equipo)
├── ayuda.js                Asistente de ayuda
├── almacen.js              Almacén: inventario, compras y pedidos
├── usuarios.js             Ingreso, roles y gestión de usuarios
├── generar-usuario.js      Lógica de la pantalla sencilla
└── README.md
```

## Cómo abrirlo

Todos los archivos deben estar en la misma carpeta. Abre `index.html` en el navegador.
No necesita instalar nada ni un servidor.

## Dónde se guardan los datos

Todo se guarda en el navegador de cada equipo (localStorage):

- `fixlab_warehouse_v1`: inventario, compras y pedidos del almacén.
- `fixlab.usuarios.v1`: cuentas creadas para ingresar al sistema. Las contraseñas se guardan cifradas (PBKDF2 con sal).

Por eso los datos no se comparten entre computadoras ni celulares. Para eso hace falta una base de datos en un servidor.

## Conectar una base de datos real

Solo cambia `db.js`. Ahí están las funciones `getItem` y `setItem` que usan el resto de los archivos. Si las reemplazas por llamadas a tu base de datos, el sistema seguirá funcionando igual, pero las validaciones de contraseña también deberían hacerse en el servidor.

## Cuentas base

Las cuentas `admin` y `pasante` están definidas al inicio de `usuarios.js`. Cambia sus contraseñas antes de usar el sistema en el taller.
