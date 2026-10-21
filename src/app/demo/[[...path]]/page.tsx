import { WorkspaceApp } from "@/components/workspace";
export const metadata = {
  title: "Fictional demo",
  robots: { index: false, follow: false },
};
export default function DemoPage() {
  return <WorkspaceApp />;
}
