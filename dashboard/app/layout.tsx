import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NebulaSEO SEO Dashboard",
  description: "AI-powered SEO analytics and insights for NebulaSEO",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signUpUrl=""
      afterSignOutUrl="/sign-in"
    >
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <div className="flex h-screen">
            {/* Sidebar - hidden on mobile */}
            <div className="hidden md:block">
              <Sidebar />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-auto pb-16 md:pb-0">
              {children}
            </main>

            {/* Mobile navigation */}
            <MobileNav />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
