import { z } from "zod";

// Zod 4 sonde `new Function("")` pour compiler ses parseurs : sans `'unsafe-eval'` dans la CSP
// (D77), le navigateur signale cette sonde comme une violation même quand l'erreur est avalée.
// Côté client, le parseur interprété suffit.
z.config({ jitless: true });
