const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const BOT_TOKEN  = process.env.ADMIN_BOT_TOKEN || '8184531398:AAFJoIcptkZth9GB9MJE44aHYR3ODxg48PQ';
const ADMIN_ID   = Number(process.env.ADMIN_ID || '6151671553');
const APP_URL    = process.env.APP_URL || '';
const MAIN_URL   = (process.env.MAIN_BOT_URL || 'https://giftbot-miniapp-production-d53b.up.railway.app').replace(/\/$/, '');
const SECRET     = process.env.ADMIN_SECRET || 'myadmin123';
const PORT       = process.env.PORT || 3001;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ── Auth middleware ── */
function authCheck(req, res, next) {
  const s = req.headers['x-admin-secret'] || req.query.s || '';
  if (s !== SECRET) return res.status(403).json({ error: 'Forbidden' });
  next();
}

/* ── Proxy to main bot ── */
app.all('/proxy/*', authCheck, async (req, res) => {
  const subpath = req.path.replace('/proxy', '');
  const qs = new URLSearchParams(req.query).toString();
  const url = MAIN_URL + subpath + (qs ? (subpath.includes('?') ? '&' : '?') + qs : '');
  try {
    const opts = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': SECRET,
      }
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      opts.body = JSON.stringify(req.body);
    }
    const r = await fetch(url, opts);
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { error: text }; }
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: 'Proxy error: ' + e.message, url });
  }
});

/* ── Config endpoint (for frontend) ── */
app.get('/api/config', (req, res) => {
  res.json({ secret: SECRET, mainUrl: MAIN_URL });
});

/* ── Bot commands ── */
bot.command('start', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Нет доступа.');
  const me = await bot.telegram.getMe().catch(() => ({ username: 'admin_bot' }));
  const url = APP_URL || `https://t.me/${me.username}`;
  await ctx.reply('👑 Панель администратора GiftBot', {
    reply_markup: {
      inline_keyboard: [[{ text: '🛠 Открыть Admin Panel', web_app: { url: APP_URL || url } }]]
    }
  });
});
bot.command('panel', (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.reply('🔗 ' + (APP_URL || 'APP_URL не задан'));
});

function isAdmin(id) { return Number(id) === ADMIN_ID; }

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Admin panel on port ${PORT}`);
  console.log(`   Main bot: ${MAIN_URL}`);
  if (APP_URL) {
    bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`)
      .then(() => console.log('✅ Webhook set'))
      .catch(e => { console.log('Webhook error:', e.message); bot.launch(); });
  } else {
    bot.launch();
    console.log('✅ Bot polling');
  }
});
app.post(`/bot${BOT_TOKEN}`, (req, res) => { bot.handleUpdate(req.body, res); });
process.once('SIGINT',  () => bot.stop());
process.once('SIGTERM', () => bot.stop());
