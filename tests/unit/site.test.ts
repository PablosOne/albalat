import { describe, it, expect } from 'vitest';
import { site } from '@/data/site';
describe('site data', () => {
  it('has a hero station first and a combined classes/contact station', () => {
    expect(site.stations[0]?.id).toBe('hero');
    expect(site.stations.some(s => s.id === 'classes')).toBe(true);
    expect(site.stations.some(s => s.id === 'guitar')).toBe(false);
    expect(site.stations.some(s => s.id === 'contact')).toBe(false);
  });
  it('every station heading is bilingual', () => {
    for (const s of site.stations) { expect(s.heading.es).toBeTruthy(); expect(s.heading.en).toBeTruthy(); }
  });
  it('has bilingual about prose and a TODO-marked placeholder portrait', () => {
    expect(site.about.paragraphs.es.length).toBeGreaterThan(0);
    expect(site.about.paragraphs.en.length).toBe(site.about.paragraphs.es.length);
    expect(site.about.portrait.alt.es).toContain('TODO-ASSET');
    expect(site.about.portrait.alt.en).toContain('TODO-ASSET');
  });
  it('includes official listening and video profiles', () => {
    expect(site.socials.some((social) => social.href.includes('youtube.com/c/EulogioAlbalat'))).toBe(true);
    expect(site.socials.some((social) => social.href.includes('open.spotify.com/artist/2WrurcoEYPTTdAqWX2ulpe'))).toBe(true);
  });
});
