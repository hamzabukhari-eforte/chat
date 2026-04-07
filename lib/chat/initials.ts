/** Two-letter abbreviation from display name (e.g. "Kaif Khatri" → "KK", one word → first two letters). */
export function nameToInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter((p) => p.length > 0);

  const firstLetter = (segment: string): string => {
    const m = segment.match(/\p{L}|\p{N}/u);
    return m ? m[0] : "";
  };

  if (parts.length >= 2) {
    const a = firstLetter(parts[0]);
    const b = firstLetter(parts[parts.length - 1]);
    const pair = (a + b).toUpperCase();
    return pair || "?";
  }

  const one = parts[0] ?? trimmed;
  const letters = [...one].filter((ch) => /\p{L}|\p{N}/u.test(ch));
  if (letters.length >= 2) {
    return (letters[0] + letters[1]).toUpperCase();
  }
  if (letters.length === 1) {
    return (letters[0] + letters[0]).toUpperCase();
  }
  return "?";
}
