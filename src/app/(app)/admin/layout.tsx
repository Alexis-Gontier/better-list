import { requireAdmin } from "@/lib/auth/session";

/** Dépend du rôle du visiteur : rien à prérendre. */
export const instant = false;

/** Seconde garde, par-dessus celle de `(app)` : le rôle. Une fois, ici (spec refonte §1). */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
