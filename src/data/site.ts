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
  fullName: 'Eulogio Albalat',
  role: {
    es: 'Guitarrista clásico',
    en: 'Classical guitarist',
  } satisfies Bilingual,

  socials: [
    { label: 'Email', href: 'mailto:hello@eulogioalbalat.com' },
    { label: 'YouTube', href: 'https://www.youtube.com/c/EulogioAlbalat' },
    { label: 'Spotify', href: 'https://open.spotify.com/artist/2WrurcoEYPTTdAqWX2ulpe' },
    { label: 'Apple Music', href: 'https://music.apple.com/us/artist/eulogio-albalat/1849308945' },
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
        'Formado desde niño entre la pintura, la escultura y la música del entorno cultural gallego, la guitarra clásica ha sido el hilo conductor de una vida dedicada al estudio, la interpretación y la enseñanza.',
        'Catedrático del Conservatorio Superior de A Coruña durante treinta y tres años, ha actuado como solista y en formaciones de cámara por España, Francia, Italia, Inglaterra, Noruega y Grecia.',
        'Su trabajo se articula en torno al sonido, la respiración de la frase y la relación íntima entre intérprete, instrumento y oyente.',
      ],
      en: [
        "Raised from childhood among the painting, sculpture, and music of Galicia's cultural world, the classical guitar has been the throughline of a life devoted to study, performance, and teaching.",
        'Full professor at the Conservatorio Superior of A Coruña for thirty-three years, he has performed as a soloist and in chamber ensembles across Spain, France, Italy, England, Norway, and Greece.',
        'His work is shaped by sound, the breathing of the phrase, and the intimate relationship between performer, instrument, and listener.',
      ],
    },
    portrait: {
      src: '/images/eulo.webp',
      alt: {
        es: 'Retrato de Eulogio Albalat.',
        en: 'Portrait of Eulogio Albalat.',
      },
    },
  } satisfies AboutContent,

  stations: [
    {
      id: 'hero',
      kind: 'hero',
      heading: {
        es: 'Eulogio Albalat',
        en: 'Eulogio Albalat',
      },
      tagline: {
        es: 'Guitarrista clásico',
        en: 'Classical guitarist',
      },
    },
    {
      id: 'about',
      kind: 'teaser',
      heading: {
        es: 'Biografía',
        en: 'About',
      },
      tagline: {
        es: 'Una trayectoria dedicada a la guitarra clásica.',
        en: 'A life devoted to the classical guitar.',
      },
      body: {
        es: [
          'Formado desde niño entre la pintura, la escultura y la música del entorno cultural gallego, la guitarra clásica ha sido el hilo conductor de una vida dedicada al estudio, la interpretación y la enseñanza.',
          'Catedrático del Conservatorio Superior de A Coruña durante treinta y tres años, ha actuado como solista y en formaciones de cámara por España y buena parte de Europa.',
        ],
        en: [
          "Raised from childhood among the painting, sculpture, and music of Galicia's cultural world, the classical guitar has been the throughline of a life devoted to study, performance, and teaching.",
          'Full professor at the Conservatorio Superior of A Coruña for thirty-three years, he has performed as a soloist and in chamber ensembles across Spain and much of Europe.',
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
  const prefix = isEn ? '/en' : '';
  const email = site.socials.find((social) => social.label === 'Email')?.href ?? 'mailto:hello@eulogioalbalat.com';
  const youtube = site.socials.find((social) => social.label === 'YouTube')?.href ?? '/videos';
  const spotify = site.socials.find((social) => social.label === 'Spotify')?.href ?? '/music';
  const appleMusic = site.socials.find((social) => social.label === 'Apple Music')?.href ?? '/music';

  return [
    {
      id: 'hero',
      index: 1,
      heading: site.fullName,
      subheading: site.role[locale],
      role: isEn ? 'Classical guitar' : 'Guitarra clásica',
      body: [],
      visual: {
        kind: 'hero',
        image: '/images/bg2.webp',
        imageAlt: isEn ? 'Mossy stone wall behind Eulogio Albalat' : 'Muro de piedra con musgo tras Eulogio Albalat',
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
        site.about.paragraphs[locale][1] ?? '',
      ].filter(Boolean),
      tagline: isEn
        ? 'A life devoted to the classical guitar.'
        : 'Una vida dedicada a la guitarra clásica.',
      detail: true,
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
