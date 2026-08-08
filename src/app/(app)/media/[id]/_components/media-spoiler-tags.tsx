"use client";

import { ChevronDownIcon, EyeOffIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { MediaTag } from "@/features/media/schemas/media.schema";

/**
 * Les tags que le visiteur n'a pas demandé à voir.
 *
 * Repliés, et **pas seulement masqués visuellement** : un `hidden` en CSS laisserait le texte dans
 * le DOM, donc lisible par un lecteur d'écran, par la recherche du navigateur et par un aperçu de
 * lien. Ici, le contenu n'est monté qu'au dépliage.
 */
export function MediaSpoilerTags({ tags }: { tags: MediaTag[] }) {
  return (
    <Collapsible className="pt-1">
      <CollapsibleTrigger asChild>
        <Button
          className="group text-muted-foreground"
          size="sm"
          variant="ghost"
        >
          <EyeOffIcon aria-hidden="true" />
          {tags.length} tags révélant l'intrigue
          <ChevronDownIcon
            aria-hidden="true"
            className="transition-transform group-data-[state=open]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-2">
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li key={tag.id}>
              <Badge className="gap-1.5 font-normal" variant="outline">
                {tag.name}
                {tag.rank ? (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {tag.rank} %
                  </span>
                ) : null}
              </Badge>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
