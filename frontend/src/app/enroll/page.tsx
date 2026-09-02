import { redirect } from "next/navigation";

/** Legacy route — signup now lives at /signup. */
export default function EnrollRedirectPage() {
  redirect("/signup");
}
