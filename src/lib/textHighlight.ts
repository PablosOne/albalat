/**
 * Heading highlight helper — flags each word of `text` with `isHighlight`
 * so renderers that wrap each word in a span (TextReveal `words` mode) can
 * apply colour per-unit while keeping the existing entrance animation.
 *
 * If the substring is missing or not found, every word is returned with
 * `isHighlight: false` — the heading still renders plain.
 */

export interface HighlightedWord {
  word: string;
  isHighlight: boolean;
}

export function wordsWithHighlight(text: string, highlight: string | undefined): HighlightedWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!highlight) return words.map((word) => ({ word, isHighlight: false }));

  const highlightWords = highlight.trim().split(/\s+/).filter(Boolean);
  if (highlightWords.length === 0) return words.map((word) => ({ word, isHighlight: false }));

  // Find the first contiguous run of words whose joined form equals the highlight.
  let startIdx = -1;
  const target = highlightWords.join(' ');
  for (let i = 0; i <= words.length - highlightWords.length; i++) {
    if (words.slice(i, i + highlightWords.length).join(' ') === target) {
      startIdx = i;
      break;
    }
  }

  if (startIdx < 0) return words.map((word) => ({ word, isHighlight: false }));

  return words.map((word, i) => ({
    word,
    isHighlight: i >= startIdx && i < startIdx + highlightWords.length,
  }));
}

/** Default colour for the headline highlight system when a panel has no accent override. */
export const HEADING_HIGHLIGHT_COLOR = '#C6923E';
