import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  return { title: t("title"), description: t("description") };
}

export const viewport: Viewport = { themeColor: "#ffffff" };

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh">
        <NextIntlClientProvider>
          <Header />
          <main id="main">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
