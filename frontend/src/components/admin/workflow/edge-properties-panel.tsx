"use client"

import Button from "@/components/ui/button/Button"
import InputField from "@/components/form/input/InputField"
import TextArea from "@/components/form/input/TextArea"
import Label from "@/components/form/Label"
import { Copy, Trash2 } from 'lucide-react'
import {type Node, 
        type Edge } from "reactflow"
import { Tooltip } from "@/components/ui/tooltip/Tooltip"
import { EdgeParameter } from "@/types/workflow/workflow-types"

// This file will implement the edge panel configuration
interface EdgePropertiesPanelProps {
  selectedEdge: Node | Edge | null
  nodes: Node[]
  edges: Edge[]
  updateConditionalEdgeNodeData: (nodeId: string, newData: Partial<Node["data"]>) => void
  deleteSelectedEdge: () => void
  copyEdgeNode: (edge: Node) => void
}

export function EdgePropertiesPanel({
  selectedEdge,
  nodes,
  edges,
  updateConditionalEdgeNodeData,
  deleteSelectedEdge,
  copyEdgeNode,
}: EdgePropertiesPanelProps) {  
  if (!selectedEdge) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Select a connection to view its properties.
      </div>
    )
  }

  const connectType = selectedEdge.data?.connect_type
  
  // --- Direct Edge Layout ---
  if (connectType === "direct") {
    const edge = edges.find((e) => e.id === selectedEdge.id)
    if (!edge) {
      return (
        <div className="text-sm text-gray-500 text-center py-8">
          Select a connection to view its properties.
        </div>
      )
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h4 className="text-sm font-semibold text-gray-900">🎯 Direct Edge</h4>
          <Button variant="outline" size="icon" onClick={deleteSelectedEdge}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-1 text-sm text-gray-700">
          <div><span className="font-medium">From:</span> {edge.source}</div>
          <div><span className="font-medium">To:</span> {edge.target}</div>
          {edge.data?.label && (
            <div><span className="font-medium">Label:</span> {edge.data.label}</div>
          )}
        </div>
      </div>
    )
  }
  // --- Conditional Edge Node Layout ---
  const edgeNode = nodes.find(
    (node) =>
      node.id === selectedEdge.id &&
      node.type === "conditional" &&
      node.data?.connect_type === "conditional"
  )
  if (!edgeNode) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Select a connection to view its properties.
      </div>
    )
  }

  const { id, data } = edgeNode
  const outputMapping = (data.outputMapping ?? {}) as Record<string, string>;
  const config = data.config ?? {};

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h4 className="text-sm font-semibold text-gray-900">Conditional Edge</h4>
        <div className="flex space-x-2">
          <Button variant="outline" size="icon" onClick={() => copyEdgeNode(edgeNode)}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={deleteSelectedEdge}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Section: Routing Outputs */}
      <div className="border rounded-md bg-gray-50 px-3 py-2">
        <Label className="text-xs font-semibold text-gray-700">Routing Outputs</Label>
        <div className="space-y-2 mt-2">
          {Object.entries(outputMapping).map(([label, target]) => (
            <div key={label} className="text-xs flex justify-between text-gray-600">
              <span>{label}</span>
              <span className="font-medium text-gray-800">{target || "(not connected)"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section: Parameters */}
      {Array.isArray(data.parameters) && data.parameters.length > 0 && config && (
        <div className="border rounded-md bg-gray-50 px-3 py-2">
          <Label className="text-xs font-semibold text-gray-700">Parameters</Label>
          <div className="space-y-4 mt-2">
            {data.parameters.map((param:EdgeParameter) => (
              <div key={param.name} className="text-xs space-y-1">
                {/* Tooltip for parameter name */}
                <Tooltip content={<div>{param.description}</div>}>
                  <Label className="text-xs text-gray-700 cursor-help inline-block">
                    {param.name}
                  </Label>
                </Tooltip>

                {/* Input or TextArea */}
                {param.type === "str" ? (
                  <InputField
                    value={config[param.name] || ""}
                    onChange={(e) =>
                      updateConditionalEdgeNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: e.target.value,
                        },
                      })
                    }
                    className="mt-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <TextArea
                    value={config[param.name] || ""}
                    onChange={(value) =>
                      updateConditionalEdgeNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: value,
                        },
                      })
                    }
                    rows={3}
                    className="mt-1 text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {/* Current value display */}
                <div className="text-xs text-gray-500 mt-1">
                  Current value: {String(config[param.name]) || "(empty)"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
