import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import FirebaseAnalyticsProvider from "@/components/FirebaseAnalyticsProvider";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");
  return (
    <FirebaseAnalyticsProvider
      admin={{
        id: session.id,
        email: session.email,
        name: session.name,
        role: session.role,
      }}
    >
      <AdminShell adminName={session.name}>{children}</AdminShell>
    </FirebaseAnalyticsProvider>
  );
}
