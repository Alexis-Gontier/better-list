import type { NextConfig } from "next";

// Valide les variables d'environnement au build : un secret manquant casse ici,
// pas en production sur une requête utilisateur.
import "./src/config/env";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Active la directive `"use cache"` (+ PPR par défaut). C'est le seul mécanisme de cache qui
  // s'applique à AniList : son endpoint GraphQL est en POST, or le Data Cache de `fetch` ne
  // mémorise que les GET.
  cacheComponents: true,

  images: {
    // Jaquettes, bannières et portraits viennent tous du CDN d'AniList. Sans cette autorisation
    // explicite, `next/image` refuse l'URL — Next n'optimise que des hôtes déclarés, pour qu'on ne
    // puisse pas transformer l'optimiseur en proxy d'images ouvert.
    remotePatterns: [
      { protocol: "https", hostname: "s4.anilist.co", pathname: "/file/**" },
      // Vignettes de bandes-annonces. AniList ne référence que ces deux plateformes dans
      // `trailer.site`, et les chemins sont bornés : ça reste une autorisation étroite.
      { protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" },
      {
        protocol: "https",
        hostname: "www.dailymotion.com",
        pathname: "/thumbnail/**",
      },
    ],
  },

  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
