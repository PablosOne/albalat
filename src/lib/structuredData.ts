import { siteConfig, type CorePageId, type SiteLocale, localizedPagePath } from '@/config/site';
import { discography } from '@/data/discography';
import { videos } from '@/data/videos';

type JsonLdNode = Record<string, unknown>;

const absolute = (path: string, site: URL) => new URL(path, site).toString();

export function buildStructuredData(pageId: CorePageId, locale: SiteLocale, site: URL): JsonLdNode {
  const page = siteConfig.pages[pageId];
  const pageURL = absolute(localizedPagePath(pageId, locale), site);
  const homeURL = absolute(localizedPagePath('home', locale), site);
  const personId = `${homeURL}#person`;
  const artistId = `${homeURL}#artist`;
  const sameAs = siteConfig.socials.map(({ href }) => href);
  const breadcrumb = pageId === 'home' ? [] : [{
    '@type': 'BreadcrumbList',
    '@id': `${pageURL}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteConfig.pages.home.label[locale], item: homeURL },
      { '@type': 'ListItem', position: 2, name: page.label[locale], item: pageURL },
    ],
  }];

  const person: JsonLdNode = {
    '@type': 'Person',
    '@id': personId,
    name: siteConfig.identity.name,
    jobTitle: siteConfig.identity.role[locale],
    url: homeURL,
    image: absolute(siteConfig.assets.portrait, site),
    email: siteConfig.identity.email,
    sameAs,
  };
  const artist: JsonLdNode = {
    '@type': 'MusicGroup',
    '@id': artistId,
    name: siteConfig.identity.name,
    url: homeURL,
    image: absolute(siteConfig.assets.portrait, site),
    member: { '@id': personId },
    sameAs,
  };

  let specific: JsonLdNode[] = [];
  if (pageId === 'music') {
    specific = [
      {
        '@type': 'WebPage', '@id': `${pageURL}#webpage`, url: pageURL,
        name: page.title[locale], description: page.description[locale], inLanguage: locale,
        about: { '@id': artistId }, breadcrumb: { '@id': `${pageURL}#breadcrumb` },
      },
      ...discography.map((album) => ({
        '@type': 'MusicAlbum', '@id': `${pageURL}#album-${album.id}`, name: album.title,
        byArtist: { '@id': artistId }, datePublished: String(album.year),
        image: absolute(album.cover, site), recordLabel: album.label,
        url: album.links.spotify ?? album.links.appleMusic ?? album.links.youtube ?? pageURL,
        track: album.tracklist.map((track) => ({
          '@type': 'MusicRecording', position: track.no, name: track.title,
          duration: track.duration, byArtist: { '@id': artistId },
          inAlbum: { '@id': `${pageURL}#album-${album.id}` },
        })),
      })),
    ];
  } else if (pageId === 'videos') {
    specific = videos.map((video) => ({
      '@type': 'VideoObject', '@id': `${pageURL}#${video.id}`,
      name: video.title[locale], description: video.description?.[locale] ?? video.title[locale],
      thumbnailUrl: [`https://i.ytimg.com/vi/${video.youtubeId}/maxresdefault.jpg`],
      embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}`,
      uploadDate: video.date, inLanguage: locale,
    }));
  } else if (pageId === 'classes') {
    specific = [
      {
        '@type': 'ContactPage', '@id': `${pageURL}#webpage`, url: pageURL,
        name: page.title[locale], description: page.description[locale], inLanguage: locale,
        breadcrumb: { '@id': `${pageURL}#breadcrumb` }, about: { '@id': personId },
      },
      {
        '@type': 'Course', '@id': `${pageURL}#masterclass`,
        name: locale === 'en' ? 'Classical guitar masterclasses' : 'Masterclass de guitarra clásica',
        provider: { '@id': personId }, inLanguage: locale,
      },
      {
        '@type': 'Service', '@id': `${pageURL}#concert-booking`,
        name: locale === 'en' ? 'Classical guitar concerts' : 'Conciertos de guitarra clásica',
        provider: { '@id': personId }, serviceType: 'Classical guitar performance', inLanguage: locale,
      },
    ];
  } else if (pageId === 'about') {
    specific = [{
      '@type': 'ProfilePage', '@id': `${pageURL}#webpage`, url: pageURL,
      name: page.title[locale], description: page.description[locale], inLanguage: locale,
      mainEntity: { '@id': personId }, breadcrumb: { '@id': `${pageURL}#breadcrumb` },
    }];
  }

  return { '@context': 'https://schema.org', '@graph': [person, artist, ...breadcrumb, ...specific] };
}
