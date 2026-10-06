import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function ComposePage() {
  await requireUser();
  // Redirect to main mail page - compose panel will be opened via URL state or local storage
  redirect("/mail");
}
