import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/invoices', '/files', '/contracts', '/messages', '/contacts'],
      },
    ],
    sitemap: 'https://servixos.com/sitemap.xml',
    host: 'https://servixos.com',
  };
}
