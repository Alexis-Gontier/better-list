"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Les notes personnelles ne s'enregistrent pas à la frappe.
 *
 * Chaque sauvegarde ajoute une ligne au journal (`EntryEvent` de type `NOTE`, append-only) : un
 * enregistrement automatique en produirait une par mot tapé, et le journal — qui porte la timeline
 * et le récap annuel — deviendrait illisible.
 */
export function EntryNotes({
  notes,
  onSave,
  disabled,
}: {
  notes: string | null;
  onSave: (notes: string | null) => void;
  disabled?: boolean;
}) {
  const fieldId = useId();
  const [draft, setDraft] = useState(notes ?? "");
  const dirty = draft !== (notes ?? "");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={fieldId}>Mes notes</Label>
      <Textarea
        className="min-h-20 resize-y"
        disabled={disabled}
        id={fieldId}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ce que j'en ai pensé…"
        value={draft}
      />
      {dirty ? (
        <Button
          disabled={disabled}
          onClick={() => onSave(draft.trim() || null)}
          size="sm"
          variant="secondary"
        >
          Enregistrer la note
        </Button>
      ) : null}
    </div>
  );
}
