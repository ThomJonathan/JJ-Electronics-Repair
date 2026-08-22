import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "JJ-Electronics — Business Tracker",
  description: "Inventory, orders, and sales tracking for JJ-Electronics",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app">
          <NavBar />
          <main className="main">
            <div className="content-wrap">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
