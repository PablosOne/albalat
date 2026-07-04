/**
 * Core content model for the site: the guitarist's identity, socials, and
 * the seven "stations" that populate the horizontal stage on Home.
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
    // TODO-CONTENT: replace with Eulogio's real contact email/socials once provided.
    { label: 'Email', href: 'mailto:contacto@example.com' },
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
      src: '/images/eulogio-portrait-placeholder.webp',
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
    },
    {
      id: 'guitar',
      kind: 'teaser',
      heading: {
        es: 'La guitarra',
        en: 'The Guitar',
      },
      tagline: {
        es: 'Notas sobre técnica, sonido e instrumentos.',
        en: 'Notes on technique, sound, and instruments.',
      },
      href: '/guitar',
    },
    {
      id: 'classes',
      kind: 'teaser',
      heading: {
        es: 'Clases',
        en: 'Classes',
      },
      tagline: {
        es: 'Clases privadas para todos los niveles, a medida de cada alumno.',
        en: 'Private classes for every level, tailored to each student.',
      },
      href: '/classes',
    },
    {
      id: 'contact',
      kind: 'teaser',
      heading: {
        es: 'Contacto',
        en: 'Contact',
      },
      tagline: {
        es: 'Para conciertos, clases o cualquier consulta, será un placer atenderle.',
        en: 'For concerts, classes, or any inquiry, it would be a pleasure to hear from you.',
      },
      href: '/contact',
    },
  ] satisfies Station[],
};
