
import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
