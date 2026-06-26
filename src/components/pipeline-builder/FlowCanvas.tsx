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
import QuantumGuruNode from './nodes/QuantumGuruNode';
import TheProblemNode from './nodes/TheProblemNode';
import TheMathematicalInterpretationNode from './nodes/TheMathematicalInterpretationNode';
import TheQuantumInterpretationNode from './nodes/TheQuantumInterpretationNode';
import QuantumAlgorithmNode from './nodes/QuantumAlgorithmNode';
import { usePipelineStore } from '@/store/usePipelineStore';

const nodeTypes = {
  problemNode: ProblemNode,
  variableNode: VariableNode,
  hardwareNode: HardwareNode,
  analyticsNode: AnalyticsNode,
  promptNode: AnalysisPromptNode,
  singleVar: SingleVariableNode,
  executeNode: ExecuteNode,
  saveNode: SaveNode,
  quantumGuruNode: QuantumGuruNode,
  theProblemNode: TheProblemNode,
  theMathematicalInterpretationNode: TheMathematicalInterpretationNode,
  theQuantumInterpretationNode: TheQuantumInterpretationNode,
  quantumAlgorithmNode: QuantumAlgorithmNode
};

const ROYAL_BLUE = 'oklch(0.623 0.214 259.815)';
const EDGE_STYLE = { stroke: ROYAL_BLUE, strokeWidth: 2 };

let id = 0;
const getId = () => `dndnode_${id++}`;

const INITIAL_NODES = [
  // Left Column: Quantum Guru steps
  { id: 'the-problem', type: 'theProblemNode', position: { x: 80, y: 50 }, data: {} },
  { id: 'the-math', type: 'theMathematicalInterpretationNode', position: { x: 80, y: 350 }, data: {} },
  { id: 'the-quantum', type: 'theQuantumInterpretationNode', position: { x: 80, y: 650 }, data: {} },
  { id: 'the-algorithm', type: 'quantumAlgorithmNode', position: { x: 80, y: 950 }, data: {} },

  // Right Column: execution and analytics
  { id: 'quantum-guru-1', type: 'quantumGuruNode', position: { x: 750, y: 50 }, data: {} },
  { id: 'hardware-1', type: 'hardwareNode', position: { x: 750, y: 350 }, data: {} },
  { id: 'execute-1', type: 'executeNode', position: { x: 750, y: 650 }, data: {} },
  { id: 'analytics-1', type: 'analyticsNode', position: { x: 750, y: 900 }, data: {} },
  { id: 'prompt-1', type: 'promptNode', position: { x: 750, y: 1250 }, data: {} }
];

const INITIAL_EDGES = [
  // Quantum Guru steps chain
  { id: 'e-tp-tm', source: 'the-problem', sourceHandle: 's-bottom', target: 'the-math', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e-tm-tq', source: 'the-math', sourceHandle: 's-bottom', target: 'the-quantum', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e-tq-ta', source: 'the-quantum', sourceHandle: 's-bottom', target: 'the-algorithm', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  
  // Cross connection from algorithm to executor chain
  { id: 'e-ta-qg', source: 'the-algorithm', sourceHandle: 's-right', target: 'quantum-guru-1', targetHandle: 't-left', animated: true, style: EDGE_STYLE },
  
  // Right column chain
  { id: 'e-qg-hw', source: 'quantum-guru-1', sourceHandle: 's-bottom', target: 'hardware-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e-hw-ex', source: 'hardware-1', sourceHandle: 's-bottom', target: 'execute-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e-ex-an', source: 'execute-1', sourceHandle: 's-bottom', target: 'analytics-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE },
  { id: 'e-an-pr', source: 'analytics-1', sourceHandle: 's-bottom', target: 'prompt-1', targetHandle: 't-top', animated: true, style: EDGE_STYLE }
];

function FlowCanvasInternal() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { 
    problemName, 
    problemDefinition, 
    currentIssues, 
    reasoningTrace,
    quantumAlgorithmCode,
    variables, 
    hardware, 
    analysisPrompt, 
    analyticsWidgets, 
    outputVisuals 
  } = usePipelineStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  // Sync state data reactively based on completed steps in the store
  useEffect(() => {
    const filteredNodes = INITIAL_NODES.filter(node => {
      if (node.id === 'the-problem') return !!problemDefinition;
      if (node.id === 'the-math') return !!currentIssues;
      if (node.id === 'the-quantum') return !!reasoningTrace;
      if (node.id === 'the-algorithm') return !!quantumAlgorithmCode;
      // All right column execution blocks appear once code generation completes
      return !!quantumAlgorithmCode;
    }).map(node => {
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
    });

    setNodes(filteredNodes);

    const filteredEdges = INITIAL_EDGES.filter(edge => {
      const sourceExists = filteredNodes.some(n => n.id === edge.source);
      const targetExists = filteredNodes.some(n => n.id === edge.target);
      return sourceExists && targetExists;
    });

    setEdges(filteredEdges);
  }, [
    problemName, 
    problemDefinition, 
    currentIssues, 
    reasoningTrace, 
    quantumAlgorithmCode, 
    variables, 
    hardware, 
    analysisPrompt, 
    analyticsWidgets, 
    outputVisuals, 
    setNodes, 
    setEdges
  ]);

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
      
      {/* Empty State Overlay */}
      {!problemDefinition && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#09090b]/80 backdrop-blur-md z-30 pointer-events-none p-6">
          <div className="text-center max-w-md">
            <span className="font-semibold text-xs text-muted-foreground uppercase tracking-widest block mb-2">
              Awaiting problem input
            </span>
            <h2 className="text-2xl font-extrabold text-foreground mb-4">
              Quantum pipeline builder
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe your optimization problem in the right chat coach interface to dynamically compile, verifier-audit, and build your visual flowchart.
            </p>
          </div>
        </div>
      )}

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
