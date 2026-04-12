import type { MetadataRoute } from 'next';

const BASE_URL = 'https://servixos.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: `${BASE_URL}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/forgot-password`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];
}
