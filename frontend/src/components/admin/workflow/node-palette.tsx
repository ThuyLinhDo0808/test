"use client"

import React from "react"
import {
  Play, MessageSquare, Shield, FileText, HelpCircle,
  XCircle, Scissors,
  CheckCircle, Search, StopCircle, Share2, AlertTriangle
} from "lucide-react"

// This file will implement the node pallete in the selecting node and edge types template

// This contains the mapping of node types and edge types to their respective icons.
export const iconMapNodes: Record<string, React.ComponentType<{ className: string }>> = {
  starter: Play,
  retrieve: FileText,
  rag: MessageSquare,
  security: Shield,
  query_rewrite: HelpCircle,
  no_document: XCircle,
  no_answer: XCircle,
  trimmer: Scissors,
  final_answer: CheckCircle,
  multi_retrieve: Search,
  doc_grader: CheckCircle,
  ender: StopCircle,
  
}

export const iconMapEdges: Record<string, React.ComponentType<{ className: string }>> = {
  no_document: XCircle,
  routing: Share2,
  hallucination_grader: AlertTriangle,
}

// This contains the mapping of node types and edge types to their respective colors.
export const colorMapNodes: Record<string, string> = {
  starter: "bg-green-50 border-green-300 dark:bg-green-400 dark:border-green-100",
  retrieve: "bg-indigo-50 border-indigo-300 dark:bg-indigo-400 dark:border-indigo-100",
  rag: "bg-blue-50 border-blue-300 dark:bg-blue-400 dark:border-blue-100",
  security: "bg-orange-50 border-orange-300 dark:bg-orange-400 dark:border-orange-100",
  query_rewrite: "bg-teal-50 border-teal-300 dark:bg-teal-400 dark:border-teal-100",
  no_document: "bg-red-50 border-red-300 dark:bg-red-400 dark:border-red-100",
  no_answer: "bg-gray-50 border-gray-300 dark:bg-gray-400 dark:border-gray-100",
  trimmer: "bg-lime-50 border-lime-300 dark:bg-lime-400 dark:border-lime-100",
  final_answer: "bg-red-50 border-red-300 dark:bg-red-400 dark:border-red-100",
  multi_retrieve: "bg-cyan-50 border-cyan-300 dark:bg-cyan-400 dark:border-cyan-100",
  doc_grader: "bg-pink-50 border-pink-300 dark:bg-pink-400 dark:border-pink-100",
  ender: "bg-red-50 border-red-300 dark:bg-red-400 dark:border-red-100",
}


export const colorMapEdges: Record<string, string> = {
  no_document: "bg-red-50 border-red-300 dark:bg-red-400 dark:border-red-100",
  routing: "bg-purple-50 border-purple-300 dark:bg-purple-400 dark:border-purple-100",
  hallucination_grader: "bg-amber-50 border-amber-300 dark:bg-amber-400 dark:border-amber-100",
}


export const miniMapNodeColors: Record<string, string> = {
  starter: "#10b981",       // green-500
  retrieve: "#6366f1",      // indigo-500
  rag: "#3b82f6",           // blue-500
  security: "#f59e0b",      // orange-500
  query_rewrite: "#14b8a6", // teal-500
  no_document: "#ef4444",   // red-500
  no_answer: "#9ca3af",     // gray-400
  trimmer: "#84cc16",       // lime-500
  final_answer: "#dc2626",  // red-600
  multi_retrieve: "#06b6d4",// cyan-500
  doc_grader: "#ec4899",    // pink-500
  ender: "#dc2626",         // red-600
  routing: "#8b5cf6",       // purple-500
  hallucination_grader: "#fbbf24", // amber-400
};

// A shared template interface for both nodes and edges
interface TemplateBase {
  type: string
  name: string
  icon: React.ComponentType<{ className: string }>
  color: string
}

interface NodePaletteProps {
  activeTab: "node" | "edge"
  setActiveTab: (tab: "node" | "edge") => void
  nodeTemplates: TemplateBase[]
  edgeTemplates: TemplateBase[]
}

export function NodePalette({
  activeTab,
  setActiveTab,
  nodeTemplates,
  edgeTemplates = [],
}: NodePaletteProps)  {
    const onDragStart = (
      event: React.DragEvent,
      template: TemplateBase,
      kind: "node" | "edge"
    ) => {
      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({ type: template.type, label: template.name, kind })
      )
      event.dataTransfer.effectAllowed = "move"
    }

    const templates = activeTab === "node" ? nodeTemplates : edgeTemplates

    return (
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2 mb-3">
          <button
            className={`text-sm px-3 py-1 rounded border ${
              activeTab === "node"
                ? "border-blue-500 text-blue-600 dark:border-blue-200 dark:text-blue-200"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-100 hover:dark:text-gray-50"
            }`}
            onClick={() => setActiveTab("node")}
          >
            Node Types
          </button>
          <button
            className={`text-sm px-3 py-1 rounded border ${
              activeTab === "edge"
                ? "border-blue-500 text-blue-600 dark:border-blue-200 dark:text-blue-200"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-100 hover:dark:text-gray-50"
            }`}
            onClick={() => setActiveTab("edge")}
          >
            Edge Types
          </button>
        </div>

        <div className="space-y-2">
          {templates.map((template) => (
            <div
              key={template.type}
              className="flex items-start p-3 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-move hover:bg-gray-100 transition-colors border border-gray-200"
              draggable
              onDragStart={(event) => onDragStart(event, template, activeTab)}
            >
              <template.icon className={`w-5 h-5 mr-3 mt-0.5 text-gray-600 dark:text-gray-100 flex-shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray- dark:text-gray-50">{template.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-100">{template.type}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
}


