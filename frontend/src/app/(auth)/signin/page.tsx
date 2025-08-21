import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";
import { getAuthSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Next.js SignIn Page | TailAdmin - Next.js Dashboard Template",
  description: "This is Next.js Signin Page TailAdmin Dashboard Template",
};

export default async function SignIn() {
  const session = await getAuthSession(); // for app directory

  if (session && session.user?.role === "admin") {
    redirect("/dashboard"); // Redirect to dashboard if already signed in
  }
  return <SignInForm />;
}