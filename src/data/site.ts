import { siteConfig, localizedPagePath } from '@/config/site';

/**
 * Core content model for the site: the guitarist's identity, socials, and
 * the stations that populate the horizontal stage on Home.
 *
 * Pure data - no components, no styling. See docs/superpowers/plans/
 * 2026-07-04-albalat-website.md (Task 1.1) for the originating spec.
 */

export interface Bilingual {
  es: string;
  en: string;
}

export type BilingualParagraphs = {
  es: string[];
  en: string[];
};

/**
 * Distinguishes the hero station (large, name-and-role display, first on
 * the stage) from every other station, which renders as a compact teaser
 * linking out to its own detail page.
 */
export type StationKind = 'hero' | 'teaser';

export interface Station {
  id: string;
  kind: StationKind;
  heading: Bilingual;
  tagline?: Bilingual;
  body?: BilingualParagraphs;
  href?: string;
  accent?: string;
  detail?: boolean; // true → this station opens a vertical detail lane
}

export interface PanelLink {
  label: string;
  href: string;
}

export interface PanelStat {
  label: string;
  value: string;
}

export type PanelVisualKind = 'hero' | 'about' | 'photo' | 'services' | 'minimal' | 'separator' | 'card';

export interface Panel {
  id: string;
  index: number;
  heading?: string;
  headingHighlight?: string;
  subheading?: string;
  role?: string;
  dates?: string;
  body: string[];
  callout?: string;
  bullets?: readonly string[];
  stats?: PanelStat[];
  links?: PanelLink[];
  /** Crawlable route for a panel that also opens an interactive detail lane. */
  href?: string;
  tagline?: string;
  taglineHighlight?: string;
  accent?: string;
  /** true -> this panel opens a vertical detail lane; openLabel is its arrow's accessible label. */
  detail?: boolean;
  openLabel?: string;
  visual: { kind: PanelVisualKind } & (
    | { image: string; imageAlt: string }
    | { image?: never; imageAlt?: never }
  );
}

export interface AboutContent {
  eyebrow: Bilingual;
  paragraphs: BilingualParagraphs;
  portrait: {
    src: string;
    alt: Bilingual;
  };
}

export const site = {
  fullName: siteConfig.identity.name,
  role: siteConfig.identity.role satisfies Bilingual,

  socials: [
    { label: 'Email', href: `mailto:${siteConfig.identity.email}` },
    ...siteConfig.socials,
  ],

  about: {
    eyebrow: {
      es: 'Biografía',
      en: 'About',
    },
    paragraphs: {
      // Condensed from the full biography rendered in
      // src/components/content/AboutContent.astro (the About detail lane).
      es: [
        'Intérprete, catedrático e investigador, su trayectoria está dedicada a la interpretación, la investigación y la difusión del patrimonio musical español para guitarra, con fidelidad al espíritu de la música.',
        'Catedrático del Conservatorio Superior de Música de A Coruña durante más de tres décadas, ha llevado un repertorio que va del Renacimiento a la creación contemporánea por España y Europa.',
        'En la actualidad interpreta, investiga y graba desde su propio estudio en el histórico Pazo de Souto, en Begonte (Lugo).',
      ],
      en: [
        'Performer, professor, and researcher, his career is devoted to the interpretation, study, and dissemination of the Spanish guitar heritage, with a deep fidelity to the spirit of the music.',
        'Full professor at the Conservatorio Superior de Música of A Coruña for more than three decades, he has taken a repertoire spanning the Renaissance to contemporary creation across Spain and Europe.',
        'Today he performs, researches, and records from his own studio at the historic Pazo de Souto in Begonte (Lugo).',
      ],
    },
    portrait: {
      src: siteConfig.assets.portrait,
      alt: {
        es: `Retrato de ${siteConfig.identity.name}.`,
        en: `Portrait of ${siteConfig.identity.name}.`,
      },
    },
  } satisfies AboutContent,

  stations: [
    {
      id: 'hero',
      kind: 'hero',
      heading: { es: siteConfig.identity.name, en: siteConfig.identity.name },
      tagline: siteConfig.identity.role,
    },
    {
      id: 'about',
      kind: 'teaser',
      heading: {
        es: 'Biografía',
        en: 'About',
      },
      tagline: {
        es: 'Interpretación, docencia e investigación al servicio de la guitarra española.',
        en: 'Performance, teaching, and research in the service of the Spanish guitar.',
      },
      body: {
        es: [
          'Intérprete, catedrático e investigador, su trayectoria está dedicada a la interpretación, la investigación y la difusión del patrimonio musical español para guitarra, con fidelidad al espíritu de la música.',
          'Catedrático del Conservatorio Superior de Música de A Coruña durante más de tres décadas, ha llevado un repertorio que va del Renacimiento a la creación contemporánea por España y Europa.',
        ],
        en: [
          'Performer, professor, and researcher, his career is devoted to the interpretation, study, and dissemination of the Spanish guitar heritage, with a deep fidelity to the spirit of the music.',
          'Full professor at the Conservatorio Superior de Música of A Coruña for more than three decades, he has taken a repertoire spanning the Renaissance to contemporary creation across Spain and Europe.',
        ],
      },
      href: '/about',
      detail: true,
    },
    {
      id: 'music',
      kind: 'teaser',
      heading: {
        es: 'Música',
        en: 'Music',
      },
      tagline: {
        es: 'Grabaciones reunidas por álbum, disponibles para escuchar.',
        en: 'Recordings gathered by album, ready to listen.',
      },
      href: '/music',
      detail: true,
    },
    {
      id: 'videos',
      kind: 'teaser',
      heading: {
        es: 'Vídeos',
        en: 'Videos',
      },
      tagline: {
        es: 'Interpretaciones y momentos de concierto en imagen.',
        en: 'Performances and concert moments on film.',
      },
      href: '/videos',
      detail: true,
    },
    {
      id: 'classes',
      kind: 'teaser',
      heading: {
        es: 'Masterclass y conciertos',
        en: 'Masterclass & Concerts',
      },
      tagline: {
        es: 'Masterclass, propuestas de concierto y contacto directo en una sola consulta.',
        en: 'Masterclasses, concert bookings, and direct contact in one place.',
      },
      href: '/classes',
      detail: true,
    },
  ] satisfies Station[],
};

export type HomeLocale = 'es' | 'en';

export function getHomePanels(locale: HomeLocale): Panel[] {
  const isEn = locale === 'en';
  const email = `mailto:${siteConfig.identity.email}`;
  const youtube = site.socials.find((social) => social.label === 'YouTube')?.href ?? '/videos';
  const spotify = site.socials.find((social) => social.label === 'Spotify')?.href ?? '/music';
  const appleMusic = site.socials.find((social) => social.label === 'Apple Music')?.href ?? '/music';

  return [
    {
      id: 'hero',
      index: 1,
      heading: site.fullName,
      subheading: siteConfig.identity.shortBio[locale],
      role: isEn ? 'Classical guitar' : 'Guitarra clásica',
      body: [],
      visual: {
        kind: 'hero',
        image: '/images/bg2.webp',
        imageAlt: isEn ? `Mossy stone wall behind ${siteConfig.identity.name}` : `Muro de piedra con musgo tras ${siteConfig.identity.name}`,
      },
    },
    {
      id: 'about',
      index: 2,
      heading: isEn ? 'About.' : 'Biografía.',
      subheading: isEn ? 'Sound, phrasing, repertoire' : 'Sonido, fraseo, repertorio',
      role: site.about.eyebrow[locale],
      body: [
        site.about.paragraphs[locale][0] ?? '',
      ].filter(Boolean),
      tagline: isEn
        ? 'A life devoted to the classical guitar.'
        : 'Una vida dedicada a la guitarra clásica.',
      detail: true,
      href: localizedPagePath('about', locale),
      openLabel: isEn ? 'Open the full biography' : 'Abrir la biografía completa',
      visual: { kind: 'about' },
    },
    {
      id: 'sep-listen',
      index: 3,
      tagline: isEn ? 'Listen.\nRecordings and albums.' : 'Escuchar.\nGrabaciones y álbumes.',
      taglineHighlight: isEn ? 'Recordings and albums.' : 'Grabaciones y álbumes.',
      accent: '#C6923E',
      body: [],
      visual: { kind: 'separator' },
    },
    {
      id: 'music',
      index: 4,
      heading: isEn ? 'Music.' : 'Música.',
      subheading: isEn ? 'Recordings gathered by album' : 'Grabaciones reunidas por álbum',
      role: isEn ? 'Discography' : 'Discografía',
      dates: isEn ? 'Albums and works' : 'Álbumes y obras',
      body: [
        isEn
          ? 'From Moreno Torroba to Boccherini: recordings and albums gathered in one listening space.'
          : 'De Moreno Torroba a Boccherini: grabaciones y álbumes reunidos en un mismo espacio de escucha.',
      ],
      links: [
        { label: 'Spotify', href: spotify },
      ],
      detail: true,
      href: localizedPagePath('music', locale),
      openLabel: isEn ? 'Open Music details' : 'Abrir Música',
      visual: {
        kind: 'photo',
        image: '/images/portrait_cover.webp',
        imageAlt: isEn ? 'Album cover placeholder' : 'Portada provisional de álbum',
      },
    },
    {
      id: 'videos',
      index: 5,
      heading: isEn ? 'Videos.' : 'Vídeos.',
      subheading: isEn ? 'Performances and concert moments' : 'Interpretaciones y momentos de concierto',
      role: isEn ? 'Film' : 'Imagen',
      dates: isEn ? 'Live and studio' : 'Directo y estudio',
      body: [
        isEn
          ? 'Performances live and in the studio: from Bach and Weiss to Torroba, Turina, and Villa-Lobos.'
          : 'Interpretaciones en directo y en estudio: de Bach y Weiss a Torroba, Turina y Villa-Lobos.',
      ],
      links: [
        { label: 'YouTube', href: youtube },
      ],
      detail: true,
      href: localizedPagePath('videos', locale),
      openLabel: isEn ? 'Open Videos details' : 'Abrir Vídeos',
      visual: {
        kind: 'photo',
        image: '/images/concert.webp',
        imageAlt: isEn ? 'Placeholder performance image' : 'Imagen provisional de interpretación',
      },
    },
    {
      id: 'classes',
      index: 6,
      heading: isEn ? 'Masterclass and concerts.' : 'Masterclass y conciertos.',
      headingHighlight: isEn ? 'concerts.' : 'conciertos.',
      subheading: isEn ? 'Masterclasses, bookings, direct contact' : 'Masterclass, conciertos y contacto directo',
      body: [
        isEn
          ? 'A direct route for masterclasses, concert proposals, and artistic enquiries.'
          : 'Una vía directa para masterclass, propuestas de concierto y consultas artísticas.',
      ],
      bullets: isEn
        ? ['Masterclasses', 'Concert proposals', 'Direct enquiries']
        : ['Masterclass', 'Propuestas de concierto', 'Consultas directas'],
      links: [
        { label: 'Email', href: email },
      ],
      detail: true,
      href: localizedPagePath('classes', locale),
      openLabel: isEn ? 'Open Masterclass & Concerts details' : 'Abrir Masterclass y conciertos',
      visual: { kind: 'services' },
    },
    {
      id: 'contact',
      index: 7,
      heading: isEn ? 'Contact.' : 'Contacto.',
      body: [],
      links: [
        { label: email.replace('mailto:', ''), href: email },
        { label: 'YouTube', href: youtube },
        { label: 'Spotify', href: spotify },
        { label: 'Apple Music', href: appleMusic },
      ],
      visual: { kind: 'minimal' },
    },
  ];
}
