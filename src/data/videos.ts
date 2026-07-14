import type { Bilingual } from '@/data/site';

export interface Video {
  id: string;
  title: Bilingual;
  youtubeId: string;
  category: Bilingual;
  date?: string;
  description?: Bilingual;
}

export const videos = [
  {
    id: 'torroba-torija',
    title: {
      es: 'Torija',
      en: 'Torija',
    },
    youtubeId: '1K275jYYJmQ',
    category: {
      es: 'Federico Moreno Torroba',
      en: 'Federico Moreno Torroba',
    },
    description: {
      es: 'La elegía de Castillos de España, Vol. 1.',
      en: 'The elegy from Castillos de España, Vol. 1.',
    },
  },
  {
    id: 'bach-largo-bwv-1005',
    title: {
      es: 'Largo BWV 1005',
      en: 'Largo BWV 1005',
    },
    youtubeId: 'VEVa5BTvRf4',
    category: {
      es: 'J. S. Bach',
      en: 'J. S. Bach',
    },
    date: '2012-01-01',
    description: {
      es: 'Bach transcrito para guitarra, grabado en la iglesia de San Miguel de Breamo.',
      en: 'Bach transcribed for guitar, recorded at San Miguel de Breamo Church.',
    },
  },
  {
    id: 'torroba-castillos-seleccion',
    title: {
      es: 'Castillos de España, Vol. 1 - selección',
      en: 'Castillos de España, Vol. 1 - selection',
    },
    youtubeId: 'XNXJyguWNc0',
    category: {
      es: 'Federico Moreno Torroba',
      en: 'Federico Moreno Torroba',
    },
    description: {
      es: 'Selección grabada en el Palacio del Infante D. Luis, en Arenas de San Pedro.',
      en: 'A selection recorded at the Palace of Infante D. Luis, Arenas de San Pedro.',
    },
  },
  {
    id: 'sainz-de-la-maza-danzas',
    title: {
      es: 'Zapateado, Petenera y Rondeña',
      en: 'Zapateado, Petenera and Rondeña',
    },
    youtubeId: 'bcyFR3BCCBE',
    category: {
      es: 'Regino Sainz de la Maza',
      en: 'Regino Sainz de la Maza',
    },
    description: {
      es: 'Tres piezas españolas reunidas en una interpretación de color directo.',
      en: 'Three Spanish pieces gathered in a direct, vividly colored performance.',
    },
  },
  {
    id: 'torroba-alcaniz',
    title: {
      es: 'Alcañiz',
      en: 'Alcañiz',
    },
    youtubeId: 'BxPmqtWCNyE',
    category: {
      es: 'Federico Moreno Torroba',
      en: 'Federico Moreno Torroba',
    },
    description: {
      es: 'De Castillos de España, Vol. 1.',
      en: 'From Castillos de España, Vol. 1.',
    },
  },
  {
    id: 'boccherini-fandango',
    title: {
      es: 'Quinteto n.º 4 en Re mayor, G. 448 "Fandango"',
      en: 'Quintet No. 4 in D Major, G. 448 "Fandango"',
    },
    youtubeId: 'xhjM8uHTi74',
    category: {
      es: 'Luigi Boccherini',
      en: 'Luigi Boccherini',
    },
    description: {
      es: 'El quinteto para guitarra y cuerda coronado por su célebre fandango final.',
      en: 'The quintet for guitar and strings crowned by its famous closing Fandango.',
    },
  },
  {
    id: 'villa-lobos-schottisch-choro',
    title: {
      es: 'Schottisch-Choro',
      en: 'Schottisch-Choro',
    },
    youtubeId: 'NQuDKXRxe5w',
    category: {
      es: 'Heitor Villa-Lobos',
      en: 'Heitor Villa-Lobos',
    },
    description: {
      es: 'De la Suite popular brasileña.',
      en: 'From the Suite populaire brésilienne.',
    },
  },
  {
    id: 'weiss-preludio-suite-2',
    title: {
      es: 'Preludio, Suite n.º II en Mi mayor',
      en: 'Prelude, Suite No. II in E Major',
    },
    youtubeId: 'wWE7MY7NRrE',
    category: {
      es: 'Silvius Leopold Weiss',
      en: 'Silvius Leopold Weiss',
    },
    description: {
      es: 'Weiss trasladado del laúd barroco a la guitarra.',
      en: 'Weiss carried from the baroque lute to the guitar.',
    },
  },
  {
    id: 'bach-fugue-bwv-1005',
    title: {
      es: 'Fuga BWV 1005',
      en: 'Fugue BWV 1005',
    },
    youtubeId: 'CDERynrKA2s',
    category: {
      es: 'J. S. Bach',
      en: 'J. S. Bach',
    },
    date: '2012-01-01',
    description: {
      es: 'La fuga de la Sonata III, grabada en directo en 2012.',
      en: 'The Sonata III fugue, recorded live in 2012.',
    },
  },
  {
    id: 'turina-sonata-op-61-lento',
    title: {
      es: 'Sonata Op. 61 - I. Lento',
      en: 'Sonata Op. 61 - I. Lento',
    },
    youtubeId: 'go0P9xikwBY',
    category: {
      es: 'Joaquín Turina',
      en: 'Joaquín Turina',
    },
    date: '2012-01-01',
    description: {
      es: 'Primer movimiento de la Sonata Op. 61, en directo (2012).',
      en: 'First movement of the Sonata Op. 61, live (2012).',
    },
  },
  {
    id: 'turina-sonata-op-61-andante',
    title: {
      es: 'Sonata Op. 61 - II. Andante',
      en: 'Sonata Op. 61 - II. Andante',
    },
    youtubeId: 'pOtSuumzR5c',
    category: {
      es: 'Joaquín Turina',
      en: 'Joaquín Turina',
    },
    date: '2012-01-01',
    description: {
      es: 'Segundo movimiento de la Sonata Op. 61, en directo (2012).',
      en: 'Second movement of the Sonata Op. 61, live (2012).',
    },
  },
] satisfies Video[];

export function getVideoCategories(locale: keyof Bilingual): string[] {
  return [...new Set(videos.map((video) => video.category[locale]))];
}

export function getVideosByCategory(locale: keyof Bilingual) {
  return getVideoCategories(locale).map((category) => ({
    category,
    videos: videos.filter((video) => video.category[locale] === category),
  }));
}
