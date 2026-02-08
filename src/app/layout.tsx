import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gramin Sahayak - Rural Grievance Reporting",
  description: "Voice-first grievance reporting for rural India",
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
