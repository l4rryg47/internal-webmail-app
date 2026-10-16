import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Webmail 4.7",
  description: "Internal enterprise webmail app",
  icons: {
    icon: "/webmail-logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
