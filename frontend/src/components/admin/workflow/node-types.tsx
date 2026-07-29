import { Handle, Position } from "reactflow"
import {NodeTemplate, NodeConfig } from "@/types/workflow/workflow-types"
import { ConditionalEdgeNode } from "@/components/admin/workflow/edge-types";

type WorkflowNodeProps = {
  data: NodeTemplate & { config?: NodeConfig }
}

// This component represents a node in the workflow designer of the Canvas.
export function WorkflowNode({ data }: WorkflowNodeProps) {
  const Icon = data.icon
  const color = data.color || "gray"

  return (
    <div className={`px-4 py-3 shadow-lg rounded-lg ${color} border-2 min-w-[160px]`}>
      {data.allow_input && (
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
      )}

      <div className="flex items-center mb-2">
        <Icon className={`w-5 h-5 mr-2 text-${color}-600`} />
        <div className={`text-sm font-semibold text-${color}-800`}>{data.name}</div>
      </div>

      <div className={`text-xs text-${color}-600 mb-2`}>
        {data.type}
      </div>

      {data.allow_output && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}
    </div>
  )
}

export const nodeTypes = {
  starter: WorkflowNode,
  retrieve: WorkflowNode,
  rag: WorkflowNode,
  security: WorkflowNode,
  query_rewrite: WorkflowNode,
  no_document: WorkflowNode,
  no_answer: WorkflowNode,
  trimmer: WorkflowNode,
  final_answer: WorkflowNode,
  multi_retrieve: WorkflowNode,
  doc_grader: WorkflowNode,
  ender: WorkflowNode,
  conditional: ConditionalEdgeNode,
}
