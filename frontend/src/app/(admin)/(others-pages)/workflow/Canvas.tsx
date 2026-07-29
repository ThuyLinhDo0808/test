"use client";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  Node,
  Edge, ReactFlowInstance,
  NodeChange, EdgeChange, Connection
} from "reactflow";
import { miniMapNodeColors } from "@/components/admin/workflow/node-palette"

import { Play, Upload , UploadCloud } from "lucide-react";
import Button from "@/components/ui/button/Button";
import { nodeTypes } from "@/components/admin/workflow/node-types";

import type React from "react";
import { RefObject } from "react";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  loadWorkflow: () => void;
  onConnect: (connection: Connection) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onDrop: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  isTestMode: boolean;
  currentTestNode: string | null;
  testWorkflow: () => void;
  reactFlowWrapper: RefObject<HTMLDivElement | null>;
  setReactFlowInstance: (rf: ReactFlowInstance) => void;
  saveWorkflow: () => void;
}

export function Canvas(props: CanvasProps) {
    const {
        nodes, edges,
        onNodesChange, onEdgesChange,
        loadWorkflow,
        onConnect, onNodeClick, onEdgeClick,
        onDrop, onDragOver,
        isTestMode, currentTestNode,
        testWorkflow,
        reactFlowWrapper, setReactFlowInstance, saveWorkflow
    } = props;
    return (
        <div className="flex-1 flex flex-col">
            <div className="h-18 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4">
                <div className="flex items-center space-x-4">
                <span className="text-sm text- dark:text-gray-50">
                    Nodes: {nodes.length} | Connections: {edges.length}
                </span>
                </div>
                <div className="flex items-center space-x-2">
                <Button
                    onClick={loadWorkflow}
                    className="text-sm"
                    disabled={isTestMode}
                    >
                    <UploadCloud className="w-4 h-4" />
                    Load Workflow
                </Button>

                <Button
                    variant={isTestMode ? "primary" : "outline"}
                    className="text-sm"
                    onClick={testWorkflow}
                    >
                    <Play className="w-4 h-4" />
                    {isTestMode ? "Stop Test" : "Test Flow"}
                </Button>

                <Button
                    onClick={saveWorkflow}
                    className="text-sm"
                    disabled={isTestMode}
                    >
                    <Upload className="w-4 h-4" />
                    Deploy
                </Button>
                <ThemeToggleButton/>
                </div>
            </div>

            <div className="flex-1" ref={reactFlowWrapper}>
                <ReactFlow
                nodes={nodes.map((node) => ({
                    ...node,
                    className:
                    isTestMode && currentTestNode === node.id
                        ? "shadow-[0_0_12px_4px_rgba(34,197,94,0.6)]"
                        : "",
                }))}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={onDrop}
                onDragOver={onDragOver}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                nodeTypes={nodeTypes}
                fitView
                className="bg-gray-50 dark:bg-gray-900"
                defaultEdgeOptions={{
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed },
                }}
                >
                <Controls />
                <MiniMap
                    nodeColor={(node) => {
                        const visualType =
                        node.type === "conditional" ? node.data?.type : node.type;

                        return miniMapNodeColors[visualType] || "#6b7280"; // default gray-500
                    }}
                    className="bg-white border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
                />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                </ReactFlow>
            </div>
        </div>
    );
}