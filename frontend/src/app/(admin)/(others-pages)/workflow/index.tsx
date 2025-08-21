"use client";

import { useEffect } from "react";

import  { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/constants";

import { useWorkflowLogic } from "@/types/workflow/useWorkflowLogic";
import { useSidebarResize } from "@/types/workflow/useSidebarResize";
import { iconMapNodes, 
         colorMapNodes, 
         iconMapEdges, 
         colorMapEdges, 
         NodePalette, } from "@/components/admin/workflow/node-palette";
 
import { RawEdgeMetadata, 
         ConditionalEdgeTemplate, 
         NodeRegistryResponse, 
         NodeConfig, 
         NodeTemplate, 
         RawWorkflowNode,
         RawWorkflowEdge,
         HasParameters } from "@/types/workflow/workflow-types"; 

import { MarkerType, type Node, type Edge } from "reactflow";

import { Canvas } from "./Canvas";
import { NodePanel } from "./NodePanel";
import "reactflow/dist/style.css"


import Button from "@/components/ui/button/Button"
import Badge from "@/components/ui/badge/Badge"
import InputField from "@/components/form/input/InputField"

import { XCircle, HelpCircle } from 'lucide-react'



export function WorkflowEditor() { 
    
    const {status} = useSession();
    const router = useRouter();
    
    
    // Authentication check to redirect if not authenticated
    useEffect(() => {
        if (status === "unauthenticated") router.push("/");   
    }, [status, router]);


    const {
        nodes, setNodes, onNodesChange,
        edges, setEdges, onEdgesChange,
        selectedEdge, setSelectedEdge,
        selectedNode, setSelectedNode,
        generateDirectEdgeId, generateConditionalEdgeId,
        nodeTemplates, setNodeTemplates,
        edgeTemplates, setEdgeTemplates,
        isTestMode, activeTab, setActiveTab,
        activeTabUpper, setActiveTabUpper,
        reactFlowWrapper, setReactFlowInstance,
        testMessages, currentTestNode,
        testInput, setTestInput, stopTest,
        processTestInput, 
        onConnect, onDrop, onDragOver, onNodeClick, onEdgeClick,
        updateNodeData, updateConditionalEdgeNodeData,
        deleteSelectedNode, deleteSelectedEdge,
        duplicateSelectedNode, copyEdgeNode,
        testWorkflow, saveWorkflow, streamingMessage
    } = useWorkflowLogic();

    const { startDragging, sidebarWidth, nodePaletteRef, topHeight,
            startSidebarResizing } = useSidebarResize();
    
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
            const [nodesRes, edgesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/workflow/metadata/nodes/`),
                fetch(`${API_BASE_URL}/admin/workflow/metadata/edges/`)
            ])

            if (!nodesRes.ok) throw new Error("Failed to fetch node metadata")
            if (!edgesRes.ok) throw new Error("Failed to fetch edge metadata")

            const nodeData: NodeRegistryResponse = await nodesRes.json()
            const edgeData: Record<string, Omit<RawEdgeMetadata, "icon" | "color">> = await edgesRes.json()
            
            // map nodes
            const mappedNodes: NodeTemplate[] = Object.entries(nodeData).map(([type, meta]) => ({
                type,
                name: meta.name,  // this name of the regiesterd node, not unique node name
                description: meta.description,
                icon: iconMapNodes[type] ?? HelpCircle,
                color: colorMapNodes[type] ?? "gray",
                allow_input: meta.allow_input,
                allow_output: meta.allow_output,
                allow_node: false, // default false
                parameters: meta.parameters?.map(p => ({
                    name: p.name,
                    type: p.type,
                    default: p.default,
                    description: p.description,
                    options: p.options
                }))
            }))

            // map edges
            const mappedEdges: ConditionalEdgeTemplate[] = Object.entries(edgeData).map(
            ([edgeType, def]) => ({
                type: edgeType,
                name: def.name,
                connect_type: "conditional",
                description: def.description,
                icon: iconMapEdges[edgeType] ?? HelpCircle,
                color: colorMapEdges[edgeType] ?? "gray",
                parameters: def.parameters,
                outputMapping: def.outputs,
            })
            );

            console.log("Mapped edges:", mappedEdges);
            setNodeTemplates(mappedNodes)
            setEdgeTemplates(mappedEdges)

            } catch (error) {
            console.error("Error loading metadata:", error)
            }
        };

    fetchMetadata();
    }, [setNodeTemplates, setEdgeTemplates]);
    
    // This function retrieves the template and the default configuration for a given node type.
    function getTemplateAndDefaultConfig<T extends HasParameters>(
        type: string,
        templates: T[]
        ): { template?: T; defaultConfig: NodeConfig } {
        const template = templates.find((t) => t.type === type);

        const defaultConfig: NodeConfig =
            template?.parameters?.reduce<NodeConfig>((acc, param) => {
            acc[param.name] = param.default ?? null;
            return acc;
            }, {}) ?? {};

        return { template, defaultConfig };
    }


    async function loadWorkflow() {
        try {
            const res = await fetch(`${API_BASE_URL}/admin/workflow/`);
            const config = await res.json();
            console.log("Loaded workflow config:", config);

            const loadedNodes = config.config.nodes.map((node:RawWorkflowNode) => {

                const { template, defaultConfig } = getTemplateAndDefaultConfig(node.node_type, nodeTemplates)
                if (!template) {
                    throw new Error(`No template found for node_type: ${node.node_type}`);
                }
                return {
                    id: node.name,         // Differentiate nodes by their unique name
                    type: node.node_type,  // Differentiate with the node types
                    position: node.position ?? { x: 0, y: 0 },
                    data: {
                        name: template.name,
                        type: node.node_type,
                        config: defaultConfig,
                        parameters: template?.parameters || [],
                        allow_input: template?.allow_input ?? true,
                        allow_output: template?.allow_output ?? true,
                        icon: template?.icon,
                        color: template?.color,
                        allow_node: config.config.allowed_nodes?.includes(node.name) ?? false,
                    },
                };
            });

            const loadConditionalEdges = config.config.edges.flatMap((edge:RawWorkflowEdge) => {
                // Conditional edge - convert to custom node
                if (edge.connect_type === "conditional") {
                    // Generate a unique ID for the conditional edge node
                    
                    const outputMapping = Object.fromEntries(Object.entries(edge.to_node));
                    
                    const { template, defaultConfig } = getTemplateAndDefaultConfig(edge.edge_type, edgeTemplates)
                    if (!template) {
                        throw new Error(`No template found for edge_type: ${edge.edge_type}`);
                    }
                    return {
                        id: generateConditionalEdgeId(edge.from_node),
                        type: "conditional",
                        position: edge.position ?? { x: 100, y: 100 },
                        data: {
                            name: template.name,        // This name will be displayed in the conditional edges
                            source: edge.from_node,     // The source was use the unique name of the node   
                            connect_type: "conditional",
                            type: edge.edge_type,
                            outputMapping,              // This will be used to map outputs to nodes, map with the unique name of the node
                            config: defaultConfig,      // Default configuration for the edge
                            parameters: template?.parameters || [],
                            icon: template?.icon,
                            color: template?.color,
                        },
                    };
                }
                return [];
            });

            const edgesFromConditionalNodes = loadConditionalEdges.flatMap((condNode:Node) => {
                const { id: condId, data } = condNode;
                const { source, outputMapping = {} }: { source: string; outputMapping: Record<string, string> } = data;

                if (!source || !condId) return [];

                // Edge from the source node to the conditional node
                const conditionalInputEdge: Edge = {
                    id: generateDirectEdgeId(source, condId),
                    source,          // node id of the conditional edge
                    target: condId,  // conditional node id
                    type: "smoothstep",
                    markerEnd: { type: MarkerType.ArrowClosed },
                    data: { connect_type: "direct" },
                };

                // Edges from the conditional node to its outputs
                const conditionalOutputEdges: Edge[] = Object.entries(outputMapping)
                    .filter(([, targetId]) => !!targetId)
                    .map(([label, targetId]) => ({
                        id: generateDirectEdgeId(source, condId),
                        source: condId,
                        target: targetId,
                        sourceHandle: label,
                        type: "smoothstep",
                        markerEnd: { type: MarkerType.ArrowClosed },
                        label,
                        data: { connect_type: "direct" },
                    }));

                return [conditionalInputEdge, ...conditionalOutputEdges];
            });

            const loadedEdges = config.config.edges.flatMap((edge:RawWorkflowEdge ) => {
                if (edge.connect_type === "direct") {
                    return [{
                        id: generateDirectEdgeId(edge.from_node, edge.to_node),
                        source: edge.from_node,  // This is unique name of the source node
                        target: edge.to_node,    // This is unique name of the target node
                        type: "smoothstep",
                        data: { connect_type: "direct" },
                    }];
                }  
                return [];
            });

            setNodes([...loadedNodes, ...loadConditionalEdges]);
            setEdges([...loadedEdges, ...edgesFromConditionalNodes]);
            
            setSelectedNode(null);
            setSelectedEdge(null);
        } catch (err) {
            console.error("Failed to load workflow", err);
        }
    }
    
    
    return (
        <div className="fixed inset-0 z-50 flex bg-gray-50">
        {/* Left Sidebar */}
        <div
            style={{ width: sidebarWidth }}
            className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-600 flex flex-col"
        >
            {/* Header */}
            <div className="h-18 px-4 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                    onClick={() => window.history.back()}
                    className="p-1 hover:bg-gray-100 rounded"
                    >
                    <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-100" />
                    </button>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">Workflow Editor</h2>
                </div>
                <Badge>
                    {isTestMode ? "Test Mode" : "Design Mode"}
                </Badge>
            </div>

            {/* Conditional content based on test mode */}
            {isTestMode ? (
            /* Test Panel */
            <div className="flex-1 flex flex-col min-h-0">
  
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-100 mb-3">Test Console</h3>
                <div className="space-y-2">
                <div className="text-xs text-gray-600 dark:text-gray-200">
                    Current Node: {
                        currentTestNode
                            ? nodes.find(n => n.id === currentTestNode)?.data.name || currentTestNode
                            : "None"
                        }   
                </div>
                <Button onClick={stopTest} variant="outline" className="w-full text-sm">
                    Stop Test
                </Button>
                </div>
            </div>

            {/* Message container (scrollable) */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0 custom-scrollbar">
                <div className="space-y-3">
                    {testMessages.map((message) => (
                        <div
                        key={message.id}
                        className={`p-3 rounded-lg text-sm ${
                            message.type === "user"
                            ? "bg-blue-100 border border-blue-200 ml-4"
                            : "bg-gray-100 border border-gray-200 mr-4"
                        }`}
                        >
                        <div className="font-medium text-xs text-gray-500 mb-1">
                            {message.type === "user" ? "User" : "System"} • {message.timestamp.toLocaleTimeString()}
                        </div>
                        <div>{message.content}</div>
                        </div>
                    ))}

                    {/* 👇 Streaming message appears as a "live" system message */}
                    {streamingMessage && (
                        <div className="p-3 rounded-lg text-sm bg-gray-100 border border-gray-200 mr-4">
                        <div className="font-medium text-xs text-gray-500 mb-1">
                            System • Streaming...
                        </div>
                        <div>{streamingMessage}</div>
                        </div>
                    )}
                    </div>
            </div>

            {/* Input section */}
            {currentTestNode && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 w-full">
                    <div className="flex items-center gap-2 w-full">
                    <div className="flex-1">
                        <InputField
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        placeholder="Enter test input..."
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                            e.preventDefault();
                            processTestInput();
                            }
                        }}
                        />
                    </div>
                    <Button
                        onClick={processTestInput}
                        className="text-sm px-4 py-2 whitespace-nowrap shrink-0"
                    >
                        Send
                    </Button>
                    </div>
                </div>
                )}
            </div>
           
            ) : (
            /* Normal design mode content */
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Top: Node Types section (Resizable) */}
            <div ref={nodePaletteRef} 
                style={{ height: `${topHeight}px` }} 
                className="overflow-y-auto custom-scrollbar">
                <NodePalette
                    activeTab={activeTabUpper}
                    setActiveTab={setActiveTabUpper}
                    nodeTemplates={nodeTemplates}
                    edgeTemplates={edgeTemplates}
                    />
            </div>

            {/* Middle: Drag handle */}
            <div
                onMouseDown={startDragging}
                className="h-1 cursor-row-resize bg-gray-200 dark:bg-gray-600"
            />

            {/* Bottom: Node/Edge tab panel */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button
                        className={`px-3 py-2 text-sm font-medium ${
                        activeTab === "node"
                            ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-200 dark:text-blue-200"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-100 hover:dark:text-gray-50"
                        }`}
                        onClick={() => setActiveTab("node")}
                    >
                        Node
                    </button>
                    <button
                        className={`px-3 py-2 text-sm font-medium ${
                        activeTab === "edge"
                            ? "border-b-2 border-blue-500 text-blue-600 dark:border-blue-200 dark:text-blue-200"
                            : "text-gray-500 hover:text-gray-700 dark:text-gray-100 hover:dark:text-gray-50"
                        }`}
                        onClick={() => setActiveTab("edge")}
                    >
                        Edge
                    </button>
                    </div>

                    {/* Tab Content */}
                    <NodePanel
                        activeTab={activeTab}
                        selectedNode={selectedNode}
                        selectedEdge={selectedEdge}
                        nodes={nodes}
                        edges={edges}
                        updateNodeData={updateNodeData}
                        deleteSelectedNode={deleteSelectedNode}
                        deleteSelectedEdge={deleteSelectedEdge}
                        duplicateSelectedNode={duplicateSelectedNode}
                        copyEdgeNode={copyEdgeNode}
                        updateConditionalEdgeNodeData={updateConditionalEdgeNodeData}
                    />
                </div>
            </div>
            )}
        </div>
        
        {/* Sidebar Resizer */}
        <div
            onMouseDown={startSidebarResizing}
            className="w-1 cursor-col-resize bg-gray-200 dark:bg-gray-600 hover:bg-gray-300"
        />
        
        {/* Main Canvas */}
        <Canvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            loadWorkflow={loadWorkflow}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            isTestMode={isTestMode}
            currentTestNode={currentTestNode}
            testWorkflow={testWorkflow}
            reactFlowWrapper={reactFlowWrapper}
            setReactFlowInstance={setReactFlowInstance}
            saveWorkflow={saveWorkflow}
            />
        </div>
    )
}