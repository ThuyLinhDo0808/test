"use client"

import type React from "react"

import { useCallback, useEffect, useRef, useState } from "react"
import { Save, Bot, Server, ChevronDown, Search, Info, Zap, Shield, Clock } from "lucide-react"
import ComponentCard from "@/components/common/ComponentCard"
import InputField from "@/components/form/input/InputField"
import Button from "@/components/ui/button/Button"
import { API_BASE_URL } from "@/lib/constants"

interface ModelConfig {
  backend_provider: string
  model_name: string
  base_url?: string
  api_key?: string
}

interface LlmProviderConfigProps {
  onConfigUpdate?: () => void
}

interface ModelItem {
  value: string
  label: string
  desc: string
  recommended?: boolean
}

const CHATGPT_MODEL_CATEGORIES: Record<string, { title: string; models: ModelItem[] }> = {
  recommended: {
    title: "List of Models",
    models: [
      {
        value: "gpt-5",
        label: "GPT-5",
        desc: "Top-tier model — best for coding, reasoning, and agentic tasks",
      },
      {
        value: "gpt-5-mini",
        label: "GPT-5 Mini",
        desc: "Faster, cost-efficient GPT-5 for well-defined tasks",
      },
      {
        value: "gpt-5-nano",
        label: "GPT-5 Nano",
        desc: "Ultra-fast, lowest-cost GPT-5 variant for light on-device ops",
        recommended: true,
      },
      {
        value: "gpt-4o",
        label: "GPT-4o",
        desc: "Fast, flexible model — great for interactive UIs and multimodal workflows",
      },
      {
        value: "gpt-4o-mini",
        label: "GPT-4o Mini",
        desc: "Low-latency, affordable GPT-4o variant for realtime interactions",
      },
      {
        value: "gpt-4.1",
        label: "GPT-4.1",
        desc: "Smart non-reasoning model — good fallback for lower-cost high-quality replies",
      },
    ],
  },
}


const ALL_MODELS: (ModelItem & { category: string; _categorySlug: string })[] = Object.entries(
  CHATGPT_MODEL_CATEGORIES,
).flatMap(([slug, category]) =>
  category.models.map((m) => ({
    ...m,
    recommended: !!m.recommended,
    category: category.title,
    _categorySlug: slug,
  })),
)

export default function LlmProviderConfig({ onConfigUpdate }: LlmProviderConfigProps) {
  const [llmConfig, setLlmConfig] = useState<ModelConfig>({
    backend_provider: "",
    model_name: "",
    base_url: "",
    api_key: "",
  })
  const [savedLlmConfig, setSavedLlmConfig] = useState<ModelConfig | null>(null)
  const [savingLlm, setSavingLlm] = useState(false)
  const [showModelDropdown, setShowModelDropdown] = useState(false)
  const [modelSearch, setModelSearch] = useState("")
  const [showAllModels, setShowAllModels] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const fetchLlmConfig = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/llm/`)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error("Failed to fetch LLM configuration:", errData?.detail || response.statusText)
        return
      }
      const data = await response.json()
      setSavedLlmConfig(data)
      setLlmConfig({
        backend_provider: data.backend_provider || "",
        model_name: data.model_name || "",
        base_url: data.base_url || "",
        api_key: "",
      })
    } catch (err) {
      console.error("Network error fetching LLM config:", err)
    }
  }, [])

  useEffect(() => {
    fetchLlmConfig()
  }, [fetchLlmConfig])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false)
      }
    }
    if (showModelDropdown) {
      document.addEventListener("click", onClick)
    }
    return () => document.removeEventListener("click", onClick)
  }, [showModelDropdown])

  const handleProviderChange = (provider: string) => {
    if (provider === "ollama") {
      // Auto-populate with EMBEDDING_MODEL_NAME
      setLlmConfig({
        ...llmConfig,
        backend_provider: provider,
        model_name: "llama3.2",
      })
    } else {
      setLlmConfig({ ...llmConfig, backend_provider: provider, model_name: "" })
    }
  }

  const handleSaveLlm = async () => {
    if (!llmConfig.backend_provider) {
      alert("Please select a provider")
      return
    }
    if (llmConfig.backend_provider === "ollama" && !llmConfig.model_name) {
      alert("Please provide a model name")
      return
    }
    if (llmConfig.backend_provider === "openai") {
      if (!llmConfig.model_name || !llmConfig.api_key) {
        alert("Please provide model name and API key")
        return
      }
    }

    setSavingLlm(true)
    try {
      const payload: ModelConfig = {
        backend_provider: llmConfig.backend_provider,
        model_name: llmConfig.model_name,
      }
      if (llmConfig.backend_provider === "openai") {
        payload.api_key = llmConfig.api_key
        if (llmConfig.base_url) {
          payload.base_url = llmConfig.base_url
        }
      }

      const response = await fetch(`${API_BASE_URL}/admin/llm/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        alert("LLM configuration updated successfully!")
        await fetchLlmConfig()
        setLlmConfig({
          backend_provider: payload.backend_provider,
          model_name: payload.model_name || "",
          base_url: payload.base_url || "",
          api_key: "",
        })
        onConfigUpdate?.()
      } else {
        const err = await response.json().catch(() => ({ detail: "Unknown error" }))
        alert(`Failed to save: ${err.detail}`)
      }
    } catch (err) {
      console.error("Error saving LLM config:", err)
      alert("Network error occurred")
    } finally {
      setSavingLlm(false)
    }
  }

  const handleModelSelect = (modelValue: string) => {
    setLlmConfig({ ...llmConfig, model_name: modelValue })
    setShowModelDropdown(false)
    setModelSearch("")
    setShowAllModels(false)
  }

  const rawFilteredBySearch = modelSearch
    ? ALL_MODELS.filter(
        (model) =>
          model.label.toLowerCase().includes(modelSearch.toLowerCase()) ||
          model.desc.toLowerCase().includes(modelSearch.toLowerCase()) ||
          model.value.toLowerCase().includes(modelSearch.toLowerCase()),
      )
    : ALL_MODELS

  const filteredModels = rawFilteredBySearch
  const displayModels = showAllModels ? ALL_MODELS : filteredModels

  const getSelectedModelLabel = () => {
    if (llmConfig.model_name) {
      const found = ALL_MODELS.find((m) => m.value === llmConfig.model_name)
      return found ? `${found.label}` : llmConfig.model_name
    }
    if (savedLlmConfig?.model_name) {
      const foundSaved = ALL_MODELS.find((m) => m.value === savedLlmConfig.model_name)
      return foundSaved ? `${foundSaved.label} (saved)` : `${savedLlmConfig.model_name} (saved)`
    }
    return "Select a model"
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && displayModels && displayModels.length > 0) {
      handleModelSelect(displayModels[0].value)
    }
  }

  const groupByCategory = (models: (ModelItem & { category: string; _categorySlug: string })[]) => {
    return models.reduce<Record<string, (ModelItem & { category: string; _categorySlug: string })[]>>((acc, m) => {
      acc[m._categorySlug] = acc[m._categorySlug] || []
      acc[m._categorySlug].push(m)
      return acc
    }, {})
  }

  const isConfigured = savedLlmConfig?.backend_provider && savedLlmConfig?.model_name

  return (
    <div className="max-w-4xl mx-auto">
      <ComponentCard
        title="LLM Provider Configuration"
        className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm"
        desc="Configure your Large Language Model backend for AI-powered conversations and analysis"
      >
        <div className="space-y-8">
          {/* Status Banner */}
          {savedLlmConfig && (
            <div
              className={`rounded-xl border p-6 ${
                isConfigured
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                  : "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg ${
                    isConfigured ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-amber-100 dark:bg-amber-900/50"
                  }`}
                >
                  <Bot
                    className={`h-6 w-6 ${
                      isConfigured ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <h3
                    className={`font-semibold ${
                      isConfigured ? "text-emerald-900 dark:text-emerald-100" : "text-amber-900 dark:text-amber-100"
                    }`}
                  >
                    {isConfigured ? "LLM Provider Active" : "LLM Provider Not Configured"}
                  </h3>
                  <p
                    className={`text-sm mt-1 ${
                      isConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {isConfigured
                      ? "Your AI backend is configured and ready for conversations"
                      : "Configure your LLM provider to enable AI-powered features"}
                  </p>
                  {isConfigured && (
                    <div className="mt-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Provider</div>
                          <div className="text-sm font-mono text-emerald-700 dark:text-emerald-300 capitalize">
                            {savedLlmConfig.backend_provider}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Model</div>
                          <div className="text-sm font-mono text-emerald-700 dark:text-emerald-300">
                            {savedLlmConfig.model_name}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Server className="h-5 w-5 text-gray-500" />
              Choose Your Provider
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={llmConfig.backend_provider === "openai"}
                className={`group relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all duration-200 ${
                  llmConfig.backend_provider === "openai"
                    ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30 shadow-lg"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => handleProviderChange("openai")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      llmConfig.backend_provider === "openai"
                        ? "bg-blue-100 dark:bg-blue-900/50"
                        : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    <Bot
                      className={`h-6 w-6 ${
                        llmConfig.backend_provider === "openai"
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">OpenAI</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Industry-leading models with cutting-edge capabilities
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded-full">
                        <Zap className="h-3 w-3" />
                        High Performance
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                        <Clock className="h-3 w-3" />
                        Low Latency
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                aria-pressed={llmConfig.backend_provider === "ollama"}
                className={`group relative overflow-hidden rounded-xl border-2 p-6 text-left transition-all duration-200 ${
                  llmConfig.backend_provider === "ollama"
                    ? "border-green-500 bg-green-50 dark:border-green-400 dark:bg-green-950/30 shadow-lg"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                onClick={() => handleProviderChange("ollama")}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      llmConfig.backend_provider === "ollama"
                        ? "bg-green-100 dark:bg-green-900/50"
                        : "bg-gray-100 dark:bg-gray-700"
                    }`}
                  >
                    <Server
                      className={`h-6 w-6 ${
                        llmConfig.backend_provider === "ollama"
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Ollama</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Self-hosted models for privacy and control
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                        <Shield className="h-3 w-3" />
                        Privacy First
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full">
                        Self-Hosted
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Model Configuration */}
          {llmConfig.backend_provider && (
            <div className="space-y-6 border-t border-gray-200 dark:border-gray-700 pt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Model Configuration</h3>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Model Name */}
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-gray-500" />
                    Model Name
                    <span className="text-red-500">*</span>
                  </label>

                  {llmConfig.backend_provider === "openai" ? (
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={showModelDropdown}
                        className="flex w-full items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-sm hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        onClick={() => {
                          setShowModelDropdown(!showModelDropdown)
                          if (!showModelDropdown) setShowAllModels(false)
                        }}
                      >
                        <span
                          className={
                            llmConfig.model_name ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                          }
                        >
                          {getSelectedModelLabel()}
                        </span>
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      </button>

                      {showModelDropdown && (
                        <div className="absolute z-10 mt-1 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl">
                          <div className="border-b border-gray-200 dark:border-gray-700 p-3">
                            <div className="mb-2 flex items-center gap-2">
                              <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search models..."
                                  className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  value={modelSearch}
                                  onChange={(e) => setModelSearch(e.target.value)}
                                  onKeyDown={handleSearchKeyDown}
                                  aria-label="Search models"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="max-h-70 overflow-y-auto">
                            {displayModels.length > 0 ? (
                              Object.entries(groupByCategory(displayModels)).map(([catSlug, modelsInCat]) => {
                                const categoryTitle =
                                  CHATGPT_MODEL_CATEGORIES[catSlug]?.title || modelsInCat[0].category
                                return (
                                  <div key={catSlug}>
                                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                                      {categoryTitle}
                                    </div>
                                    {modelsInCat.map((model) => (
                                      <button
                                        key={model.value}
                                        type="button"
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                        onClick={() => handleModelSelect(model.value)}
                                        title={`${model.label} — ${model.desc}`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                              {model.label}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              {model.desc}
                                            </div>
                                          </div>
                                          <div className="ml-3 flex gap-1">
                                            {model.recommended && (
                                              <div className="text-xs text-yellow-500" title="Recommended">
                                                ⭐
                                              </div>
                                            )}
                                            
                                          </div>
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                )
                              })
                            ) : (
                              <div className="px-4 py-8 text-center text-sm text-gray-500">No models found</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <InputField
                      placeholder={savedLlmConfig?.model_name || "llama3.2"}
                      value={llmConfig.model_name}
                      onChange={(e) => setLlmConfig({ ...llmConfig, model_name: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  )}

                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                    <div>
                      {llmConfig.backend_provider === "openai" ? (
                        <>
                          <strong>Recommended:</strong> Frontier models for best performance.
                          <strong> On-prem:</strong> Open-weight models for privacy.
                          <strong> Realtime:</strong> Low-latency streaming models.
                        </>
                      ) : (
                        <>
                          Model automatically set to{" "}
                          <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">llama3.2</code>{" "}
                          (EMBEDDING_MODEL_NAME). You can change this if needed.
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Key for OpenAI */}
                {llmConfig.backend_provider === "openai" && (
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-gray-500" />
                      API Key
                      <span className="text-red-500">*</span>
                    </label>
                    <InputField
                      type="password"
                      placeholder="sk-..."
                      value={llmConfig.api_key}
                      onChange={(e) => setLlmConfig({ ...llmConfig, api_key: e.target.value })}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                    <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                      <div>Your API key is encrypted and stored securely. Get your key from the OpenAI dashboard.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Base URL for OpenAI */}
              {llmConfig.backend_provider === "openai" && (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Server className="h-4 w-4 text-gray-500" />
                    Base URL (Optional)
                  </label>
                  <InputField
                    placeholder={savedLlmConfig?.base_url || "https://api.openai.com/v1"}
                    value={llmConfig.base_url}
                    onChange={(e) => setLlmConfig({ ...llmConfig, base_url: e.target.value })}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                  <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <Info className="h-4 w-4 mt-0.5 text-gray-400" />
                    <div>
                      Leave empty to use the default OpenAI endpoint. Custom endpoints may have CORS limitations.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save Button */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Configuration will be applied immediately after saving
            </div>
            <Button
              variant="primary"
              onClick={handleSaveLlm}
              disabled={savingLlm || !llmConfig.backend_provider}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              {savingLlm ? "Saving Configuration..." : "Save LLM Settings"}
            </Button>
          </div>
        </div>
      </ComponentCard>
    </div>
  )
}
