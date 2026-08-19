import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoloScan — TCG & sports card values",
  description:
    "Scan Pokémon, Magic, Yu-Gi-Oh!, and sports trading cards, then estimate value from the latest eBay sold comps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
