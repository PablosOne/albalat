import { siteConfig } from '@/config/site';

export const prerender = true;

export function GET(): Response {
  const body = [
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${siteConfig.origin}/sitemap-index.xml`,
    '',
  ].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
