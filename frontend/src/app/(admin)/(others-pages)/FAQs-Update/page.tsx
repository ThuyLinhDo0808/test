import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import ManageFaqsContent from "./ManageFaqsContent";

export default async function ManageFaqsPage() {
  const session = await getAuthSession();
  if (!session || session.user?.role !== "admin") {
    redirect("/signin");
  }

  return <ManageFaqsContent />;
}