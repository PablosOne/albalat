import { describe, it, expect } from 'vitest';
import { site } from '@/data/site';
import { CORE_PAGE_IDS, localizedPagePath, siteConfig } from '@/config/site';
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
  it('has bilingual about prose and a described portrait', () => {
    expect(site.about.paragraphs.es.length).toBeGreaterThan(0);
    expect(site.about.paragraphs.en.length).toBe(site.about.paragraphs.es.length);
    expect(site.about.portrait.alt.es).toBeTruthy();
    expect(site.about.portrait.alt.en).toBeTruthy();
    expect(site.about.portrait.alt.es).not.toContain('TODO-ASSET');
    expect(site.about.portrait.alt.en).not.toContain('TODO-ASSET');
  });
  it('derives identity and profiles from the template config', () => {
    expect(site.fullName).toBe(siteConfig.identity.name);
    expect(site.socials).toContainEqual({ label: 'Email', href: `mailto:${siteConfig.identity.email}` });
    for (const profile of siteConfig.socials) expect(site.socials).toContainEqual(profile);
  });
  it('provides unique localized paths for every configured core page', () => {
    const paths = CORE_PAGE_IDS.flatMap((id) => [localizedPagePath(id, 'es'), localizedPagePath(id, 'en')]);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
