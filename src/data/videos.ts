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
    id: 'torroba-castillos-seleccion',
    title: {
      es: 'Castillos de Espana, Vol. 1 - seleccion',
      en: 'Castillos de Espana, Vol. 1 - selection',
    },
    youtubeId: 'HJIQHddITh8',
    category: {
      es: 'Federico Moreno Torroba',
      en: 'Federico Moreno Torroba',
    },
    date: '2020-08-01',
    description: {
      es: 'Una lectura de concierto alrededor de las miniaturas castellanas de Moreno Torroba.',
      en: "A concert reading built around Moreno Torroba's Castilian miniatures.",
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
    id: 'albeniz-granada-live',
    title: {
      es: 'Granada',
      en: 'Granada',
    },
    youtubeId: 'uaOlCIkWqZY',
    category: {
      es: 'Isaac Albeniz',
      en: 'Isaac Albeniz',
    },
    date: '2012-01-01',
    description: {
      es: 'Version en directo de Granada, de la Suite espanola Op. 47.',
      en: 'Live performance of Granada, from Suite espanola Op. 47.',
    },
  },
  {
    id: 'bach-prelude-bwv-1005',
    title: {
      es: 'Preludio BWV 1005',
      en: 'Prelude BWV 1005',
    },
    youtubeId: 'WBjAxytAqUk',
    category: {
      es: 'J. S. Bach',
      en: 'J. S. Bach',
    },
    date: '2012-01-01',
    description: {
      es: 'El preludio de la Sonata III en una transcripcion propia para guitarra.',
      en: 'The Sonata III prelude in a personal transcription for guitar.',
    },
  },
  {
    id: 'sainz-de-la-maza-danzas',
    title: {
      es: 'Zapateado, Petenera y Rondena',
      en: 'Zapateado, Petenera and Rondena',
    },
    youtubeId: 'bcyFR3BCCBE',
    category: {
      es: 'Regino Sainz de la Maza',
      en: 'Regino Sainz de la Maza',
    },
    description: {
      es: 'Tres piezas espanolas reunidas en una interpretacion de color directo.',
      en: 'Three Spanish pieces gathered in a direct, vividly colored performance.',
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
