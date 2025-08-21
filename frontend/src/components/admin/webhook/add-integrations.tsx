"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import ComponentCard from "@/components/common/ComponentCard"
import Button from "@/components/ui/button/Button"
import InputField from "@/components/form/input/InputField"
import { API_BASE_URL } from "@/lib/constants"

interface WebhookConfig {
  url: string
  key: string
}

interface WebhookConfigFormProps {
  webhookConfig: WebhookConfig | null
}


export default function WebhookConfigForm({ webhookConfig }: WebhookConfigFormProps) {
  const [config, setConfig] = useState<WebhookConfig>({ url: "", key: "" }) // current input
  const [savedConfig, setSavedConfig] = useState<WebhookConfig>({ url: "", key: "" }) // placeholder source

  const [loading, setLoading] = useState(false)

  // Sync props to local state
  useEffect(() => {
    if (webhookConfig) {
      setConfig({ url: "", key: "" }) // clear current input
      setSavedConfig(webhookConfig)   // show saved values as placeholders
    }
  }, [webhookConfig])


  const handleSave = async () => {
    if (!config.url || !config.key) {
      alert("Please fill in both webhook URL and API key")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/admin/webhook/config/`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: config.url,
          key: config.key,
        }),
      })

      if (response.ok) {
        alert("Webhook configuration saved successfully!")

        const updated = await fetch(`${API_BASE_URL}/admin/webhook/config/`)
        if (updated.ok) {
          const data = await updated.json()
          setSavedConfig(data)   // update placeholder values
          setConfig({ url: "", key: "" }) // clear input field so placeholder appears
        }
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.detail}`)
      }
    } catch (error) {
      console.error("Error saving webhook config:", error);
      alert("Network error occurred")
    } finally {
      setLoading(false)
    }
  }



  return (
    <ComponentCard
      title="Webhook Configuration"
      className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50"
    >
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure your webhook endpoint to receive automatic notifications for all visitor and upload events
        </p>
      </div>
      <div className="p-6 space-y-6">
        {/* Instruction when nothing is configured */}
        {savedConfig.url.trim() === "" && savedConfig.key.trim() === "" && (
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-sm text-blue-800 dark:text-blue-200 p-4 rounded-lg">
            No webhook is currently configured. Please enter a <strong>Webhook URL</strong> and a <strong>Shared Key</strong> to enable automated notifications.
          </div>
        )}
        {/* Webhook URL input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Webhook URL <span className="text-red-500">*</span>
          </label>
          <InputField
            placeholder={savedConfig.url}
            value={config.url}
            onChange={(e) => setConfig({ ...config, url: e.target.value })}
            className="bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Must be a valid HTTPS URL that can receive POST requests
          </p>
        </div>
        {/* Shared Key input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shared Key <span className="text-red-500">*</span>
          </label>
          <InputField
            type="password"
            placeholder={savedConfig.key}
            value={config.key}
            onChange={(e) => setConfig({ ...config, key: e.target.value })}
            className="bg-white dark:bg-gray-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This will be sent as the &quot;x-make-apikey&quot; header with each request
          </p>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">Event Payload Structure</h4>
          <pre className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded mt-2 overflow-x-auto">
            {`{
  "id": "1233223",
  "name": "John Doe",
  "dob": "1990-01-01",
  "purpose": "Meeting"
  "access_code": "ABC123",
}`}
          </pre>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || !config.url || !config.key}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  )
}
