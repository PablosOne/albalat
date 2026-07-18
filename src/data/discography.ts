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
  /** `spotify:album:<id>` used by expand-to-full. Absent for video-only releases. */
  spotifyUri?: string;
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
      es: 'Monográfico dedicado a Federico Moreno Torroba, planteado como un recorrido por castillos, danzas y sonatinas para guitarra.',
      en: 'A Federico Moreno Torroba monograph shaped as a journey through castles, dances, and guitar sonatinas.',
    },
    spotifyUri: 'spotify:album:7dRT52ybtElgNDbHqcFZoF',
    appleEmbed: 'https://embed.music.apple.com/us/album/1849357917',
    palette: { glow: '#c6923e', accent: '#d9a441', depth: '#14110d', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Castillos de España, Vol. 1: No. 1, Turégano', duration: '2:58', durationMs: 178439,
        previewUrl: `${APPLE}/AudioPreview221/v4/08/cb/e2/08cbe2b7-71c2-15fe-be2d-c9faf7466e0b/mzaf_18290329146510751130.plus.aac.p.m4a`,
        theme: { glow: '#8a8172', accent: '#b39a63', energy: 0.42 } },
      { no: 2, title: 'Castillos de España, Vol. 1: No. 2, Torija', duration: '2:13', durationMs: 133136,
        previewUrl: `${APPLE}/AudioPreview211/v4/f8/9c/fe/f89cfeff-3dd2-5559-86f6-cc0f06cdc145/mzaf_17769706013069457437.plus.aac.p.m4a`,
        theme: { glow: '#7f7360', accent: '#a98f57', energy: 0.38 } },
      { no: 3, title: 'Castillos de España, Vol. 1: No. 3, Manzanares el Real', duration: '1:29', durationMs: 89166,
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
    id: 'boccherini-quintetos',
    title: 'Boccherini: Quintetos con guitarra',
    year: 2018,
    cover: '/images/albums/boccherini-cover.jpg',
    notes: {
      es: 'Tres quintetos para guitarra y cuerda de Luigi Boccherini grabados con el Shostakóvich Ensemble, coronados por el célebre fandango del Quinteto en Re mayor.',
      en: 'Three Boccherini quintets for guitar and strings recorded with the Shostakovich Ensemble, crowned by the famous Fandango of the D major Quintet.',
    },
    spotifyUri: 'spotify:album:6LCxV2GxJnqPNTaia2Jlw5',
    palette: { glow: '#a4543a', accent: '#c9764a', depth: '#140e0b', energy: 0.55 },
    tracklist: [
      { no: 1, title: 'Quintet in C Major, G. 453: I. Allegro maestoso assai', duration: '11:24', durationMs: 684640,
        previewUrl: 'https://p.scdn.co/mp3-preview/f4b3fc549240c338697647e572c6a036d780bfa2' },
      { no: 2, title: 'Quintet in C Major, G. 453: II. Andantino', duration: '3:42', durationMs: 222354,
        previewUrl: 'https://p.scdn.co/mp3-preview/e8e9b540253d32e03bc650686967edf03106060a' },
      { no: 3, title: 'Quintet in C Major, G. 453: III. Allegretto', duration: '6:35', durationMs: 395824,
        previewUrl: 'https://p.scdn.co/mp3-preview/c0666bd4bf21d13756436e96b37dd2aaec7427b9' },
      { no: 4, title: 'Quintet in C Major, G. 453: IV. Ritirata "Retraite de Madrid" avec variations', duration: '6:23', durationMs: 383779,
        previewUrl: 'https://p.scdn.co/mp3-preview/733f0a8ddb1ea9493bfc97f49bb2f146b9f32bc9' },
      { no: 5, title: 'Quintet in E Minor, G. 451: I. Allegro commodo', duration: '5:25', durationMs: 325535,
        previewUrl: 'https://p.scdn.co/mp3-preview/c9fd0b36261102a4f16d3cb67d4278adf49d9766' },
      { no: 6, title: 'Quintet in E Minor, G. 451: II. Adagio', duration: '3:16', durationMs: 196226,
        previewUrl: 'https://p.scdn.co/mp3-preview/57856f0b62856c559fb8354ac6fc588615865689' },
      { no: 7, title: 'Quintet in E Minor, G. 451: III. Minuetto con moto (Trio)', duration: '3:56', durationMs: 236001,
        previewUrl: 'https://p.scdn.co/mp3-preview/88fd5f3be23a9fd131c0d6730359b89f76ba059c' },
      { no: 8, title: 'Quintet in E Minor, G. 451: IV. Allegretto', duration: '4:49', durationMs: 289127,
        previewUrl: 'https://p.scdn.co/mp3-preview/0ed8fb9b1cd3556351d37768f53ec84d6f3de1ff' },
      { no: 9, title: 'Quintet in D Major, G. 448: I. Pastorale', duration: '3:57', durationMs: 237453,
        previewUrl: 'https://p.scdn.co/mp3-preview/03118432607660e03e41faf92a5e96cd234fc0be',
        theme: { glow: '#6f7a4f', accent: '#9caf5e', energy: 0.35 } },
      { no: 10, title: 'Quintet in D Major, G. 448: II. Allegro maestoso', duration: '4:08', durationMs: 248035,
        previewUrl: 'https://p.scdn.co/mp3-preview/a4f6bb200c44173b7229377febf9b37782108173' },
      { no: 11, title: 'Quintet in D Major, G. 448: III & IV. Grave assai - Fandango', duration: '6:14', durationMs: 374282,
        previewUrl: 'https://p.scdn.co/mp3-preview/8f3723e65bf051ae753e04b1f94a026bcc8de257',
        theme: { glow: '#c25a33', accent: '#e07840', energy: 0.9 } },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/6LCxV2GxJnqPNTaia2Jlw5',
      youtube: 'https://www.youtube.com/watch?v=xhjM8uHTi74',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/6LCxV2GxJnqPNTaia2Jlw5',
      youtube: 'https://www.youtube-nocookie.com/embed/xhjM8uHTi74',
    },
  },
  {
    id: 'guitarra',
    title: 'Guitarra',
    year: 2018,
    cover: '/images/albums/guitarra-cover.jpg',
    notes: {
      es: 'Álbum digital de repertorio para guitarra que abre la estantería histórica de Eulogio Albalat en plataformas.',
      en: 'A digital guitar-repertoire album that opens the historical shelf for Eulogio Albalat on streaming platforms.',
    },
    spotifyUri: 'spotify:album:5vUZx32NxcgkM0F5aU8be7',
    palette: { glow: '#e6c534', accent: '#f2d43a', depth: '#0a0a0a', energy: 0.5 },
    tracklist: [
      { no: 1, title: 'Galilei: Ricercare: Intavolatura di liuto', duration: '0:51' },
      { no: 2, title: 'Weiss: Sonata No. 2: Prelude Sarabande Courante', duration: '1:44' },
      { no: 3, title: 'Weiss: Lute Suite No. 16: I. Sarabande', duration: '1:51' },
      { no: 4, title: 'Mompou: Suite Compostelana: I. Preludio', duration: '2:48' },
      { no: 5, title: 'Mompou: Suite Compostelana: Canción', duration: '3:08' },
      { no: 6, title: 'Mompou: Suite Compostelana: Muñeira', duration: '2:42',
        theme: { glow: '#7fa14a', accent: '#b7c85a', energy: 0.8 } },
    ],
    links: {
      spotify: 'https://open.spotify.com/album/5vUZx32NxcgkM0F5aU8be7',
      appleMusic: 'https://music.apple.com/us/artist/eulogio-albalat/1849308945',
      youtube: 'https://www.youtube.com/watch?v=CDERynrKA2s',
    },
    embeds: {
      spotify: 'https://open.spotify.com/embed/album/5vUZx32NxcgkM0F5aU8be7',
      youtube: 'https://www.youtube-nocookie.com/embed/CDERynrKA2s',
    },
  },
  {
    id: 'concerto-solistas-galegos',
    title: 'Concerto dos Solistas Galegos',
    year: 2023,
    cover: '/images/albums/concerto-solistas-galegos.jpg',
    notes: {
      es: 'Concierto para guitarra y orquesta de Enrique Rodríguez Iglesias, grabado con la Orquesta do Conservatorio de Melide bajo la dirección de Fernando Vázquez Arias.',
      en: 'Concerto for guitar and orchestra by Enrique Rodríguez Iglesias, recorded with the Melide Conservatory Orchestra conducted by Fernando Vázquez Arias.',
    },
    palette: { glow: '#2e6b5e', accent: '#4fa08c', depth: '#0b1210', energy: 0.4 },
    tracklist: [],
    links: {
      youtube: 'https://www.youtube.com/watch?v=FIBfIYJ-g74',
    },
    embeds: {
      youtube: 'https://www.youtube-nocookie.com/embed/FIBfIYJ-g74',
    },
  },
] satisfies Album[];

export const featuredAlbum = (discography.find((album) => album.featured) ?? discography[0]) as Album;
