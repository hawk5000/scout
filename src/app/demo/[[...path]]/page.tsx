import { PublicDemoApp } from "@/components/public-demo";

export const metadata = {
  title: "Fictional SCOUT market demo",
  description:
    "Explore fictional hotel-market findings and a sample SCOUT Briefing.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <PublicDemoApp />;
}
