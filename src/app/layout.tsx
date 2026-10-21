import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "SCOUT by SalesHospitality", template: "%s · SCOUT" },
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
