/* ══ CONFIG — loaded from server ══ */
let SECRET = 'myadmin123';

async function initConfig() {
  try {
    const r = await fetch('/api/config');
    const d = await r.json();
    if (d.secret) SECRET = d.secret;
  } catch {}
}

/* ══ API — all calls go through our own proxy ══ */
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'x-admin-secret': SECRET }
  };
  const proxyPath = '/proxy/api/admin' + path;
  // Always add userId to query string for GET and DELETE
  const needsQs = method === 'GET' || method === 'DELETE';
  const qs = needsQs ? (path.includes('?') ? '&' : '?') + 'userId=6151671553' : '';
  if (body && method !== 'GET') opts.body = JSON.stringify({ ...body, userId: '6151671553' });
  else if (!body && method !== 'GET' && method !== 'DELETE') opts.body = JSON.stringify({ userId: '6151671553' });
  try {
    const r = await fetch(proxyPath + qs, opts);
    return await r.json();
  } catch (e) { return { error: String(e.message) }; }
}

/* ══ TOAST ══ */
let _tt = null;
function toast(msg, type = 'g') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast ' + type + ' show';
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
  dashboard:'Дашборд', users:'Пользователи', draws:'Розыгрыши',
  promos:'Промокоды', balance:'Монеты / Звёзды', shop:'Магазин',
  tasks:'Задания', bans:'Бан / Разбан', broadcast:'Рассылка',
  access:'Доступ', repair:'Тех. работы'
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
  if      (name === 'dashboard') loadDashboard();
  else if (name === 'users')     loadUsers();
  else if (name === 'draws')     loadDraws();
  else if (name === 'promos')    loadPromos();
  else if (name === 'shop')      loadShop();
  else if (name === 'tasks')     loadTasks();
  else if (name === 'bans')      loadBans();
  else if (name === 'access')    loadAccess();
  else if (name === 'repair')    loadRepair();
}

/* ══ DASHBOARD ══ */
async function loadDashboard() {
  const d = await api('/stats');
  if (d.error) { toast('Ошибка: ' + d.error, 'r'); return; }
  document.getElementById('s-users').textContent  = (d.totalUsers||0).toLocaleString('ru');
  document.getElementById('s-draws').textContent  = d.activeDraws||0;
  document.getElementById('s-promos').textContent = d.promos||0;
  document.getElementById('s-vip').textContent    = d.vipCount||0;
  document.getElementById('s-coins').textContent  = (d.totalCoins||0).toLocaleString('ru');
  document.getElementById('s-repair').textContent = d.repairMode ? '🔧 Включены' : '✅ Выкл';
  document.getElementById('s-repair').style.color = d.repairMode ? '#f59e0b' : '#10b981';
  document.getElementById('users-count').textContent = (d.totalUsers||0).toLocaleString('ru');
  const top = document.getElementById('top-users');
  top.innerHTML = (d.topUsers||[]).map((u,i) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
      <span style="font-size:12px;color:var(--muted2);width:16px">${i+1}</span>
      <div style="flex:1;font-size:13px;font-weight:600">${u.firstName||u.username||'User'} <span style="color:var(--muted2)">@${u.username||'—'}</span></div>
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
  if (!Array.isArray(d)) { el.innerHTML = '<div class="empty">Ошибка: ' + (d.error||'неизвестно') + '</div>'; return; }
  _allUsers = d;
  renderUsers(d);
}

function filterUsers() {
  const q = document.getElementById('user-search').value.toLowerCase().trim();
  renderUsers(q ? _allUsers.filter(u =>
    (u.username||'').toLowerCase().includes(q) ||
    (u.firstName||'').toLowerCase().includes(q) ||
    String(u.uid).includes(q)
  ) : _allUsers);
}

function renderUsers(users) {
  const el = document.getElementById('user-list');
  if (!users.length) { el.innerHTML = '<div class="empty">Ничего не найдено</div>'; return; }
  const now = Date.now();
  el.innerHTML = users.slice(0,200).map((u,i) => {
    const init = (u.firstName||u.username||'?')[0]?.toUpperCase()||'?';
    const isVip = u.vipExpiry && u.vipExpiry > now;
    return `<div class="user-card" style="transition-delay:${Math.min(i,30)*20}ms" onclick="openUserModal('${u.uid}')">
      <div class="user-av">${u.photoUrl?`<img src="${u.photoUrl}" onerror="this.remove()">`:''}${!u.photoUrl?init:''}</div>
      <div class="user-info">
        <div class="user-name">${u.firstName||'Пользователь'} ${isVip?'<span class="badge badge-vip">VIP</span>':''} ${u.banned?'<span class="badge badge-ban">БАН</span>':''}</div>
        <div class="user-meta"><span>@${u.username||'—'}</span><span>#${u.uid}</span></div>
      </div>
      <div class="user-bal">${(u.balance||0).toLocaleString('ru')}</div>
    </div>`;
  }).join('');
  requestAnimationFrame(() => {
    document.querySelectorAll('.user-card').forEach((c,i) => setTimeout(() => c.classList.add('visible'), i*20));
  });
}

async function openUserModal(uid) {
  const u = await api('/users/' + uid);
  if (!u || u.error) { toast('Ошибка', 'r'); return; }
  const now = Date.now();
  const isVip = u.vipExpiry && u.vipExpiry > now;
  document.getElementById('um-title').textContent = u.firstName || 'Пользователь';
  document.getElementById('um-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="user-av" style="width:48px;height:48px;font-size:18px">${u.photoUrl?`<img src="${u.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:(u.firstName||'?')[0]?.toUpperCase()}</div>
      <div>
        <div style="font-size:15px;font-weight:800">${u.firstName||'—'}</div>
        <div style="font-size:12px;color:var(--muted2)">@${u.username||'—'} · #${u.uid}</div>
        ${isVip?'<span class="badge badge-vip">VIP до '+new Date(u.vipExpiry).toLocaleDateString('ru')+'</span>':''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Монеты</div><div style="font-size:18px;font-weight:800;color:var(--green)">${(u.balance||0).toLocaleString('ru')}</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Stars</div><div style="font-size:18px;font-weight:800;color:#f59e0b">${u.starsBalance||0} ⭐</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Рефералов</div><div style="font-size:18px;font-weight:800">${(u.refs||[]).length}</div></div>
      <div class="stat-card" style="padding:10px"><div class="stat-lbl">Заданий</div><div style="font-size:18px;font-weight:800">${(u.doneTasks||[]).length}</div></div>
    </div>
    <div style="font-size:11px;color:var(--muted2);margin-bottom:12px">
      Регистрация: ${u.createdAt?new Date(u.createdAt).toLocaleString('ru'):'—'} · Вход: ${u.lastSeen?new Date(u.lastSeen).toLocaleString('ru'):'—'}
    </div>
    <div class="btn-row">
      <button class="btn btn-green btn-sm" onclick="quickBal('${uid}','add')">+ Монеты</button>
      <button class="btn btn-ghost btn-sm" onclick="quickBal('${uid}','sub')">- Монеты</button>
      <button class="btn btn-danger btn-sm" onclick="quickBanModal('${uid}','${u.username||''}')">🚫 Бан</button>
    </div>
    <div style="margin-top:14px">
      <div style="font-size:12px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">Транзакции</div>
      <div id="um-txs"><div style="text-align:center;padding:10px;color:var(--muted2);font-size:12px">Загрузка…</div></div>
    </div>`;
  document.getElementById('user-modal').classList.add('show');
  // Load transactions async
  loadUserTxs(uid);
  loadUserOrders(uid);
}
async function loadUserTxs(uid) {
  const el = document.getElementById('um-txs');
  if (!el) return;
  try {
    const r = await fetch(`/proxy/api/transactions?userId=${uid}&s=${SECRET}`, { headers:{'x-admin-secret':SECRET} });
    const d = await r.json();
    const txs = d.transactions || [];
    if (!txs.length) { el.innerHTML = '<div style="text-align:center;padding:10px;color:var(--muted2);font-size:12px">Нет транзакций</div>'; return; }
    el.innerHTML = txs.slice(0,20).map(tx => {
      const isPos = String(tx.amount||'').startsWith('+');
      const isNeg = String(tx.amount||'').startsWith('-');
      return `<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
        <span style="font-size:11px;font-weight:700;color:${isPos?'#10b981':isNeg?'#ef4444':'var(--muted2)'}">
          ${tx.amount||'—'}
        </span>
        <span style="flex:1;font-size:12px;color:rgba(255,255,255,.75)">${tx.details||tx.type||'—'}</span>
        <span style="font-size:10px;color:var(--muted2)">${tx.date||''}</span>
      </div>`;
    }).join('');
  } catch { el.innerHTML = '<div style="text-align:center;padding:10px;color:var(--muted2);font-size:12px">Ошибка</div>'; }
}

async function loadUserOrders(uid) {
  const r = await api('/orders/'+uid);
  if (!r.ok || !r.orders || !r.orders.length) return;
  const el = document.getElementById('um-txs');
  if (!el) return;
  const pending = r.orders.filter(o => o.status === 'pending');
  if (!pending.length) return;
  const ordersHtml = `<div style="margin-top:12px">
    <div style="font-size:12px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">📦 Заказы</div>
    ${pending.map(o => `
      <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;margin-bottom:6px">
        <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:6px">${o.type === 'stars' ? '⭐ ' + o.amount + ' Stars' : o.details}</div>
        <div style="font-size:11px;color:var(--muted2);margin-bottom:8px">${o.details} · <span style="color:#f59e0b;font-weight:600">На проверке</span></div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-green btn-sm" style="flex:1" onclick="orderAction('${uid}','${o.id}','approved')">✅ Одобрить</button>
          <button class="btn btn-danger btn-sm" style="flex:1" onclick="orderAction('${uid}','${o.id}','rejected')">❌ Отказ</button>
        </div>
      </div>`).join('')}
  </div>`;
  el.insertAdjacentHTML('afterend', ordersHtml);
}

async function orderAction(uid, orderId, status) {
  const r = await api('/orders/'+uid+'/'+orderId+'/status','POST',{ status });
  if (r.ok) {
    toast(status === 'approved' ? '✅ Одобрено' : '❌ Отказано', status === 'approved' ? 'g' : 'r');
    openUserModal(uid); // refresh
  } else toast(r.error||'Ошибка','r');
}

function closeUserModal() { document.getElementById('user-modal').classList.remove('show'); }

async function quickBal(uid, action) {
  const amt = prompt(action==='add'?'Сколько монет выдать?':'Сколько монет снять?');
  if (!amt || isNaN(amt)) return;
  const reason = prompt('Причина:') || '';
  const r = await api('/balance','POST',{ targetUid:uid, amount:Number(amt), action, reason });
  if (r.ok) { toast(action==='add'?`+${amt} монет выдано`:`-${amt} монет снято`,'g'); closeUserModal(); }
  else toast(r.error||'Ошибка','r');
}

async function quickBanModal(uid, username) {
  const reason = prompt('Причина бана:')||'';
  const dur = prompt('Срок (часы, 0=навсегда):')||'0';
  const duration = Number(dur)*3600000;
  const r = await api('/ban','POST',{ targetUid:uid, username, duration, reason });
  if (r.ok) { toast('Пользователь забанен','g'); closeUserModal(); loadUsers(); }
  else toast(r.error||'Ошибка','r');
}

/* ══ DRAWS ══ */
let _drawConds = [];
function addDrawCond() {
  const type = document.getElementById('d-cond-type').value;
  const val  = document.getElementById('d-cond-val').value.trim();
  const labels = { tg:'📢 Канал', tg_chat:'💬 Чат', task:'✅ Задание', vip:'⭐ VIP только' };
  _drawConds.push({ type, value:val, label:labels[type]||type });
  document.getElementById('d-cond-val').value = '';
  renderDrawConds();
}
function renderDrawConds() {
  document.getElementById('d-conds-list').innerHTML = _drawConds.map((c,i) =>
    `<div class="cond-row"><div class="cond-name">${c.label}: ${c.value||'—'}</div><button class="cond-del" onclick="_drawConds.splice(${i},1);renderDrawConds()">×</button></div>`
  ).join('');
}

function previewDrawImg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('d-img-preview').innerHTML = `<img src="${ev.target.result}" style="width:100%;border-radius:10px;max-height:140px;object-fit:cover">`; };
  reader.readAsDataURL(file);
}

async function createDraw() {
  const prize    = document.getElementById('d-prize').value.trim();
  const desc     = document.getElementById('d-desc').value.trim();
  const endVal   = document.getElementById('d-end').value;
  const winners  = parseInt(document.getElementById('d-winners').value)||1;
  const ticket   = document.getElementById('d-ticket').classList.contains('on');
  const imgUrl   = document.getElementById('d-imgurl').value.trim();
  const imgFile  = document.getElementById('d-img').files[0];
  if (!prize)  { toast('Укажи приз','r'); return; }
  if (!endVal) { toast('Укажи время окончания','r'); return; }
  const timeMs = new Date(endVal).getTime() - Date.now();
  if (timeMs < 10000) { toast('Дата в прошлом','r'); return; }
  const vipOnly = document.getElementById('d-vip-only').classList.contains('on');
  const ticketPriceEl = document.getElementById('d-ticket-price');
  const ticketPrice = ticketPriceEl ? (parseInt(ticketPriceEl.value)||null) : null;
  const r = await api('/draws','POST',{ prize, timeMs, winnersCount:winners, requireTicket:ticket, ticketPrice, vipOnly, imageUrl:imgUrl||null });
  if (!r.ok) { toast(r.error||'Ошибка','r'); return; }
  const id = r.id;
  if (desc) await api(`/draws/${id}/desc`,'PATCH',{ desc });
  for (const c of _drawConds) {
    if (c.type==='tg'||c.type==='tg_chat')
      await api(`/draws/${id}/conditions`,'POST',{ type:c.type, channel:(c.value||'').replace('@',''), name:c.value });
  }
  if (imgFile) {
    const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=e=>res(e.target.result.split(',')[1]); fr.readAsDataURL(imgFile); });
    await api(`/draws/${id}/image`,'POST',{ imageBase64:b64, mimeType:imgFile.type });
  }
  toast(`Розыгрыш #${id} создан!`,'g');
  _drawConds=[]; renderDrawConds();
  ['d-prize','d-desc','d-end','d-imgurl'].forEach(x=>document.getElementById(x).value='');
  document.getElementById('d-img-preview').innerHTML='';
  loadDraws();
}

async function loadDraws() {
  const d = await api('/draws');
  if (!d || d.error) { document.getElementById('active-draws').innerHTML='<div class="empty">Ошибка: '+(d?.error||'?')+'</div>'; return; }
  const ad = document.getElementById('active-draws');
  const fd = document.getElementById('finished-draws');
  ad.innerHTML = (d.active||[]).length ? (d.active||[]).map(draw=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${draw.prize} <span style="font-size:10px;color:var(--muted2)">#${draw.id}</span></div><span class="chip green">${(draw.participants||[]).length} уч.</span></div>
      <div class="item-card-meta"><span>Поб.: ${draw.winnersCount||1}</span><span>${new Date(draw.endsAt).toLocaleString('ru')}</span></div>
      <div class="item-card-actions">
        <button class="btn btn-ghost btn-sm" onclick='openDrawEditModal(${JSON.stringify(draw).replace(/'/g,"&#39;")})'>✏️</button>
        <button class="btn btn-green btn-sm" onclick="extendDrawMs(${draw.id},3600000)">+1ч</button>
        <button class="btn btn-danger btn-sm" onclick="deleteDraw(${draw.id})">✕</button>
      </div>
    </div>`).join('') : '<div class="empty">Нет активных</div>';
  fd.innerHTML = (d.finished||[]).length ? (d.finished||[]).slice(0,20).map(draw=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${draw.prize} <span style="font-size:10px;color:var(--muted2)">#${draw.id}</span></div><span class="chip">${(draw.participants||[]).length} уч.</span></div>
      <div class="item-card-meta"><span>Победители: ${(draw.winners||[]).map(w=>w.name||w.firstName).join(', ')||'—'}</span></div>
      <div class="item-card-actions">
        <button class="btn btn-gold btn-sm" onclick="rerollWinner(${draw.id})">🎲 Реролл</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFinDraw(${draw.id})">✕</button>
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
      <div class="inp-group"><label class="inp-label">Победителей</label><input class="inp" id="dm-wc" type="number" value="${draw.winnersCount||1}" style="width:80px"></div>
    </div>
    <div class="inp-group"><label class="inp-label">Продлить</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${[['−1ч',-3600000],['−10м',-600000],['+10м',600000],['+1ч',3600000],['+1д',86400000]].map(([l,ms])=>
          `<button class="btn btn-ghost btn-sm" onclick="extendDrawMs(${draw.id},${ms})">${l}</button>`).join('')}
      </div>
    </div>
    <button class="btn btn-primary" style="margin-top:8px" onclick="saveDrawEdit(${draw.id})">Сохранить</button>`;
  const _dmt=document.getElementById('draw-modal-title');if(_dmt)_dmt.textContent='Редактировать розыгрыш';
  document.getElementById('draw-modal').classList.add('show');
}
function closeDrawModal() { document.getElementById('draw-modal').classList.remove('show'); }

async function saveDrawEdit(id) {
  const r = await api(`/draws/${id}`,'PATCH',{
    prize: document.getElementById('dm-prize').value.trim(),
    desc:  document.getElementById('dm-desc').value.trim(),
    imageUrl: document.getElementById('dm-img').value.trim(),
    winnersCount: parseInt(document.getElementById('dm-wc').value)||1
  });
  if (r.ok) { toast('Сохранено','g'); closeDrawModal(); loadDraws(); }
  else toast(r.error||'Ошибка','r');
}

async function extendDrawMs(id, ms) {
  const r = await api(`/draws/${id}/time`,'PATCH',{ addMs:ms });
  if (r.ok) { toast('Время обновлено','g'); loadDraws(); closeDrawModal(); }
  else toast(r.error||'Ошибка','r');
}
async function deleteDraw(id) {
  if (!confirm(`Удалить #${id}?`)) return;
  const r = await api(`/draws/${id}`,'DELETE');
  if (r.ok) { toast('Удалено','g'); loadDraws(); }
  else toast(r.error||'Ошибка','r');
}
async function deleteFinDraw(id) {
  if (!confirm(`Удалить завершённый #${id}?`)) return;
  const r = await api(`/draws/finished/${id}`,'DELETE');
  if (r.ok) { toast('Удалено','g'); loadDraws(); }
  else toast(r.error||'Ошибка','r');
}
async function rerollWinner(id) {
  const target = prompt('Юзернейм или UID победителя для реролла:'); if (!target) return;
  const r = await api(`/draws/finished/${id}/reroll-winner`,'POST',{ target });
  if (r.ok) { toast(`Реролл: ${r.removed} → ${r.newWinner}`,'g'); loadDraws(); }
  else toast(r.error||'Ошибка','r');
}

/* ══ PROMOS ══ */
async function createPromo() {
  const code    = document.getElementById('p-code').value.trim().toUpperCase();
  const reward  = parseInt(document.getElementById('p-reward').value);
  const maxUses = parseInt(document.getElementById('p-uses').value)||100;
  const vipOnly = document.getElementById('p-vip').classList.contains('on');
  if (!code||!reward) { toast('Заполни поля','r'); return; }
  const r = await api('/promos','POST',{ code, reward, maxUses, vipOnly });
  if (r.ok) { toast('Промокод создан','g'); ['p-code','p-reward','p-uses'].forEach(id=>document.getElementById(id).value=''); loadPromos(); }
  else toast(r.error||'Ошибка','r');
}
async function loadPromos() {
  const d = await api('/promos');
  const el = document.getElementById('promo-list');
  if (typeof d!=='object'||d.error) { el.innerHTML='<div class="empty">Ошибка</div>'; return; }
  const items = Object.entries(d);
  el.innerHTML = items.length ? items.map(([code,p])=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title" style="font-family:monospace;font-size:15px">${code}</div><span class="chip green">+${p.reward}</span></div>
      <div class="item-card-meta"><span>${p.usedCount||0}/${p.maxUses} исп.</span>${p.vipOnly?'<span class="chip gold">VIP</span>':''}</div>
      <div class="item-card-actions"><button class="btn btn-danger btn-sm" onclick="deletePromo('${code}')">Удалить</button></div>
    </div>`).join('') : '<div class="empty">Нет промокодов</div>';
}
async function deletePromo(code) {
  const r = await api('/promos/'+code,'DELETE');
  if (r.ok) { toast('Удалено','g'); loadPromos(); }
  else toast(r.error||'Ошибка','r');
}

/* ══ BALANCE ══ */
async function doBalance() {
  const user   = document.getElementById('bal-user').value.trim();
  const amount = parseInt(document.getElementById('bal-amount').value);
  const type   = document.getElementById('bal-type').value;
  const reason = document.getElementById('bal-reason').value.trim();
  if (!user||!amount) { toast('Заполни поля','r'); return; }
  const isUid = /^\d+$/.test(user);
  const action = type.includes('add') ? 'add' : 'sub';
  const body = isUid ? { targetUid:user } : { targetUsername:user };
  Object.assign(body, { amount, action, reason });
  const r = await api('/balance','POST',body);
  if (r.ok) { toast(`Баланс обновлён: ${r.before} → ${r.after}`,'g'); }
  else toast(r.error||'Ошибка','r');
}

/* ══ SHOP ══ */
async function loadShop() {
  const [staticR, customR] = await Promise.all([api('/shop/static'), api('/shop')]);
  document.getElementById('static-items').innerHTML = Array.isArray(staticR) ? staticR.map(item=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${item.name}</div><span class="chip">${item.price}</span></div>
      <div class="item-card-actions"><button class="btn btn-ghost btn-sm" onclick="editStaticItem(${item.id})">✏️ Изменить</button></div>
    </div>`).join('') : '<div class="empty">Ошибка</div>';
  document.getElementById('custom-items').innerHTML = Array.isArray(customR)&&customR.length ? customR.map(item=>{
    const stockBadge = (item.stock!==null&&item.stock!==undefined) ? `<span class="stock-badge">${item.stock} шт. в наличии</span>` : '';
    return `<div class="item-card" style="position:relative">
      ${item.imageUrl ? `<div style="position:relative;margin-bottom:8px"><img src="${item.imageUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px">${stockBadge ? `<span style="position:absolute;top:6px;right:6px" class="stock-badge">${item.stock} шт.</span>` : ''}</div>` : stockBadge}
      <div class="item-card-hdr">
        <div class="item-card-title">${item.name} ${item.tag==='NEW'?'<span class="badge-new">NEW</span>':(item.tag?'<span class="chip">'+item.tag+'</span>':'')}</div>
        <span class="chip">${item.price}</span>
      </div>
      <div class="item-card-meta">
        ${item.desc?'<span>'+item.desc.slice(0,40)+'…</span>':''}
        ${!item.imageUrl&&(item.stock!==null&&item.stock!==undefined)?'<span class="stock-badge">'+item.stock+' шт. в наличии</span>':''}
      </div>
      <div class="item-card-actions">
        <label class="btn btn-ghost btn-sm" style="cursor:pointer">
          🖼
          <input type="file" accept="image/*" style="display:none" onchange="uploadShopItemImg(event,${item.id})">
        </label>
        <button class="btn btn-ghost btn-sm" onclick="editCustomItem(${item.id})">✏️</button>
        <button class="btn btn-danger btn-sm" onclick="deleteShopItem(${item.id})">✕</button>
      </div>
    </div>`;
  }).join('') : '<div class="empty">Нет кастомных товаров</div>';
}
async function createShopItem() {
  const name   = document.getElementById('sh-name').value.trim();
  const price  = parseInt(document.getElementById('sh-price').value);
  const desc   = document.getElementById('sh-desc').value.trim();
  const tag    = document.getElementById('sh-tag').value.trim();
  const stock  = parseInt(document.getElementById('sh-stock').value)||null;
  const imgUrl = document.getElementById('sh-img').value.trim();
  const imgFile= document.getElementById('sh-img-file').files[0];
  if (!name||!price) { toast('Заполни поля','r'); return; }
  const r = await api('/shop','POST',{ name, price, desc, tag, imageUrl:imgUrl||null, stock:stock||null });
  if (!r.ok) { toast(r.error||'Ошибка','r'); return; }
  // upload image file if provided
  if (imgFile && r.item) {
    const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=e=>res(e.target.result.split(',')[1]); fr.readAsDataURL(imgFile); });
    await api('/shop/'+r.item.id+'/image','POST',{ imageBase64:b64, mimeType:imgFile.type });
  }
  toast('Товар добавлен','g');
  ['sh-name','sh-price','sh-desc','sh-tag','sh-img'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('sh-img-file').value='';
  document.getElementById('sh-img-preview').innerHTML='';
  loadShop();
}

async function uploadShopItemImg(e, id) {
  const file = e.target.files[0]; if (!file) return;
  const b64 = await new Promise(res => { const fr=new FileReader(); fr.onload=ev=>res(ev.target.result.split(',')[1]); fr.readAsDataURL(file); });
  const r = await api('/shop/'+id+'/image','POST',{ imageBase64:b64, mimeType:file.type });
  if (r.ok) { toast('Картинка обновлена','g'); loadShop(); }
  else toast(r.error||'Ошибка','r');
}
function previewShopImg(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { document.getElementById('sh-img-preview').innerHTML = `<img src="${ev.target.result}" style="width:100%;border-radius:8px;max-height:100px;object-fit:cover">`; };
  reader.readAsDataURL(file);
}

async function editStaticItem(id) {
  const name = prompt('Новое название:'); const price = prompt('Новая цена:');
  const body = {}; if (name) body.name=name; if (price) body.rew=parseInt(price);
  const r = await api('/shop/static/'+id,'PATCH',body);
  if (r.ok) { toast('Обновлено','g'); loadShop(); } else toast(r.error||'Ошибка','r');
}
async function editCustomItem(id) {
  const price = prompt('Новая цена:'); const stock = prompt('В наличии (0=∞):');
  const body = {}; if (price) body.price=parseInt(price);
  if (stock!==null) body.stock = stock==='0'?null:parseInt(stock);
  const r = await api('/shop/'+id,'PATCH',body);
  if (r.ok) { toast('Обновлено','g'); loadShop(); } else toast(r.error||'Ошибка','r');
}
async function deleteShopItem(id) {
  if (!confirm('Удалить?')) return;
  const r = await api('/shop/'+id,'DELETE');
  if (r.ok) { toast('Удалено','g'); loadShop(); }
}

/* ══ TASKS ══ */
async function loadTasks() {
  const [custom, stat] = await Promise.all([api('/tasks'), api('/tasks/static')]);
  const all = [...(Array.isArray(stat)?stat:[]), ...(Array.isArray(custom)?custom:[])];
  document.getElementById('tasks-list').innerHTML = all.length ? all.map(t=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${t.name} ${t.isNew?'<span class="badge-new">NEW</span>':''}</div><span class="chip green">+${t.rew}</span></div>
      <div class="item-card-meta"><span>${t.tag||''}</span>${t.channel?'<span>@'+t.channel+'</span>':''}</div>
      ${!t._isStatic?`<div class="item-card-actions"><button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Удалить</button></div>`:''}
    </div>`).join('') : '<div class="empty">Нет заданий</div>';
}
async function createTask() {
  const name     = document.getElementById('t-name').value.trim();
  const typeBase = document.getElementById('t-type').value;
  const channel  = document.getElementById('t-channel').value.trim().replace('@','');
  const reward   = parseInt(document.getElementById('t-reward').value);
  const desc     = document.getElementById('t-desc').value.trim();
  const isNew    = document.getElementById('t-new').classList.contains('on');
  if (!name||!reward) { toast('Заполни поля','r'); return; }
  const type = (typeBase==='sub:'||typeBase==='chat:') ? typeBase+channel : typeBase;
  const r = await api('/tasks','POST',{ type, name, reward, desc, isNew });
  if (r.ok) { toast('Задание добавлено','g'); ['t-name','t-channel','t-reward','t-desc'].forEach(id=>document.getElementById(id).value=''); loadTasks(); }
  else toast(r.error||'Ошибка','r');
}
async function deleteTask(id) {
  const r = await api('/tasks/'+id,'DELETE');
  if (r.ok) { toast('Удалено','g'); loadTasks(); } else toast(r.error||'Ошибка','r');
}

/* ══ BANS ══ */
async function doBan() {
  const user   = document.getElementById('ban-user').value.trim();
  const dur    = Number(document.getElementById('ban-dur').value);
  const reason = document.getElementById('ban-reason').value.trim();
  if (!user) { toast('Укажи пользователя','r'); return; }
  const r = await api('/ban','POST',{ username:user, duration:dur, reason });
  if (r.ok) { toast('Забанен','g'); ['ban-user','ban-reason'].forEach(id=>document.getElementById(id).value=''); loadBans(); }
  else toast(r.error||'Ошибка','r');
}
async function doUnban() {
  const user = document.getElementById('unban-user').value.trim();
  if (!user) { toast('Укажи пользователя','r'); return; }
  const r = await api('/unban','POST',{ username:user });
  if (r.ok) { toast('Разбанен','g'); document.getElementById('unban-user').value=''; loadBans(); }
  else toast(r.error||'Ошибка','r');
}
async function loadBans() {
  const users = await api('/users');
  const el = document.getElementById('bans-list');
  const banned = Array.isArray(users) ? users.filter(u=>u.banned) : [];
  el.innerHTML = banned.length ? banned.map(u=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${u.firstName||'—'} @${u.username||'—'}</div><span class="chip red">БАН</span></div>
      <div class="item-card-actions"><button class="btn btn-green btn-sm" onclick="doUnbanDirect('${u.username}')">✅ Разбанить</button></div>
    </div>`).join('') : '<div class="empty">Нет забаненных</div>';
}
async function doUnbanDirect(username) {
  const r = await api('/unban','POST',{ username });
  if (r.ok) { toast('Разбанен','g'); loadBans(); } else toast(r.error||'Ошибка','r');
}

/* ══ BROADCAST ══ */
async function doBroadcast() {
  const text   = document.getElementById('bc-text').value.trim();
  const target = document.getElementById('bc-target').value;
  if (!text) { toast('Введи текст','r'); return; }
  const r = await api(target==='vip'?'/broadcast/vip':'/broadcast','POST',{ text });
  if (r.ok) { toast(`Рассылка запущена`,'g'); document.getElementById('bc-text').value=''; }
  else toast(r.error||'Ошибка','r');
}
async function doNotif() {
  const text = document.getElementById('notif-text').value.trim();
  const type = document.getElementById('notif-type').value;
  if (!text) { toast('Введи текст','r'); return; }
  const r = await api('/notify','POST',{ type, text });
  if (r.ok) { toast('Уведомление отправлено','g'); document.getElementById('notif-text').value=''; }
  else toast(r.error||'Ошибка','r');
}

/* ══ ACCESS ══ */
async function loadAccess() {
  const d = await api('/access');
  const toggle = document.getElementById('access-toggle');
  d.enabled ? toggle.classList.add('on') : toggle.classList.remove('on');
  const el = document.getElementById('access-list');
  const wl = d.whitelist||[];
  el.innerHTML = wl.length ? wl.map(u=>
    `<div class="item-card">
      <div class="item-card-hdr"><div class="item-card-title">${u.firstName||'—'} @${u.username||'—'}</div><span style="font-size:11px;color:var(--muted2)">#${u.uid}</span></div>
      <div class="item-card-actions"><button class="btn btn-danger btn-sm" onclick="removeAccess('${u.uid}')">Убрать</button></div>
    </div>`).join('') : '<div class="empty">Список пуст</div>';
}
async function toggleAccess() {
  const enabled = !document.getElementById('access-toggle').classList.contains('on');
  const r = await api('/access','POST',{ enabled });
  if (r.ok) { toast(enabled?'Режим приглашений включён':'Открытый доступ','g'); loadAccess(); }
  else toast(r.error||'Ошибка','r');
}
async function addAccess() {
  const uid  = document.getElementById('acc-uid').value.trim();
  const user = document.getElementById('acc-user').value.trim().replace('@','');
  if (!uid) { toast('Укажи UID','r'); return; }
  const r = await api('/access/users','POST',{ uid, username:user });
  if (r.ok) { toast('Добавлен','g'); ['acc-uid','acc-user'].forEach(id=>document.getElementById(id).value=''); loadAccess(); }
  else toast(r.error||'Ошибка','r');
}
async function removeAccess(uid) {
  const r = await fetch(`/proxy/api/admin/access/users/${uid}?userId=6151671553`,{
    method:'DELETE', headers:{'x-admin-secret':SECRET}
  });
  toast('Удалён','g'); loadAccess();
}

/* ══ REPAIR ══ */
async function loadRepair() {
  const d = await api('/stats');
  const toggle = document.getElementById('repair-toggle');
  d.repairMode ? toggle.classList.add('on') : toggle.classList.remove('on');
  document.getElementById('repair-status').innerHTML = d.repairMode
    ? '<span style="color:#f59e0b;font-weight:700">🔧 Тех. работы включены</span>'
    : '<span style="color:#10b981;font-weight:700">✅ Приложение работает</span>';
}
async function toggleRepair() {
  const r = await api('/repair','POST',{});
  if (r.ok) { toast(r.repairMode?'🔧 Включено':'✅ Выключено','g'); loadRepair(); }
  else toast(r.error||'Ошибка','r');
}


/* ══ CASES EDITOR ══ */
// Default cases config (mirrors config.js)
const _CASES_DEFAULT = [
  {id:1,name:'Нищий Кейс',price:4444,photo:'https://i.imgur.com/N6vjFz8.jpeg',drops:[
    {icoKey:'coins',n:'Монеты',v:'+450',coins:450,w:30},
    {icoKey:'coins',n:'Монеты',v:'+600',coins:600,w:25},
    {icoKey:'coins',n:'Монеты',v:'+900',coins:900,w:20},
    {icoKey:'coins',n:'Монеты',v:'+1500',coins:1500,w:15},
    {icoKey:'coins',n:'Монеты',v:'+2000',coins:2000,w:5},
    {icoKey:'stars',n:'50 Звёзд ⭐',v:'50 ⭐',stars:50,w:5},
  ]},
  {id:2,name:'Средний Кейс',price:8888,photo:'https://i.imgur.com/hxTvBaf.jpeg',drops:[
    {icoKey:'coins',n:'Монеты',v:'+888',coins:888,w:30},
    {icoKey:'coins',n:'Монеты',v:'+1200',coins:1200,w:25},
    {icoKey:'coins',n:'Монеты',v:'+2000',coins:2000,w:20},
    {icoKey:'coins',n:'Монеты',v:'+3500',coins:3500,w:10},
    {icoKey:'coins',n:'Монеты',v:'+5000',coins:5000,w:10},
    {icoKey:'stars',n:'100 Звёзд ⭐',v:'100 ⭐',stars:100,w:5},
  ]},
  {id:3,name:'Кейс Богача',price:19999,photo:'https://i.imgur.com/dpfHwkG.jpeg',drops:[
    {icoKey:'coins',n:'Монеты',v:'+2222',coins:2222,w:25},
    {icoKey:'coins',n:'Монеты',v:'+3500',coins:3500,w:25},
    {icoKey:'coins',n:'Монеты',v:'+5555',coins:5555,w:20},
    {icoKey:'coins',n:'Монеты',v:'+7777',coins:7777,w:15},
    {icoKey:'coins',n:'Монеты',v:'+15000',coins:15000,w:10},
    {icoKey:'stars',n:'150 Звёзд ⭐',v:'150 ⭐',stars:150,w:5},
  ]},
  {id:4,name:'Кейс Миллионера',price:77000,photo:'https://i.imgur.com/3iI3Gpq.jpeg',drops:[
    {icoKey:'megagift',n:'Мега-подарок',v:'х1',inv:'megagift',cnt:1,w:5},
    {icoKey:'coins',n:'Монеты',v:'+5000',coins:5000,w:22},
    {icoKey:'coins',n:'Монеты',v:'+9999',coins:9999,w:20},
    {icoKey:'coins',n:'Монеты',v:'+15000',coins:15000,w:20},
    {icoKey:'coins',n:'Монеты',v:'+25000',coins:25000,w:15},
    {icoKey:'coins',n:'Монеты',v:'+50000',coins:50000,w:10},
    {icoKey:'stars',n:'200 Звёзд ⭐',v:'200 ⭐',stars:200,w:3},
    {icoKey:'coins',n:'Монеты',v:'+100000',coins:100000,w:5,rare:true},
  ]},
];

let _editingCaseDrops = [];
let _editingCaseId = 1;

function loadCaseEditor() {
  const id = parseInt(document.getElementById('case-select').value);
  _editingCaseId = id;
  const def = _CASES_DEFAULT.find(c => c.id === id);
  if (!def) return;
  _editingCaseDrops = JSON.parse(JSON.stringify(def.drops));
  document.getElementById('case-price').value = def.price;
  document.getElementById('case-photo').value = def.photo || '';
  renderCaseDrops();
}

function renderCaseDrops() {
  const el = document.getElementById('case-drops-list');
  if (!_editingCaseDrops.length) { el.innerHTML = '<div class="empty" style="padding:10px">Нет призов</div>'; return; }
  const totalW = _editingCaseDrops.reduce((s,d)=>s+(d.w||1),0);
  el.innerHTML = _editingCaseDrops.map((d,i) => {
    const pct = totalW > 0 ? ((d.w||1)/totalW*100).toFixed(1) : 0;
    const icon = d.stars ? '⭐' : d.inv ? '🎁' : '💰';
    return `<div class="item-card" style="padding:8px 10px;margin-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:14px">${icon}</span>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:700">${d.n}</div>
          <div style="font-size:10px;color:var(--muted2)">Вес: ${d.w||1} | Шанс: ~${pct}%</div>
        </div>
        <button class="btn btn-danger btn-sm" style="padding:4px 8px" onclick="_removeDrop(${i})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function _removeDrop(i) {
  _editingCaseDrops.splice(i,1);
  renderCaseDrops();
}

function addCaseDrop() {
  const type = document.getElementById('drop-type').value;
  const name = document.getElementById('drop-name').value.trim();
  const val  = parseInt(document.getElementById('drop-value').value) || 0;
  const w    = parseInt(document.getElementById('drop-weight').value) || 10;
  if (!name || !val) { toast('Заполни название и значение','r'); return; }
  const drop = { n: name, w };
  if (type === 'coins') { drop.icoKey='coins'; drop.v='+'+val; drop.coins=val; }
  else if (type === 'stars') { drop.icoKey='stars'; drop.v=val+' ⭐'; drop.stars=val; }
  else if (type === 'vip') { drop.icoKey='vip'; drop.v=val+'д VIP'; drop.vipDays=val; }
  _editingCaseDrops.push(drop);
  renderCaseDrops();
  ['drop-name','drop-value'].forEach(id=>document.getElementById(id).value='');
}

async function saveCaseEdit() {
  const price = parseInt(document.getElementById('case-price').value);
  const photo = document.getElementById('case-photo').value.trim();
  if (!price) { toast('Укажи цену','r'); return; }
  // Save via admin API - stores in DB as case overrides
  const r = await api('/cases/'+_editingCaseId,'PATCH',{
    price, photo, drops: _editingCaseDrops
  });
  if (r.ok) { toast('Кейс сохранён ✅','g'); }
  else { toast('Ошибка: '+( r.error||'?'),'r'); }
}

async function loadCasesPage() {
  loadCaseEditor(); // Load first case by default
}

/* ══ INIT ══ */
initConfig().then(() => {
  loadDashboard();
  setInterval(() => { if (_curPage==='dashboard') loadDashboard(); }, 30000);
});
