import { Edge } from "reactflow";
import React from "react"

// Conditional Edge Type Initialization
export type EdgeConnectType = "direct" | "conditional"

// This is the raw data structure for edges in the workflow fetched from the backend.
export type RawWorkflowEdge = {
  edge_type: string;
  connect_type: "conditional" | "direct";
  from_node: string;
  to_node: string; // mapping output key to node name
  position?: { x: number; y: number };
};

export interface EdgeParameter {
  name: string
  type: "str" | "int" | "bool" | "float"  // extend as needed
  default?: string | number | boolean
  description?: string
  options?: string[] | null
}

export type RawEdgeMetadata = {
  name: string
  description?: string
  parameters?: EdgeParameter[]
  outputs?: string[]
}

//Extends Edge from React Flow, so it must have: id, source, target, etc.
export type ConditionalEdge = Edge & {
  type: string   // this would be the edge type
  name: string 
  connect_type: "conditional"
  description?: string
  icon: React.ComponentType<{ className: string }>;
  color: string
  outputMapping?: string[] 
  parameters?: EdgeParameter[] 
}

export type ConditionalEdgeTemplate = {
  type: string;
  name: string;
  connect_type: "conditional";
  description?: string;
  icon: React.ComponentType<{ className: string }>;
  color: string;
  outputMapping?: string[];
  parameters?: EdgeParameter[];
};


// Node Types Initialization
// Makes the expected shape of data.config predictable
// This is useful for type checking and ensuring consistency across node types
export type NodeConfig = Record<string, string | number | boolean | null>;

export type NodeParam = {
  name: string;
  type: string;
  default: string | number | boolean | null;
  description: string;
  options: string;
};

export type NodeMeta = {
  type: string;
  name: string;
  description: string;
  parameters: NodeParam[];
  prerequisites: string[];
  outputs: string[];
  allow_input: boolean;
  allow_output: boolean;
};

export type NodeRegistryResponse = Record<string, NodeMeta>;

export type NodeTemplate = {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className: string }>;
  color: string;
  allow_input: boolean;
  allow_output: boolean;
  allow_node: boolean; // <-- added this field
  parameters?: NodeParam[];
};

// This is the raw data structure for nodes in the workflow fetched from the backend
export type RawWorkflowNode = {
  name: string;
  node_type: string;
  position?: { x: number; y: number };
};

export interface HasParameters {
  type: string;
  parameters?: { name: string; default?: string | number | boolean | null }[];
}