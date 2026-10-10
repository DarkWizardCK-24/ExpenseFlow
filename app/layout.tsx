import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ExpenseFlow – Track spending, split bills, reach goals',
  description: 'Track income and expenses, split bills with friends and save towards goals, all in one place.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#059669',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased min-h-screen text-[#0b3b2e] select-text`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              className: 'rounded-2xl border border-emerald-100 shadow-xl',
              style: {
                background: '#ffffff',
                color: '#0b3b2e',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
