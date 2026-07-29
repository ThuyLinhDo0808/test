"use client";

import { Copy, Trash2 } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { Tooltip } from "@/components/ui/tooltip/Tooltip";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import Switch from "@/components/form/switch/Switch";
import TextArea from "@/components/form/input/TextArea";
import { EdgePropertiesPanel } from "@/components/admin/workflow/edge-properties-panel";
import type { Node, Edge } from 'reactflow'
import type { ConditionalEdge } from '@/types/workflow/workflow-types' 
import type { NodeParam } from "@/types/workflow/workflow-types";

type NodePanelProps = {
  activeTab: string;
  selectedNode: Node | null;
  selectedEdge: Edge | Node | null;
  nodes: Node[];
  edges: Edge[];
  updateNodeData: (nodeId: string, newData: Partial<Node["data"]>) => void;
  deleteSelectedNode: () => void;
  deleteSelectedEdge: () => void;
  duplicateSelectedNode: () => void;
  copyEdgeNode: (edge: Node) => void;
  updateConditionalEdgeNodeData: (nodeId: string, data: Partial<ConditionalEdge>) => void;
};

export function NodePanel({
  activeTab,
  selectedNode,
  selectedEdge,
  nodes,
  edges,
  updateNodeData,
  deleteSelectedNode,
  deleteSelectedEdge,
  duplicateSelectedNode,
  copyEdgeNode,
  updateConditionalEdgeNodeData,
}: NodePanelProps) {
  if (activeTab === "edge") {
    return (
      <EdgePropertiesPanel
        selectedEdge={selectedEdge}
        nodes={nodes}
        edges={edges}
        updateConditionalEdgeNodeData={updateConditionalEdgeNodeData}
        deleteSelectedEdge={deleteSelectedEdge}
        copyEdgeNode={copyEdgeNode}
      />
    )
  }
  // This will ensure using the correct node data
  const currentNode = nodes.find((node) => node.id === selectedNode?.id)
  if (!currentNode) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Select a node to edit its properties
      </div>
    )
  }

  const { id, type, data } = currentNode
  const { config = {}, parameters = []} = data

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-2">
        <h4 className="text-sm font-semibold text-gray-900">
          {type ? type.charAt(0).toUpperCase() + type.slice(1) : "Unknown"} Node
        </h4>
        <div className="flex gap-1">
          <Button variant="outline" onClick={duplicateSelectedNode} className="text-xs p-2">
            <Copy className="w-3 h-3" />
          </Button>
          <Button variant="outline" onClick={deleteSelectedNode} className="text-xs p-2">
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Toggle Section */}
      <div className="bg-gray-50 border rounded-md px-3 py-2 flex items-center justify-between">
        <Label className="text-sm font-medium text-gray-800">Allow node</Label>
        <Switch
          label="Allow node"
          checked={!!data.allow_node}
          onChange={(checked) => {
            updateNodeData(id, {
              allow_node: checked,
            });
          }}
        />
      </div>

      {/* Parameters Section */}
      {parameters.length > 0 && (
        <div className="space-y-4 border-t pt-4">
          <h5 className="text-sm font-semibold text-gray-800">Parameters</h5>
          
          {parameters.map((param: NodeParam) => (
            <div key={param.name} className="flex flex-col bg-gray-50 border rounded-md px-3 py-2">
              <Tooltip content={<div>{param.description}</div>}>
                <Label className="text-sm text-gray-700 mb-1 cursor-help inline-block">
                  {param.name}
                </Label>
              </Tooltip>

              {param.type === "str" && (
                <>
                  <InputField
                    value={config[param.name] || ""}
                    onChange={(e) =>
                      updateNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: e.target.value,
                        },
                      })
                    }
                    className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {String(config[param.name] || "")}
                  </div>
                </>
              )}

              {param.type === "text" && (
                <>
                  <TextArea
                    value={config[param.name] || ""}
                    onChange={(value) =>
                      updateNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: value,
                        },
                      })
                    }
                    rows={4}
                    className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {String(config[param.name] || "")}
                  </div>
                </>
              )}

              {param.type === "bool" && (
                <>
                  <select
                    value={String(config[param.name])}
                    onChange={(e) =>
                      updateNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: e.target.value === "true",
                        },
                      })
                    }
                    className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {String(config[param.name])}
                  </div>
                </>
              )}

              {param.type === "int" && (
                <>
                  <InputField
                    type="number"
                    value={config[param.name] ?? 0}
                    onChange={(e) =>
                      updateNodeData(id, {
                        config: {
                          ...config,
                          [param.name]: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="text-sm px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Current: {String(config[param.name])}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

}

