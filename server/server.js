/* =========================================================
   iAuto.kz — сервер: раздача сайта + приём заявок.
   Запуск:  npm install  →  npm start
   ========================================================= */
'use strict';

const path = require('path');
const fs = require('fs');
const https = require('https');
const express = require('express');

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT = process.env.TELEGRAM_CHAT_ID || '';

loadEnv(path.join(__dirname, '.env'));

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

/* ---------- простая защита от спама: не более 10 заявок в 10 минут с одного IP ---------- */
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 10) return res.status(429).json({ ok: false, error: 'Слишком много заявок, попробуйте позже' });
  list.push(now);
  hits.set(ip, list);
  next();
}

/* ---------- приём заявки ---------- */
app.post('/api/lead', rateLimit, async (req, res) => {
  const b = req.body || {};
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const lead = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    createdAt: new Date().toISOString(),
    type: str(b.type, 20) === 'seller' ? 'seller' : 'client',
    source: str(b.source, 100),
    name: str(b.name, 100),
    phone: str(b.phone, 30),
    car: str(b.car, 150),
    company: str(b.company, 150),
    vin: str(b.vin, 17).toUpperCase(),
    message: str(b.message, 2000),
    consent: b.consent === true || b.consent === 'true',
    page: str(b.page, 300),
    userAgent: str(b.userAgent, 300),
    ip: str(req.headers['x-forwarded-for'] || req.socket.remoteAddress, 60)
  };

  if (lead.name.length < 2) return res.status(400).json({ ok: false, error: 'Укажите имя' });
  if (lead.phone.replace(/\D/g, '').length < 11) return res.status(400).json({ ok: false, error: 'Укажите корректный телефон' });
  if (!lead.consent) return res.status(400).json({ ok: false, error: 'Нужно согласие на обработку данных' });

  try {
    await saveLead(lead);
  } catch (e) {
    console.error('Не удалось сохранить заявку:', e);
    return res.status(500).json({ ok: false, error: 'Ошибка сервера' });
  }
  notifyTelegram(lead).catch((e) => console.error('Telegram:', e.message));
  console.log(`[lead] ${lead.createdAt} ${lead.type} ${lead.name} ${lead.phone} (${lead.source})`);
  res.json({ ok: true, id: lead.id });
});

/* ---------- список заявок (для admin.html) ---------- */
app.get('/api/leads', (req, res) => {
  if (!ADMIN_TOKEN) return res.status(503).json({ ok: false, error: 'ADMIN_TOKEN не задан в server/.env' });
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== ADMIN_TOKEN) return res.status(401).json({ ok: false, error: 'Неверный токен' });
  res.json({ ok: true, leads: readLeads().reverse() });
});

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

/* ---------- статика ---------- */
app.use(express.static(ROOT, { extensions: ['html'], index: 'index.html', maxAge: '1h' }));
app.use((req, res) => res.status(404).sendFile(path.join(ROOT, 'index.html')));

app.listen(PORT, () => {
  console.log(`iAuto.kz работает: http://localhost:${PORT}`);
  console.log(`Заявки сохраняются в ${LEADS_FILE}`);
  if (!TG_TOKEN || !TG_CHAT) console.log('Подсказка: задайте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в server/.env, чтобы получать заявки в Telegram');
});

/* ---------- helpers ---------- */
function readLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; }
}
let writing = Promise.resolve();
function saveLead(lead) {
  writing = writing.then(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const list = readLeads();
    list.push(lead);
    fs.writeFileSync(LEADS_FILE, JSON.stringify(list, null, 2), 'utf8');
  });
  return writing;
}

function notifyTelegram(lead) {
  if (!TG_TOKEN || !TG_CHAT) return Promise.resolve();
  const lines = [
    `🆕 Заявка с сайта iAuto.kz — ${lead.type === 'seller' ? 'ПРОДАВЕЦ' : 'клиент'}`,
    `Источник: ${lead.source || '—'}`,
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    lead.company ? `Магазин: ${lead.company}` : '',
    lead.car ? `Авто: ${lead.car}` : '',
    lead.vin ? `VIN: ${lead.vin}` : '',
    lead.message ? `Описание: ${lead.message}` : ''
  ].filter(Boolean);
  const body = JSON.stringify({ chat_id: TG_CHAT, text: lines.join('\n') });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${TG_TOKEN}/sendMessage`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, (res) => { res.resume(); res.statusCode < 300 ? resolve() : reject(new Error('HTTP ' + res.statusCode)); });
    req.on('error', reject);
    req.end(body);
  });
}

function loadEnv(file) {
  try {
    fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  } catch { /* .env необязателен */ }
}
