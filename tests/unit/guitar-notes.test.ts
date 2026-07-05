import { describe, expect, it } from 'vitest';
import { guitarNotes } from '@/data/guitar-notes';

describe('guitar notes', () => {
  it('covers technique, sound, and instruments', () => {
    expect(new Set(guitarNotes.map((note) => note.kind))).toEqual(new Set(['trick', 'sound', 'guitars']));
  });

  it('has bilingual titles and body copy', () => {
    for (const note of guitarNotes) {
      expect(note.title.es).toBeTruthy();
      expect(note.title.en).toBeTruthy();
      expect(note.summary.es).toBeTruthy();
      expect(note.summary.en).toBeTruthy();
      expect(note.body.es.length).toBeGreaterThan(0);
      expect(note.body.en.length).toBe(note.body.es.length);
    }
  });
});
