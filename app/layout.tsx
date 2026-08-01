import type { Metadata } from "next";
import "./globals.css";
import { TokenProvider } from "@/components/TokenProvider";
import { TokenModal, GearButton } from "@/components/TokenModal";

export const metadata: Metadata = {
  title: "github-query-tool | Cartoon & Minimalist",
  description: "Look up GitHub users, view repository metrics, and compare developers side-by-side in a minimal cartoonish interface.",
  keywords: ["GitHub", "Developer", "Explorer", "Repositories", "Compare", "NextJS", "TypeScript"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='11' width='18' height='10' rx='2' fill='%23ffeb3b' /><circle cx='12' cy='5' r='2' fill='%23ffeb3b' /><path d='M12 7v4' /><circle cx='8' cy='16' r='1.5' fill='%23000000' /><circle cx='16' cy='16' r='1.5' fill='%23000000' /></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Fira+Code:wght@700&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <TokenProvider>
          <GearButton />
          <TokenModal />
          {children}
        </TokenProvider>
      </body>
    </html>
  );
}
