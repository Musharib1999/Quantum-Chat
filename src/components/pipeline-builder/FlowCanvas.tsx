'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState, addEdge, updateEdge, BackgroundVariant, ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';
import ProblemNode from './nodes/ProblemNode';
import VariableNode from './nodes/VariableNode';
import HardwareNode from './nodes/HardwareNode';
import AnalyticsNode from './nodes/AnalyticsNode';
import AnalysisPromptNode from './nodes/AnalysisPromptNode';
import SingleVariableNode from './nodes/SingleVariableNode';
import ExecuteNode from './nodes/ExecuteNode';
import SaveNode from './nodes/SaveNode';
import { usePipelineStore } from '@/store/usePipelineStore';

const nodeTypes = {
  problemNode: ProblemNode,
  variableNode: VariableNode,
  hardwareNode: HardwareNode,
  analyticsNode: AnalyticsNode,
  promptNode: AnalysisPromptNode,
  singleVar: SingleVariableNode,
  executeNode: ExecuteNode,
  saveNode: SaveNode
};

const ROYAL_BLUE = 'oklch(0.623 0.214 259.815)';
const EDGE_STYLE = { stroke: ROYAL_BLUE, strokeWidth: 2 };

let id = 0;
const getId = () => `dndnode_${id++}`;

const INITIAL_NODES = [
  { id: 'problem-1', type: 'problemNode', position: { x: 250, y: 50 }, data: {} },
  { id: 'variables-1', type: 'variableNode', position: { x: 250, y: 300 }, data: {} },
  { id: 'hardware-1', type: 'hardwareNode', position: { x: 250, y: 550 }, data: {} },
  { id: 'analytics-1', type: 'analyticsNode', position: { x: 250, y: 800 }, data: {} },
  { id: 'prompt-1', type: 'promptNode', position: { x: 250, y: 1050 }, data: {} },
  { id: 'execute-1', type: 'executeNode', position: { x: 250, y: 1300 }, data: {} },
];

const INITIAL_EDGES = [
  { id: 'e1-2', source: 'problem-1', sourceHandle: 's-bottom', target: 'variables-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e2-3', source: 'variables-1', sourceHandle: 's-bottom', target: 'hardware-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e3-4', source: 'hardware-1', sourceHandle: 's-bottom', target: 'analytics-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e4-5', source: 'analytics-1', sourceHandle: 's-bottom', target: 'prompt-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e5-6', source: 'prompt-1', sourceHandle: 's-bottom', target: 'execute-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
];

function FlowCanvasInternal() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { problemName, problemDefinition, currentIssues, variables, hardware, analysisPrompt, analyticsWidgets, outputVisuals } = usePipelineStore();
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Always reactively update node data when store changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === 'problem-1') {
          return { ...node, data: { ...node.data, name: problemName, problem: problemDefinition, issues: currentIssues } };
        }
        if (node.id === 'variables-1') {
          return { ...node, data: { ...node.data, variables } };
        }
        if (node.id === 'hardware-1') {
          return { ...node, data: { ...node.data, selectedHardware: hardware } };
        }
        if (node.id === 'analytics-1') {
          return { ...node, data: { ...node.data, widgets: analyticsWidgets, outputVisuals } };
        }
        if (node.id === 'prompt-1') {
          return { ...node, data: { ...node.data, prompt: analysisPrompt } };
        }
        return node;
      })
    );
  }, [problemName, problemDefinition, currentIssues, variables, hardware, analysisPrompt, analyticsWidgets, outputVisuals, setNodes]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: EDGE_STYLE }, eds)),
    [setEdges]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge: any, newConnection: any) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    [setEdges]
  );

  const onDragOver = useCallback((event: any) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      event.preventDefault();
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { problem: '', issues: '', variables: [], prompt: '', name: '' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  return (
    <div className="w-full h-full flex bg-background relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeUpdate={onEdgeUpdate}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#3f3f46" />
        <Controls className="!bg-card !border-border !fill-foreground" />
      </ReactFlow>
    </div>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInternal />
    </ReactFlowProvider>
  );
}
