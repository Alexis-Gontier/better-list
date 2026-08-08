import { redirect } from "next/navigation";

import { routes } from "@/config/routes";

/**
 * En OAuth seul, s'inscrire et se connecter sont le même geste : GitHub crée le compte s'il
 * n'existe pas. La route existe pour que `/signup` ne soit pas une 404, et elle renvoie sur
 * `/login`.
 */
export default function SignupPage() {
  redirect(routes.auth.login);
}
