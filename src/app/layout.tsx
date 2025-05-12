
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/providers/auth-provider';
import { LanguageProvider, LanguageContext } from '@/providers/language-provider';
import { useContext } from 'react'; 

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

// This component will wrap the main part of the app and conditionally render Toaster
// It uses client-side hooks (useContext) and will be treated as a Client Component by React.
function AppContent({ children }: { children: React.ReactNode }) {
  const langContext = useContext(LanguageContext);

  return (
    <>
      {children}
      {/* Conditionally render Toaster only after language state is hydrated on the client */}
      {langContext && langContext.hydrated ? <Toaster /> : null}
    </>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The `html lang="en"` is crucial. This is what the server will render,
  // and what the client will initially render.
  // The LanguageProvider's useEffect will update `document.documentElement.lang`
  // *after* this initial render and hydration, which is a separate DOM update.
  // React compares the initial client render against the server render.
  return (
    <html lang="en" className="dark"> {/* Keep lang="en" hardcoded here */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LanguageProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

