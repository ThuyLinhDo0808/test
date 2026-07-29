"use client"

import { useEffect, useState } from "react"
<<<<<<< HEAD
import { Save, Globe, Key, CheckCircle, AlertCircle, Info } from "lucide-react"
=======
import { Save } from "lucide-react"
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
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

<<<<<<< HEAD
export default function WebhookConfigForm({ webhookConfig }: WebhookConfigFormProps) {
  const [config, setConfig] = useState<WebhookConfig>({ url: "", key: "" })
  const [savedConfig, setSavedConfig] = useState<WebhookConfig>({ url: "", key: "" })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (webhookConfig) {
      setConfig({ url: "", key: "" })
      setSavedConfig(webhookConfig)
    }
  }, [webhookConfig])

=======

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


>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
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
<<<<<<< HEAD
          setSavedConfig(data)
          setConfig({ url: "", key: "" })
=======
          setSavedConfig(data)   // update placeholder values
          setConfig({ url: "", key: "" }) // clear input field so placeholder appears
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
        }
      } else {
        const error = await response.json()
        alert(`Failed to save: ${error.detail}`)
      }
    } catch (error) {
<<<<<<< HEAD
      console.error("Error saving webhook config:", error)
=======
      console.error("Error saving webhook config:", error);
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
      alert("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

<<<<<<< HEAD
  const isConfigured = savedConfig.url.trim() !== "" && savedConfig.key.trim() !== ""

  return (
    <div className="max-w-4xl mx-auto">
      <ComponentCard
        title="Webhook Integration"
        className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
        desc="Configure webhook endpoints to receive real-time notifications for visitor events and system activities"
      >
        <div className="space-y-8">
          {/* Status Banner */}
          <div
            className={`rounded-xl border p-6 ${
              isConfigured
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
            }`}
          >
            <div className="flex items-start gap-4">
              {isConfigured ? (
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5" />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    isConfigured ? "text-emerald-900 dark:text-emerald-100" : "text-amber-900 dark:text-amber-100"
                  }`}
                >
                  {isConfigured ? "Webhook Active" : "Webhook Not Configured"}
                </h3>
                <p
                  className={`text-sm mt-1 ${
                    isConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                  }`}
                >
                  {isConfigured
                    ? "Your webhook is configured and ready to receive notifications"
                    : "Configure your webhook endpoint to enable automated notifications for visitor events"}
                </p>
                {isConfigured && (
                  <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-1">
                      Current Endpoint
                    </div>
                    <div className="text-sm font-mono text-emerald-700 dark:text-emerald-300 break-all">
                      {savedConfig.url}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Webhook URL */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Webhook URL</label>
                <span className="text-red-500 text-sm">*</span>
              </div>
              <InputField
                placeholder={savedConfig.url || "https://your-app.com/api/webhook"}
                value={config.url}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20"
              />
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                <div>
                  Must be a valid HTTPS URL that can receive POST requests. This endpoint will receive all visitor and
                  system event notifications.
                </div>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <label className="text-sm font-semibold text-gray-900 dark:text-gray-100">Authentication Key</label>
                <span className="text-red-500 text-sm">*</span>
              </div>
              <InputField
                type="password"
                placeholder={savedConfig.key ? "••••••••••••••••" : "Enter your shared secret key"}
                value={config.key}
                onChange={(e) => setConfig({ ...config, key: e.target.value })}
                className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20"
              />
              <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                <div>
                  This key will be sent as the{" "}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">x-make-apikey</code> header
                  with each webhook request for authentication.
                </div>
              </div>
            </div>
          </div>

          {/* Event Payload Documentation */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-800/50">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Event Payload Structure
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your webhook endpoint will receive POST requests with the following JSON payload structure:
            </p>
            <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-gray-100 font-mono">
                {`{
  "id": "1233223",
  "name": "John Doe", 
  "dob": "1990-01-01",
  "purpose": "Meeting",
  "access_code": "ABC123"
}`}
              </pre>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="text-xs">
                <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">Headers Included:</div>
                <ul className="text-gray-600 dark:text-gray-400 space-y-1">
                  <li>
                    • <code>Content-Type: application/json</code>
                  </li>
                  <li>
                    • <code>x-make-apikey: [your-key]</code>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Changes will take effect immediately after saving
            </div>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={loading || !config.url || !config.key}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {loading ? "Saving Configuration..." : "Save Webhook Settings"}
            </Button>
          </div>
        </div>
      </ComponentCard>
    </div>
=======


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
>>>>>>> a3e73f24fdecda8ff20136cc16c840bbb297c079
  )
}
