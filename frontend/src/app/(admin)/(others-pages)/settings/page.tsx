import type { Metadata } from "next"
import SettingsClient from "./SettingsClient"

export const metadata: Metadata = {
  title: "Settings | Visitor Management System",
  description: "Configure system settings",
}

export default function SettingsPage() {
  return <SettingsClient />
}