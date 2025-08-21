import type { Metadata } from "next"
import WebhookConfigClient from "./WebhookConfigClient"

export const metadata: Metadata = {
  title: "Webhook Configuration | Visitor Management System",
  description: "Configure notification webhooks for visitor events",
}

export default function WebhookConfigPage() {
  return <WebhookConfigClient />
}