import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import UploadContent from "./UploadContent";

export default async function UploadPage() {
  const session = await getAuthSession();

  if (!session || session.user?.role !== "admin") {
    redirect("/signin");
  }

  return <UploadContent />;
}