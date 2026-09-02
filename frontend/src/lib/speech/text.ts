/** Strip content that shouldn't be read aloud. */
export function textForSpeech(raw: string): string {
  return raw
    .replace(/\(attached:.*?\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function pickPreferredVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length > 0 ? english : voices;

  const ranked = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return ranked[0] ?? null;
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  const name = voice.name.toLowerCase();

  if (voice.localService) score += 2;
  if (name.includes("google")) score += 4;
  if (name.includes("natural") || name.includes("neural")) score += 5;
  if (name.includes("samantha") || name.includes("aria")) score += 3;
  if (voice.default) score += 1;

  return score;
}
