import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { NavHeader } from '@/components/layout/nav-header';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getSession } from '@/lib/auth/session';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'AIDEN // Listen',
  description: 'Cultural intelligence platform',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <TooltipProvider>
            <NavHeader email={session?.email ?? null} />
            <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
