/**
 * Síntesis de voz del dispositivo (Web Speech API). Gratis, sin servicios
 * externos y sin gastar créditos. Se usa para pronunciar las palabras en
 * inglés y los colores de la paleta bilingüe.
 */

let warmed = false;

function ensureVoices() {
  if (warmed || typeof window === "undefined" || !("speechSynthesis" in window)) return;
  // En algunos navegadores la lista de voces carga async; forzamos la carga.
  window.speechSynthesis.getVoices();
  warmed = true;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

type SpeakOptions = { lang?: string; rate?: number };

/** Pronuncia un texto. Cancela cualquier locución en curso. */
export function speak(text: string, { lang = "en-US", rate = 0.85 }: SpeakOptions = {}) {
  if (!speechSupported()) return;
  ensureVoices();
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

/** Dice la palabra en inglés y, si se pasa, luego el español. */
export function speakBilingual(en: string, es?: string) {
  if (!speechSupported()) return;
  ensureVoices();
  window.speechSynthesis.cancel();
  const a = new SpeechSynthesisUtterance(en);
  a.lang = "en-US";
  a.rate = 0.85;
  window.speechSynthesis.speak(a);
  if (es) {
    const b = new SpeechSynthesisUtterance(es);
    b.lang = "es-MX";
    b.rate = 0.9;
    window.speechSynthesis.speak(b);
  }
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel();
}
