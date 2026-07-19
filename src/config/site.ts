export const CORE_PAGE_IDS = ['home', 'about', 'music', 'videos', 'classes'] as const;
export type CorePageId = (typeof CORE_PAGE_IDS)[number];
export type DetailPageId = Exclude<CorePageId, 'home'>;
export type SiteLocale = 'es' | 'en';
export type Localized<T = string> = Record<SiteLocale, T>;

export interface PageConfig {
  path: string;
  label: Localized;
  title: Localized;
  description: Localized;
}

/**
 * Template entry point.
 *
 * Change this file first when reusing the project for another artist. Long-form
 * biography, album, video, and service copy live in src/data and
 * src/components/content so each content collection can evolve independently.
 */
export const siteConfig = {
  origin: 'https://eulogioalbalat.com',
  defaultLocale: 'es' as const,
  locales: ['es', 'en'] as const,
  localeTags: { es: 'es-ES', en: 'en-US' },
  identity: {
    name: 'Eulogio Albalat',
    role: {
      es: 'Guitarrista clásico',
      en: 'Classical guitarist',
    },
    shortBio: {
      es: 'Intérprete, catedrático e investigador',
      en: 'Performer, professor, and researcher',
    },
    location: 'Pazo de Souto, Lugo',
    legalAddress: {
      es: 'Pazo de Souto, Begonte, Lugo, España',
      en: 'Pazo de Souto, Begonte, Lugo, Spain',
    },
    email: 'hello@eulogioalbalat.com',
  },
  assets: {
    favicon: '/favicon.svg',
    portrait: '/images/eulo.webp',
    socialImage: {
      src: '/images/eulo.webp',
      width: 1200,
      height: 800,
      type: 'image/webp',
    },
  },
  theme: {
    stage: '#0B0A09',
    ink: '#F4EFE7',
    muted: '#B9AE9E',
    accent: '#C6923E',
  },
  socials: [
    { label: 'YouTube', href: 'https://www.youtube.com/c/EulogioAlbalat' },
    { label: 'Spotify', href: 'https://open.spotify.com/artist/2WrurcoEYPTTdAqWX2ulpe' },
    { label: 'Apple Music', href: 'https://music.apple.com/us/artist/eulogio-albalat/1849308945' },
  ],
  pages: {
    home: {
      path: '/',
      label: { es: 'Inicio', en: 'Home' },
      title: { es: 'Eulogio Albalat - Guitarrista clásico', en: 'Eulogio Albalat - Classical guitarist' },
      description: {
        es: 'El escenario digital de Eulogio Albalat: guitarra clásica, grabaciones, vídeos, masterclass y conciertos.',
        en: "Eulogio Albalat's digital stage: classical guitar, recordings, videos, masterclasses, and concerts.",
      },
    },
    about: {
      path: '/about/',
      label: { es: 'Biografía', en: 'About' },
      title: { es: 'Eulogio Albalat - Biografía', en: 'Eulogio Albalat - About' },
      description: {
        es: 'Interpretación, docencia e investigación al servicio de la guitarra española.',
        en: 'Performance, teaching, and research in the service of the Spanish guitar.',
      },
    },
    music: {
      path: '/music/',
      label: { es: 'Música', en: 'Music' },
      title: { es: 'Eulogio Albalat - Música', en: 'Eulogio Albalat - Music' },
      description: {
        es: 'Discografía, CD y enlaces de escucha de Eulogio Albalat.',
        en: "Eulogio Albalat's discography, CDs, and listening links.",
      },
    },
    videos: {
      path: '/videos/',
      label: { es: 'Vídeos', en: 'Videos' },
      title: { es: 'Eulogio Albalat - Vídeos', en: 'Eulogio Albalat - Videos' },
      description: {
        es: 'Vídeos de Eulogio Albalat: interpretaciones, conciertos y grabaciones de guitarra clásica.',
        en: 'Videos by Eulogio Albalat: performances, concerts, and classical guitar recordings.',
      },
    },
    classes: {
      path: '/classes/',
      label: { es: 'Masterclass y conciertos', en: 'Masterclass & Concerts' },
      title: {
        es: 'Eulogio Albalat - Masterclass, conciertos y contacto',
        en: 'Eulogio Albalat - Masterclass, Concerts & Contact',
      },
      description: {
        es: 'Masterclass de guitarra clásica, propuestas de concierto y contacto directo con Eulogio Albalat.',
        en: 'Classical guitar masterclasses, concert inquiries, and direct contact with Eulogio Albalat.',
      },
    },
  } satisfies Record<CorePageId, PageConfig>,
  legal: {
    updated: { es: '19 de julio de 2026', en: '19 July 2026' },
    privacyDescription: {
      es: 'Información sobre cómo Eulogio Albalat trata tus datos personales y cómo ejercer tus derechos.',
      en: 'Information about how Eulogio Albalat processes your personal data and how to exercise your rights.',
    },
    cookiesDescription: {
      es: 'Información sobre las cookies, el almacenamiento local y los servicios externos utilizados en eulogioalbalat.com.',
      en: 'Information about cookies, local storage and external services used on eulogioalbalat.com.',
    },
  },
  credits: {
    label: { es: 'Web por', en: 'Website by' },
    name: 'gfdu.me',
    href: 'https://gfdu.me',
  },
} as const;

export function localizedPagePath(pageId: CorePageId, locale: SiteLocale): string {
  const path = siteConfig.pages[pageId].path;
  if (locale === siteConfig.defaultLocale) return path;
  return path === '/' ? `/${locale}/` : `/${locale}${path}`;
}

export function pageConfig(pageId: CorePageId): PageConfig {
  return siteConfig.pages[pageId];
}
