import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getAuthSession();

  if (!session || session.user?.role !== "admin") {
    redirect("/signin");
  }

  return <DashboardClient />;
}