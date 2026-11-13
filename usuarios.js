(() => {
  'use strict';
  // Acceso local de demostración. Las cuentas creadas (desde el login o desde Configuración) se guardan
  // en este navegador con la contraseña cifrada (PBKDF2 + sal). Para producción, validar en el servidor.
  // Cambia estos valores para personalizar las cuentas base de esta copia.
  const ACCOUNTS = [
    { user: 'admin', password: 'Servicell2026', role: 'admin', name: 'Administrador' },
    { user: 'pasante', password: 'Pasante2026', role: 'pasante', name: 'Pasante' }
  ];
  const ROLE_LABELS = { admin: 'Administrador', pasante: 'Pasante' };
  const STORE_KEY = 'fixlab.usuarios.v1';
  const ITERATIONS = 150000;
  const USERNAME_PATTERN = /^[a-z0-9._-]{3,20}$/;
  const restricted = [
    '#inventario', '#inventario-completo', '#piezas', '#productos-pedir', '#almacen',
    '#configuracion', '#ventas', '#pagos', '#facturacion', '#reportes',
    '#purchaseModal', '#partModal', '#reportsAccessModal', '#reportsFullModal',
    '#manageModal', '#wh-dialog', '#topReportsBtn', '#footerReportsBtn',
    '#editOrdersBtn', '#editInventoryBtn', '.row-menu', '.activity-panel',
    '.client-summary .activity-link', '#ayuda-fixlab', '#notificationsBtn',
    '.top-avatar', '.sidebar-bottom .more'
  ].join(',');
  const allowedHashes = new Set(['#inicio', '#ordenes', '#clientes']);
  let memoryUsers = null;   // respaldo en memoria si el navegador bloquea localStorage
  let currentUser = null;   // usuario con sesión abierta
  let signingIn = false;
  let saving = false;
  let roleGroups = 0;
  const managers = [];

  // ---------- Utilidades ----------
  const normalize = value => value.trim().toLowerCase();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const canHash = () => Boolean(window.crypto && window.crypto.subtle);
  const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const fromHex = hex => Uint8Array.from(hex.match(/../g) || [], pair => parseInt(pair, 16));
  const randomHex = bytes => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
  const newId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomHex(8));
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
  const saveNotice = saved => (saved ? '' : ' Aviso: este navegador no permite guardar datos; los cambios se perderán al recargar la página.');
  function generatePassword(length = 10) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint32Array(length)), n => chars[n % chars.length]).join('');
  }
  async function hashPassword(password, saltHex) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS }, key, 256);
    return toHex(new Uint8Array(bits));
  }

  // ---------- Almacenamiento de usuarios ----------
  function readUsers() {
    if (memoryUsers) return memoryUsers;
    try {
      const data = JSON.parse(FixDB.getItem(STORE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }
  // Devuelve false si el navegador no pudo guardar; en ese caso los cambios solo duran hasta recargar.
  function writeUsers(list) {
    try {
      FixDB.setItem(STORE_KEY, JSON.stringify(list));
      memoryUsers = null;
      return true;
    } catch (error) {
      memoryUsers = list;
      return false;
    }
  }

  // ---------- Roles y sesión ----------
  function applyRole(account) {
    document.body.dataset.scRole = account.role;
    window.scRole = account.role;
    document.querySelector('.user b').textContent = account.name;
    document.querySelector('.user small').textContent = account.role === 'pasante' ? 'Acceso limitado' : 'Acceso completo';
    document.querySelector('.user .avatar').textContent = account.role === 'pasante' ? 'PA' : 'AD';
    if (account.role !== 'pasante') return;
    document.querySelector('.page-heading h1').textContent = 'Panel del pasante';
    document.querySelector('.page-heading p').textContent = 'Registra clientes y equipos, y consulta el estado de las reparaciones.';
    document.querySelectorAll(restricted).forEach(element => {
      element.dataset.scRestricted = 'true';
      element.hidden = true;
      element.inert = true;
    });
    document.querySelectorAll('.main-nav a, .sidebar-bottom a').forEach(link => {
      if (!allowedHashes.has(link.getAttribute('href'))) {
        link.dataset.scRestricted = 'true'; link.hidden = true; link.inert = true;
      }
    });
    document.querySelectorAll('#repairForm [name="price"], #clientForm [name="estimatedPrice"], #clientForm [name="workPrice"]').forEach(input => {
      input.required = false; input.disabled = true;
      input.closest('label').dataset.scRestricted = 'true';
    });
    const note = document.createElement('p');
    note.textContent = 'La cotización será completada por el administrador.';
    note.style.cssText = 'color:#91bbae;font-size:12px';
    document.querySelector('#repairForm .modal-actions').before(note);
    document.querySelector('#clientForm .modal-actions').before(note.cloneNode(true));
    if (location.hash && !allowedHashes.has(location.hash)) location.hash = 'inicio';
  }
  document.addEventListener('click', event => {
    if (window.scRole !== 'pasante') return;
    const blocked = event.target.closest('[data-sc-restricted], ' + restricted);
    const link = event.target.closest('a[href^="#"]');
    if (blocked || (link && !allowedHashes.has(link.getAttribute('href')))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('submit', event => {
    if (window.scRole === 'pasante' && !['repairForm', 'clientForm'].includes(event.target.id)) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('hashchange', () => {
    if (window.scRole === 'pasante' && !allowedHashes.has(location.hash)) location.hash = 'inicio';
  });

  // ---------- Verificación de credenciales ----------
  async function findAccount(username, password) {
    const base = ACCOUNTS.find(item => item.user === username && item.password === password);
    if (base) return base;
    const stored = readUsers().find(item => item.user === username);
    if (!stored || !canHash()) return null;
    return (await hashPassword(password, stored.salt)) === stored.hash ? stored : null;
  }

  // ---------- Gestor de usuarios (se usa en el login y en Configuración) ----------
  const MANAGER_HTML = `
    <form class="sc-um-form" data-sc="form" autocomplete="off" novalidate>
      <div class="sc-um-grid">
        <label class="sc-um-lbl">Nombre completo
          <input class="sc-um-in" data-sc="name" maxlength="60" placeholder="Ej. Juan Pérez">
        </label>
        <label class="sc-um-lbl">Nombre de usuario
          <input class="sc-um-in" data-sc="username" maxlength="20" placeholder="Ej. juan.perez" autocapitalize="none" spellcheck="false">
        </label>
      </div>
      <p class="sc-um-hint">De 3 a 20 caracteres: letras sin acento, números, punto, guion o guion bajo.</p>
      <div class="sc-um-role-title" id="__ROLE__-title">Rol</div>
      <div class="sc-um-roles" role="radiogroup" aria-labelledby="__ROLE__-title">
        <label class="sc-um-role">
          <input type="radio" name="__ROLE__" value="pasante" checked>
          <div><b>Pasante</b><small>Registra clientes y equipos. Sin acceso a precios ni reportes.</small></div>
        </label>
        <label class="sc-um-role">
          <input type="radio" name="__ROLE__" value="admin">
          <div><b>Administrador</b><small>Acceso completo, incluida la configuración y los reportes.</small></div>
        </label>
      </div>
      <div class="sc-um-row">
        <label class="sc-um-lbl">Contraseña
          <input class="sc-um-in" data-sc="password" maxlength="64" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
        </label>
        <button type="button" class="sc-um-btn" data-sc="generate">Generar</button>
      </div>
      <button class="sc-um-submit" type="submit">＋ Crear usuario</button>
      <div class="sc-um-msg" data-sc="form-msg" role="status" aria-live="polite"></div>
    </form>
    <div class="sc-um-list-head"><b>Usuarios</b><span data-sc="count">0 cuentas creadas</span></div>
    <div data-sc="list"></div>
    <div class="sc-um-msg" data-sc="list-msg" role="status" aria-live="polite"></div>
    <p class="sc-um-note">Las cuentas se guardan en este navegador. Para usarlas desde otros equipos, se necesita un servidor.</p>`;

  function createManager(root) {
    const group = 'sc-role-' + (++roleGroups);
    root.classList.add('sc-um');
    root.innerHTML = MANAGER_HTML.replaceAll('__ROLE__', group);
    const hook = key => root.querySelector(`[data-sc="${key}"]`);

    function renderList() {
      const created = readUsers();
      hook('count').textContent = created.length === 1 ? '1 cuenta creada' : `${created.length} cuentas creadas`;
      const base = ACCOUNTS.map(account => `
        <div class="sc-um-user">
          <div class="sc-um-avatar" aria-hidden="true">${escapeHtml(initials(account.name))}</div>
          <div class="sc-um-info">
            <b>${escapeHtml(account.name)}</b>
            <small>@${escapeHtml(account.user)} · <span class="sc-um-badge ${escapeHtml(account.role)}">${escapeHtml(ROLE_LABELS[account.role])}</span> · Cuenta base</small>
          </div>
        </div>`).join('');
      const rows = created.map(item => `
        <div class="sc-um-user">
          <div class="sc-um-avatar" aria-hidden="true">${escapeHtml(initials(item.name))}</div>
          <div class="sc-um-info">
            <b>${escapeHtml(item.name)}</b>
            <small>@${escapeHtml(item.user)} · <span class="sc-um-badge ${escapeHtml(item.role)}">${escapeHtml(ROLE_LABELS[item.role] || item.role)}</span> · Creada ${escapeHtml(item.createdAt || '')}</small>
          </div>
          <div class="sc-um-acts">
            <button type="button" class="sc-um-btn" data-sc-action="reset" data-sc-id="${escapeHtml(item.id)}">Restablecer</button>
            <button type="button" class="sc-um-btn sc-um-danger" data-sc-action="delete" data-sc-id="${escapeHtml(item.id)}">Eliminar</button>
          </div>
        </div>`).join('');
      hook('list').innerHTML = base + (rows || '<div class="sc-um-empty">Todavía no hay usuarios creados. Usa el formulario para crear el primero.</div>');
    }

    function setMsg(key, text, type = '') {
      const box = hook(key);
      box.className = 'sc-um-msg' + (type ? ' is-' + type : '');
      box.textContent = text;
    }
    function showCredentials(key, title, password, saved) {
      const box = hook(key);
      box.className = 'sc-um-msg is-ok';
      box.innerHTML = `<div class="sc-um-cred"><span>${escapeHtml(title)}</span><span>Contraseña: <code>${escapeHtml(password)}</code></span><button type="button" class="sc-um-btn" data-sc-copy="${escapeHtml(password)}">Copiar</button></div><span>Compártela por WhatsApp. No se podrá volver a ver; si se pierde, usa “Restablecer contraseña”.${saveNotice(saved)}</span>`;
    }

    async function createUser(event) {
      event.preventDefault();
      if (saving) return;
      const form = event.currentTarget;
      const name = hook('name').value.trim().replace(/\s+/g, ' ');
      const username = normalize(hook('username').value);
      const role = form.querySelector('input[type="radio"]:checked').value;
      const password = hook('password').value;
      if (name.length < 3) return setMsg('form-msg', 'Escribe el nombre completo de la persona.', 'err');
      if (!USERNAME_PATTERN.test(username)) return setMsg('form-msg', 'El usuario debe tener de 3 a 20 caracteres: letras sin acento, números, punto, guion o guion bajo.', 'err');
      if (ACCOUNTS.some(account => account.user === username) || readUsers().some(item => item.user === username)) return setMsg('form-msg', 'Ese usuario ya existe. Elige otro nombre de usuario.', 'err');
      if (password.length < 8 || password.length > 64) return setMsg('form-msg', 'La contraseña debe tener entre 8 y 64 caracteres.', 'err');
      if (!canHash()) return setMsg('form-msg', 'Abre el sistema con una conexión segura (HTTPS o localhost) para crear usuarios.', 'err');
      saving = true;
      try {
        const salt = randomHex(16);
        const hash = await hashPassword(password, salt);
        const users = readUsers();
        users.push({ id: newId(), user: username, name, role, salt, hash, createdAt: new Date().toLocaleDateString('es-BO') });
        const saved = writeUsers(users);
        form.reset();
        refreshAll();
        showCredentials('form-msg', `Cuenta creada para ${name} (@${username}).`, password, saved);
      } catch (error) {
        setMsg('form-msg', 'No se pudo crear la cuenta. Inténtalo nuevamente.', 'err');
      } finally {
        saving = false;
      }
    }
    async function resetPassword(id) {
      const users = readUsers();
      const target = users.find(item => item.id === id);
      if (!target) return;
      if (!canHash()) return setMsg('list-msg', 'Abre el sistema con una conexión segura (HTTPS o localhost) para cambiar contraseñas.', 'err');
      try {
        const password = generatePassword();
        const salt = randomHex(16);
        target.salt = salt;
        target.hash = await hashPassword(password, salt);
        const saved = writeUsers(users);
        showCredentials('list-msg', `Nueva contraseña para ${target.name} (@${target.user}).`, password, saved);
      } catch (error) {
        setMsg('list-msg', 'No se pudo cambiar la contraseña. Inténtalo nuevamente.', 'err');
      }
    }
    function deleteUser(id) {
      const users = readUsers();
      const target = users.find(item => item.id === id);
      if (!target) return;
      if (target.user === currentUser) return setMsg('list-msg', 'No puedes eliminar la cuenta con la que tienes sesión abierta.', 'err');
      if (!confirm(`¿Eliminar a ${target.name} (@${target.user})? Ya no podrá ingresar al sistema.`)) return;
      const saved = writeUsers(users.filter(item => item.id !== id));
      refreshAll();
      setMsg('list-msg', `Se eliminó la cuenta de @${target.user}.${saveNotice(saved)}`, saved ? 'ok' : 'err');
    }

    hook('form').addEventListener('submit', createUser);
    hook('generate').addEventListener('click', () => {
      const input = hook('password');
      input.value = generatePassword();
      input.focus();
    });
    root.addEventListener('click', async event => {
      const copy = event.target.closest('[data-sc-copy]');
      if (copy) {
        try {
          await navigator.clipboard.writeText(copy.dataset.scCopy);
          copy.textContent = 'Copiado';
        } catch (error) {
          copy.textContent = 'Cópiala manualmente';
        }
        return;
      }
      const action = event.target.closest('[data-sc-action]');
      if (!action) return;
      if (action.dataset.scAction === 'delete') deleteUser(action.dataset.scId);
      else await resetPassword(action.dataset.scId);
    });

    const manager = { refresh: renderList };
    managers.push(manager);
    renderList();
    return manager;
  }
  function refreshAll() {
    managers.forEach(manager => manager.refresh());
  }

  // ---------- Botón "Crear nuevo usuario" en el login ----------
  const createDialog = document.getElementById('sc-create-dialog');
  createManager(document.getElementById('sc-create-root'));
  document.getElementById('sc-open-create').addEventListener('click', () => {
    if (typeof createDialog.showModal === 'function') createDialog.showModal();
    else createDialog.setAttribute('open', '');
    const first = createDialog.querySelector('input');
    if (first) first.focus();
  });
  document.getElementById('sc-create-close').addEventListener('click', () => createDialog.close());
  createDialog.addEventListener('click', event => {
    if (event.target === createDialog) createDialog.close();
  });

  // ---------- Formulario de ingreso ----------
  const loginForm = document.getElementById('sc-login-form');
  const loginUser = document.getElementById('sc-user');
  const loginPassword = document.getElementById('sc-password');
  const loginError = document.getElementById('sc-error');
  const loginButton = document.getElementById('sc-submit');
  const toggle = document.getElementById('sc-toggle');
  toggle.addEventListener('click', () => {
    const show = loginPassword.type === 'password';
    loginPassword.type = show ? 'text' : 'password';
    toggle.textContent = show ? 'Ocultar' : 'Mostrar';
    toggle.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
    toggle.setAttribute('aria-pressed', String(show));
  });
  loginForm.addEventListener('input', () => {
    loginError.textContent = '';
    loginPassword.removeAttribute('aria-invalid');
  });
  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn) return;
    signingIn = true;
    loginButton.disabled = true;
    let account = null;
    try {
      account = await findAccount(normalize(loginUser.value), loginPassword.value);
    } catch (error) {
      account = null;
    } finally {
      signingIn = false;
      loginButton.disabled = false;
    }
    if (!account) {
      loginError.textContent = 'Usuario o contraseña incorrectos. Inténtalo nuevamente.';
      loginPassword.setAttribute('aria-invalid', 'true');
      loginPassword.focus(); loginPassword.select();
      return;
    }
    currentUser = account.user;
    applyRole(account);
    loginForm.reset();
    loginPassword.type = 'password';
    toggle.textContent = 'Mostrar';
    toggle.setAttribute('aria-pressed', 'false');
    document.getElementById('sc-login').hidden = true;
    const system = document.getElementById('sc-system');
    system.hidden = false;
    system.inert = false;
    window.dispatchEvent(new Event('resize'));
    const heading = document.querySelector('.page-heading h1');
    heading.setAttribute('tabindex', '-1');
    heading.focus();
    window.scrollTo(0, 0);
  });
  // No se guarda la sesión: al recargar o cerrar sesión se vuelve a pedir acceso.
  document.getElementById('sc-logout').addEventListener('click', () => location.reload());

  // ---------- Panel "Usuarios y accesos" en Configuración (solo para quien tenga sesión admin) ----------
  function mountSettingsPanel() {
    const content = document.querySelector('#configuracion .settings-content');
    const nav = document.querySelector('#configuracion .settings-nav');
    if (!content || document.getElementById('usuarios')) return;
    const panel = document.createElement('article');
    panel.className = 'panel settings-card';
    panel.id = 'usuarios';
    panel.innerHTML = `
      <div class="settings-card-heading">
        <div><h3>Usuarios y accesos</h3><p>Crea cuentas para tu equipo. Cada persona entra con su usuario y contraseña.</p></div>
        <span class="settings-mark">+</span>
      </div>
      <div class="sc-um-host"></div>`;
    content.append(panel);
    createManager(panel.querySelector('.sc-um-host'));
    if (nav) {
      const link = document.createElement('a');
      link.href = '#usuarios';
      link.innerHTML = '◆ <span>Usuarios y accesos</span>';
      link.addEventListener('click', event => {
        event.preventDefault();
        nav.querySelectorAll('a').forEach(item => item.classList.remove('active'));
        link.classList.add('active');
        panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      nav.append(link);
    }
  }
  mountSettingsPanel();
})();
