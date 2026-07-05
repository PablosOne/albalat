export interface LocalizedText {
  es: string;
  en: string;
}

export interface Track {
  no: number;
  title: string;
  duration?: string;
}

export interface Album {
  id: string;
  title: string;
  year: number;
  cover: string;
  label?: string;
  notes: LocalizedText;
  tracklist: Track[];
  links: {
    spotify?: string;
    appleMusic?: string;
    youtube?: string;
  };
  embeds?: {
    spotify?: string;
    youtube?: string;
  };
  featured?: boolean;
}

export const discography = [
  {
    id: 'torroba-guitar-music',
    title: 'Federico Moreno Torroba: Guitar Music, Yesterday and Today of a Great Maestro',
    year: 2025,
    cover: '/images/albums/torroba-todo-cover.svg',
    label: 'Da Vinci Classics',
    featured: true,
    notes: {
      es: 'Monografico dedicado a Federico Moreno Torroba, presentado como un recorrido por castillos, danzas y sonatinas para guitarra. TODO-ASSET: sustituir la funda provisional por la portada oficial cuando se incorpore al proyecto.',
      en: 'A Federico Moreno Torroba monograph shaped as a journey through castles, dances, and guitar sonatinas. TODO-ASSET: replace the temporary sleeve with the official cover when it is added to the project.',
    },
    tracklist: [
      { no: 1, title: 'Castillos de Espana, Vol. 1: No. 1, Turegano', duration: '2:58' },
      { no: 2, title: 'Castillos de Espana, Vol. 1: No. 2, Torija', duration: '2:13' },
      { no: 3, title: 'Castillos de Espana, Vol. 1: No. 3, Manzanares el Real', duration: '1:29' },
      { no: 4, title: 'Romance de los pinos: No. 4, Montemayor', duration: '1:41' },
      { no: 9, title: 'Burgalesa', duration: '2:26' },
      { no: 13, title: 'Nocturno', duration: '4:32' },
      { no: 26, title: 'Sonatina: I. Allegretto', duration: '4:23' },
      { no: 28, title: 'Sonatina: III. Allegro', duration: '4:53' },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/7dRT52ybtElgNDbHqcFZoF',
      appleMusic: 'https://classical.music.apple.com/us/album/1849357917',
      youtube: 'https://www.youtube.com/watch?v=frxwefmz2zI',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/7dRT52ybtElgNDbHqcFZoF',
      youtube: 'https://www.youtube-nocookie.com/embed/frxwefmz2zI',
    },
  },
  {
    id: 'guitarra',
    title: 'Guitarra',
    year: 2018,
    cover: '/images/albums/guitarra-todo-cover.svg',
    notes: {
      es: 'Album digital de repertorio para guitarra que abre la estanteria historica conocida de Eulogio Albalat en plataformas. TODO-ASSET: pendiente de portada oficial y notas completas de libreto.',
      en: 'A digital guitar-repertoire album that opens the known historical shelf for Eulogio Albalat on streaming platforms. TODO-ASSET: official artwork and full booklet notes are still pending.',
    },
    tracklist: [
      { no: 1, title: 'Galilei: Ricercare: Intavolatura di liuto', duration: '0:51' },
      { no: 2, title: 'Weiss: Sonata No. 2: Prelude Sarabande Courante', duration: '1:44' },
      { no: 3, title: 'Weiss: Lute Suite No. 16: I. Sarabande', duration: '1:51' },
      { no: 4, title: 'Mompou: Suite Compostelana: I. Preludio', duration: '2:48' },
      { no: 5, title: 'Mompou: Suite Compostelana: Cancion', duration: '3:08' },
      { no: 6, title: 'Mompou: Suite Compostelana: Muñeira', duration: '2:42' },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/5vUZx32NxcgkM0F5aU8be7',
      appleMusic: 'https://music.apple.com/us/artist/eulogio-albalat/1849308945',
      youtube: 'https://www.youtube.com/c/EulogioAlbalat/videos',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/5vUZx32NxcgkM0F5aU8be7',
      youtube: 'https://www.youtube-nocookie.com/embed/CDERynrKA2s',
    },
  },
] satisfies Album[];

export const featuredAlbum = discography.find((album) => album.featured) ?? discography[0];
