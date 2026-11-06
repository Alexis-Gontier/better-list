import { UsersIcon } from "lucide-react";
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

/** Personne n'a encore ouvert de liste aux membres (maquette G). */
export function CommunityEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersIcon />
        </EmptyMedia>
        <EmptyTitle>Aucune liste partagée</EmptyTitle>
        <EmptyDescription>
          Quand un autre membre ouvrira une liste aux membres, elle apparaîtra
          ici.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href={routes.lists.root}>Voir mes listes</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
