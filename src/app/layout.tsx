
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

// Metadata is server-side, cannot use context here for dynamic titles/descriptions based on language.
// For dynamic metadata, you'd typically use the `generateMetadata` function in page components.
export const metadata: Metadata = {
  title: 'SimulTradex', // Default title
  description: 'Simulate crypto trading and analyze trends.', // Default description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The lang attribute here is 'en'.
  // The LanguageProvider's useEffect will update `document.documentElement.lang`
  // client-side after hydration.
  // Server-side rendering of lang attribute depends on initial state, which is 'en'.
  // Client-side hydration will match this initial server render.
  // Subsequent language changes are handled client-side by LanguageProvider.
  return (
    <html lang="en" className="dark" suppressHydrationWarning> {/* Keep lang="en" hardcoded here and add suppressHydrationWarning */}
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

