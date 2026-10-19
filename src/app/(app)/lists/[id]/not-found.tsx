import { ListXIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { routes } from "@/config/routes";

/**
 * Une liste qui n'existe pas, ou qui n'est pas la mienne — `getList` confond les deux exprès.
 *
 * Elle vit sous le layout `(app)` et renvoie à « Mes listes » : on arrive ici depuis un lien de liste
 * périmé, et c'est là qu'on cherchait à aller, pas à l'accueil.
 */
export default function ListNotFound() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ListXIcon />
        </EmptyMedia>
        <EmptyTitle>Liste introuvable</EmptyTitle>
        <EmptyDescription>
          Elle a peut-être été supprimée, ou ce lien ne vous est pas destiné.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href={routes.lists.root}>Retour à mes listes</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
