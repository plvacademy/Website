/**
 * PLV — chatbot service (placeholder).
 *
 * Until CHATBOT_API_URL is set, the chatbot is NOT active and the UI says so.
 * Expected future contract (adjust to your backend):
 *   POST CHATBOT_API_URL   { "message": "...", "lang": "en" | "ar" }
 *   200 -> { "reply": "..." }
 *
 * Security: the AI provider key must live ONLY on the backend. Never put keys
 * or secrets in front-end code.
 */
import { CONFIG } from '../config.js?v=8';

export function isChatbotConfigured() {
  return typeof CONFIG.CHATBOT_API_URL === 'string' && CONFIG.CHATBOT_API_URL.trim() !== '';
}

export async function sendMessage(message, { lang = 'en', timeoutMs = 15000 } = {}) {
  if (!isChatbotConfigured()) {
    throw new Error('Chatbot backend is not configured');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(CONFIG.CHATBOT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, lang }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data || typeof data.reply !== 'string') throw new Error('Unexpected chatbot response');
    return data.reply;
  } finally {
    clearTimeout(timer);
  }
}
