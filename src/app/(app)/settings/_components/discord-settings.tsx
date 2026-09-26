"use client";

import { useAction } from "next-safe-action/hooks";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DiscordWebhookStatus } from "@/features/notifications/schemas/discord.schema";
import {
  removeDiscordWebhook,
  saveDiscordWebhook,
  sendDiscordTest,
} from "@/features/notifications/server/discord.actions";

const FALLBACK_ERROR = "L'opération n'a pas abouti. Réessayez.";

/**
 * Brancher un salon Discord — **la seconde feuille interactive de l'écran**.
 *
 * Contrairement aux réglages d'affichage, il y a ici un bouton : une adresse se colle en entier
 * puis se valide, et l'enregistrement interroge Discord — rien d'optimiste à montrer pendant ce
 * temps. Le rendu suivant vient du serveur (`revalidatePath`), pas d'un état local.
 *
 * Une fois branché, **l'adresse ne revient jamais** : c'est le secret du webhook. On le reconnaît à
 * son nom ; pour en changer, on débranche et on recolle.
 */
export function DiscordSettings({ status }: { status: DiscordWebhookStatus }) {
  const [url, setUrl] = useState("");
  const inputId = useId();

  const save = useAction(saveDiscordWebhook, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        setUrl("");
        toast.success("Webhook branché.");
      } else if (data) toast.error(data.message);
    },
    onError: ({ error }) =>
      toast.error(
        error.validationErrors?.fieldErrors.url?.[0] ??
          error.serverError ??
          FALLBACK_ERROR,
      ),
  });

  const test = useAction(sendDiscordTest, {
    onSuccess: ({ data }) => {
      if (data?.ok) toast.success("Message envoyé dans le salon.");
      else if (data) toast.error(data.message);
    },
    onError: ({ error }) => toast.error(error.serverError ?? FALLBACK_ERROR),
  });

  const remove = useAction(removeDiscordWebhook, {
    onError: ({ error }) => toast.error(error.serverError ?? FALLBACK_ERROR),
  });

  if (status) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div className="flex flex-col gap-1">
          <p className="font-medium text-sm">{status.name}</p>
          <p className="text-muted-foreground text-sm">{status.hint}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            disabled={test.isPending}
            onClick={() => test.execute({})}
            size="sm"
            variant="outline"
          >
            Envoyer un test
          </Button>
          <Button
            disabled={remove.isPending}
            onClick={() => remove.execute({})}
            size="sm"
            variant="ghost"
          >
            Débrancher
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        save.execute({ url });
      }}
    >
      <Label className="font-medium text-sm" htmlFor={inputId}>
        Adresse du webhook
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          autoComplete="off"
          id={inputId}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://discord.com/api/webhooks/…"
          spellCheck={false}
          type="url"
          value={url}
        />
        <Button
          className="shrink-0"
          disabled={save.isPending || url.trim() === ""}
          type="submit"
        >
          Brancher
        </Button>
      </div>
      <p className="text-pretty text-muted-foreground text-sm">
        Dans Discord : paramètres du salon → Intégrations → Webhooks → Nouveau
        webhook → Copier l'URL.
      </p>
    </form>
  );
}
