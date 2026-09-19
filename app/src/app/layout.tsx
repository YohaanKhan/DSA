import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { NavRail } from '@/components/shell/NavRail';
import { TopBar } from '@/components/shell/TopBar';
import shell from '@/components/shell/Shell.module.css';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Exceller Trainer',
  description: 'Practice every stage of the Capgemini Exceller 2026 assessment.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfaf7' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d10' },
  ],
};

/**
 * Applied before first paint so the theme never flashes. Inline by necessity —
 * any deferred script runs too late. Dark is the default (this is a late-night
 * app and the stage hues are tuned for it); an explicit choice is remembered.
 */
const THEME_SCRIPT = `
(function(){var t='dark';try{var s=localStorage.getItem('exceller.theme');
if(s==='light'||s==='dark'){t=s;}}catch(e){}
document.documentElement.setAttribute('data-theme',t);})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const examDate = process.env.NEXT_PUBLIC_EXAM_DATE ?? '2026-09-26';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable}`}>
        <a href="#main" className={`microlabel ${shell.skip}`}>Skip to content</a>
        <div className={shell.frame}>
          <NavRail />
          <div className={shell.column}>
            <TopBar examDate={examDate} />
            <main id="main" className={shell.main}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
