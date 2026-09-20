import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { cookies } from "next/headers";
import { getTheme, themeCss, THEME_COOKIE } from "@/lib/themes";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins", display: "swap" });

export const metadata: Metadata = {
  title: "Calico Cove — Pasabuy Inventory",
  description: "Inventory, customers and sales for your Japan pasabuy business.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = getTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-mode={theme.dark ? "dark" : "light"} className={`${inter.variable} ${poppins.variable}`}>
      <head>
        <style id="theme-vars" dangerouslySetInnerHTML={{ __html: themeCss(theme) }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
