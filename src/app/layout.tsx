import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/shared/ThemeProvider';
import { HydrationGate } from '@/components/shared/HydrationGate';
import { LanguageProvider } from '@/components/shared/LanguageContext';

const siteUrl = 'https://mershhah.com';
const logoUrl = 'https://i.ibb.co/7x0KgVyv/image.png';

export const viewport = { width: 'device-width', initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: '%s | مرشح',
    default: 'مرشح | الواجهة الرقمية الموحدة للمطاعم'
  },
  description: 'مرشح هو مركز نمو سحابي يوفر فريق عمل رقمي متكامل لمطعمك أو مقهاك. تحليلات، مساعد ذكي، تسويق وأكثر.',
  icons: {
    icon: [
      { url: logoUrl },
      { url: logoUrl, sizes: '32x32', type: 'image/png' },
      { url: logoUrl, sizes: '16x16', type: 'image/png' },
    ],
    shortcut: logoUrl,
    apple: [
      { url: logoUrl, sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'apple-touch-icon-precomposed',
        url: logoUrl,
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@100;200;300;400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href={logoUrl} />
      </head>
      <body className="antialiased bg-background text-foreground" suppressHydrationWarning>
        <div id="app-root" suppressHydrationWarning>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <LanguageProvider>
              <HydrationGate>
                {children}
                <Toaster />
              </HydrationGate>
            </LanguageProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
