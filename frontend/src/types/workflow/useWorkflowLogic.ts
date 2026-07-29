import {type Node, 
        type Edge,
        addEdge,
        type Connection,
        useNodesState,
        useEdgesState, 
        applyNodeChanges,
        applyEdgeChanges,
        NodeChange, EdgeChange,
        type ReactFlowInstance, 
        MarkerType } from "reactflow";

import { useState, useRef, useCallback } from "react";
import type React from "react";
import { ConditionalEdge, NodeTemplate, NodeConfig, ConditionalEdgeTemplate, EdgeParameter } from "@/types/workflow/workflow-types";
import  { Play } from "lucide-react"
import { API_BASE_URL, API_HOST } from "@/lib/constants";


// initialize the first node when visit the page
export const initialNodes: Node[] = [
  {
    id: "start-1",
    type: "starter",
    position: { x: 250, y: 50 },
    data: {
      type: "Conversation Start",
      name: "Start Node",
      description: "Entry point of the flow",
      allow_input: false,
      allow_output: true,
      config: {},
      color: "bg-green-50 border-green-300",
      icon: Play,
      allow_node: false, // Default to false
    },
  },
];

export const initialEdges: ConditionalEdge[] = [];


export function useWorkflowLogic() {
    
    const [nodes, setNodes] = useNodesState(initialNodes);
    const [edges, setEdges] = useEdgesState(initialEdges);

    // State for managing selected nodes and edges
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [nodeTemplates, setNodeTemplates] = useState<NodeTemplate[]>([])

    // This will hold the selected edge of both direct and conditional types
    const [selectedEdge, setSelectedEdge] = useState<Edge | Node | null>(null);
    const [edgeTemplates, setEdgeTemplates] = useState<ConditionalEdgeTemplate[]>([]);

    const [workflowName, setWorkflowName] = useState("Building Access Q&A Flow");

    // State for managing the workflow mode
    const [isTestMode, setIsTestMode] = useState(false);

    // State for managing the active tab in the UI
    const [activeTab, setActiveTab] = useState<"node" | "edge">("node");
    const [activeTabUpper, setActiveTabUpper] = useState<"node" | "edge">("node");

    // State for managing the React Flow instance and wrapper
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

    // Add Temporary State for Accumulating Stream
    const [streamingMessage, setStreamingMessage] = useState<string | null>(null);

    const [testMessages, setTestMessages] = useState<
        Array<{ id: string; type: "user" | "system"; content: string; timestamp: Date }>
    >([]);
    const [currentTestNode, setCurrentTestNode] = useState<string | null>(null);
    const [testInput, setTestInput] = useState(""); 

    const startTest = () => {
        setIsTestMode(true);
        setTestMessages([]);
        const startNode = nodes.find((node) => node.type === "starter"); // There is only one stater for every type of graph
        if (startNode) {
        setCurrentTestNode(startNode.id);
        addTestMessage("system", "Test mode started. Conversation begins...");
        }
    };

    const addTestMessage = (type: "user" | "system", content: string) => {
        const newMessage = {
            id: `msg-${Date.now()}`,
            type,
            content,
            timestamp: new Date(),
        };
        setTestMessages((prev) => [...prev, newMessage]);
    };

    const stopTest = () => {
        setIsTestMode(false);
        setTestMessages([]);
        setCurrentTestNode(null);
        setTestInput("");
        setStreamingMessage(null);
    };

    const processTestInput = () => {
        if (!testInput.trim() || !currentTestNode) return;

        addTestMessage("user", testInput);
        setTestInput("");

        const ws = new WebSocket(`ws://${API_HOST}/api/admin/workflow/test_flow/`);
        let currentNode: string | null = null;
        let responseBuffer = "";

        ws.onopen = () => {
            ws.send(testInput);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log("Data: ",data)
                const node = data.node;
                const msg = data.msg; // correct key

                if (node && node !== currentNode) {
                    const matchingNode = nodes.find((n) => n.data.id === node || n.id === node);
                    console.log(matchingNode)
                    if (matchingNode) {
                        setCurrentTestNode(matchingNode.id);
                        addTestMessage("system", `→ Entering ${node} node: ${matchingNode.id}`);
                    }
                    currentNode = node;
            }

            if (msg) {
                responseBuffer += msg;
                setStreamingMessage(responseBuffer);
            }
            } catch (err) {
                console.error("Error parsing WebSocket message:", err);
                console.error("Invalid JSON from WebSocket:", event.data);
            }
        };

        ws.onerror = (err) => {
            console.error("WebSocket error:", err);
            addTestMessage("system", "WebSocket error occurred.");
            setStreamingMessage(null);
        };

        ws.onclose = () => {
            if (responseBuffer.trim()) {
            addTestMessage("system", responseBuffer.trim());
            }
            setStreamingMessage(null);
            addTestMessage("system", "Streaming completed.");
        };
    };

   
    // setup for generate the random suffix
    function generateRandomSuffix(): string {
        return Math.random().toString(36).substring(2, 8); // 6-char random
    }

    const generateDirectEdgeId = useCallback((source: string, target: string): string => {
        const s = source.replace(/[^a-zA-Z0-9_-]/g, "");
        const t = target.replace(/[^a-zA-Z0-9_-]/g, "");
        const rand = generateRandomSuffix();
        return `edge-${s}-to-${t}-${rand}`;
    }, []);

    const generateConditionalEdgeId = useCallback((fromNode?: string): string => {
        const base = fromNode?.replace(/[^a-zA-Z0-9_-]/g, "") || "new";
        const rand = generateRandomSuffix();
        return `edge-${base}-cond-${rand}`;
    }, []);

    const onConnect = useCallback(
        (params: Connection) => {
            if (!params.source || !params.target) return;

            const sourceNode = nodes.find((n) => n.id === params.source);
            console.log("Source node:", sourceNode);
            console.log("Params:", params.sourceHandle);
            // CASE: Conditional edge node
            if (sourceNode?.type === "conditional" && params.sourceHandle) {
            const outputKey = params.sourceHandle;
            
            // Update that node's outputMapping
            setNodes((nds) =>
                nds.map((node) => {
                if (node.id === sourceNode.id && node.data.outputMapping) {
                    
                    return {
                    ...node,
                    data: {
                        ...node.data,
                        outputMapping: {
                        ...node.data.outputMapping,
                        [outputKey]: params.target!,
                        },
                    },
                    };
                }
                console.log("Node updated:", node);
                return node;
                })
            );

            // Also add visual edge with label = sourceHandle
            const newEdge: Edge = {
                id: generateDirectEdgeId(params.source, params.target),
                source: params.source,
                target: params.target,
                sourceHandle: params.sourceHandle,
                // type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                label: outputKey,
                data: { connect_type: "direct" },
            };
            
            console.log("Adding conditional edge:", newEdge);
            setEdges((eds) => addEdge(newEdge, eds));
            }

            // CASE: Direct edge
            else {
            const newEdge: Edge = {
                id: generateDirectEdgeId(params.source, params.target),
                source: params.source,
                target: params.target,
                // type: "smoothstep",
                markerEnd: { type: MarkerType.ArrowClosed },
                data: { connect_type: "direct" },
            };
            setEdges((eds) => addEdge(newEdge, eds));
            }
        },
    [nodes, setNodes, setEdges, generateDirectEdgeId]
    );


    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }, []);


    const onDrop = useCallback(
    (event: React.DragEvent) => {
        event.preventDefault()

        const raw = event.dataTransfer.getData("application/reactflow")
        if (!raw || !reactFlowInstance || !reactFlowWrapper.current) return
        

        const parsed = JSON.parse(raw)
        const { type, kind } = parsed as { type: string; kind: "node" | "edge" }

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
        const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
        })

        if (kind === "node") {
            const template = nodeTemplates.find((t) => t.type === type)
            if (!template) return
            
            const defaultConfig =
                template.parameters?.reduce<NodeConfig>((acc, param) => {
                acc[param.name] = param.default
                return acc
            }, {}) ?? {}

            const newNode: Node = {
                id: `${type}-${Date.now()}`,
                type,
                position,
                data: {
                    type: template.type,
                    name: template.name,
                    description: template.description,
                    icon: template.icon,
                    color: template.color,
                    allow_input: template.allow_input,
                    allow_output: template.allow_output,
                    config: defaultConfig,
                    parameters: template.parameters,
                    allow_node: false // Default to false
                },
            }
            
            setNodes((nds) => [...nds, newNode])
        }


        if (kind === "edge") {
            const template = edgeTemplates.find((t) => t.type === type)
            if (!template) return

            // Create output mapping for edge parameters
            const outputMapping: Record<string, string> = Object.fromEntries(
                (template.outputMapping ?? []).map((key) => [key, ""])
            )

            // Create default config for edge parameters
            const defaultConfig: Record<string, string | number | boolean> =
                template.parameters?.reduce((acc, param) => {
                acc[param.name] = param.default ?? ""
                return acc
            }, {} as Record<string, string | number | boolean>) ?? {}



            const newEdgeNode: Node = {
                id: generateConditionalEdgeId(undefined),
                type: "conditional", // this links to  ConditionalEdgeNode renderer
                position,
                data: {
                    type: template.type,
                    name: template.name,
                    connect_type: "conditional",
                    description: template.description,
                    icon: template.icon,
                    color: template.color,
                    outputMapping,
                    parameters: template.parameters,
                    config: defaultConfig,
                },
            }
            console.log("Adding new edge node:", newEdgeNode)
            setNodes((nds) => [...nds, newEdgeNode])
        }
    },
    [reactFlowInstance, reactFlowWrapper, nodeTemplates, edgeTemplates, setNodes, generateConditionalEdgeId]
    )

    // This function handles node clicks, differentiating between conditional edge nodes and regular nodes
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        
        const isConditionalEdgeNode =
            node.type === "conditional" && node.data?.connect_type === "conditional";

        if (isConditionalEdgeNode) {
            setSelectedEdge(node);
            setSelectedNode(null);
            console.log("Selected Conditional edge:", node)         
        } else { 
            setSelectedNode(node);
            setSelectedEdge(null);
            console.log("Selected Node:", node);
        }
    }, []);

    // This function handles edge clicks, setting the selected edge state
    const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge ) => {
        
        setSelectedEdge(edge);
        setSelectedNode(null);
        console.log("Selected Edge:", edge);
    }, []);

    
    const updateNodeData = (nodeId: string, newData: Partial<Node["data"]>) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id !== nodeId) return node;

                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...newData,
                        config: {
                            ...node.data.config,
                            ...(newData.config || {}),
                        },
                        parameters: newData.parameters ?? node.data.parameters,
                        allow_node:
                        newData.hasOwnProperty("allow_node")
                            ? newData.allow_node
                            : node.data.allow_node,
                    },
                };
            })
        );
        console.log("Updated node data:", newData);
    };


    const updateConditionalEdgeNodeData = (nodeId: string, newData: Partial<Node["data"]>) => {
        setNodes((nodes) =>
            nodes.map((node) => {
            const isConditional =
                node.id === nodeId &&
                node.type === "conditional" &&
                node.data?.connect_type === "conditional";

            if (!isConditional) return node;

            return {
                ...node,
                data: {
                ...node.data,
                ...newData,
                },
            };
            })
        );
    };

    const deleteSelectedNode = () => {
        if (selectedNode) {
            setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
            setEdges((eds) =>
                eds.filter(
                    (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
                )
            );
            setSelectedNode(null);
        }
    };

    // Deletes the selected edge, handling both conditional and direct edges
    const deleteSelectedEdge = () => {
        if (!selectedEdge) return;

        const isConditionalEdge =
            "type" in selectedEdge &&
            selectedEdge.type === "conditional" &&
            selectedEdge.data?.connect_type === "conditional";

        if (isConditionalEdge) {
            const condId = selectedEdge.id;

            // Remove the conditional node
            setNodes((nodes) => nodes.filter((node) => node.id !== condId));

            // Remove all visual edges connected to the conditional node
            setEdges((edges) =>
                edges.filter((edge) => edge.source !== condId && edge.target !== condId)
            );
        } else {
            // Normal edge deletion
            setEdges((edges) => {
                const edgeToDelete = edges.find((e) => e.id === selectedEdge.id);
                const updated = edges.filter((edge) => edge.id !== selectedEdge.id);

                // Clear outputMapping if it was from a conditional node
                if (
                    edgeToDelete &&
                    edgeToDelete.source &&
                    edgeToDelete.sourceHandle // only conditional output edge has this
                ) {
                    setNodes((nodes) =>
                        nodes.map((node) => {
                            if (node.id === edgeToDelete.source && node.type === "conditional") {
                                const newMapping = { ...node.data.outputMapping };
                                if (edgeToDelete.sourceHandle != null) {
                                    delete newMapping[edgeToDelete.sourceHandle];
                                }
                                return {
                                    ...node,
                                    data: {
                                        ...node.data,
                                        outputMapping: newMapping,
                                    },
                                };
                            }
                            return node;
                        })
                    );
                }

                return updated;
            });
        }

        setSelectedEdge(null);
    };


    const duplicateSelectedNode = () => {
        if (selectedNode) {
            const newNode: Node = {
            ...selectedNode,
            id: `${selectedNode.type}-${Date.now()}`,
            position: {
                x: selectedNode.position.x + 50,
                y: selectedNode.position.y + 50,
            },
            data: {
                ...selectedNode.data,
                label: `${selectedNode.data.label} (Copy)`,
            },
            };
            setNodes((nds) => nds.concat(newNode));
        }
        };

    // Copy the conditional edge node
    const copyEdgeNode = (edge: Node) => {
        if (edge?.type === "conditional") {
            const oldMapping = edge.data.outputMapping ?? {};

            const clearedMapping = Object.fromEntries(
                Object.keys(oldMapping).map((key) => [key, ""])
            );
            const newEdgeNode: Node = {
                ...edge,
                id: generateConditionalEdgeId(`duplicated-${edge.data.type}`),
                position: {
                    x: edge.position.x + 40,
                    y: edge.position.y + 40,
                },
                data: {
                    ...edge.data,
                    label: `${edge.data.name} (Copy)`,
                    outputMapping: clearedMapping,
                    config: {
                    ...(edge.data.config ?? {})
                    },
                },
            };
            setNodes((nodes) => [...nodes, newEdgeNode]);
        }
    };
    

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );

    // This function handles edge changes, specifically removing edges and updating output mappings for conditional nodes
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            // Use a type guard to safely access id
            const validChanges = changes.filter(
                (c) => 'id' in c && typeof c.id === 'string');
            console.log("Valid Edge Changes:", validChanges);
            const removedEdges = validChanges.filter((c) => c.type === "remove");

            if (removedEdges.length > 0) {
            setNodes((prevNodes) =>
                prevNodes.map((node) => {
                if (node.type === "conditional" && node.data?.outputMapping) {
                    const updatedMapping = { ...node.data.outputMapping };

                    removedEdges.forEach((removed) => {
                    const edge = edges.find((e) => e.id === removed.id);
                    if (
                        edge &&
                        edge.source === node.id &&
                        edge.sourceHandle &&
                        updatedMapping[edge.sourceHandle]
                    ) {
                        updatedMapping[edge.sourceHandle] = "";
                    }
                    });

                    return {
                    ...node,
                    data: {
                        ...node.data,
                        outputMapping: updatedMapping,
                    },
                    };
                }

                return node;
                })
            );
            }
            setEdges((eds) => applyEdgeChanges(validChanges, eds));
        },
    [edges, setEdges, setNodes]
    );

    const testWorkflow = () => {
        if (isTestMode) {
            stopTest();
        } else {
            startTest();
        }
    };

    // Function to save current graph state to backend
    async function saveWorkflow() {
        const entryNodeId = nodes.find((n) => n.data.allow_input === false)?.id || null;
        const directEdges = edges.filter((e) => e.data?.connect_type === "direct");
        const conditionalNodes = nodes.filter((n) => n.type === "conditional");

        const graphNodes = nodes
            .filter((n) => n.type !== "conditional")
            .map((node) => {
                const params = (node.data.parameters || []).map((param:EdgeParameter) => ({
                    ...param,
                    default: node.data.config?.[param.name] ?? param.default,
                }));

                return {
                    name: node.id,
                    node_type: node.type,
                    position: node.position,
                    parameters: params,
                };
            });

        const graphEdges = [
            ...directEdges
                .filter((edge) => {
                    const sourceNode = nodes.find((n) => n.id === edge.source);
                    const targetNode = nodes.find((n) => n.id === edge.target);
                    return sourceNode?.type !== "conditional" && targetNode?.type !== "conditional";
                })
                .map((edge) => ({
                    from_node: edge.source,
                    to_node: edge.target,
                    connect_type: "direct",
                    edge_type: "",
                })),
            ...conditionalNodes.map((condNode) => {
                const params = (condNode.data.parameters || []).map((param:EdgeParameter) => ({
                    ...param,
                    default: condNode.data.config?.[param.name] ?? param.default,
                }));

                return {
                    from_node: condNode.data.source,
                    to_node: condNode.data.outputMapping,
                    connect_type: "conditional",
                    edge_type: condNode.data.type,
                    position: condNode.position,
                    parameters: params,
                };
            }),
        ];


        const allowedNodes = nodes
            .filter((n) => n.type !== "conditional" && n.data?.allow_node === true)
            .map((n) => n.id); // Only include the node's ID

        const payload = {
            nodes: graphNodes,
            edges: graphEdges,
            entry_node: entryNodeId,
            allowed_nodes: allowedNodes,
        };

        console.log("Saving workflow with payload:", payload);

        try {
            const response = await fetch(`${API_BASE_URL}/admin/workflow/`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to save workflow");
            }

            console.log("Workflow saved successfully");
        } catch (err) {
            console.error("Error saving workflow:", err);
        }
    }
        


    return {
        nodes, setNodes, onNodesChange,
        edges, setEdges, onEdgesChange,
        nodeTemplates, setNodeTemplates,
        edgeTemplates, setEdgeTemplates,
        selectedNode, setSelectedNode,
        selectedEdge, setSelectedEdge,
        generateDirectEdgeId, generateConditionalEdgeId,
        workflowName, setWorkflowName,
        isTestMode, setIsTestMode,
        activeTab, setActiveTab,
        activeTabUpper, setActiveTabUpper,
        reactFlowWrapper, reactFlowInstance, setReactFlowInstance,
        testMessages, setTestMessages,
        currentTestNode, setCurrentTestNode,
        testInput, setTestInput,
        startTest, stopTest,
        processTestInput, addTestMessage,
        onConnect, onDrop, onDragOver, onNodeClick, onEdgeClick,
        updateNodeData, updateConditionalEdgeNodeData,
        deleteSelectedNode, deleteSelectedEdge,
        duplicateSelectedNode, copyEdgeNode, testWorkflow, saveWorkflow,
        streamingMessage
    };
}

