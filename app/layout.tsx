import type { Metadata } from 'next';
import { preload } from 'react-dom';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/newsreader';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@ui-sdk/core/web.css';
import '@/vendor/pico/native.css';
import './globals.css';
import './travels/travel.css';
import FlowerGarden from '@/components/FlowerGarden';
import { Margins } from '@/components/Landscape';

export const metadata: Metadata = {
  metadataBase: new URL('https://akshat.dev'),
  title: { default: 'Akshat', template: '%s — Akshat' },
  description: 'I use this website as a dumping ground for some of my side projects.',
  openGraph: { type: 'website', siteName: 'akshat.dev' },
  twitter: { card: 'summary' },
  icons: { icon: '/favicon.svg' },
  ...(process.env.TRAVEL_PREVIEW === '1' ? { robots: { index: false, follow: false } } : {}),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  preload('/fonts/allo/AlloVariable.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  return <html lang="en" data-appearance="light">
    <body>
      <a className="skip-link" href="#main">Skip to content</a>
      <Margins />
      <FlowerGarden side="left" />
      <FlowerGarden side="right" />
      <div className="site-shell">
        <header className="site-header"><a className="site-brand" href="/" aria-label="Akshat home">akshat.dev</a></header>
        <main id="main" data-content>{children}</main>
        <footer className="site-footer"><a href="https://github.com/akshatagarwl/akshat.dev" target="_blank" rel="noopener noreferrer">source</a><a href="https://github.com/VedSoni-dev/seedbed" target="_blank" rel="noopener noreferrer">garden by seedbed</a></footer>
      </div>
    </body>
  </html>;
}
