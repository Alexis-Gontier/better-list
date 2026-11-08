import { getAccountExport } from "@/features/auth/server/account-export.queries";
import { getSession } from "@/lib/auth/session";

/**
 * Télécharger ses données (D75) : un fichier JSON, servi en pièce jointe.
 *
 * **Un route handler**, parce que c'est un téléchargement : un lien `<a download>` le déclenche
 * sans JavaScript, ce qu'une action (un POST) ne sait pas faire. Sa garde est la seule qu'il ait :
 * `api/` est hors du proxy et du layout `(app)`.
 */
export async function GET() {
  const session = await getSession();

  if (session?.user.status !== "APPROVED") {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAccountExport(session.user.id);
  const day = data.exportedAt.slice(0, 10);

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="better-list-${data.account.username}-${day}.json"`,
      // Des données personnelles : ni le navigateur ni un proxy ne les gardent.
      "Cache-Control": "no-store",
    },
  });
}
