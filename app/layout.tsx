import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: {
    default: "BuildSpark – Spark Construction Limited",
    template: "%s | BuildSpark",
  },
  description:
    "BuildSpark is the all-in-one construction site management platform for Spark Construction Limited. Manage projects, finances, inventory, and teams with ease.",
  keywords: [
    "construction management",
    "site manager",
    "inventory",
    "finance",
    "Uganda",
    "Spark Construction",
  ],
  authors: [{ name: "Spark Construction Limited" }],
  creator: "Spark Construction Limited",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BuildSpark",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: "BuildSpark",
    title: "BuildSpark – Spark Construction Limited",
    description: "All-in-one construction management platform",
  },
  twitter: { card: "summary", title: "BuildSpark", description: "Construction Management Platform" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f97316" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange={false}
            >
              {children}
              <Toaster
                position="top-right"
                richColors
                expand
                toastOptions={{
                  style: { borderRadius: "12px" },
                }}
              />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
