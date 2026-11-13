(() => {
  'use strict';
  // Demostración local: las contraseñas se guardan cifradas (PBKDF2 + sal) en este navegador.
  // Para producción, la validación debe hacerse en un servidor.
  const STORE_KEY = 'fixlab.usuarios.demo';
  const ITERATIONS = 100000;
  const USERNAME_RE = /^[a-z0-9._-]{3,20}$/;
  const ROLE_LABEL = { admin: 'Administrador', pasante: 'Pasante' };
  let memory = null; // respaldo si el navegador bloquea localStorage

  const $ = id => document.getElementById(id);
  const normalize = value => value.trim().toLowerCase();
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const canHash = () => Boolean(window.crypto && crypto.subtle);
  const toHex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const fromHex = hex => Uint8Array.from(hex.match(/../g) || [], pair => parseInt(pair, 16));
  const randomHex = bytes => toHex(crypto.getRandomValues(new Uint8Array(bytes)));
  const newId = () => (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : randomHex(8));
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const notice = saved => (saved ? '' : ' Aviso: este navegador no guarda datos; la cuenta se perderá al recargar.');

  function generatePassword(length = 10) {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    return Array.from(crypto.getRandomValues(new Uint32Array(length)), n => chars[n % chars.length]).join('');
  }
  async function hashPassword(password, saltHex) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: ITERATIONS }, key, 256);
    return toHex(new Uint8Array(bits));
  }

  function readUsers() {
    if (memory) return memory;
    try {
      const data = JSON.parse(FixDB.getItem(STORE_KEY) || '[]');
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }
  function writeUsers(list) {
    try {
      FixDB.setItem(STORE_KEY, JSON.stringify(list));
      memory = null;
      return true;
    } catch (error) {
      memory = list;
      return false;
    }
  }

  function setMsg(el, text, type = '') {
    el.className = 'msg' + (type ? ' ' + type : '');
    el.textContent = text;
  }
  function showCredentials(el, title, password, saved) {
    el.className = 'msg ok';
    el.innerHTML = `<div class="cred"><span>${esc(title)}</span><span>Contraseña: <code>${esc(password)}</code></span><button type="button" class="btn small" data-copy="${esc(password)}">Copiar</button></div><span>Compártela por WhatsApp. No se podrá volver a ver; si se pierde, usa “Restablecer”.${notice(saved)}</span>`;
  }

  function renderList() {
    const users = readUsers();
    $('count').textContent = users.length === 1 ? '1 cuenta' : `${users.length} cuentas`;
    $('list').innerHTML = users.length
      ? users.map(u => `
        <div class="user">
          <div class="avatar" aria-hidden="true">${esc(initials(u.name))}</div>
          <div class="user-info">
            <b>${esc(u.name)}</b>
            <small>@${esc(u.user)} · <span class="badge ${esc(u.role)}">${esc(ROLE_LABEL[u.role] || u.role)}</span> · Creado ${esc(u.createdAt)}</small>
          </div>
          <div class="user-actions">
            <button type="button" class="btn small" data-action="reset" data-id="${esc(u.id)}">Restablecer</button>
            <button type="button" class="btn small danger" data-action="delete" data-id="${esc(u.id)}">Eliminar</button>
          </div>
        </div>`).join('')
      : '<div class="empty">Todavía no hay usuarios. Crea el primero con el formulario.</div>';
  }

  $('generate').addEventListener('click', () => {
    $('password').value = generatePassword();
    $('password').focus();
  });

  $('new-user').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = $('form-msg');
    const name = $('name').value.trim().replace(/\s+/g, ' ');
    const username = normalize($('username').value);
    const role = form.elements.role.value;
    const password = $('password').value;

    if (name.length < 3) return setMsg(msg, 'Escribe el nombre completo de la persona.', 'err');
    if (!USERNAME_RE.test(username)) return setMsg(msg, 'El nombre de usuario no cumple el formato indicado.', 'err');
    if (readUsers().some(u => u.user === username)) return setMsg(msg, 'Ese usuario ya existe. Elige otro.', 'err');
    if (password.length < 8 || password.length > 64) return setMsg(msg, 'La contraseña debe tener entre 8 y 64 caracteres.', 'err');
    if (!canHash()) return setMsg(msg, 'Abre esta página con una conexión segura (https o localhost) para crear usuarios.', 'err');

    try {
      const salt = randomHex(16);
      const hash = await hashPassword(password, salt);
      const users = readUsers();
      users.push({ id: newId(), name, user: username, role, salt, hash, createdAt: new Date().toLocaleDateString('es-BO') });
      const saved = writeUsers(users);
      form.reset();
      renderList();
      showCredentials(msg, `Cuenta creada para ${name} (@${username}).`, password, saved);
    } catch (error) {
      setMsg(msg, 'No se pudo crear la cuenta. Inténtalo nuevamente.', 'err');
    }
  });

  async function resetPassword(id) {
    const users = readUsers();
    const target = users.find(u => u.id === id);
    if (!target) return;
    const password = generatePassword();
    const salt = randomHex(16);
    target.salt = salt;
    target.hash = await hashPassword(password, salt);
    const saved = writeUsers(users);
    showCredentials($('list-msg'), `Nueva contraseña para ${target.name} (@${target.user}).`, password, saved);
  }
  function deleteUser(id) {
    const users = readUsers();
    const target = users.find(u => u.id === id);
    if (!target || !confirm(`¿Eliminar a ${target.name} (@${target.user})? No podrá volver a ingresar.`)) return;
    const saved = writeUsers(users.filter(u => u.id !== id));
    renderList();
    setMsg($('list-msg'), `Se eliminó la cuenta de @${target.user}.${notice(saved)}`, saved ? 'ok' : 'err');
  }
  document.addEventListener('click', async event => {
    const copy = event.target.closest('[data-copy]');
    if (copy) {
      try {
        await navigator.clipboard.writeText(copy.dataset.copy);
        copy.textContent = 'Copiado';
      } catch (error) {
        copy.textContent = 'Cópiala manualmente';
      }
      return;
    }
    const action = event.target.closest('[data-action]');
    if (!action) return;
    if (action.dataset.action === 'delete') deleteUser(action.dataset.id);
    else await resetPassword(action.dataset.id);
  });

  async function findUser(username, password) {
    const user = readUsers().find(u => u.user === username);
    if (!user || !canHash()) return null;
    return (await hashPassword(password, user.salt)) === user.hash ? user : null;
  }
  $('login').addEventListener('submit', async event => {
    event.preventDefault();
    const msg = $('login-msg');
    const username = normalize($('l-user').value);
    const password = $('l-pass').value;
    if (!username || !password) return setMsg(msg, 'Escribe el usuario y la contraseña.', 'err');
    setMsg(msg, 'Verificando…');
    let user = null;
    try {
      user = await findUser(username, password);
    } catch (error) {
      user = null;
    }
    if (!user) return setMsg(msg, 'Usuario o contraseña incorrectos.', 'err');
    msg.className = 'msg ok';
    msg.innerHTML = `Ingreso correcto: <b>${esc(user.name)}</b> · ${esc(ROLE_LABEL[user.role] || user.role)}. Así entra al sistema con su rol.`;
  });

  renderList();
})();
