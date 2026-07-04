import { describe, it, expect } from 'vitest';
import { site } from '@/data/site';
describe('site data', () => {
  it('has a hero station first and a contact station', () => {
    expect(site.stations[0]?.id).toBe('hero');
    expect(site.stations.some(s => s.id === 'contact')).toBe(true);
  });
  it('every station heading is bilingual', () => {
    for (const s of site.stations) { expect(s.heading.es).toBeTruthy(); expect(s.heading.en).toBeTruthy(); }
  });
});
