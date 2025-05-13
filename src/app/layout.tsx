
'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/providers/language-provider';
import { AuthProvider } from '@/providers/auth-provider'; // Import AuthProvider
import dynamic from 'next/dynamic'; 

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const DynamicToaster = dynamic(() => import('@/components/ui/toaster').then(mod => mod.Toaster), {
  ssr: false,
  loading: () => null, 
});

// Metadata is server-side, cannot use context here for dynamic titles/descriptions based on language.
// For dynamic metadata, you'd typically use the `generateMetadata` function in page components.
// Removed export const metadata as it's not allowed in 'use client' files. 
// Metadata should be defined in server components or using generateMetadata in page.tsx/layout.tsx server files if needed.


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The lang attribute on <html> is best set statically or via a server component
  // to avoid hydration mismatches. LanguageProvider handles client-side language state.
  // suppressHydrationWarning is added to <html> to mitigate issues if extensions modify attributes,
  // but the root cause of mismatches should ideally be addressed.
  // Keeping 'en' as default and letting client-side updates handle language changes
  // for attributes on this specific tag, like 'lang' or 'class' if modified by extensions.
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head> 
        {/* Next.js will inject its necessary head elements here */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <AuthProvider> {/* Wrap with AuthProvider */}
            {children}
            <DynamicToaster />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
