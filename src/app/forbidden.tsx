import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Forbidden() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Accès refusé</EmptyTitle>
          <EmptyDescription>
            Votre compte n'a pas les droits nécessaires pour cette action.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
