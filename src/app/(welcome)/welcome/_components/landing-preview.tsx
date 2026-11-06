import Image from "next/image";

/** Les captures de l'app, prises en 1440 × 900 en thème sombre (D63). */
const MAIN = {
  src: "/screenshots/accueil.jpg",
  alt: "L'accueil : une œuvre à la une, puis les séries en cours et leur épisode",
};

const DETAILS = [
  {
    src: "/screenshots/fiche.jpg",
    alt: "La fiche de Frieren",
    caption: "La fiche d'une œuvre, et votre suivi en un clic",
  },
  {
    src: "/screenshots/bibliotheque.jpg",
    alt: "Ma bibliothèque, triée par activité récente",
    caption: "Votre bibliothèque, par statut et par tri",
  },
  {
    src: "/screenshots/profil.jpg",
    alt: "Un profil : chiffres, favoris et calendrier d'activité",
    caption: "Votre profil, vos chiffres, votre année",
  },
] as const;

function Shot({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-border">
      <Image
        alt={alt}
        className="h-auto w-full"
        height={900}
        sizes="(min-width: 1152px) 1152px, 100vw"
        src={src}
        width={1440}
      />
    </div>
  );
}

/** « Un aperçu » : l'app telle qu'un membre la voit, une grande capture et trois détails. */
export function LandingPreview() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="font-heading font-semibold text-muted-foreground text-sm">
        Un aperçu, une fois entré
      </h2>
      <Shot {...MAIN} />
      <ul className="grid gap-4 sm:grid-cols-3">
        {DETAILS.map((detail) => (
          <li className="flex flex-col gap-2" key={detail.src}>
            <Shot alt={detail.alt} src={detail.src} />
            <span className="text-muted-foreground text-sm">
              {detail.caption}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
