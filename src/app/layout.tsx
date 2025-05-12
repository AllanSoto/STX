
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { LanguageProvider } from '@/providers/language-provider';
// Removed LanguageContext and useContext imports as AppContent is removed.

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SimulTradex', // Default title
  description: 'Simulate crypto trading and analyze trends.', // Default description
};

// AppContent component has been removed for this diagnostic step.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The lang attribute here is 'en'.
  // The LanguageProvider's useEffect will update `document.documentElement.lang`
  // client-side after hydration.
  return (
    <html lang="en" className="dark"> {/* Keep lang="en" hardcoded here */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <Toaster /> {/* Toaster placed directly */}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
