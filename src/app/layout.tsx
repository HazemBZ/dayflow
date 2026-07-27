import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Atkinson_Hyperlegible,
  Lora,
  Merriweather,
} from "next/font/google";
import { Sidebar } from "@/components/ui/sidebar";
import { PageTransition } from "@/components/ui/page-transition";
import { LiveClock } from "@/components/ui/live-clock";
import { ThemeProvider } from "@/lib/theme/theme-provider";
import { ScaleProvider } from "@/lib/scale-provider";
import { NotesPopover } from "@/components/ui/notes-popover";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const atkinsonHyperlegible = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Priorities — Planning System",
  description: "Daily → Weekly → Monthly → Quarterly planning system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${atkinsonHyperlegible.variable} ${lora.variable} ${merriweather.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider>
          <ScaleProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="fixed right-4 top-1 z-50">
              <LiveClock />
            </div>
            <NotesPopover />
            <main className="flex-1 h-full overflow-auto p-4 md:p-6 lg:p-8">
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
          </ScaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
