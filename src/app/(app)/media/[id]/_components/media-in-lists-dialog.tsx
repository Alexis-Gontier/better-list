"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * « Tout voir » (maquette F). Les mini-cartes arrivent rendues par le serveur en `children` :
 * aucune lecture côté client, la fenêtre ne fait que les montrer.
 */
export function MediaInListsDialog({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="text-muted-foreground" size="xs" variant="ghost">
          Tout voir
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-baseline gap-2">
            Dans les listes
            <span className="font-normal text-muted-foreground text-sm">
              {count}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
