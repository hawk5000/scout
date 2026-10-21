import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SCOUT by SalesHospitality", template: "%s · SCOUT" },
  icons: {
    icon: [
      { url: "/brand/scout-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/scout-icon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [
      { url: "/brand/scout-icon-180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  description:
    "Your hotel’s market research assistant. Companies, projects and events, together in one market blueprint.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
