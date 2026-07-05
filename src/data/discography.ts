export interface LocalizedText {
  es: string;
  en: string;
}

export interface AlbumTheme {
  /** Primary ambient radial-glow color. */
  glow: string;
  /** UI accent tint. */
  accent: string;
  /** Deep base / vignette color. */
  depth: string;
  /** Motion energy 0..1 — scales drift speed, glow pulse, parallax. */
  energy: number;
}

export interface Track {
  no: number;
  title: string;
  duration?: string;
  previewUrl?: string;
  spotifyTrackId?: string;
  durationMs?: number;
  /** Per-track theme adaptation, merged over the album palette. */
  theme?: Partial<AlbumTheme>;
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
  /** `spotify:album:<id>` used by expand-to-full. */
  spotifyUri: string;
  /** `https://embed.music.apple.com/...` when an Apple album exists. */
  appleEmbed?: string;
  /** Base theme identity for the record. */
  palette: AlbumTheme;
  featured?: boolean;
}

const APPLE = 'https://audio-ssl.itunes.apple.com/itunes-assets';

export const discography = [
  {
    id: 'torroba-guitar-music',
    title: 'Federico Moreno Torroba: Guitar Music, Yesterday and Today of a Great Maestro',
    year: 2025,
    cover: '/images/albums/torroba-cover.jpg',
    label: 'Da Vinci Classics',
    featured: true,
    notes: {
      es: 'Monografico dedicado a Federico Moreno Torroba, presentado como un recorrido por castillos, danzas y sonatinas para guitarra.',
      en: 'A Federico Moreno Torroba monograph shaped as a journey through castles, dances, and guitar sonatinas.',
    },
    spotifyUri: 'spotify:album:7dRT52ybtElgNDbHqcFZoF',
    appleEmbed: 'https://embed.music.apple.com/us/album/1849357917',
    palette: { glow: '#c6923e', accent: '#d9a441', depth: '#14110d', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Castillos de Espana, Vol. 1: No. 1, Turegano', duration: '2:58', durationMs: 178439,
        previewUrl: `${APPLE}/AudioPreview221/v4/08/cb/e2/08cbe2b7-71c2-15fe-be2d-c9faf7466e0b/mzaf_18290329146510751130.plus.aac.p.m4a`,
        theme: { glow: '#8a8172', accent: '#b39a63', energy: 0.42 } },
      { no: 2, title: 'Castillos de Espana, Vol. 1: No. 2, Torija', duration: '2:13', durationMs: 133136,
        previewUrl: `${APPLE}/AudioPreview211/v4/f8/9c/fe/f89cfeff-3dd2-5559-86f6-cc0f06cdc145/mzaf_17769706013069457437.plus.aac.p.m4a`,
        theme: { glow: '#7f7360', accent: '#a98f57', energy: 0.38 } },
      { no: 3, title: 'Castillos de Espana, Vol. 1: No. 3, Manzanares el Real', duration: '1:29', durationMs: 89166,
        previewUrl: `${APPLE}/AudioPreview221/v4/c8/b5/ef/c8b5efd3-75fd-b570-4551-c714b7f9b980/mzaf_2027352862036534195.plus.aac.p.m4a`,
        theme: { glow: '#9c8b63', accent: '#c6a24e', energy: 0.5 } },
      { no: 4, title: 'Romance de los pinos: No. 4, Montemayor', duration: '1:41', durationMs: 101873,
        previewUrl: `${APPLE}/AudioPreview211/v4/6d/e9/1d/6de91d46-c185-f89b-1081-6c6505484160/mzaf_2449211025769951982.plus.aac.p.m4a`,
        theme: { glow: '#6f7a4f', accent: '#9caf5e', energy: 0.4 } },
      { no: 9, title: 'Burgalesa', duration: '2:26', durationMs: 146456,
        previewUrl: `${APPLE}/AudioPreview221/v4/e9/e8/2f/e9e82fc9-b866-8260-927a-add08c541e93/mzaf_2022886457840797067.plus.aac.p.m4a`,
        theme: { glow: '#c6923e', accent: '#e0a83f', energy: 0.72 } },
      { no: 13, title: 'Nocturno', duration: '4:32', durationMs: 272941,
        previewUrl: `${APPLE}/AudioPreview221/v4/45/fc/e0/45fce04d-64d1-37de-3ca2-6e9020a67762/mzaf_8407402004681094402.plus.aac.p.m4a`,
        theme: { glow: '#3f4a63', accent: '#6d7ba0', depth: '#0c0e14', energy: 0.22 } },
      { no: 26, title: 'Sonatina: I. Allegretto', duration: '4:23', durationMs: 263516,
        previewUrl: `${APPLE}/AudioPreview211/v4/6f/9e/8f/6f9e8f48-9b27-f828-2d53-a16617d94e1a/mzaf_4359568736295582167.plus.aac.p.m4a`,
        theme: { glow: '#c89a4a', accent: '#e6bb55', energy: 0.66 } },
      { no: 28, title: 'Sonatina: III. Allegro', duration: '4:53', durationMs: 293061,
        previewUrl: `${APPLE}/AudioPreview221/v4/6c/b2/37/6cb237ba-5729-7c1e-c14d-9ca541b8ed69/mzaf_8636292215092312280.plus.aac.p.m4a`,
        theme: { glow: '#d98a36', accent: '#f2a844', energy: 0.85 } },
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
    cover: '/images/albums/guitarra-cover.jpg',
    notes: {
      es: 'Album digital de repertorio para guitarra que abre la estanteria historica de Eulogio Albalat en plataformas.',
      en: 'A digital guitar-repertoire album that opens the historical shelf for Eulogio Albalat on streaming platforms.',
    },
    spotifyUri: 'spotify:album:5vUZx32NxcgkM0F5aU8be7',
    palette: { glow: '#e6c534', accent: '#f2d43a', depth: '#0a0a0a', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Galilei: Ricercare: Intavolatura di liuto', duration: '0:51' },
      { no: 2, title: 'Weiss: Sonata No. 2: Prelude Sarabande Courante', duration: '1:44' },
      { no: 3, title: 'Weiss: Lute Suite No. 16: I. Sarabande', duration: '1:51' },
      { no: 4, title: 'Mompou: Suite Compostelana: I. Preludio', duration: '2:48' },
      { no: 5, title: 'Mompou: Suite Compostelana: Cancion', duration: '3:08' },
      { no: 6, title: 'Mompou: Suite Compostelana: Muneira', duration: '2:42',
        theme: { glow: '#7fa14a', accent: '#b7c85a', energy: 0.8 } },
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
