import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function MailThreadPage({ params }: { params: { id: string } }) {
  await requireUser();
  // Redirect to main mail page - thread selection will be handled via URL state
  redirect("/mail");
}
