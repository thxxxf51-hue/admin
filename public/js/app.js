/* ══ CONFIG ══ */
const MAIN_URL = (window.MAIN_BOT_URL || 'https://giftbot-miniapp-production-d53b.up.railway.app').replace(/\/$/, '');
const SECRET = (window.ADMIN_SECRET || 'myadmin123');

/* ══ API ══ */
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET }
  };
  if (body && method !== 'GET') opts.body = JSON.stringify({ ...body, userId: '6151671553' });
  try {
    const r = await fetch(MAIN_URL + '/api/admin' + path + (method === 'GET' ? (path.includes('?') ? '&' : '?') + 'userId=6151671553' : ''), opts);
    return await r.json();
  } catch (e) { return { error: String(e.message) }; }
}

/* ══ TOAST ══ */
let _tt = null;
function toast(msg, type = 'g') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast ' + type + ' show';
  clearTimeout(_tt);
  _tt = setTimeout(() => el.classList.remove('show'), 3000);
}

/* ══ SIDEBAR ══ */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

/* ══ NAVIGATION ══ */
const PAGE_TITLES = {
  dashboard: 'Дашборд', users: 'Пользователи', draws: 'Розыгрыши',
  promos: 'Промокоды', balance: 'Монеты / Звёзды', shop: 'Магазин',
  tasks: 'Задания', bans: 'Бан / Разбан', broadcast: 'Рассылка',
  access: 'Доступ', repair: 'Тех. работы'
};
let _curPage = 'dashboard';

document.getElementById('nav').addEventListener('click', (e) => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  goPage(item.dataset.page);
  closeSidebar();
});

function goPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + name)?.classList.add('active');
  document.querySelector(`.nav-item[data-page="${name}"]`)?.classList.add('active');
  document.getElementById('topbar-title').textContent = PAGE_TITLES[name] || name;
  _curPage = name;
  loadPage(name);
}

function loadPage(name) {
  if (name === 'dashboard') loadDashboard();
  else if (name === 'users') loadUsers();
  else if (name === 'draws') loadDraws();
  else if (name === 'promos') loadPromos();
  else if (name === 'shop') loadShop();
  else if (name === 'tasks') loadTasks();
  else if (name === 'bans') loadBans();
  else if (name === 'access') loadAccess();
  else if (name === 'repair') loadRepair();
}

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  const d = await api('/stats');
  if (d.error) { toast('Ошибка загрузки', 'r'); return; }
  document.getElementById('s-users').textContent = (d.totalUsers || 0).toLocaleString('ru');
  document.getElementById('s-draws').textContent = d.activeDraws || 0;
  document.getElementById('s-promos').textContent = d.promos || 0;
  document.getElementById('s-vip').textContent = d.vipCount || 0;
  document.getElementById('s-coins').textContent = (d.totalCoins || 0).toLocaleString('ru');
  document.getElementById('s-repair').textContent = d.repairMode ? '🔧 Включены' : '✅ Выключены';
  document.getElementById('s-repair').style.color = d.repairMode ? '#f59e0b' : '#10b981';
  document.getElementById('users-count').textContent = (d.totalUsers || 0).toLocaleString('ru');
  const top = document.getElementById('top-users');
  top.innerHTML = (d.topUsers || []).map((u, i) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:12px;color:var(--muted2);width:16px">${i+1}</span>
      <div style="flex:1;font-size:13px;font-weight:600">${u.firstName || u.username || 'User'} ${u.username ? '<span style="color:var(--muted2)">@' + u.username + '</span>' : ''}</div>
      <span style="font-size:12px;font-weight:700;color:var(--green)">${(u.balance||0).toLocaleString('ru')}</span>
    </div>`
  ).join('') || '<div class="empty">Нет данных</div>';
}

/* ══ USERS ══ */
let _allUsers = [];
async function loadUsers() {
  const el = document.getElementById('user-list');
  el.innerHTML = '<div class="empty">Загрузка…</div>';
  const d = await api('/users');
  if (!Array.isArray(d)) { el.innerHTML = '<div class="empty">Ошибка</div>'; return; }
  _allUsers = d;
  renderUsers(d);
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase().trim();
  const filtered = q ? _allUsers.filter(u =>
    (u.username||'').toLowerCase().includes(q) ||
    (u.firstName||'').toLowerCase().includes(q) ||
    String(u.uid).includes(q)
  ) : _allUsers;
  renderUsers(filtered);
}

function renderUsers(users) {
  const el = document.getElementById('user-list');
  if (!users.length) { el.innerHTML = '<div class="empty">Ничего не найдено</div>'; return; }
  const now = Date.now();
  el.innerHTML = users.slice(0, 200).map((u, i) => {
    const initial = (u.firstName || u.username || '?')[0]?.toUpperCase() || '?';
    const isVip = u.vipExpiry && u.vipExpiry > now;
    const isBanned = u.banned;
    return `<div class="user-card" data-uid="${u.uid}" style="transition-delay:${Math.min(i,30)*22}ms" onclick="openUserModal('${u.uid}')">
      <div class="user-av">${u.photoUrl ? `<img src="${u.photoUrl}" onerror="this.remove()">` : initial}</div>
      <div class="user-info">
        <div class="user-name">${u.firstName || 'Пользователь'} ${isVip ? '<span class="badge badge-vip">VIP</span>' : ''} ${isBanned ? '<span class="badge badge-ban">БАН</span>' : ''}</div>
        <div class="user-meta"><span>@${u.username || '—'}</span><span>#${u.uid}</span></div>
      </div>
      <div class="user-bal">${(u.balance||0).toLocaleString('ru')}</div>
    </div>`;
  }).join('');
  // Animate
  requestAnimationFrame(() => {
    document.querySelectorAll('.user-card').forEach((c, i) => {
      setTimeout(() => c.classList.add('visible'), i * 22);
    });
  });
}

async function openUserModal(uid) {
  const d = await api('/users/' + uid);
  if (!d || d.error) { toast('Ошибка', 'r'); return; }
  const u = d;
  const now = Date.now();
  const isVip = u.vipExpiry && u.vipExpiry > now;
  document.getElementById('um-title').textContent = u.firstName || 'Пользователь';
  document.getElementById('um-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="user-av" style="width:48px;height:48px;font-size:18px">${u.photoUrl ? `<img src="${u.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (u.firstName||'?')[0]?.toUpperCase()}</div>
      <div>
        <div style="font-size:15px;font-weight:800">${u.firstName||'—'}</div>
        <div style="font-size:12px;color:var(--muted2)">@${u.username||'—'} · #${u.uid}</div>
        ${isVip ? '<span class="badge badge-vip">VIP до ' + new Date(u.vipExpiry).toLocaleDateString('ru') + '</span>' : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Монеты</div><div style="font-size:18px;font-weight:800;color:var(--green)">${(u.balance||0).toLocaleString('ru')}</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Stars</div><div style="font-size:18px;font-weight:800;color:#f59e0b">${u.starsBalance||0} ⭐</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Рефералов</div><div style="font-size:18px;font-weight:800">${(u.refs||[]).length}</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Задания</div><div style="font-size:18px;font-weight:800">${(u.doneTasks||[]).length}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted2);margin-bottom:12px">Регистрация: ${u.createdAt ? new Date(u.createdAt).toLocaleString('ru') : '—'} · Последний вход: ${u.lastSeen ? new Date(u.lastSeen).toLocaleString('ru') : '—'}</div>
    <div class="btn-row">
      <button class="btn btn-green btn-sm" onclick="quickBal('${uid}','add')">+ Монеты</button>
      <button class="btn btn-ghost btn-sm" onclick="quickBal('${uid}','sub')">- Монеты</button>
      <button class="btn btn-danger btn-sm" onclick="quickBan('${uid}','${u.username||''}')">Бан</button>
    </div>`;
  document.getElementById('user-modal').classList.add('show');
}
function closeUserModal() { document.getElementById('user-modal').classList.remove('show'); }

async function quickBal(uid, action) {
  const amt = prompt(action === 'add' ? 'Сколько монет выдать?' : 'Сколько монет снять?');
  if (!amt || isNaN(amt)) return;
  const reason = prompt('Причина (Enter чтобы пропустить):') || '';
  const r = await api('/balance', 'POST', { targetUid: uid, amount: Number(amt), action, reason });
  if (r.ok) { toast(action === 'add' ? `+${amt} монет выдано` : `-${amt} монет снято`, 'g'); closeUserModal(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function quickBan(uid, username) {
  const reason = prompt('Причина бана:') || '';
  const r = await api('/ban', 'POST', { targetUid: uid, username, duration: 0, reason });
  if (r.ok) { toast('Пользователь забанен', 'g'); closeUserModal(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ DRAWS ══ */
let _drawConds = [];

function addDrawCond() {
  const type = document.getElementById('d-cond-type').value;
  const val = document.getElementById('d-cond-val').value.trim();
  const labels = { tg: '📢 Канал', tg_chat: '💬 Чат', task: '✅ Задание', vip: '⭐ VIP только' };
  _drawConds.push({ type, value: val, label: labels[type] || type });
  document.getElementById('d-cond-val').value = '';
  renderDrawConds();
}

function renderDrawConds() {
  const el = document.getElementById('d-conds-list');
  el.innerHTML = _drawConds.map((c, i) =>
    `<div class="cond-row"><div class="cond-name">${c.label}: ${c.value || '—'}</div><button class="cond-del" onclick="_drawConds.splice(${i},1);renderDrawConds()">×</button></div>`
  ).join('');
}

function previewDrawImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('d-img-preview').innerHTML =
      `<img src="${ev.target.result}" style="width:100%;border-radius:10px;max-height:140px;object-fit:cover">`;
  };
  reader.readAsDataURL(file);
}

async function createDraw() {
  const prize = document.getElementById('d-prize').value.trim();
  const desc = document.getElementById('d-desc').value.trim();
  const endVal = document.getElementById('d-end').value;
  const winners = parseInt(document.getElementById('d-winners').value) || 1;
  const requireTicket = document.getElementById('d-ticket').classList.contains('on');
  const vipOnly = document.getElementById('d-vip-only').classList.contains('on');
  const imgUrl = document.getElementById('d-imgurl').value.trim();
  const imgFile = document.getElementById('d-img').files[0];

  if (!prize) { toast('Укажи приз', 'r'); return; }
  if (!endVal) { toast('Укажи время окончания', 'r'); return; }

  const endsAt = new Date(endVal).getTime();
  const timeMs = endsAt - Date.now();
  if (timeMs < 10000) { toast('Время окончания должно быть в будущем', 'r'); return; }

  const r = await api('/draws', 'POST', { prize, timeMs, winnersCount: winners, requireTicket, imageUrl: imgUrl || null });
  if (!r.ok) { toast(r.error || 'Ошибка', 'r'); return; }

  const id = r.id;
  if (desc) await api(`/draws/${id}/desc`, 'PATCH', { desc });
  // conditions
  for (const c of _drawConds) {
    if (c.type === 'tg' || c.type === 'tg_chat') {
      await api(`/draws/${id}/conditions`, 'POST', { type: c.type, channel: (c.value||'').replace('@',''), name: c.value });
    }
  }
  // upload image file
  if (imgFile) {
    const b64 = await new Promise(res => {
      const fr = new FileReader();
      fr.onload = e => res(e.target.result.split(',')[1]);
      fr.readAsDataURL(imgFile);
    });
    await api(`/draws/${id}/image`, 'POST', { imageBase64: b64, mimeType: imgFile.type });
  }
  toast(`Розыгрыш #${id} создан!`, 'g');
  _drawConds = [];
  renderDrawConds();
  ['d-prize','d-desc','d-end','d-imgurl'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('d-img-preview').innerHTML = '';
  loadDraws();
}

async function loadDraws() {
  const d = await api('/draws');
  const ad = document.getElementById('active-draws');
  const fd = document.getElementById('finished-draws');
  if (!d || d.error) { ad.innerHTML = '<div class="empty">Ошибка</div>'; return; }

  const active = (d.active || []);
  const finished = (d.finished || []);

  ad.innerHTML = active.length ? active.map(draw => `
    <div class="item-card">
      <div class="item-card-hdr">
        <div class="item-card-title">${draw.prize} ${/^\d+$/.test(String(draw.prize)) ? '💰' : '🎁'} <span style="font-size:10px;color:var(--muted2)">#${draw.id}</span></div>
        <span class="chip green">${draw.participants?.length || 0} уч.</span>
      </div>
      <div class="item-card-meta">
        <span>Поб.: ${draw.winnersCount||1}</span>
        <span>Конец: ${new Date(draw.endsAt).toLocaleString('ru')}</span>
      </div>
      <div class="item-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="openDrawEditModal(${JSON.stringify(draw).replace(/"/g,'&quot;')})">✏️ Редактировать</button>
        <button class="btn btn-green btn-sm" onclick="extendDraw(${draw.id})">+1ч</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDraw(${draw.id})">Удалить</button>
      </div>
    </div>`).join('') : '<div class="empty">Нет активных</div>';

  fd.innerHTML = finished.length ? finished.slice(0,20).map(draw => `
    <div class="item-card">
      <div class="item-card-hdr">
        <div class="item-card-title">${draw.prize} <span style="font-size:10px;color:var(--muted2)">#${draw.id}</span></div>
        <span class="chip">${(draw.participants||[]).length} уч.</span>
      </div>
      <div class="item-card-meta">
        <span>Победители: ${(draw.winners||[]).map(w=>w.name||w.firstName).join(', ') || '—'}</span>
        <span>${draw.finishedAt ? new Date(draw.finishedAt).toLocaleDateString('ru') : ''}</span>
      </div>
      <div class="item-card-actions">
        <button class="btn btn-gold btn-sm" onclick="rerollDraw(${draw.id})">🎲 Реролл</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFinishedDraw(${draw.id})">Удалить</button>
      </div>
    </div>`).join('') : '<div class="empty">Нет завершённых</div>';
}

let _editDraw = null;
function openDrawEditModal(draw) {
  _editDraw = draw;
  document.getElementById('dm-body').innerHTML = `
    <div class="inp-group"><label class="inp-label">Приз</label><input class="inp" id="dm-prize" value="${draw.prize||''}"></div>
    <div class="inp-group"><label class="inp-label">Описание</label><textarea class="inp" id="dm-desc">${draw.desc||''}</textarea></div>
    <div class="inp-row">
      <div class="inp-group"><label class="inp-label">Картинка URL</label><input class="inp" id="dm-img" value="${draw.imageUrl||''}"></div>
      <div class="inp-group"><label class="inp-label">Победителей</label><input class="inp" id="dm-wc" type="number" value="${draw.winnersCount||1}"></div>
    </div>
    <div class="inp-group"><label class="inp-label">Продлить на</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn btn-ghost btn-sm" onclick="extendDrawMs(${draw.id},600000)">+10м</button>
        <button class="btn btn-ghost btn-sm" onclick="extendDrawMs(${draw.id},3600000)">+1ч</button>
        <button class="btn btn-ghost btn-sm" onclick="extendDrawMs(${draw.id},86400000)">+1д</button>
        <button class="btn btn-ghost btn-sm" onclick="extendDrawMs(${draw.id},-3600000)">-1ч</button>
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveDrawEdit(${draw.id})">Сохранить</button>`;
  document.getElementById('draw-modal').classList.add('show');
}
function closeDrawModal() { document.getElementById('draw-modal').classList.remove('show'); }

async function saveDrawEdit(id) {
  const prize = document.getElementById('dm-prize').value.trim();
  const desc = document.getElementById('dm-desc').value.trim();
  const imageUrl = document.getElementById('dm-img').value.trim();
  const winnersCount = parseInt(document.getElementById('dm-wc').value) || 1;
  const r = await api(`/draws/${id}`, 'PATCH', { prize, desc, imageUrl, winnersCount });
  if (r.ok) { toast('Сохранено', 'g'); closeDrawModal(); loadDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function extendDraw(id) { await extendDrawMs(id, 3600000); }
async function extendDrawMs(id, ms) {
  const r = await api(`/draws/${id}/time`, 'PATCH', { addMs: ms });
  if (r.ok) { toast('Время обновлено', 'g'); loadDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function deleteDraw(id) {
  if (!confirm(`Удалить розыгрыш #${id}?`)) return;
  const r = await api(`/draws/${id}`, 'DELETE');
  if (r.ok) { toast('Удалено', 'g'); loadDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function deleteFinishedDraw(id) {
  if (!confirm(`Удалить завершённый розыгрыш #${id}?`)) return;
  const r = await api(`/draws/finished/${id}`, 'DELETE');
  if (r.ok) { toast('Удалено', 'g'); loadDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function rerollDraw(id) {
  const target = prompt('Юзернейм или UID победителя для реролла:');
  if (!target) return;
  const r = await api(`/draws/finished/${id}/reroll-winner`, 'POST', { target });
  if (r.ok) { toast('Реролл выполнен', 'g'); loadDraws(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ PROMOS ══ */
async function createPromo() {
  const code = document.getElementById('p-code').value.trim().toUpperCase();
  const reward = parseInt(document.getElementById('p-reward').value);
  const maxUses = parseInt(document.getElementById('p-uses').value) || 100;
  const vipOnly = document.getElementById('p-vip').classList.contains('on');
  if (!code || !reward) { toast('Заполни все поля', 'r'); return; }
  const r = await api('/promos', 'POST', { code, reward, maxUses, vipOnly });
  if (r.ok) { toast('Промокод создан', 'g'); ['p-code','p-reward','p-uses'].forEach(id => document.getElementById(id).value = ''); loadPromos(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function loadPromos() {
  const d = await api('/promos');
  const el = document.getElementById('promo-list');
  if (!d || typeof d !== 'object') { el.innerHTML = '<div class="empty">Ошибка</div>'; return; }
  const items = Object.entries(d);
  el.innerHTML = items.length ? items.map(([code, p]) =>
    `<div class="item-card">
      <div class="item-card-hdr">
        <div class="item-card-title" style="font-family:monospace;font-size:15px">${code}</div>
        <span class="chip green">+${p.reward}</span>
      </div>
      <div class="item-card-meta">
        <span>${p.usedCount||0} / ${p.maxUses} исп.</span>
        ${p.vipOnly ? '<span class="chip gold">VIP</span>' : ''}
      </div>
      <div class="item-card-actions">
        <button class="btn btn-danger btn-sm" onclick="deletePromo('${code}')">Удалить</button>
      </div>
    </div>`).join('') : '<div class="empty">Нет промокодов</div>';
}

async function deletePromo(code) {
  const r = await api('/promos/' + code, 'DELETE');
  if (r.ok) { toast('Удалено', 'g'); loadPromos(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ BALANCE ══ */
async function doBalance() {
  const user = document.getElementById('bal-user').value.trim();
  const amount = parseInt(document.getElementById('bal-amount').value);
  const type = document.getElementById('bal-type').value;
  const reason = document.getElementById('bal-reason').value.trim();
  if (!user || !amount) { toast('Заполни поля', 'r'); return; }
  const isUid = /^\d+$/.test(user);
  const isStars = type.includes('stars');
  const action = type.includes('add') ? 'add' : 'sub';
  const body = isUid ? { targetUid: user } : { targetUsername: user };
  Object.assign(body, { amount, action: isStars ? (action + '_stars') : action, reason });
  const r = await api('/balance', 'POST', body);
  if (r.ok) { toast(`Баланс обновлён: ${r.before} → ${r.after}`, 'g'); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ SHOP ══ */
async function loadShop() {
  const [staticR, customR] = await Promise.all([api('/shop/static'), api('/shop')]);
  const si = document.getElementById('static-items');
  const ci = document.getElementById('custom-items');
  si.innerHTML = Array.isArray(staticR) ? staticR.map(item =>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${item.name}</div><span class="chip">${item.price} 🪙</span></div>
      <div class="item-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="editStaticItem(${item.id})">✏️ Изменить цену/название</button>
      </div>
    </div>`).join('') : '<div class="empty">Ошибка</div>';

  ci.innerHTML = Array.isArray(customR) ? (customR.length ? customR.map(item =>
    `<div class="item-card">
      <div class="item-card-hdr">
        <div class="item-card-title">${item.name} ${item.tag === 'NEW' ? '<span class="badge-new">NEW</span>' : (item.tag ? '<span class="chip">'+item.tag+'</span>' : '')}</div>
        <span class="chip">${item.price} 🪙</span>
      </div>
      <div class="item-card-meta">
        ${item.desc ? '<span>' + item.desc.slice(0,40) + '</span>' : ''}
        ${item.stock !== null && item.stock !== undefined ? '<span>В наличии: ' + item.stock + '</span>' : ''}
      </div>
      <div class="item-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="editCustomItem(${item.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteShopItem(${item.id})">Удалить</button>
      </div>
    </div>`).join('') : '<div class="empty">Нет товаров</div>') : '<div class="empty">Ошибка</div>';
}

async function createShopItem() {
  const name = document.getElementById('sh-name').value.trim();
  const price = parseInt(document.getElementById('sh-price').value);
  const desc = document.getElementById('sh-desc').value.trim();
  const tag = document.getElementById('sh-tag').value.trim();
  const stock = parseInt(document.getElementById('sh-stock').value) || null;
  const imageUrl = document.getElementById('sh-img').value.trim();
  if (!name || !price) { toast('Заполни поля', 'r'); return; }
  const r = await api('/shop', 'POST', { name, price, desc, tag, imageUrl, stock: stock || null });
  if (r.ok) { toast('Товар добавлен', 'g'); ['sh-name','sh-price','sh-desc','sh-tag','sh-img'].forEach(id => document.getElementById(id).value = ''); loadShop(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function editStaticItem(id) {
  const name = prompt('Новое название (пусто = не менять):');
  const price = prompt('Новая цена (пусто = не менять):');
  const body = {};
  if (name) body.name = name;
  if (price) body.rew = parseInt(price);
  const r = await api('/shop/static/' + id, 'PATCH', body);
  if (r.ok) { toast('Обновлено', 'g'); loadShop(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function editCustomItem(id) {
  const price = prompt('Новая цена:');
  const stock = prompt('В наличии (шт, 0 = без ограничений):');
  const body = {};
  if (price) body.price = parseInt(price);
  if (stock !== null) body.stock = stock === '0' ? null : parseInt(stock);
  const r = await api('/shop/' + id, 'PATCH', body);
  if (r.ok) { toast('Обновлено', 'g'); loadShop(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function deleteShopItem(id) {
  if (!confirm('Удалить товар?')) return;
  const r = await api('/shop/' + id, 'DELETE');
  if (r.ok) { toast('Удалено', 'g'); loadShop(); }
}

/* ══ TASKS ══ */
async function loadTasks() {
  const [custom, stat] = await Promise.all([api('/tasks'), api('/tasks/static')]);
  const el = document.getElementById('tasks-list');
  const all = [...(Array.isArray(stat) ? stat : []), ...(Array.isArray(custom) ? custom : [])];
  el.innerHTML = all.length ? all.map(t =>
    `<div class="item-card">
      <div class="item-card-hdr">
        <div class="item-card-title">${t.name} ${t.isNew ? '<span class="badge-new">NEW</span>' : ''}</div>
        <span class="chip green">+${t.rew}</span>
      </div>
      <div class="item-card-meta"><span>${t.tag||''}</span>${t.channel ? '<span>@'+t.channel+'</span>' : ''}</div>
      ${!t._isStatic ? `<div class="item-card-actions"><button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Удалить</button></div>` : ''}
    </div>`).join('') : '<div class="empty">Нет заданий</div>';
}

async function createTask() {
  const name = document.getElementById('t-name').value.trim();
  const typeBase = document.getElementById('t-type').value;
  const channel = document.getElementById('t-channel').value.trim().replace('@','');
  const reward = parseInt(document.getElementById('t-reward').value);
  const desc = document.getElementById('t-desc').value.trim();
  const isNew = document.getElementById('t-new').classList.contains('on');
  if (!name || !reward) { toast('Заполни поля', 'r'); return; }
  const type = (typeBase === 'sub:' || typeBase === 'chat:') ? typeBase + channel : typeBase;
  const r = await api('/tasks', 'POST', { type, name, reward, desc, isNew });
  if (r.ok) { toast('Задание добавлено', 'g'); ['t-name','t-channel','t-reward','t-desc'].forEach(id => document.getElementById(id).value = ''); loadTasks(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function deleteTask(id) {
  const r = await api('/tasks/' + id, 'DELETE');
  if (r.ok) { toast('Удалено', 'g'); loadTasks(); }
}

/* ══ BANS ══ */
async function doBan() {
  const user = document.getElementById('ban-user').value.trim();
  const duration = document.getElementById('ban-dur').value;
  const reason = document.getElementById('ban-reason').value.trim();
  if (!user) { toast('Укажи пользователя', 'r'); return; }
  const r = await api('/ban', 'POST', { username: user, duration: Number(duration), reason });
  if (r.ok) { toast('Пользователь забанен', 'g'); ['ban-user','ban-reason'].forEach(id => document.getElementById(id).value = ''); loadBans(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function doUnban() {
  const user = document.getElementById('unban-user').value.trim();
  if (!user) { toast('Укажи пользователя', 'r'); return; }
  const r = await api('/unban', 'POST', { username: user });
  if (r.ok) { toast('Разбанен', 'g'); document.getElementById('unban-user').value = ''; loadBans(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function loadBans() {
  const d = await api('/stats');
  const el = document.getElementById('bans-list');
  // get bans from users list
  const users = await api('/users');
  const banned = Array.isArray(users) ? users.filter(u => u.banned) : [];
  el.innerHTML = banned.length ? banned.map(u =>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">@${u.username||'—'} · ${u.firstName||''}</div><span class="chip red">БАН</span></div>
      <div class="item-card-actions"><button class="btn btn-green btn-sm" onclick="doUnbanDirect('${u.username}')">✅ Разбанить</button></div>
    </div>`).join('') : '<div class="empty">Нет забаненных</div>';
}

async function doUnbanDirect(username) {
  const r = await api('/unban', 'POST', { username });
  if (r.ok) { toast('Разбанен', 'g'); loadBans(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ BROADCAST ══ */
async function doBroadcast() {
  const text = document.getElementById('bc-text').value.trim();
  const target = document.getElementById('bc-target').value;
  if (!text) { toast('Введи текст', 'r'); return; }
  const endpoint = target === 'vip' ? '/broadcast/vip' : '/broadcast';
  const r = await api(endpoint, 'POST', { text });
  if (r.ok) { toast(`Рассылка запущена (${r.queued || r.sent || '…'} чел.)`, 'g'); document.getElementById('bc-text').value = ''; }
  else toast(r.error || 'Ошибка', 'r');
}

async function doNotif() {
  const text = document.getElementById('notif-text').value.trim();
  const type = document.getElementById('notif-type').value;
  if (!text) { toast('Введи текст', 'r'); return; }
  const r = await api('/notify', 'POST', { type, text });
  if (r.ok) { toast('Уведомление отправлено', 'g'); document.getElementById('notif-text').value = ''; }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ ACCESS ══ */
let _accessData = null;
async function loadAccess() {
  const d = await api('/access');
  _accessData = d;
  const toggle = document.getElementById('access-toggle');
  if (d.enabled) toggle.classList.add('on'); else toggle.classList.remove('on');
  const el = document.getElementById('access-list');
  const wl = d.whitelist || [];
  el.innerHTML = wl.length ? wl.map(u =>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${u.firstName||'—'} @${u.username||'—'}</div><span style="font-size:11px;color:var(--muted2)">#${u.uid}</span></div>
      <div class="item-card-actions"><button class="btn btn-danger btn-sm" onclick="removeAccess('${u.uid}')">Убрать</button></div>
    </div>`).join('') : '<div class="empty">Список пуст — все имеют доступ</div>';
}

async function toggleAccess() {
  const enabled = !document.getElementById('access-toggle').classList.contains('on');
  const r = await api('/access', 'POST', { enabled });
  if (r.ok) { toast(enabled ? 'Режим приглашений включён' : 'Все могут заходить', 'g'); loadAccess(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function addAccess() {
  const uid = document.getElementById('acc-uid').value.trim();
  const username = document.getElementById('acc-user').value.trim().replace('@','');
  if (!uid) { toast('Укажи UID', 'r'); return; }
  const r = await api('/access/users', 'POST', { uid, username });
  if (r.ok) { toast('Добавлен', 'g'); document.getElementById('acc-uid').value = ''; document.getElementById('acc-user').value = ''; loadAccess(); }
  else toast(r.error || 'Ошибка', 'r');
}

async function removeAccess(uid) {
  const r = await fetch(MAIN_URL + '/api/admin/access/users/' + uid + '?userId=6151671553', {
    method: 'DELETE', headers: { 'x-admin-secret': SECRET }
  });
  toast('Удалён', 'g'); loadAccess();
}

/* ══ REPAIR ══ */
async function loadRepair() {
  const d = await api('/stats');
  const toggle = document.getElementById('repair-toggle');
  if (d.repairMode) toggle.classList.add('on'); else toggle.classList.remove('on');
  document.getElementById('repair-status').innerHTML = d.repairMode
    ? '<span style="color:#f59e0b;font-weight:700">🔧 Тех. работы включены — приложение недоступно</span>'
    : '<span style="color:#10b981;font-weight:700">✅ Всё работает — приложение доступно</span>';
}

async function toggleRepair() {
  const r = await api('/repair', 'POST', {});
  if (r.ok) { toast(r.repairMode ? '🔧 Тех. работы включены' : '✅ Тех. работы выключены', 'g'); loadRepair(); }
  else toast(r.error || 'Ошибка', 'r');
}

/* ══ INIT ══ */
loadDashboard();
setInterval(() => {
  if (_curPage === 'dashboard') loadDashboard();
}, 30000);
