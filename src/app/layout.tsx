
'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
// import { Toaster } from '@/components/ui/toaster'; // Original import
import { AuthProvider } from '@/providers/auth-provider';
import { LanguageProvider } from '@/providers/language-provider';
import dynamic from 'next/dynamic'; // Added for dynamic import

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Dynamically import Toaster with SSR disabled
const DynamicToaster = dynamic(() => import('@/components/ui/toaster').then(mod => mod.Toaster), {
  ssr: false,
  loading: () => null, // Render nothing while loading, consistent with client-only approach
});

// Metadata should be defined in page.tsx files or a server component layout.
// Removed export const metadata: Metadata = { ... }; due to 'use client' directive.

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
            <DynamicToaster /> {/* Use dynamically imported Toaster */}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

