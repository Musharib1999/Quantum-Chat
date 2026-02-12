import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";

export const metadata: Metadata = {
  title: "Quantum Guru Chat",
  description: "Turning Quantum Complexity into Clear Intelligence",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased select-none">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
