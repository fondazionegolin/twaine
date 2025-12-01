import React, { useCallback, useState, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Connection,
  Edge,
  Node,
  NodeChange,
  EdgeChange,
  ConnectionMode,
  applyNodeChanges
} from 'reactflow';
import StoryNode from './StoryNode';

interface EditorGraphProps {
  reactFlowNodes: Node[];
  reactFlowEdges: Edge[];
  selectedNodeId: string | null;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeRemove: (nodeId: string) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  onConnectParent: (sourceId: string, targetId: string) => void;
  onPlayFromNode?: (nodeId: string) => void;
}

const EditorGraph: React.FC<EditorGraphProps> = ({
  reactFlowNodes,
  reactFlowEdges,
  selectedNodeId,
  onNodePositionChange,
  onNodeRemove,
  onEdgesChange,
  onNodeSelect,
  onConnectParent,
  onPlayFromNode
}) => {
  // Custom node types - memoized to prevent re-registration
  const nodeTypes = useMemo(() => ({
    storyNode: StoryNode
  }), []);

  // Transform nodes to use custom type, inject play handler, and set selected state
  const nodesWithType = useMemo(() => {
    return reactFlowNodes.map(node => ({
      ...node,
      type: 'storyNode',
      data: {
        ...node.data,
        isSelected: node.id === selectedNodeId,
        onPlayFromNode
      }
    }));
  }, [reactFlowNodes, onPlayFromNode, selectedNodeId]);

  // Local state for smooth dragging - syncs from props but updates locally during drag
  const [localNodes, setLocalNodes] = useState<Node[]>(nodesWithType);

  // Sync local nodes when props change (but not during drag)
  useEffect(() => {
    setLocalNodes(nodesWithType);
  }, [nodesWithType]);

  // Update selection state when selectedNodeId changes
  useEffect(() => {
    setLocalNodes(nodes => nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isSelected: node.id === selectedNodeId
      }
    })));
  }, [selectedNodeId]);

  // Handle node changes locally for smooth dragging
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Filter out selection changes - we handle selection ourselves via onNodeClick
    const nonSelectionChanges = changes.filter(change => change.type !== 'select');
    
    if (nonSelectionChanges.length > 0) {
      setLocalNodes(nds => applyNodeChanges(nonSelectionChanges, nds));
    }

    // Handle removals immediately
    for (const change of changes) {
      if (change.type === 'remove') {
        onNodeRemove(change.id);
      }
    }
  }, [onNodeRemove]);

  // Sync position to parent only when drag ends
  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    onNodePositionChange(node.id, node.position);
  }, [onNodePositionChange]);

  const onConnect = useCallback((params: Connection) => {
    if (params.source && params.target) {
      onConnectParent(params.source, params.target);
    }
  }, [onConnectParent]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onNodeSelect(node.id);
  }, [onNodeSelect]);

  const handlePaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  return (
    <div className="w-full h-full bg-neutral-950">
      <ReactFlow
        nodes={localNodes}
        edges={reactFlowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.2}
        zoomOnScroll={true}
        preventScrolling={true}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
      >
        <Background color="#404040" gap={20} size={1} className="bg-neutral-950" />
        <Controls className="bg-neutral-800 border-neutral-700" />
        <MiniMap
          nodeColor="#3b82f6"
          maskColor="rgba(23, 23, 23, 0.8)"
          className="bg-neutral-900 border-neutral-700"
        />
      </ReactFlow>
    </div>
  );
};

export default React.memo(EditorGraph);