import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { WorkflowEditor } from "./index";

export default async function WorkflowPage() {
  const session = await getAuthSession();

  if (!session || session.user?.role !== "admin") {
    redirect("/signin");
  }
  return <WorkflowEditor />;
}