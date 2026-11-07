export interface StatItem {
  number: string;
  label: string;
}

export interface SlideItem {
  id: string;
  index: string;
  headline: string[];
  cardTitle: string;
  cardDescription: string;
  cardButtonText: string;
  imageUrl: string;
  imageAlt: string;
  stats: StatItem[];
  videoUrl?: string;
}

export interface NavLink {
  label: string;
  href: string;
  active?: boolean;
}

export interface SocialLink {
  platform: 'instagram' | 'x' | 'facebook';
  href: string;
  ariaLabel: string;
}

export const content = {
  brand: {
    name: 'Experience Japan',
    logoAlt: 'Four-petal emblem',
  },
  navLinks: [
    { label: 'Home', href: '#', active: true },
    { label: 'About', href: '#about' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Features', href: '#features' },
  ] as NavLink[],
  socialLinks: [
    { platform: 'instagram', href: 'https://instagram.com', ariaLabel: 'Instagram' },
    { platform: 'x', href: 'https://x.com', ariaLabel: 'X (formerly Twitter)' },
    { platform: 'facebook', href: 'https://facebook.com', ariaLabel: 'Facebook' },
  ] as SocialLink[],
  exploreCta: {
    label: 'Explore Now',
    href: '#explore',
  },
  watchMovie: {
    label: 'WATCH MOVIE',
    videoUrl: 'https://www.youtube.com/embed/g0H3g0p9bQY?autoplay=1&mute=0', // Cinematic Japan 4K
  },
  slides: [
    {
      id: 'shrine-dusk',
      index: '01',
      headline: ['EXPERIENCES', 'THAT GO BEYOND', 'DESTINATIONS'],
      cardTitle: 'EXPERIENCE JAPAN',
      cardDescription:
        "Explore Japan's culture, landscapes, and design-led cities for journeys that feel immersive, meaningful, and unforgettable.",
      cardButtonText: 'Explore Japan',
      // Real atmospheric Japanese shrine courtyard at dusk with overcast sky and lone person walking
      imageUrl:
        'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=85&w=2400&auto=format&fit=crop',
      imageAlt:
        'Japanese shrine courtyard at dusk under a dramatic dark overcast sky with a lone person walking',
      stats: [
        { number: '6,800+', label: 'Islands' },
        { number: '2,000+', label: 'Years of History' },
        { number: '2,000+', label: 'Temples & Shrines' },
      ],
      videoUrl: 'https://www.youtube.com/embed/g0H3g0p9bQY?autoplay=1',
    },
    {
      id: 'kyoto-temple',
      index: '02',
      headline: ['TIMELESS BEAUTY', 'ROOTED IN SACRED', 'TRADITIONS'],
      cardTitle: 'KYOTO SANCTUARIES',
      cardDescription:
        'Wander through tranquil zen rock gardens, moss-draped courtyards, and thousand-year-old cedar pavilions at twilight.',
      cardButtonText: 'Discover Kyoto',
      imageUrl:
        'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=85&w=2400&auto=format&fit=crop',
      imageAlt: 'Historic Kyoto temple grounds surrounded by autumn trees at twilight',
      stats: [
        { number: '1,600+', label: 'Buddhist Temples' },
        { number: '400+', label: 'Shinto Shrines' },
        { number: '17', label: 'UNESCO Sites' },
      ],
      videoUrl: 'https://www.youtube.com/embed/2b9txcAt4e0?autoplay=1',
    },
    {
      id: 'tokyo-twilight',
      index: '03',
      headline: ['FUTURE HORIZONS', 'WHERE CONTRAST', 'CREATES HARMONY'],
      cardTitle: 'TOKYO METROPOLIS',
      cardDescription:
        'Experience the quiet stillness of hidden neighbourhood alleyways framed by towering architectural marvels.',
      cardButtonText: 'Unveil Tokyo',
      imageUrl:
        'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=85&w=2400&auto=format&fit=crop',
      imageAlt: 'Tokyo pagoda and illuminated temple hall against the evening sky',
      stats: [
        { number: '23', label: 'Special Wards' },
        { number: '200+', label: 'Michelin Stars' },
        { number: '1st', label: 'Safest Megacity' },
      ],
      videoUrl: 'https://www.youtube.com/embed/g0H3g0p9bQY?autoplay=1',
    },
    {
      id: 'fuji-alpine',
      index: '04',
      headline: ['SACRED PEAKS', 'SERENE LAKES &', 'ETERNAL HORIZONS'],
      cardTitle: 'MOUNT FUJI & LAKES',
      cardDescription:
        'Stand in awe before the snow-capped silhouette reflected upon mirror calderas as morning mist lifts.',
      cardButtonText: 'Explore Nature',
      imageUrl:
        'https://images.unsplash.com/photo-1492571350019-22de08371fd3?q=85&w=2400&auto=format&fit=crop',
      imageAlt: 'Torii gate overlooking misty lake and sacred mountains at dawn',
      stats: [
        { number: '3,776m', label: 'Summit Elevation' },
        { number: '5', label: 'Fuji Lakes' },
        { number: '30+', label: 'National Parks' },
      ],
      videoUrl: 'https://www.youtube.com/embed/2b9txcAt4e0?autoplay=1',
    },
  ] as SlideItem[],
};

