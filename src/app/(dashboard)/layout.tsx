import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/client";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionContext, isGlobalAdmin, isDriver } from "@/lib/auth/permissions";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const ctx = await getSessionContext();
  if (!ctx) {
    redirect("/login");
  }

  const isAdmin = await isGlobalAdmin(ctx.userId);

  // Check if user's active organization is still active
  if (ctx.organizationId) {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { isActive: true },
    });

    if (org && !org.isActive) {
      redirect("/login?error=tenant_deactivated");
    }
  }

  const userInfo = {
    name: session.user.name,
    email: session.user.email,
  };

  // Fetch org info for admin switcher
  let currentOrg: { id: string; name: string } | null = null;
  let organizations: { id: string; name: string; slug: string }[] = [];

  if (isAdmin) {
    const [activeOrg, allOrgs] = await Promise.all([
      ctx.organizationId
        ? prisma.organization.findUnique({
            where: { id: ctx.organizationId },
            select: { id: true, name: true },
          })
        : null,
      prisma.organization.findMany({
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      }),
    ]);
    currentOrg = activeOrg;
    organizations = allOrgs;
  }

  const showBottomNav = isDriver(ctx);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A]">
      <Sidebar
        user={userInfo}
        role={ctx.role}
        isAdmin={isAdmin}
        currentOrgName={currentOrg?.name}
      />
      <div className="flex flex-1 flex-col min-w-0">
        <Header
          user={userInfo}
          role={ctx.role}
          isAdmin={isAdmin}
          currentOrg={currentOrg}
          organizations={organizations}
        />
        <main
          id="main-content"
          role="main"
          className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto max-w-[1400px]">
            {children}
          </div>
        </main>
      </div>
      {showBottomNav && <BottomNav />}
    </div>
  );
}
