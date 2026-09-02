import type { Metadata, Viewport } from "next";
import TopNav from "@/components/TopNav";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ThemeProvider, themeBootScript } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "netbot — by netsol",
  description:
    "Your knowledge, on speaking terms. Grounded RAG answers with face unlock and two-way voice.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafbfc" },
    { media: "(prefers-color-scheme: dark)", color: "#06090f" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <TopNav />
              {children}
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
