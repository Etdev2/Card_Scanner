import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "HoloScan — scan, price, and collect trading cards",
  description:
    "Scan Pokémon, Magic, Yu-Gi-Oh!, and sports trading cards, estimate value from the latest eBay sold comps, and keep a personal on-device collection.",
  applicationName: "HoloScan",
  appleWebApp: {
    capable: true,
    title: "HoloScan",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#071016",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
