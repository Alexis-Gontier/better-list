import type { NextConfig } from "next";

// Valide les variables d'environnement au build : un secret manquant casse ici,
// pas en production sur une requête utilisateur.
import "./src/config/env";
import { routes } from "./src/config/routes";

/**
 * CSP statique, sans nonce (D77) : un nonce rend chaque page dynamique, ce que `cacheComponents`
 * (PPR) interdit. D'où `'unsafe-inline'` pour les scripts de flight de Next et les styles inline.
 * Chaque hôte correspond à un usage réel : jaquettes AniList, avatars des fournisseurs OAuth.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://s4.anilist.co https://avatars.githubusercontent.com https://cdn.discordapp.com https://lh3.googleusercontent.com",
  "font-src 'self'",
  // Le navigateur ne parle qu'à nos route handlers : AniList n'est appelé que côté serveur.
  "connect-src 'self'",
  // Les bandes-annonces sont lues mais pas encore intégrées : aucune iframe à autoriser.
  "frame-src 'none'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://github.com https://discord.com https://accounts.google.com",
].join("; ");

const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Report-Only d'abord : on relève les violations avant de bloquer quoi que ce soit.
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Active la directive `"use cache"` (+ PPR par défaut). C'est le seul mécanisme de cache qui
  // s'applique à AniList : son endpoint GraphQL est en POST, or le Data Cache de `fetch` ne
  // mémorise que les GET.
  cacheComponents: true,

  images: {
    // Pas d'optimiseur : sur Vercel Hobby, chaque couple (image, largeur) est une transformation
    // facturée, et le catalogue en épuise le quota — au-delà, `/_next/image` répond 402 et plus
    // aucune image ne s'affiche. Le CDN d'AniList sert déjà des tailles prêtes (`medium`, `large`,
    // `extraLarge`) : le navigateur les charge directement.
    unoptimized: true,
    // Jaquettes, bannières et portraits viennent tous du CDN d'AniList. Sans cette autorisation
    // explicite, `next/image` refuse l'URL — Next n'optimise que des hôtes déclarés, pour qu'on ne
    // puisse pas transformer l'optimiseur en proxy d'images ouvert. Sans effet tant que
    // `unoptimized` tient, mais prêt si l'optimiseur revient.
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

  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },

  /** En OAuth seul, s'inscrire et se connecter sont le même geste : `/signup` n'est plus qu'un ancien lien. */
  async redirects() {
    return [
      {
        source: routes.legacy.signup,
        destination: routes.auth.login,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
