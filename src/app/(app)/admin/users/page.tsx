import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeading } from "@/components/shared/page-heading";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADMIN_TABS,
  type AdminTab,
  AdminTabs,
} from "@/features/admin/components/admin-tabs";
import { MembersTable } from "@/features/admin/components/members-table";
import { PendingTable } from "@/features/admin/components/pending-table";
import { getAdminOverview } from "@/features/admin/server/admin.queries";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Membres" };

function parseTab(value: unknown): AdminTab {
  return ADMIN_TABS.find((tab) => tab.value === value)?.value ?? "attente";
}

async function AdminBoard({
  searchParams,
}: {
  searchParams: PageProps<"/admin/users">["searchParams"];
}) {
  const [{ onglet }, overview, self] = await Promise.all([
    searchParams,
    getAdminOverview(),
    requireAdmin(),
  ]);
  const active = parseTab(onglet);
  const counts = {
    attente: overview.pending.length,
    membres: overview.members.length,
    bannis: overview.banned.length,
  };

  const empty =
    active === "attente"
      ? overview.pending.length === 0 && "Aucune demande en attente"
      : active === "bannis"
        ? overview.banned.length === 0 && "Aucun membre banni"
        : false;

  return (
    <div className="flex flex-col gap-6">
      <AdminTabs active={active} counts={counts} />
      {empty ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{empty}</EmptyTitle>
            <EmptyDescription>
              {active === "attente"
                ? "Une première connexion crée une demande ici."
                : "Un bannissement se lève d'ici, à tout moment."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : active === "attente" ? (
        <PendingTable requests={overview.pending} />
      ) : (
        <MembersTable
          members={active === "bannis" ? overview.banned : overview.members}
          mode={active === "bannis" ? "banned" : "members"}
          selfId={self.id}
        />
      )}
    </div>
  );
}

function AdminBoardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-80 rounded-lg" />
      <div className="flex flex-col gap-2">
        {["a", "b", "c", "d"].map((key) => (
          <Skeleton className="h-15 w-full" key={key} />
        ))}
      </div>
    </div>
  );
}

/** L'administration du cercle (spec refonte §1) : la garde du rôle est dans le layout du segment. */
export default function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  return (
    <div className="flex flex-col gap-8">
      <PageHeading
        description="Qui entre dans le cercle, et qui en sort. Réservé aux administrateurs."
        title="Membres"
      />
      <Suspense fallback={<AdminBoardSkeleton />}>
        <AdminBoard searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
