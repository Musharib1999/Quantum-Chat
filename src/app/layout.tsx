import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quantum-Chat - Futuristic AI Assistant",
  description: "AI-powered Conversations for the Future",
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
