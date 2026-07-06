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
  ],

  about: {
    eyebrow: {
      es: 'Biografía',
      en: 'About',
    },
    paragraphs: {
      // TODO-CONTENT: replace with Eulogio's real bio detail (training,
      // milestones, venues, recordings) once provided. These paragraphs avoid
      // invented specifics and stay at a truthful general level.
      es: [
        'La guitarra clásica ha sido el hilo conductor de una vida entre el estudio, la interpretación y la enseñanza.',
        'Su trabajo se articula alrededor del sonido, la respiración de la frase y la relación íntima entre intérprete, instrumento y oyente.',
        'En este espacio se reunirá su actividad artística: grabaciones, vídeos, notas sobre la guitarra y vías de contacto para clases privadas o propuestas de concierto.',
      ],
      en: [
        'The classical guitar has been the throughline of a life spent between study, performance, and teaching.',
        'His work is shaped by sound, phrasing, and the intimate relationship between performer, instrument, and listener.',
        'This space will gather his artistic activity: recordings, videos, notes on the guitar, and contact routes for private classes or concert proposals.',
      ],
    },
    portrait: {
      src: '/images/eulo.webp',
      alt: {
        es: 'TODO-ASSET: retrato provisional hasta recibir una fotografía real de Eulogio Albalat.',
        en: 'TODO-ASSET: placeholder portrait until a real photograph of Eulogio Albalat is provided.',
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
          'La guitarra clásica ha sido el hilo conductor de una vida entre el estudio, la interpretación y la enseñanza.',
          'Esa dedicación se reparte hoy entre los escenarios, el aula y la grabación, siempre al servicio del repertorio del instrumento.',
        ],
        en: [
          'The classical guitar has been the throughline of a life spent between study, performance, and teaching.',
          "That dedication is shared today across the stage, the studio, and the classroom, always in service of the instrument's repertoire.",
        ],
      },
      href: '/about',
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
        es: 'Clases y conciertos',
        en: 'Classes & Concerts',
      },
      tagline: {
        es: 'Clases privadas, conciertos y contacto directo en una sola consulta.',
        en: 'Private classes, concert bookings, and direct contact in one place.',
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

  return [
    {
      id: 'hero',
      index: 1,
      heading: site.fullName,
      subheading: site.role[locale],
      role: isEn ? 'Classical guitar' : 'Guitarra clasica',
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
      heading: isEn ? 'About.' : 'Biografia.',
      subheading: isEn ? 'Sound, phrase, repertoire' : 'Sonido, frase, repertorio',
      role: site.about.eyebrow[locale],
      body: [
        site.about.paragraphs[locale][0] ?? '',
        site.about.paragraphs[locale][1] ?? '',
      ].filter(Boolean),
      tagline: isEn
        ? 'A life devoted to the classical guitar.'
        : 'Una vida dedicada a la guitarra clasica.',
      visual: { kind: 'about' },
    },
    {
      id: 'sep-listen',
      index: 3,
      tagline: isEn ? 'Listen.\nRecordings and albums.' : 'Escuchar.\nGrabaciones y albumes.',
      taglineHighlight: isEn ? 'Recordings and albums.' : 'Grabaciones y albumes.',
      accent: '#C6923E',
      body: [],
      visual: { kind: 'separator' },
    },
    {
      id: 'music',
      index: 4,
      heading: isEn ? 'Music.' : 'Musica.',
      subheading: isEn ? 'Recordings gathered by album' : 'Grabaciones reunidas por album',
      role: isEn ? 'Discography' : 'Discografia',
      dates: isEn ? 'Albums and works' : 'Albumes y obras',
      body: [
        isEn
          ? 'Recordings, releases, and selected works gathered in one listening space.'
          : 'Grabaciones, lanzamientos y obras seleccionadas reunidas en un espacio de escucha.',
      ],
      links: [
        { label: isEn ? 'Open music' : 'Ver musica', href: '#music' },
        { label: 'Spotify', href: spotify },
      ],
      visual: {
        kind: 'photo',
        image: '/images/portrait_cover.webp',
        imageAlt: isEn ? 'Album cover placeholder' : 'Portada provisional de album',
      },
    },
    {
      id: 'videos',
      index: 5,
      heading: 'Videos.',
      subheading: isEn ? 'Performances and concert moments' : 'Interpretaciones y momentos de concierto',
      role: isEn ? 'Film' : 'Imagen',
      dates: isEn ? 'Live and studio' : 'Directo y estudio',
      body: [
        isEn
          ? 'Performances and concert moments on film, presented with the same quiet focus as the instrument.'
          : 'Interpretaciones y momentos de concierto en imagen, con la misma atencion al detalle que el instrumento.',
      ],
      links: [
        { label: isEn ? 'Open videos' : 'Ver videos', href: '#videos' },
        { label: 'YouTube', href: youtube },
      ],
      visual: {
        kind: 'photo',
        image: '/images/concert.webp',
        imageAlt: isEn ? 'Placeholder performance image' : 'Imagen provisional de interpretacion',
      },
    },
    {
      id: 'classes',
      index: 6,
      heading: isEn ? 'Classes and concerts.' : 'Clases y conciertos.',
      headingHighlight: isEn ? 'concerts.' : 'conciertos.',
      subheading: isEn ? 'Private lessons, bookings, direct contact' : 'Clases privadas, conciertos y contacto directo',
      body: [
        isEn
          ? 'A direct route for private classes, concert proposals, and artistic enquiries.'
          : 'Una via directa para clases privadas, propuestas de concierto y consultas artisticas.',
      ],
      bullets: isEn
        ? ['Private classes', 'Concert proposals', 'Direct enquiries']
        : ['Clases privadas', 'Propuestas de concierto', 'Consultas directas'],
      links: [
        { label: isEn ? 'Make an enquiry' : 'Enviar consulta', href: '#classes' },
        { label: 'Email', href: email },
      ],
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
      ],
      visual: { kind: 'minimal' },
    },
  ];
}
