const { Telegraf } = require('telegraf');
const express = require('express');
const path = require('path');

const BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || '8184531398:AAFJoIcptkZth9GB9MJE44aHYR3ODxg48PQ';
const ADMIN_ID = Number(process.env.ADMIN_ID || '6151671553');
const APP_URL = process.env.APP_URL || '';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function isAdmin(id) { return Number(id) === ADMIN_ID; }

bot.command('start', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply('⛔ Нет доступа.');
  const url = APP_URL || `https://t.me/${(await bot.telegram.getMe()).username}`;
  await ctx.reply('👑 Панель администратора GiftBot', {
    reply_markup: {
      inline_keyboard: [[{
        text: '🛠 Открыть Admin Panel',
        web_app: { url: APP_URL || url }
      }]]
    }
  });
});

bot.command('panel', async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  ctx.reply('🔗 ' + (APP_URL || 'APP_URL не задан'));
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Admin panel on port ${PORT}`);
  if (APP_URL) {
    bot.telegram.setWebhook(`${APP_URL}/bot${BOT_TOKEN}`)
      .then(() => console.log('✅ Webhook set'))
      .catch(() => bot.launch());
  } else {
    bot.launch();
  }
});

app.post(`/bot${BOT_TOKEN}`, (req, res) => { bot.handleUpdate(req.body, res); });
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
