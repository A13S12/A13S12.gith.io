(() => {
  const parts = [...document.querySelectorAll('.part')];
  const pcPhoto = document.getElementById('pcPhoto');
  const pageProgress = document.getElementById('pageProgress');
  const stateLabel = document.getElementById('stateLabel');
  const stateBar = document.getElementById('stateBar');
  const stage = document.getElementById('pcStage');
  const hardwareState = document.querySelector('.hardware-state');

  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));

  const ease = t =>
    t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // Calcula si la PC está armada o desarmada según el scroll
  function explosionFromScroll(progress) {
    if (progress <= 0.47) {
      return ease(clamp(progress / 0.47));
    }

    if (progress <= 0.56) {
      return 1;
    }

    return 1 - ease(clamp((progress - 0.56) / 0.40));
  }

  function update() {
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    const progress =
      maxScroll > 0
        ? clamp(window.scrollY / maxScroll)
        : 0;

    const explode = explosionFromScroll(progress);

    pageProgress.style.width = `${progress * 100}%`;
    stateBar.style.width = `${explode * 100}%`;

    // Cambia el estado visual para que el reensamblaje se distinga del desmontaje.
    if (explode < 0.08) {
      stateLabel.textContent = 'ENSAMBLADO';
      hardwareState.dataset.phase = 'assembled';
    } else if (progress < 0.56) {
      stateLabel.textContent =
        `DESMONTANDO ${Math.round(explode * 100)}%`;
      hardwareState.dataset.phase = 'disassembling';
    } else {
      stateLabel.textContent =
        `REENSAMBLAJE ACTIVO · ${Math.round((1 - explode) * 100)}%`;
      hardwareState.dataset.phase = 'assembling';
    }

    pcPhoto.style.opacity = String(0.30 - explode * 0.18);

    pcPhoto.style.transform =
      `scale(${1 - explode * 0.035})`;

    // Movimiento de cada pieza
    parts.forEach((part, index) => {
      const x = Number(part.dataset.x || 0);
      const y = Number(part.dataset.y || 0);
      const r = Number(part.dataset.r || 0);
      const z = Number(part.dataset.z || 0);

      const delay = index * 0.022;

      const local = ease(
        clamp(
          (explode - delay) /
          Math.max(0.01, 1 - delay)
        )
      );

      const lift =
        Math.sin(local * Math.PI) * 10;

      part.style.transform = `
        translate3d(
          ${x * local}px,
          ${y * local - lift}px,
          ${z * local}px
        )
        rotate(${r * local}deg)
        scale(${1 + local * 0.025})
      `;

      part.style.opacity =
        String(0.26 + local * 0.30);

      part.style.filter = `
        saturate(${0.75 + local * 0.55})
        contrast(${1 + local * 0.08})
        drop-shadow(
          0
          ${8 + local * 16}px
          ${18 + local * 24}px
          rgba(0, 0, 0, 0.36)
        )
      `;
    });

    stage.style.transform = `
      translate(-50%, -50%)
      rotateX(${2 + explode * 2}deg)
      rotateY(${(progress - 0.5) * 2.8}deg)
    `;
  }

  let ticking = false;

  // Actualiza la animación mientras hacemos scroll
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          update();
          ticking = false;
        });

        ticking = true;
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', update);

  update();

  // Hace aparecer suavemente el contenido
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    {
      threshold: 0.14
    }
  );

  document
    .querySelectorAll('.reveal')
    .forEach(element => observer.observe(element));

  const repairModal = document.getElementById('repairModal');
  const purchaseModal = document.getElementById('purchaseModal');
  const clientModal = document.getElementById('clientModal');
  const partModal = document.getElementById('partModal');
  const reportsAccessModal = document.getElementById('reportsAccessModal');
  const reportsFullModal = document.getElementById('reportsFullModal');
  const manageModal = document.getElementById('manageModal');
  const repairForm = document.getElementById('repairForm');
  const purchaseForm = document.getElementById('purchaseForm');
  const clientForm = document.getElementById('clientForm');
  const partForm = document.getElementById('partForm');
  const reportsAccessForm = document.getElementById('reportsAccessForm');
  const reportsPasswordInput = document.getElementById('reportsPasswordInput');
  const reportsPasswordError = document.getElementById('reportsPasswordError');
  const manageForm = document.getElementById('manageForm');
  const tableBody = document.querySelector('tbody');
  const partList = document.querySelectorAll('.inventory-item');

  const setModal = (modal, isOpen) => {
    if (isOpen && window.scRole === 'pasante' && !['repairModal', 'clientModal'].includes(modal.id)) return;
    modal.hidden = !isOpen;
    document.body.classList.toggle('modal-open', isOpen);
    if (isOpen) {
      const firstInput = modal.querySelector('input, select, textarea');
      firstInput?.focus();
    }
  };

  // Contraseña de acceso a Reportes. Cámbiala aquí si deseas usar otra.
  const REPORTS_PASSWORD = 'Servicell2026';

  const requestReportsAccess = () => {
    reportsAccessForm.reset();
    reportsPasswordError.textContent = '';
    reportsPasswordInput.classList.remove('input-error');
    setModal(reportsAccessModal, true);
  };

  reportsAccessForm.addEventListener('submit', event => {
    event.preventDefault();
    const enteredPassword = reportsPasswordInput.value;

    if (enteredPassword === REPORTS_PASSWORD) {
      reportsPasswordError.textContent = '';
      reportsPasswordInput.classList.remove('input-error');
      setModal(reportsAccessModal, false);
      setModal(reportsFullModal, true);
      return;
    }

    reportsPasswordError.textContent = 'Contraseña incorrecta. Inténtalo nuevamente.';
    reportsPasswordInput.classList.add('input-error');
    reportsPasswordInput.select();
  });

  reportsPasswordInput.addEventListener('input', () => {
    reportsPasswordError.textContent = '';
    reportsPasswordInput.classList.remove('input-error');
  });

  document.getElementById('newRepair').addEventListener('click', () => setModal(repairModal, true));
  document.getElementById('topReportsBtn').addEventListener('click', requestReportsAccess);
  const footerReportsBtn = document.getElementById('footerReportsBtn');
  if (footerReportsBtn) {
    footerReportsBtn.addEventListener('click', event => {
      event.preventDefault();
      requestReportsAccess();
    });
  }
  document.getElementById('closeReportsAccessModal').addEventListener('click', () => setModal(reportsAccessModal, false));
  document.getElementById('cancelReportsAccess').addEventListener('click', () => setModal(reportsAccessModal, false));
  reportsAccessModal.addEventListener('click', event => {
    if (event.target === reportsAccessModal) setModal(reportsAccessModal, false);
  });
  document.getElementById('closeReportsFullModal').addEventListener('click', () => setModal(reportsFullModal, false));
  reportsFullModal.addEventListener('click', event => {
    if (event.target === reportsFullModal) setModal(reportsFullModal, false);
  });
  document.getElementById('closeModal').addEventListener('click', () => setModal(repairModal, false));
  document.getElementById('cancelModal').addEventListener('click', () => setModal(repairModal, false));
  repairModal.addEventListener('click', event => {
    if (event.target === repairModal) setModal(repairModal, false);
  });

  const purchaseTitle = document.getElementById('purchaseTitle');
  const purchaseEyebrow = purchaseModal.querySelector('.eyebrow');
  const purchaseDescription = purchaseModal.querySelector('p');
  const purchaseItemLabel = document.getElementById('purchaseItemLabel');
  const purchasePartSelect = purchaseForm.querySelector('select[name="part"]');
  const purchaseRequestList = document.getElementById('purchaseRequestList');
  const purchaseOptions = {
    parts: ['Bateria iPhone 11', 'Pantalla Samsung A52', 'Flex puerto Lightning', 'Pantalla iPhone 13 Pro'],
    products: ['Laptop para trabajo', 'Laptop gamer', 'Reloj digital', 'Parlante portatil', 'Pates electronicas']
  };
  const openPurchaseModal = type => {
    const isProduct = type === 'products';
    purchaseEyebrow.textContent = isProduct ? 'SOLICITUD DE PRODUCTOS' : 'SOLICITUD DE INVENTARIO';
    purchaseTitle.textContent = isProduct ? 'Solicitar productos' : 'Solicitar piezas';
    purchaseDescription.textContent = isProduct
      ? 'Completa el producto, cantidad y proveedor para pedirlo.'
      : 'Completa el repuesto, cantidad y proveedor para pedirlo.';
    purchaseItemLabel.textContent = isProduct ? 'Producto' : 'Repuesto';
    purchasePartSelect.innerHTML = purchaseOptions[type].map(option => `<option>${option}</option>`).join('');
    setModal(purchaseModal, true);
  };
  document.getElementById('requestPartsBtn').onclick = () => openPurchaseModal('parts');
  document.getElementById('requestProductsBtn').addEventListener('click', () => openPurchaseModal('products'));
  document.getElementById('closePurchaseModal').addEventListener('click', () => setModal(purchaseModal, false));
  document.getElementById('cancelPurchaseModal').addEventListener('click', () => setModal(purchaseModal, false));
  purchaseModal.addEventListener('click', event => {
    if (event.target === purchaseModal) setModal(purchaseModal, false);
  });
  document.getElementById('newClientBtn').addEventListener('click', () => setModal(clientModal, true));
  document.getElementById('closeClientModal').addEventListener('click', () => setModal(clientModal, false));
  document.getElementById('cancelClientModal').addEventListener('click', () => setModal(clientModal, false));
  clientModal.addEventListener('click', event => {
    if (event.target === clientModal) setModal(clientModal, false);
  });
  document.getElementById('newPartBtn').addEventListener('click', () => { partForm.reset(); delete partForm.dataset.editingItem; setModal(partModal, true); });
  document.getElementById('closePartModal').addEventListener('click', () => setModal(partModal, false));
  document.getElementById('cancelPartModal').addEventListener('click', () => setModal(partModal, false));
  partModal.addEventListener('click', event => {
    if (event.target === partModal) setModal(partModal, false);
  });
  document.getElementById('closeManageModal').addEventListener('click', () => setModal(manageModal, false));
  manageModal.addEventListener('click', event => {
    if (event.target === manageModal) setModal(manageModal, false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (!repairModal.hidden) setModal(repairModal, false);
      else if (!purchaseModal.hidden) setModal(purchaseModal, false);
      else if (!clientModal.hidden) setModal(clientModal, false);
      else if (!partModal.hidden) setModal(partModal, false);
      else if (!reportsAccessModal.hidden) setModal(reportsAccessModal, false);
      else if (!reportsFullModal.hidden) setModal(reportsFullModal, false);
      else if (!manageModal.hidden) setModal(manageModal, false);
    }
  });

  const escapeHtml = value => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const normalizeWhatsAppPhone = value => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('00')) digits = digits.slice(2);
    // En Bolivia los celulares suelen tener 8 digitos. Si se ingresa solo el numero local, agrega 591.
    if (digits.length === 8) digits = `591${digits}`;
    return digits;
  };

  const findClientPhone = clientName => {
    const normalizedName = String(clientName || '').trim().toLowerCase();
    const client = [...document.querySelectorAll('.client-row')].find(row =>
      row.querySelector('b')?.textContent.trim().toLowerCase() === normalizedName
    );
    return client?.dataset.phone || '';
  };

  const getPhoneForOrder = row => {
    const clientName = row.querySelector('.device b')?.textContent.trim() || 'cliente';
    let phone = normalizeWhatsAppPhone(row.dataset.phone || findClientPhone(clientName));
    if (!phone) {
      const entered = window.prompt(`Ingresa el WhatsApp de ${clientName}. Ejemplo: 70000000`);
      if (entered === null) return '';
      phone = normalizeWhatsAppPhone(entered);
    }
    if (phone.length < 10 || phone.length > 15) {
      window.alert('El numero de WhatsApp no parece valido. Usa el codigo de pais o un numero boliviano de 8 digitos.');
      return '';
    }
    row.dataset.phone = phone;
    return phone;
  };

  const openPickupWhatsApp = row => {
    const phone = getPhoneForOrder(row);
    if (!phone) return;

    const client = row.querySelector('.device b')?.textContent.trim() || 'cliente';
    const device = row.querySelector('.device small')?.textContent.trim() || 'equipo';
    const order = row.querySelector('.order-id')?.textContent.trim() || '';
    const message = `Hola ${client}, te informamos que tu ${device}${order ? ` (${order})` : ''} ya esta listo para recoger. Puedes pasar por C.B.B.A. cuando te sea posible. ¡Gracias!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) window.location.href = url;
    showToast(`WhatsApp preparado para ${client}`);
  };

  tableBody.addEventListener('click', event => {
    const button = event.target.closest('.whatsapp-order-btn');
    if (!button) return;
    const row = button.closest('tr');
    if (row) openPickupWhatsApp(row);
  });

  repairForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(repairForm);
    const nextOrder = 1049 + tableBody.rows.length;
    const price = Number(data.get('price')).toFixed(2);
    const received = new Date(data.get('received'));
    const delivery = new Date(data.get('delivery'));
    const receivedText = received.toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace('.', '');
    const deliveryText = delivery.toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace('.', '');
    const row = document.createElement('tr');
    row.dataset.phone = normalizeWhatsAppPhone(data.get('phone'));
    row.innerHTML = `
      <td><b class="order-id">#FL-${nextOrder}</b><small>Orden creada ahora</small></td>
      <td><b>${escapeHtml(receivedText)}</b></td>
      <td><div class="device"><span class="device-icon iphone">▯</span><div><b>${escapeHtml(data.get('client'))}</b><small>${escapeHtml(data.get('device'))}</small></div></div></td>
      <td>${escapeHtml(data.get('issue'))}<small class="sc-financial">${window.scRole === 'pasante' ? 'Cotización pendiente' : 'Precio: Bs ' + escapeHtml(price)}</small></td>
      <td><span class="status diagnosis">Diagnostico</span></td>
      <td><b>${escapeHtml(deliveryText)}</b></td>
      <td><div class="order-actions"><button class="whatsapp-order-btn" type="button">WhatsApp</button><button class="row-menu" aria-label="Acciones de la orden">···</button></div></td>`;
    tableBody.prepend(row);
    repairForm.reset();
    setModal(repairModal, false);
    showToast('Orden creada correctamente');
  });

  purchaseForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(purchaseForm);
    const part = escapeHtml(data.get('part'));
    const quantity = escapeHtml(data.get('quantity'));
    const price = Number(data.get('price') || 0);
    const supplier = escapeHtml(data.get('supplier'));
    const priority = escapeHtml(data.get('priority'));

    const item = document.createElement('div');
    item.className = 'purchase-request-item';
    item.innerHTML = `<span>${part} x${quantity}</span><strong>Bs ${Number(price).toFixed(2)}</strong>`;
    purchaseRequestList.prepend(item);

    window.warehousePurchase?.(String(data.get('part')), Number(data.get('quantity')), String(data.get('supplier')));
    purchaseForm.reset();
    setModal(purchaseModal, false);
    showToast(`Solicitud creada: ${part} x${quantity} · ${priority} · Bs ${price.toFixed(2)} · ${supplier}`);
  });

  clientForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(clientForm);
    const name = String(data.get('name')).trim();
    const clientPhone = normalizeWhatsAppPhone(data.get('phone'));
    const estimatedPrice = Number(data.get('estimatedPrice') || 0);
    const workPrice = Number(data.get('workPrice') || 0);
    const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    const clientRow = document.createElement('div');
    clientRow.className = 'client-row';
    clientRow.dataset.phone = clientPhone;
    clientRow.innerHTML = `<span class="client-avatar blue-bg">${escapeHtml(initials)}</span><div><b>${escapeHtml(name)}</b><small class="sc-financial">${window.scRole === 'pasante' ? 'Cotización pendiente' : 'Est. Bs ' + escapeHtml(estimatedPrice.toFixed(2)) + ' · Trabajo Bs ' + escapeHtml(workPrice.toFixed(2))}</small></div><span class="client-device">${escapeHtml(data.get('device'))}</span><span class="client-status active-client">Activo</span><button class="row-menu" aria-label="Acciones de ${escapeHtml(name)}">···</button>`;
    document.querySelector('.client-list').append(clientRow);
    clientRow.querySelector('.row-menu').addEventListener('click', () => showToast(`Acciones disponibles para ${name}`));
    clientForm.reset();
    setModal(clientModal, false);
    showToast(window.scRole === 'pasante' ? `Cliente registrado: ${name}` : `Cliente registrado: ${name} · Est. Bs ${estimatedPrice.toFixed(2)} · Trabajo Bs ${workPrice.toFixed(2)}`);
  });

  partForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(partForm);
    const name = String(data.get('partName')).trim();
    const price = Number(data.get('partPrice') || 0);
    const stock = Number(data.get('partStock') || 0);
    const supplier = String(data.get('partSupplier')).trim();
    const status = String(data.get('partStatus'));
    const inventoryTable = document.querySelector('#piezas .inventory-table');
    const editingItem = partForm.dataset.editingItem ? inventoryTable.querySelector(`[data-part-name="${CSS.escape(partForm.dataset.editingItem)}"]`) : null;

    const item = editingItem || document.createElement('div');
    item.className = 'inventory-item';
    item.dataset.partName = name;
    item.dataset.partPrice = String(price);
    item.dataset.partStock = String(stock);
    item.dataset.partSupplier = supplier;
    item.dataset.partStatus = status;

    const stockStatusClass = stock <= 2 ? 'critical-quantity' : '';
    const warningClass = status === 'Critico' ? 'stock-warning' : status === 'Bajo' ? 'stock-warning amber-text' : status === 'Solicitado' ? 'stock-warning' : 'stock-warning healthy-text';
    const statusLabel = status === 'Disponible' ? 'Disponible' : status === 'Bajo' ? 'Bajo' : status === 'Critico' ? 'Critico' : 'Solicitado';
    item.innerHTML = `
      <span class="part-thumb battery">▰</span>
      <div>
        <b>${escapeHtml(name)}</b>
        <small>Proveedor: ${escapeHtml(supplier)} · Precio: Bs ${escapeHtml(price.toFixed(2))}</small>
      </div>
      <strong class="quantity ${stockStatusClass}">${stock} uds.</strong>
      <span class="${warningClass}">${statusLabel}</span>
      <button class="row-menu edit-part-btn" type="button" aria-label="Editar ${escapeHtml(name)}">···</button>`;

    if (!editingItem) {
      inventoryTable.prepend(item);
    }

    item.querySelector('.edit-part-btn').addEventListener('click', () => {
      const target = item;
      partForm.dataset.editingItem = target.dataset.partName || name;
      partForm.elements.partName.value = target.dataset.partName || name;
      partForm.elements.partPrice.value = target.dataset.partPrice || price;
      partForm.elements.partStock.value = target.dataset.partStock || stock;
      partForm.elements.partSupplier.value = target.dataset.partSupplier || supplier;
      partForm.elements.partStatus.value = target.dataset.partStatus || status;
      setModal(partModal, true);
    });

    window.warehouseImport?.(item, partForm.dataset.editingItem);
    partForm.reset();
    delete partForm.dataset.editingItem;
    setModal(partModal, false);
    showToast(editingItem ? `Pieza actualizada: ${name} · Bs ${price.toFixed(2)}` : `Pieza guardada: ${name} · Bs ${price.toFixed(2)}`);
  });

  document.querySelectorAll('.edit-part-btn').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.inventory-item');
      partForm.dataset.editingItem = item.dataset.partName;
      partForm.elements.partName.value = item.dataset.partName || '';
      partForm.elements.partPrice.value = item.dataset.partPrice || '';
      partForm.elements.partStock.value = item.dataset.partStock || '';
      partForm.elements.partSupplier.value = item.dataset.partSupplier || '';
      partForm.elements.partStatus.value = item.dataset.partStatus || 'Disponible';
      setModal(partModal, true);
    });
  });

  const openManageModal = mode => {
    const isOrders = mode === 'orders';
    const title = document.getElementById('manageTitle');
    const description = document.getElementById('manageDescription');
    title.textContent = isOrders ? 'Modificar orden reciente' : 'Modificar inventario critico';
    description.textContent = isOrders
      ? 'Selecciona una orden y actualiza su estado, fechas o precio.'
      : 'Selecciona una pieza y actualiza su stock o estado.';

    if (isOrders) {
      const rows = orderRows();
      manageForm.innerHTML = `
        <label>Orden<select name="record" required>${rows.map((row, index) => `<option value="${index}">${escapeHtml(row.querySelector('.order-id')?.textContent || 'Orden')}</option>`).join('')}</select></label>
        <label>Estado<select name="status" required><option>En reparacion</option><option>Lista para entregar</option><option>Esperando pieza</option><option>Diagnostico</option></select></label>
        <label>Fecha recibido<input name="received" required></label>
        <label>Fecha de entrega<input name="delivery" required></label>
        <label>Precio (Bs)<input name="price" type="number" min="0" step="0.01" required></label>
        <div class="modal-actions"><button type="button" class="secondary-button" id="cancelManageModal">Cancelar</button><button class="primary-button" type="submit">Guardar orden</button></div>`;
      const updateOrderFields = () => {
        const row = rows[Number(manageForm.elements.record.value)];
        manageForm.elements.status.value = row.querySelector('.status')?.textContent.trim() || 'Diagnostico';
        manageForm.elements.received.value = row.cells[1]?.textContent.trim() || '';
        manageForm.elements.delivery.value = row.cells[5]?.textContent.trim() || '';
        manageForm.elements.price.value = row.cells[3]?.querySelector('small')?.textContent.replace('Precio: Bs ', '') || '0';
      };
      manageForm.elements.record.addEventListener('change', updateOrderFields);
      updateOrderFields();
      manageForm.addEventListener('submit', event => {
        event.preventDefault();
        const row = rows[Number(manageForm.elements.record.value)];
        row.cells[1].innerHTML = `<b>${escapeHtml(manageForm.elements.received.value)}</b>`;
        row.cells[3].innerHTML = `${escapeHtml(row.cells[3].textContent.replace(/Precio: Bs .*/, '').trim())}<small>Precio: Bs ${escapeHtml(Number(manageForm.elements.price.value).toFixed(2))}</small>`;
        const newStatus = manageForm.elements.status.value;
        const statusClass = newStatus === 'Lista para entregar' ? 'ready' : newStatus === 'En reparacion' ? 'in-progress' : newStatus === 'Esperando pieza' ? 'waiting' : 'diagnosis';
        row.cells[4].innerHTML = `<span class="status ${statusClass}">${escapeHtml(newStatus)}</span>`;
        row.cells[5].innerHTML = `<b>${escapeHtml(manageForm.elements.delivery.value)}</b>`;
        setModal(manageModal, false);
        showToast('Orden actualizada correctamente');
        if (newStatus === 'Lista para entregar') {
          window.setTimeout(() => openPickupWhatsApp(row), 150);
        }
      });
    } else {
      const rows = [...document.querySelectorAll('.inventory-panel .inventory-row')];
      manageForm.innerHTML = `
        <label>Pieza<select name="record" required>${rows.map((row, index) => `<option value="${index}">${escapeHtml(row.querySelector('.part-name b')?.textContent || 'Pieza')}</option>`).join('')}</select></label>
        <label>Stock actual<input name="stock" type="number" min="0" step="1" required></label>
        <label>Estado<select name="state" required><option>Critico</option><option>Bajo</option><option>Disponible</option></select></label>
        <div class="modal-actions"><button type="button" class="secondary-button" id="cancelManageModal">Cancelar</button><button class="primary-button" type="submit">Guardar inventario</button></div>`;
      const updateInventoryFields = () => {
        const row = rows[Number(manageForm.elements.record.value)];
        manageForm.elements.stock.value = row.querySelector('.stock b')?.textContent.match(/\d+/)?.[0] || '0';
        manageForm.elements.state.value = row.querySelector('.stock-warning')?.textContent.trim() || 'Bajo';
      };
      manageForm.elements.record.addEventListener('change', updateInventoryFields);
      updateInventoryFields();
      manageForm.addEventListener('submit', event => {
        event.preventDefault();
        const row = rows[Number(manageForm.elements.record.value)];
        const stock = manageForm.elements.stock.value;
        const state = manageForm.elements.state.value;
        row.querySelector('.stock b').textContent = `${stock} unidades`;
        row.querySelector('.stock-warning').textContent = state;
        row.querySelector('.stock-warning').className = `stock-warning ${state === 'Disponible' ? 'healthy-text' : state === 'Bajo' ? 'amber-text' : ''}`;
        setModal(manageModal, false);
        window.warehouseStock?.(row.querySelector('.part-name b').textContent, Number(stock));
        showToast('Inventario actualizado correctamente');
      });
    }
    document.getElementById('cancelManageModal').addEventListener('click', () => setModal(manageModal, false));
    setModal(manageModal, true);
  };

  document.getElementById('editOrdersBtn').addEventListener('click', () => openManageModal('orders'));
  document.getElementById('editInventoryBtn').addEventListener('click', () => openManageModal('inventory'));

  const orderRows = () => [...document.querySelectorAll('.orders-panel tbody tr')];
  document.querySelectorAll('.filter').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.filter').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const filter = button.textContent.toLowerCase();
      orderRows().forEach(row => {
        const status = row.querySelector('.status')?.textContent.toLowerCase() || '';
        row.hidden = !filter.includes('todas')
          && !(filter.includes('reparacion') && status.includes('reparacion'))
          && !(filter.includes('listas') && status.includes('lista'))
          && !(filter.includes('esperando') && status.includes('esperando'));
      });
    });
  });

  const topSearchInput = document.querySelector('.search input');
  const clientRows = () => [...document.querySelectorAll('.client-row')];

  topSearchInput.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();

    orderRows().forEach(row => {
      row.hidden = query !== '' && !row.textContent.toLowerCase().includes(query);
    });

    clientRows().forEach(row => {
      row.hidden = query !== '' && !row.textContent.toLowerCase().includes(query);
    });
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      document.querySelectorAll('.main-nav a').forEach(item => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  const inventoryLink = document.querySelector('.main-nav a[href="#inventario"]');
  if (inventoryLink) inventoryLink.href = '#inventario-completo';

  document.querySelectorAll('.local-search').forEach(input => {
    input.addEventListener('input', () => {
      const query = input.value.trim().toLowerCase();
      document.querySelectorAll(input.dataset.target).forEach(item => {
        item.hidden = !item.textContent.toLowerCase().includes(query);
      });
    });
  });

  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(item => item.classList.remove('active'));
      tab.classList.add('active');
      showToast(`Reporte actualizado: ${tab.textContent}`);
    });
  });

  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove('visible'), 2400);
  }

  document.querySelectorAll('[data-toast]').forEach(button => {
    button.addEventListener('click', () => showToast(button.dataset.toast));
  });

  document.querySelectorAll('.row-menu').forEach(button => {
    button.addEventListener('click', () => showToast('Acciones disponibles para este registro'));
  });
  document.getElementById('notificationsBtn').addEventListener('click', () => showToast('No tienes notificaciones nuevas'));
  document.querySelector('.top-avatar').addEventListener('click', () => showToast('Perfil de Juan Perez'));
  document.querySelector('.activity-panel .dots').addEventListener('click', () => showToast('Opciones de actividad abiertas'));
  document.getElementById('viewActivityBtn').addEventListener('click', () => showToast('Mostrando toda la actividad reciente'));
  document.getElementById('calendarBtn').addEventListener('click', () => showToast('Agenda actualizada para hoy'));

  const settingsLink = document.querySelector('.sidebar-bottom a[href="#configuracion"]');
  const workspace = document.querySelector('.workspace');
  if (settingsLink && workspace && !document.getElementById('configuracion')) {
    const settings = document.createElement('section');
    settings.className = 'settings-section';
    settings.id = 'configuracion';
    settings.innerHTML = `
      <div class="section-heading">
        <div><span class="eyebrow">CENTRO DE CONTROL</span><h2>Configuracion</h2><p>Personaliza el funcionamiento de tu taller y la experiencia de tus clientes.</p></div>
        <button class="primary-button" id="saveSettings"><span>✓</span> Guardar cambios</button>
      </div>
      <div class="settings-layout">
        <nav class="settings-nav" aria-label="Secciones de configuracion">
          <a class="active" href="#perfil-taller">◉ <span>Perfil del taller</span></a>
          <a href="#preferencias">⚙ <span>Preferencias</span></a>
          <a href="#notificaciones">♢ <span>Notificaciones</span></a>
          <a href="#seguridad">◇ <span>Seguridad</span></a>
        </nav>
        <div class="settings-content">
          <article class="panel settings-card" id="perfil-taller"><div class="settings-card-heading"><div><h3>Perfil del taller</h3><p>Estos datos aparecen en ordenes, recibos y mensajes.</p></div><span class="settings-mark">FIX</span></div><div class="settings-form"><label>Nombre del negocio<input value="FixLab Centro de Reparacion"></label><label>Correo de contacto<input type="email" value="contacto@fixlab.bo"></label><label>Telefono<input value="+591 700 245 18"></label><label>Ciudad<select><option>La Paz</option><option>Santa Cruz</option><option>Cochabamba</option></select></label><label class="full-field">Direccion<input value="Av. Arce 2450, Sucursal Central"></label></div></article>
          <article class="panel settings-card" id="preferencias"><div class="settings-card-heading"><div><h3>Preferencias de trabajo</h3><p>Define como se gestionan las reparaciones diariamente.</p></div></div><div class="setting-row"><div><b>Confirmar presupuesto antes de reparar</b><small>Evita iniciar una orden sin aprobacion del cliente.</small></div><label class="switch"><input type="checkbox" checked><span></span></label></div><div class="setting-row"><div><b>Generar numero de orden automatico</b><small>Asigna un codigo unico a cada equipo recibido.</small></div><label class="switch"><input type="checkbox" checked><span></span></label></div><div class="setting-row"><div><b>Modo de diagnostico express</b><small>Marca reparaciones sencillas para entrega el mismo dia.</small></div><label class="switch"><input type="checkbox"><span></span></label></div></article>
          <article class="panel settings-card" id="notificaciones"><div class="settings-card-heading"><div><h3>Notificaciones</h3><p>Elige que actualizaciones quieres recibir.</p></div></div><div class="setting-row"><div><b>Cliente aprobo un presupuesto</b><small>Recibe un aviso cuando una orden pueda avanzar.</small></div><label class="switch"><input type="checkbox" checked><span></span></label></div><div class="setting-row"><div><b>Stock por debajo del minimo</b><small>Alertas para piezas criticas del inventario.</small></div><label class="switch"><input type="checkbox" checked><span></span></label></div></article>
          <article class="panel settings-card" id="seguridad"><div class="settings-card-heading"><div><h3>Seguridad</h3><p>Protege el acceso al espacio de trabajo.</p></div></div><div class="security-row"><span class="security-icon">✓</span><div><b>Verificacion en dos pasos</b><small>Activa una segunda capa para iniciar sesion.</small></div><button class="secondary-action" data-toast="Verificacion en dos pasos activada">Activar</button></div></article>
        </div>
      </div>`;
    workspace.append(settings);
    settingsLink.addEventListener('click', event => {
      event.preventDefault();
      settings.scrollIntoView({ behavior: 'smooth' });
    });
    settings.querySelectorAll('.settings-nav a').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        settings.querySelectorAll('.settings-nav a').forEach(item => item.classList.remove('active'));
        link.classList.add('active');
        document.querySelector(link.getAttribute('href')).scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
    settings.querySelector('#saveSettings').addEventListener('click', () => showToast('Configuracion guardada correctamente'));
    settings.querySelectorAll('[data-toast]').forEach(button => button.addEventListener('click', () => showToast(button.dataset.toast)));
  }
})();
