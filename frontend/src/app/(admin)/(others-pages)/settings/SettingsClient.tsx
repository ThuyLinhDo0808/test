"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { AlertCircle } from "lucide-react"
import WebhookConfigForm from "@/components/admin/webhook/add-integrations"
import LlmProviderConfig from "@/components/admin/webhook/llm-provider"
import { API_BASE_URL } from "@/lib/constants"

interface WebhookConfig {
  url: string
  key: string
}

export default function SettingsClient() {
  const { status } = useSession()
  const router = useRouter()

  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWebhookConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/webhook/config/`)
      if (!response.ok) {
        const errData = await response.json()
        setError(errData.detail || "Failed to fetch webhook configuration.")
        return
      }

      const data = await response.json()
      if (data.url && data.key) {
        setWebhookConfig({ url: data.url, key: data.key })
      } else {
        setWebhookConfig(null)
      }
    } catch (err) {
      console.error("Network error fetching webhook config:", err)
      setError("Network error: Could not connect to the server.")
    }
  }, [])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      setLoading(true)
      fetchWebhookConfig().finally(() => setLoading(false))
    }
  }, [status, fetchWebhookConfig])

  const handleConfigUpdate = useCallback(() => {
    fetchWebhookConfig()
  }, [fetchWebhookConfig])

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">Manage webhook and LLM provider configuration</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-800 dark:text-amber-200">{error}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <WebhookConfigForm webhookConfig={webhookConfig} />
        <LlmProviderConfig onConfigUpdate={handleConfigUpdate} />
      </div>
    </div>
  )
}
