import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function Unauthorized() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Session expirée</EmptyTitle>
          <EmptyDescription>
            Votre session n'est plus valide. Se reconnecter rétablit l'accès.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
