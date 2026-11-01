import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "D11 | Every ball matters — MatchMemo AI",
  description: "Cricket-first live scoring, 40-over thriller simulator, and MatchMemo AI catch-up.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}



const themeScript = `
  (function() {
    try {
      const savedTheme = localStorage.getItem('d11-theme');
      const preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const nextTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (preferredDark ? 'dark' : 'light');
      const root = document.documentElement;
      root.setAttribute('data-theme', nextTheme);
      root.style.colorScheme = nextTheme;
      root.style.backgroundColor = nextTheme === 'dark' ? '#191B20' : '#F4F5F7';
    } catch (error) {
      const root = document.documentElement;
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      root.style.backgroundColor = '#191B20';
    }
  })();
`;

