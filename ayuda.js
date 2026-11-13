(function () {
  // Retirar la interfaz anterior, si existe.
  document.getElementById("fixchat")?.remove();
  document.getElementById("fixchat-launch")?.remove();

  const ventana = document.getElementById("ventana-ayuda");
  const abrir = document.getElementById("abrir-ayuda");
  const cerrar = document.getElementById("cerrar-ayuda");
  const formulario = document.getElementById("formulario-ayuda");
  const entrada = document.getElementById("consulta-ayuda");
  const mensajes = document.getElementById("mensajes-ayuda");

  function normalizar(texto) {
    return String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function obtenerTexto(elemento, selector) {
    return elemento.querySelector(selector)?.textContent.trim()
      || "No registrado";
  }

  function obtenerOrdenes() {
    return Array.from(
      document.querySelectorAll("#ordenes tbody tr")
    );
  }

  function obtenerPiezas() {
    return Array.from(
      document.querySelectorAll("#piezas .inventory-item")
    );
  }

  function mostrarMensaje(texto, usuario = false) {
    const mensaje = document.createElement("div");

    mensaje.className = usuario
      ? "mensaje-fixlab usuario"
      : "mensaje-fixlab";

    // textContent evita interpretar mensajes como código HTML.
    mensaje.textContent = texto;
    mensajes.appendChild(mensaje);
    mensajes.scrollTop = mensajes.scrollHeight;
  }

  function mostrarVentana(visible) {
    ventana.hidden = !visible;
    abrir.setAttribute("aria-expanded", String(visible));

    if (visible) entrada.focus();
    else abrir.focus();
  }

  function abrirFormulario(idBoton, idModal) {
    const boton = document.getElementById(idBoton);
    const modal = document.getElementById(idModal);

    if (!boton || !modal) {
      mostrarMensaje(
        "No encontré ese formulario en esta página."
      );
      return;
    }

    boton.click();
    mostrarVentana(false);

    // Dar foco al primer campo del formulario.
    setTimeout(function () {
      if (!modal.hidden) {
        modal.querySelector("input, select, textarea")?.focus();
      } else {
        mostrarVentana(true);
        mostrarMensaje(
          "El botón existe, pero el formulario no se abrió. " +
          "Es necesario revisar el JavaScript del formulario."
        );
      }
    }, 0);
  }

  function describirOrden(fila) {
    return (
      obtenerTexto(fila, ".order-id") +
      "\nCliente: " + obtenerTexto(fila, ".device b") +
      "\nEquipo: " + obtenerTexto(fila, ".device small") +
      "\nEstado: " + obtenerTexto(fila, ".status") +
      "\nEntrega: " +
      (fila.cells[5]?.textContent.trim() || "Por confirmar")
    );
  }

  function responder(texto) {
    const pregunta = normalizar(texto);

    if (/^(hola|buenas|ayuda)/.test(pregunta)) {
      mostrarMensaje(
        "¡Hola! Puedo ayudarte con:\n\n" +
        "• Resumen del taller\n" +
        "• Consultar una orden: FL-1048\n" +
        "• Ver órdenes listas\n" +
        "• Consultar stock bajo\n" +
        "• Buscar cliente María\n" +
        "• Abrir una nueva reparación"
      );
      return;
    }

    if (/(nueva|crear|registrar).*(reparacion|orden)/.test(pregunta)) {
      abrirFormulario("newRepair", "repairModal");
      return;
    }

    if (/(nuevo|crear|registrar).*(cliente)/.test(pregunta)) {
      abrirFormulario("newClientBtn", "clientModal");
      return;
    }

    if (/(nueva|crear|registrar|agregar).*(pieza)/.test(pregunta)) {
      abrirFormulario("newPartBtn", "partModal");
      return;
    }

    // Ejemplos admitidos: FL-1048, #FL-1048 o 1048.
    const codigo = pregunta.match(/\b(?:fl[\s-]*)?(\d{4,})\b/);

    if (codigo) {
      const fila = obtenerOrdenes().find(function (orden) {
        const numero = obtenerTexto(orden, ".order-id")
          .replace(/\D/g, "");

        return numero === codigo[1];
      });

      mostrarMensaje(
        fila
          ? describirOrden(fila)
          : "No encontré esa orden entre los registros cargados."
      );
      return;
    }

    if (pregunta.includes("resumen")) {
      const ordenes = obtenerOrdenes();
      const listas = ordenes.filter(function (fila) {
        return normalizar(obtenerTexto(fila, ".status"))
          .includes("lista");
      });

      const clientes = document.querySelectorAll(
        ".client-list .client-row"
      ).length;

      mostrarMensaje(
        "Resumen de registros cargados:\n\n" +
        "Órdenes: " + ordenes.length +
        "\nListas para entregar: " + listas.length +
        "\nPendientes: " + (ordenes.length - listas.length) +
        "\nClientes en el directorio: " + clientes +
        "\nTipos de piezas: " + obtenerPiezas().length +
        "\n\nIncluye los datos de ejemplo de la página."
      );
      return;
    }

    if (/orden|reparaciones|entregar/.test(pregunta)) {
      let ordenes = obtenerOrdenes();

      if (/lista|entregar/.test(pregunta)) {
        ordenes = ordenes.filter(function (fila) {
          return normalizar(obtenerTexto(fila, ".status"))
            .includes("lista");
        });
      }

      mostrarMensaje(
        ordenes.length
          ? ordenes.map(describirOrden).join("\n\n")
          : "No encontré órdenes que coincidan."
      );
      return;
    }

    if (/stock|inventario|pieza|repuesto/.test(pregunta)) {
      let piezas = obtenerPiezas();

      if (/bajo|critic|agotad/.test(pregunta)) {
        piezas = piezas.filter(function (pieza) {
          const estado = normalizar(
            obtenerTexto(pieza, ".stock-warning")
          );

          return /bajo|critic/.test(estado)
            || Number(pieza.dataset.partStock) <= 2;
        });
      }

      mostrarMensaje(
        piezas.length
          ? piezas.map(function (pieza) {
              return (
                pieza.dataset.partName +
                "\nStock: " + pieza.dataset.partStock +
                "\nPrecio de pieza: Bs " +
                Number(pieza.dataset.partPrice).toFixed(2) +
                "\nEstado: " + obtenerTexto(pieza, ".stock-warning")
              );
            }).join("\n\n")
          : "No encontré piezas con esos criterios."
      );
      return;
    }

    if (pregunta.includes("cliente")) {
      const nombre = pregunta
        .replace(
          /\b(buscar|busca|ver|consultar|cliente|clientes|de|el|la)\b/g,
          ""
        )
        .replace(/[¿?.,]/g, "")
        .trim();

      const clientes = Array.from(
        document.querySelectorAll(".client-list .client-row")
      ).filter(function (fila) {
        return !nombre ||
          normalizar(obtenerTexto(fila, "b")).includes(nombre);
      });

      mostrarMensaje(
        clientes.length
          ? clientes.map(function (fila) {
              return obtenerTexto(fila, "b") +
                "\nEquipo: " + obtenerTexto(fila, ".client-device");
            }).join("\n\n")
          : "No encontré ese cliente en el directorio."
      );
      return;
    }

    if (pregunta.includes("gracias")) {
      mostrarMensaje("¡De nada! Estoy aquí para ayudarte.");
      return;
    }

    mostrarMensaje(
      "No tengo una respuesta programada para esa consulta.\n\n" +
      "Prueba: «resumen», «FL-1048», «stock bajo», " +
      "«buscar cliente María» o «nueva reparación»."
    );
  }

  abrir.addEventListener("click", function () {
    mostrarVentana(ventana.hidden);
  });

  cerrar.addEventListener("click", function () {
    mostrarVentana(false);
  });

  ventana.addEventListener("keydown", function (evento) {
    if (evento.key === "Escape") {
      mostrarVentana(false);
    }
  });

  formulario.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const texto = entrada.value.trim();
    if (!texto) return;

    mostrarMensaje(texto, true);
    entrada.value = "";
    responder(texto);
  });

  document.querySelectorAll("#opciones-ayuda button")
    .forEach(function (boton) {
      boton.addEventListener("click", function () {
        mostrarMensaje(boton.textContent, true);
        responder(boton.textContent);
      });
    });

  mostrarMensaje(
    "¡Hola! Soy el asistente de FixLab.\n" +
    "Escribe «ayuda» o selecciona una opción.\n\n" +
    "Consulto los datos cargados en esta página. " +
    "La conversación se borra al recargar."
  );
})();
