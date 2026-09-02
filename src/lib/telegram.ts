const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function enviarTelegram(texto: string): Promise<boolean> {
  if (!TOKEN || !CHAT_ID) {
    console.warn("TELEGRAM_TOKEN o TELEGRAM_CHAT_ID no configurados");
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: texto, parse_mode: "HTML" }),
    });
    const data = await res.json();
    return data?.ok === true;
  } catch (e) {
    console.error("Telegram error:", e);
    return false;
  }
}
