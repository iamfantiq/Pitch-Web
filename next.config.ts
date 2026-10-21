import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Files read at runtime by API routes and admin pages: DB migrations and PDF fonts.
const runtimeFiles = ["./lib/db/migrations/**/*", "./lib/pdf/fonts/*"];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@react-pdf/renderer", "@electric-sql/pglite"],
  outputFileTracingIncludes: { "/api/**": runtimeFiles, "/admin/**": runtimeFiles },
};

export default withNextIntl(nextConfig);
