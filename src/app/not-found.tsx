import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Page introuvable</EmptyTitle>
          <EmptyDescription>
            Cette adresse ne mène nulle part. Elle a peut-être changé, ou la
            ressource a été supprimée.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/">Retour à l'accueil</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
