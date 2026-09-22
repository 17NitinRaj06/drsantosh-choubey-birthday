export const BIRTH_DATE = "1955-09-22";
export const BIRTH_PLACE = "Khandwa, Madhya Pradesh";
export const BIRTHDAY_DATE = "2026-09-22";
export const AGE_TURNING = 71;

// WS_URL is the realtime service WebSocket base URL (no trailing slash, no path).
// Example: ws://localhost:3001 or wss://birthday-chat.onrender.com
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "";

// API_URL is the realtime service HTTP base URL for REST calls (no trailing slash).
// If unset, derived from WS_URL by swapping ws:// → http://, wss:// → https://.
// Example: http://localhost:3001 or https://birthday-chat.onrender.com
function deriveApiUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (WS_URL) {
    return WS_URL.replace(/^ws:\/\//, "http://").replace(/^wss:\/\//, "https://").replace(/\/+$/, "");
  }
  return "";
}
export const API_URL = deriveApiUrl();

// PUBLIC_URL is the static site's public URL (for QR codes, meta tags, etc.)
export const PUBLIC_URL = process.env.NEXT_PUBLIC_URL ?? "";
