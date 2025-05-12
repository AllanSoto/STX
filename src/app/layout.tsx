
'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/providers/language-provider';
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


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        {/* Next.js will inject its necessary head elements here */}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
            {children}
            <DynamicToaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
