// Saytdan kelgan buyurtmani Telegram bot orqali egasiga yuboradi.
// Netlify sozlamalarida ikkita o'zgaruvchi kerak: BOT_TOKEN va CHAT_ID.

const PAY = {
  cash: "Naqd pul",
  card: "Plastik karta (Uzcard, Humo)",
  click: "Click yoki Payme",
  bank: "Bank o'tkazmasi",
};

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fmt = n => Math.round(n).toLocaleString("ru-RU").replace(/[  ]/g, " ");

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const { BOT_TOKEN, CHAT_ID } = process.env;
  if (!BOT_TOKEN || !CHAT_ID) return new Response("Bot sozlanmagan", { status: 500 });

  let o;
  try { o = await req.json(); } catch { return new Response("Bad JSON", { status: 400 }); }

  const items = Array.isArray(o.items) ? o.items.slice(0, 50) : [];
  const clean = items
    .map(i => ({ name: String(i.name || "").slice(0, 120), qty: Math.floor(Number(i.qty)), price: i.price == null ? null : Number(i.price), unit: i.unit === "m" ? " m" : " ta" }))
    .filter(i => i.name && i.qty > 0 && i.qty <= 100000 && (i.price === null || i.price >= 0));
  const phone = String(o.phone || "");
  const address = String(o.address || "").slice(0, 400);
  const loc = o.location && Number.isFinite(+o.location.lat) && Number.isFinite(+o.location.lon)
    ? { lat: +o.location.lat, lon: +o.location.lon } : null;

  if (!clean.length || !/^\+998\d{9}$/.test(phone) || !PAY[o.payment] || (!address && !loc)) {
    return new Response("Ma'lumot to'liq emas", { status: 400 });
  }

  const total = clean.reduce((a, i) => a + i.qty * (i.price || 0), 0);
  const lines = [
    "🧾 <b>Yangi buyurtma</b>",
    "",
    ...clean.map(i => `• ${esc(i.name)} — ${i.qty}${i.unit} = ${i.price === null ? "narxi kelishiladi" : fmt(i.qty * i.price) + " so'm"}`),
    `<b>Jami: ${fmt(total)} so'm</b>`,
    "",
    `📞 Telefon: ${phone}`,
    `📍 Manzil: ${address ? esc(address) : "—"}`,
    loc ? `🗺 Xarita: https://yandex.uz/maps/?pt=${loc.lon},${loc.lat}&z=17&l=map` : "",
    `💳 To'lov: ${PAY[o.payment]}`,
    o.currency === "usd" && Number(o.usdRate) > 0
      ? `💵 Mijoz narxlarni dollarda ko'rgan: ~$${(total / Number(o.usdRate)).toFixed(2)} (1 $ = ${fmt(o.usdRate)} so'm)` : "",
    `🌐 Til: ${o.lang === "ru" ? "ruscha" : "o'zbekcha"}`,
  ].filter(l => l !== "");

  const api = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const r = await fetch(`${api}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, text: lines.join("\n"), parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!r.ok) return new Response("Telegram xatosi", { status: 502 });

  if (loc) {
    await fetch(`${api}/sendLocation`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, latitude: loc.lat, longitude: loc.lon }),
    }).catch(() => {});
  }

  return Response.json({ ok: true });
};
