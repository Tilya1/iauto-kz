/* =========================================================
   Vercel Serverless Function: приём заявок  POST /api/lead
   Отправляет заявку в Telegram (переменные окружения в Vercel:
   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID). Если они не заданы,
   отвечает 503 — сайт тогда сам откроет WhatsApp с текстом заявки.
   ========================================================= */
'use strict';

const hits = new Map();

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Метод не поддерживается' });
  }

  // простая защита от спама: 10 заявок за 10 минут с одного IP
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 10) return res.status(429).json({ ok: false, error: 'Слишком много заявок, попробуйте позже' });
  list.push(now);
  hits.set(ip, list);

  let b = req.body || {};
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
  const lead = {
    type: str(b.type, 20) === 'seller' ? 'seller' : 'client',
    source: str(b.source, 100),
    name: str(b.name, 100),
    phone: str(b.phone, 30),
    car: str(b.car, 150),
    company: str(b.company, 150),
    vin: str(b.vin, 17).toUpperCase(),
    message: str(b.message, 2000),
    consent: b.consent === true || b.consent === 'true',
    page: str(b.page, 300)
  };

  if (lead.name.length < 2) return res.status(400).json({ ok: false, error: 'Укажите имя' });
  if (lead.phone.replace(/\D/g, '').length < 11) return res.status(400).json({ ok: false, error: 'Укажите корректный телефон' });
  if (!lead.consent) return res.status(400).json({ ok: false, error: 'Нужно согласие на обработку данных' });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('[lead] Telegram не настроен, заявка:', JSON.stringify(lead));
    return res.status(503).json({ ok: false, error: 'Приём заявок не настроен' });
  }

  const text = [
    `🆕 Заявка с сайта iAuto.kz — ${lead.type === 'seller' ? 'ПРОДАВЕЦ' : 'клиент'}`,
    `Источник: ${lead.source || '—'}`,
    `Имя: ${lead.name}`,
    `Телефон: ${lead.phone}`,
    lead.company ? `Магазин: ${lead.company}` : '',
    lead.car ? `Авто: ${lead.car}` : '',
    lead.vin ? `VIN: ${lead.vin}` : '',
    lead.message ? `Описание: ${lead.message}` : ''
  ].filter(Boolean).join('\n');

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text })
    });
    if (!r.ok) throw new Error('Telegram HTTP ' + r.status);
  } catch (e) {
    console.error('[lead] Telegram error:', e.message);
    return res.status(502).json({ ok: false, error: 'Не удалось отправить заявку' });
  }

  console.log(`[lead] ${new Date().toISOString()} ${lead.type} ${lead.name} ${lead.phone} (${lead.source})`);
  return res.status(200).json({ ok: true });
};
