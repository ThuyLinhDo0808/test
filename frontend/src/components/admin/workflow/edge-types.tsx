import { Handle, Position } from "reactflow"
import { ConditionalEdge } from "@/types/workflow/workflow-types"

// This file will implement the edge node displayed in the canvas
type ConditionalEdgeNodeProps = {
  data: Pick<ConditionalEdge, "name" | "type" | "color" | "icon" | "outputMapping">
}

export function ConditionalEdgeNode({ data }: ConditionalEdgeNodeProps) {
  const Icon = data.icon
  const color = data.color ?? "gray"
  const outputs = Object.keys(data.outputMapping ?? {})

  return (
    <div
      className={`px-4 py-3 shadow-lg rounded-lg ${color} border-2 border-${color}-300 min-w-[220px] relative`}
    >
      {/* Top input */}
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center mb-2">
        <Icon className={`w-5 h-5 mr-2 text-${color}-600`} />
        <div className={`text-sm font-semibold text-${color}-800`}>
          {data.name}
        </div>
      </div>

      <div className={`text-xs text-${color}-600 mb-6`}>{data.type}</div>

      {/* Handle container */}
      <div className="absolute bottom-0 left-0 w-full h-4 pointer-events-none">
        {outputs.map((key, index) => {
          const leftPercent = (index + 1) / (outputs.length + 1) * 100
          return (
            <Handle
              key={key}
              type="source"
              position={Position.Bottom}
              id={key}
              className="w-3 h-3 pointer-events-auto"
              style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}
            />
          )
        })}
      </div>
    </div>
  )
}
