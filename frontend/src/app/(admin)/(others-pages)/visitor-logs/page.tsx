import type { Metadata } from "next"
import VisitorLogsClient from "./VisitorLogsClient"

export const metadata: Metadata = {
  title: "Visitor Logs | Visitor Management System",
  description: "View and manage all visitor records",
}

export default function VisitorLogsPage() {
  return <VisitorLogsClient />
}
