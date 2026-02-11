import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeContext";

export const metadata: Metadata = {
  title: "Quantum Guru Chat",
  description: "Turning Quantum Complexity into Clear Intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased select-none">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
