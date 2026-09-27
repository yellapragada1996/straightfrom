import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Caveat, Geist, Instrument_Serif } from "next/font/google";
import { CartProvider } from "@/lib/cart";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-instrument-serif", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });
const caveat = Caveat({ variable: "--font-caveat", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "StraightFrom", template: "%s · StraightFrom" },
  description: "Own something that was really theirs. Personal items, straight from the creators you watch.",
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${bricolage.variable} ${instrumentSerif.variable} ${caveat.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
