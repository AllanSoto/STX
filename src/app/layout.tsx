import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { LanguageProvider } from '@/providers/language-provider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SimulTradex',
  description: 'Simulate crypto trading and analyze trends.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The lang attribute is hardcoded to 'en' for the server render.
  // The LanguageProvider's useEffect will update `document.documentElement.lang` client-side.
  // `suppressHydrationWarning={true}` on the <html> tag tells React to ignore mismatches
  // for attributes on this specific tag, like 'lang' or 'class' if modified by extensions.
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        {/* Next.js will inject its necessary head elements here */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
