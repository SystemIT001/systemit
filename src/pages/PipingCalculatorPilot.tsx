import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  EdgeLabelRenderer,
} from '@xyflow/react';
import type {
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { useInventory } from '../hooks/useInventory';
import './PipingCalculatorPilot.css';

// --- Custom Nodes ---

const centralHandleStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0 };

const JunctionNode = () => (
  <div className="junction-node">
    <Handle type="target" position={Position.Top} style={centralHandleStyle} />
    <Handle type="source" position={Position.Bottom} style={centralHandleStyle} />
    <div className="junction-core"></div>
  </div>
);

const IconNode = ({ data, selected }: any) => (
  <div className={`icon-node ${selected ? 'selected' : ''}`}>
    <Handle type="target" position={Position.Top} style={centralHandleStyle} />
    <Handle type="source" position={Position.Bottom} style={centralHandleStyle} />
    <span title={data.label}>{data.icon}</span>
  </div>
);

const FloorplanNode = ({ data }: any) => (
  <div style={{ pointerEvents: 'none' }}>
    <img src={data.url} alt="Plano de Fondo" style={{ opacity: 0.5, maxWidth: 'none', display: 'block' }} />
  </div>
);

// --- CABLE ROUTING AND PIPE SIZING HELPERS ---
interface CableTypeConfig {
  id: string;
  name: string;
  diameter: string;
  capacities: { size: string; maxCables: number }[];
}

const CABLE_CONFIGS: CableTypeConfig[] = [
  {
    id: 'cat5e',
    name: 'Cat 5e',
    diameter: '0.200"',
    capacities: [
      { size: '1/2"', maxCables: 2 },
      { size: '3/4"', maxCables: 5 },
      { size: '1"', maxCables: 9 },
      { size: '1 1/4"', maxCables: 15 },
      { size: '1 1/2"', maxCables: 25 },
      { size: '2"', maxCables: 40 },
      { size: '2 1/2"', maxCables: 70 },
      { size: '3"', maxCables: 100 },
    ]
  },
  {
    id: 'cat6',
    name: 'Cat 6',
    diameter: '0.250"',
    capacities: [
      { size: '1/2"', maxCables: 2 },
      { size: '3/4"', maxCables: 4 },
      { size: '1"', maxCables: 6 },
      { size: '1 1/4"', maxCables: 10 },
      { size: '1 1/2"', maxCables: 14 },
      { size: '2"', maxCables: 26 },
      { size: '2 1/2"', maxCables: 40 },
      { size: '3"', maxCables: 58 },
    ]
  },
  {
    id: 'cat6a_354',
    name: 'Cat 6A (0.354")',
    diameter: '0.354"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 2 },
      { size: '1"', maxCables: 3 },
      { size: '1 1/4"', maxCables: 5 },
      { size: '1 1/2"', maxCables: 7 },
      { size: '2"', maxCables: 13 },
      { size: '2 1/2"', maxCables: 20 },
      { size: '3"', maxCables: 29 },
    ]
  },
  {
    id: 'cat6a_330',
    name: 'Cat 6A (0.330")',
    diameter: '0.330"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 2 },
      { size: '1"', maxCables: 4 },
      { size: '1 1/4"', maxCables: 6 },
      { size: '1 1/2"', maxCables: 8 },
      { size: '2"', maxCables: 15 },
      { size: '2 1/2"', maxCables: 23 },
      { size: '3"', maxCables: 33 },
    ]
  },
  {
    id: 'cat6_ftp',
    name: 'Cat 6 FTP',
    diameter: '0.290"',
    capacities: [
      { size: '1/2"', maxCables: 1 },
      { size: '3/4"', maxCables: 3 },
      { size: '1"', maxCables: 5 },
      { size: '1 1/4"', maxCables: 7 },
      { size: '1 1/2"', maxCables: 11 },
      { size: '2"', maxCables: 19 },
      { size: '2 1/2"', maxCables: 30 },
      { size: '3"', maxCables: 43 },
    ]
  }
];

function getPipeSize(cableCount: number, cableTypeId: string): string {
  const config = CABLE_CONFIGS.find((c) => c.id === cableTypeId) || CABLE_CONFIGS[1];
  if (cableCount === 0) return config.capacities[0].size;
  const matched = config.capacities.find((cap) => cableCount <= cap.maxCables);
  return matched ? matched.size : `>${config.capacities[config.capacities.length - 1].size}`;
}


function computeCableRoutes(nodes: Node[], edges: Edge[]) {
  const adj: Record<string, { node: string; edgeId: string; weight: number }[]> = {};
  
  nodes.forEach(n => {
    adj[n.id] = [];
  });
  
  edges.forEach(e => {
    const u = e.source;
    const v = e.target;
    const weight = (e.data?.length as number) || 1;
    
    if (adj[u] && adj[v]) {
      adj[u].push({ node: v, edgeId: e.id, weight });
      adj[v].push({ node: u, edgeId: e.id, weight });
    }
  });

  const hubs = nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'gabinete').map(n => n.id);
  const cameras = nodes.filter(n => n.type === 'iconNode' && n.data?.type === 'camara').map(n => n.id);

  const edgeCableCount: Record<string, number> = {};
  edges.forEach(e => {
    edgeCableCount[e.id] = 0;
  });

  let totalCableLength = 0;

  cameras.forEach(camId => {
    if (hubs.length === 0) return;

    const dist: Record<string, number> = {};
    const prev: Record<string, { node: string; edgeId: string } | null> = {};
    const visited = new Set<string>();

    nodes.forEach(n => {
      dist[n.id] = Infinity;
      prev[n.id] = null;
    });

    dist[camId] = 0;

    const activeNodes = new Set(nodes.map(n => n.id));

    while (activeNodes.size > 0) {
      let u: string | null = null;
      let minDist = Infinity;
      activeNodes.forEach(nodeId => {
        if (dist[nodeId] < minDist) {
          minDist = dist[nodeId];
          u = nodeId;
        }
      });

      if (u === null || minDist === Infinity) break;

      activeNodes.delete(u);
      visited.add(u);

      if (hubs.includes(u)) break;

      const neighbors = adj[u] || [];
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.node)) continue;
        const alt = dist[u] + neighbor.weight;
        if (alt < dist[neighbor.node]) {
          dist[neighbor.node] = alt;
          prev[neighbor.node] = { node: u, edgeId: neighbor.edgeId };
        }
      }
    }

    let closestHub: string | null = null;
    let minHubDist = Infinity;
    hubs.forEach(hId => {
      if (dist[hId] < minHubDist) {
        minHubDist = dist[hId];
        closestHub = hId;
      }
    });

    if (closestHub && minHubDist !== Infinity) {
      let curr: any = closestHub;
      let iterations = 0;
      const maxIterations = nodes.length;
      while (curr !== camId && iterations < maxIterations) {
        const step = prev[curr];
        if (!step) break;
        edgeCableCount[step.edgeId] = (edgeCableCount[step.edgeId] || 0) + 1;
        const edgeObj = edges.find(e => e.id === step.edgeId);
        totalCableLength += (edgeObj?.data?.length as number) || 0;
        curr = step.node;
        iterations++;
      }
    }
  });

  return {
    edgeCableCount,
    totalCableLength,
    hasHubs: hubs.length > 0,
  };
}

// --- Custom Bendable Edge (draggable midpoint) ---
const BendableEdge: React.FC<EdgeProps> = ({ id, sourceX, sourceY, targetX, targetY, data, style, label, selected }) => {
  const { setEdges, screenToFlowPosition } = useReactFlow();
  const isDragging = useRef(false);

  // Default bend point is the midpoint
  const bendX = (data?.bendX as number) ?? (sourceX + targetX) / 2;
  const bendY = (data?.bendY as number) ?? (sourceY + targetY) / 2;

  // Polyline path: source → bend → target
  const edgePath = `M${sourceX},${sourceY} L${bendX},${bendY} L${targetX},${targetY}`;

  // Position label at the midpoint of the longer segment to avoid overlap with bend handle
  const len1 = Math.hypot(bendX - sourceX, bendY - sourceY);
  const len2 = Math.hypot(targetX - bendX, targetY - bendY);
  const labelX = len1 >= len2 ? (sourceX + bendX) / 2 : (bendX + targetX) / 2;
  const labelY = len1 >= len2 ? (sourceY + bendY) / 2 : (bendY + targetY) / 2;

  const onBendMouseDown = useCallback((event: React.MouseEvent<SVGCircleElement>) => {
    event.stopPropagation();
    event.preventDefault();
    isDragging.current = true;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === id
            ? { ...edge, data: { ...edge.data, bendX: pos.x, bendY: pos.y } }
            : edge
        )
      );
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [id, setEdges, screenToFlowPosition]);

  return (
    <>
      {/* Invisible thick path for easier click selection */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        stroke="transparent"
      />
      {/* Visible edge */}
      <path
        d={edgePath}
        fill="none"
        style={{
          ...style,
          strokeDasharray: '8 4',
          strokeWidth: selected ? 4 : 3,
          stroke: selected ? '#fff' : 'var(--primary-color)',
          filter: selected ? 'drop-shadow(0 0 4px var(--primary-color))' : 'none',
        }}
      />
      {/* Draggable bend handle — always visible */}
      <circle
        cx={bendX}
        cy={bendY}
        r={8}
        fill="var(--primary-color)"
        stroke="var(--bg-color)"
        strokeWidth={2}
        className="bend-handle nodrag nopan"
        onMouseDown={onBendMouseDown}
      />
      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 11,
            background: 'var(--bg-color)',
            color: 'var(--text-main)',
            padding: '2px 6px',
            borderRadius: 4,
            border: `1px solid ${selected ? 'var(--primary-color)' : 'var(--border-color)'}`,
            pointerEvents: 'none',
            fontWeight: 600,
          }}
          className="nodrag nopan"
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

const nodeTypes = {
  junction: JunctionNode,
  iconNode: IconNode,
  floorplan: FloorplanNode,
};

const edgeTypes = {
  bendable: BendableEdge,
};

// --- Main Inner Component ---

const PipingCalculatorInner = () => {
  const [nodes, setNodes] = useNodesState<Node>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [wastePercentage, setWastePercentage] = useState<number>(10);
  const [standardLength, setStandardLength] = useState<number>(6);
  const [selectedPipeId, setSelectedPipeId] = useState<string>('');
  const [cableType, setCableType] = useState<string>('cat6');
  
  // Draw Mode State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [lastDrawnNodeId, setLastDrawnNodeId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const { inventory } = useInventory();
  const materials = inventory.filter((item) => item.category === 'materials');

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge: Edge = { 
        id: `e${params.source}-${params.target}-${uuidv4()}`, 
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle || null,
        targetHandle: params.targetHandle || null,
        label: '0m', 
        data: { length: 0 },
        type: 'bendable',
        style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    if (params.edges.length > 0) setSelectedEdge(params.edges[0]);
    else setSelectedEdge(null);
  }, []);

  // --- DRAW MODE LOGIC ---
  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setLastDrawnNodeId(null);
    setSelectedEdge(null);
  };

  const toggleDrawMode = () => {
    setIsDrawingMode((prev) => {
      if (!prev) setLastDrawnNodeId(null); // Reset when activating
      return !prev;
    });
  };

  const onPaneClick = useCallback((event: React.MouseEvent) => {
    if (!isDrawingMode) return;

    // Convert screen click to React Flow coordinates
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    const newNodeId = uuidv4();
    const newNode: Node = {
      id: newNodeId,
      type: 'junction',
      position,
      data: {},
    };

    setNodes((nds) => [...nds, newNode]);

    // Automatically connect to the last drawn node
    if (lastDrawnNodeId) {
      const newEdge: Edge = {
        id: `e${lastDrawnNodeId}-${newNodeId}`,
        source: lastDrawnNodeId,
        target: newNodeId,
        label: '0m',
        data: { length: 0 },
        type: 'bendable',
        style: { strokeWidth: 3, stroke: 'var(--primary-color)' },
      };
      setEdges((eds) => [...eds, newEdge]);
    }

    setLastDrawnNodeId(newNodeId);
  }, [isDrawingMode, lastDrawnNodeId, screenToFlowPosition, setNodes, setEdges]);

  // Pressing ESC stops the continuous line
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLastDrawnNodeId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- DRAG AND DROP LOGIC ---
  const onDragStart = (event: React.DragEvent, nodeData: string) => {
    event.dataTransfer.setData('application/reactflow', nodeData);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');
      
      if (!nodeDataStr || !reactFlowBounds) return;
      const nodeData = JSON.parse(nodeDataStr);

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: uuidv4(),
        type: 'iconNode',
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // --- BACKGROUND PLAN UPLOAD ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const bgUrl = event.target?.result as string;
        setNodes((nds) => {
          const filtered = nds.filter(n => n.id !== 'floorplan-bg');
          return [
            {
              id: 'floorplan-bg',
              type: 'floorplan',
              position: { x: 0, y: 0 },
              data: { url: bgUrl },
              draggable: false,
              selectable: false,
              zIndex: -1,
            },
            ...filtered
          ];
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // --- EDGE VERTICAL METERS EDITING ---
  const handleVerticalMetersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value) || 0;
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === selectedEdge.id) {
            edge.data = { ...edge.data, verticalMeters: val };
          }
          return edge;
        })
      );
      setSelectedEdge((prev) => (prev ? { ...prev, data: { ...prev.data, verticalMeters: val } } : null));
    }
  };

  // --- EDGE PIPE SPLIT OVERRIDE ---
  const handlePipeSplitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    if (selectedEdge) {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === selectedEdge.id) {
            edge.data = { ...edge.data, splitTubes: val };
          }
          return edge;
        })
      );
      setSelectedEdge((prev) => (prev ? { ...prev, data: { ...prev.data, splitTubes: val } } : null));
    }
  };

  // --- CALCULATIONS ---
  const routingData = useMemo(() => {
    return computeCableRoutes(nodes, edges);
  }, [nodes, edges]);

  const processedEdges = useMemo(() => {
    const { edgeCableCount } = routingData;
    return edges.map((edge) => {
      const cableCount = edgeCableCount[edge.id] || 0;
      const horizontalLength = (edge.data?.length as number) || 0;
      const verticalMeters = (edge.data?.verticalMeters as number) || 0;
      const totalLength = horizontalLength + verticalMeters;
      const splitTubes = (edge.data?.splitTubes as number) || 1;
      // When split > 1, distribute cables evenly across the split tubes
      const cablesPerTube = splitTubes > 1 ? Math.ceil(cableCount / splitTubes) : cableCount;
      const pipeSize = getPipeSize(cablesPerTube, cableType);
      
      const splitLabel = splitTubes > 1 ? ` ×${splitTubes}` : '';
      const vertLabel = verticalMeters > 0 ? ` (+${verticalMeters}m↕)` : '';
      const labelText = `${horizontalLength}m${vertLabel} • ${cableCount} cables (${pipeSize}${splitLabel})`;

      return {
        ...edge,
        label: labelText,
        data: {
          ...edge.data,
          cableCount,
          pipeSize,
          splitTubes,
          verticalMeters,
          totalLength,
        },
      };
    });
  }, [edges, routingData, cableType]);

  const activeSelectedEdge = useMemo(() => {
    if (!selectedEdge) return null;
    return processedEdges.find((e) => e.id === selectedEdge.id) || null;
  }, [selectedEdge, processedEdges]);

  const { totalLength, fittingsCount, elementsCount, pipeBreakdown, totalCableLength, hasHubs } = useMemo(() => {
    const total = processedEdges.reduce((acc, edge) => {
      const tLen = (edge.data?.totalLength as number) || 0;
      return acc + tLen;
    }, 0);

    const breakdown: Record<string, number> = {
      '1/2"': 0,
      '3/4"': 0,
      '1"': 0,
      '1 1/4"': 0,
      '1 1/2"': 0,
      '2"': 0,
      '2 1/2"': 0,
      '3"': 0,
    };

    processedEdges.forEach((edge) => {
      const totalLength = (edge.data?.totalLength as number) || 0;
      const pipeSize = edge.data?.pipeSize as string || '1/2"';
      const splitTubes = (edge.data?.splitTubes as number) || 1;
      if (breakdown[pipeSize] === undefined) {
        breakdown[pipeSize] = 0;
      }
      // Each split tube requires the full run length
      breakdown[pipeSize] += totalLength * splitTubes;
    });

    const nodeConnections: Record<string, number> = {};
    nodes.filter(n => n.type === 'junction').forEach(n => nodeConnections[n.id] = 0);
    
    edges.forEach(e => {
      if (nodeConnections[e.source] !== undefined) nodeConnections[e.source]++;
      if (nodeConnections[e.target] !== undefined) nodeConnections[e.target]++;
    });

    const fittings = { valvesOrCaps: 0, elbows: 0, tees: 0, crosses: 0 };

    Object.values(nodeConnections).forEach(count => {
      if (count === 1) fittings.valvesOrCaps++;
      if (count === 2) fittings.elbows++;
      if (count === 3) fittings.tees++;
      if (count >= 4) fittings.crosses++;
    });

    const elements = {
      gabinetes: nodes.filter(n => n.type === 'iconNode' && n.data.type === 'gabinete').length,
      caja4x4: nodes.filter(n => n.type === 'iconNode' && n.data.type === 'caja4x4').length,
      caja2x4: nodes.filter(n => n.type === 'iconNode' && n.data.type === 'caja2x4').length,
      camaras: nodes.filter(n => n.type === 'iconNode' && n.data.type === 'camara').length,
    };

    return { 
      totalLength: total, 
      fittingsCount: fittings, 
      elementsCount: elements,
      pipeBreakdown: breakdown,
      totalCableLength: routingData.totalCableLength,
      hasHubs: routingData.hasHubs,
    };
  }, [nodes, edges, processedEdges, routingData]);


  return (
    <div className="piping-calculator-container">
      <div className="flow-area" ref={reactFlowWrapper}>
        <div className="toolbar">
          <button 
            className={`btn-toolbar ${isDrawingMode ? 'active' : ''}`} 
            onClick={toggleDrawMode}
          >
            {isDrawingMode ? '🛑 Detener Dibujo (Esc)' : '✏️ Dibujar Tubería'}
          </button>
          <button className="btn-toolbar" onClick={() => fileInputRef.current?.click()}>
            🖼️ Subir Plano (Fondo)
          </button>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button className="btn-toolbar btn-danger" onClick={clearCanvas}>
            🗑️ Limpiar Plano
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={processedEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          defaultEdgeOptions={{ type: 'bendable' }}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={24} size={1} color="var(--border-color)" />
        </ReactFlow>
      </div>

      <div className="sidebar-panel">
        <h3>Herramientas CAD</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Arrastra elementos al plano:</p>
        <div className="dnd-sidebar">
          <div>
            <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type: 'gabinete', icon: '🏢', label: 'Gabinete' }))}>🏢</div>
            <div className="dnd-label">Gabinete</div>
          </div>
          <div>
            <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type: 'caja4x4', icon: '🔲', label: 'Caja 4x4' }))}>🔲</div>
            <div className="dnd-label">Caja 4x4</div>
          </div>
          <div>
            <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type: 'caja2x4', icon: '▯', label: 'Caja 2x4' }))}>▯</div>
            <div className="dnd-label">Caja 2x4</div>
          </div>
          <div>
            <div className="dnd-node" draggable onDragStart={(e) => onDragStart(e, JSON.stringify({ type: 'camara', icon: '📷', label: 'Cámara' }))}>📷</div>
            <div className="dnd-label">Cámara</div>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0', width: '100%' }} />

        <h3>Calculadora</h3>
        
        <div className="form-group">
          <label>Tubo a utilizar (Inventario)</label>
          <select value={selectedPipeId} onChange={(e) => setSelectedPipeId(e.target.value)}>
            <option value="">Seleccione un tubo...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Tipo/Categoría de Cable UTP</label>
          <select value={cableType} onChange={(e) => setCableType(e.target.value)}>
            {CABLE_CONFIGS.map((config) => (
              <option key={config.id} value={config.id}>
                {config.name} ({config.diameter})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Largo estándar tubo (m)</label>
          <input 
            type="number" 
            value={standardLength} 
            onChange={(e) => setStandardLength(parseFloat(e.target.value) || 1)} 
            min="1"
          />
        </div>

        <div className="form-group">
          <label>Margen de Desperdicio (%)</label>
          <input 
            type="number" 
            value={wastePercentage} 
            onChange={(e) => setWastePercentage(parseFloat(e.target.value) || 0)} 
            min="0"
          />
        </div>

        {activeSelectedEdge && (() => {
          const cableCount = (activeSelectedEdge.data?.cableCount as number) || 0;
          const pipeSize = activeSelectedEdge.data?.pipeSize as string || '1/2"';
          const splitTubes = (activeSelectedEdge.data?.splitTubes as number) || 1;
          const horizontalLen = ((activeSelectedEdge.data as any)?.length as number) || 0;
          const verticalLen = (activeSelectedEdge.data?.verticalMeters as number) || 0;
          const totalLen = horizontalLen + verticalLen;
          const cablesPerTube = splitTubes > 1 ? Math.ceil(cableCount / splitTubes) : cableCount;

          return (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ color: 'var(--primary-color)', fontWeight: 'bold', margin: 0 }}>✏️ Editar Línea Seleccionada</label>

              {/* Info chips */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  {cableCount} cables
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--primary-color)', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                  {splitTubes > 1 ? `${splitTubes}× ` : ''}Tubo {pipeSize} {splitTubes > 1 ? `(${cablesPerTube} cab/tubo)` : ''}
                </span>
                <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  Total: {totalLen.toFixed(1)}m
                </span>
              </div>

              {/* Horizontal length */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>📐 Longitud horizontal (m)</label>
                <input
                  type="number"
                  value={horizontalLen}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setEdges((eds) => eds.map((edge) => {
                      if (edge.id === selectedEdge!.id) {
                        edge.data = { ...edge.data, length: val };
                        edge.label = `${val}m`;
                      }
                      return edge;
                    }));
                    setSelectedEdge((prev) => prev ? { ...prev, data: { ...prev.data, length: val } } : null);
                  }}
                  min="0"
                  step="0.1"
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
              </div>

              {/* Vertical meters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>↕️ Metros verticales (bajada/subida)</label>
                <input
                  type="number"
                  value={verticalLen}
                  onChange={handleVerticalMetersChange}
                  min="0"
                  step="0.1"
                  placeholder="Ej: 3 (del techo al cielo falso)"
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                {verticalLen > 0 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Total efectivo: {horizontalLen}m + {verticalLen}m = <strong>{totalLen.toFixed(1)}m</strong>
                  </span>
                )}
              </div>

              {/* Split tubes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', margin: 0 }}>🔀 Dividir en N tubos paralelos</label>
                <input
                  type="number"
                  value={splitTubes}
                  onChange={handlePipeSplitChange}
                  min="1"
                  max="10"
                  step="1"
                  style={{ padding: '0.4rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem' }}
                />
                {splitTubes > 1 && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {cableCount} cables ÷ {splitTubes} tubos = {cablesPerTube} cables/tubo → Tubo {pipeSize} cada uno
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        <div className="results-section">
          {/* UTP Cable Metraje Card */}
          <div className="result-card" style={{ borderLeft: '3px solid var(--primary-color)' }}>
            <h4 style={{ color: 'var(--primary-color)' }}>Metraje de Cable UTP</h4>
            {!hasHubs ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                ⚠️ Agrega un Gabinete (🏢) como centro de cableado para calcular las rutas de cable.
              </div>
            ) : (
              <>
                <div className="result-item">
                  <span>Cable Dibujado:</span>
                  <strong>{totalCableLength.toFixed(2)} m</strong>
                </div>
                <div className="result-item">
                  <span>Con Desperdicio (+{wastePercentage}%):</span>
                  <strong>{(totalCableLength * (1 + wastePercentage / 100)).toFixed(2)} m</strong>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.5rem 0 0 0', lineHeight: '1.2' }}>
                  * Calcula la ruta de cada Cámara (📷) al Gabinete (🏢) más cercano.
                </p>
              </>
            )}
          </div>

          <div className="result-card">
            <h4>Tubería a Comprar</h4>
            <div className="result-item">
              <span>Metraje Total Dibujado:</span>
              <strong>{totalLength.toFixed(2)} m</strong>
            </div>
            <div className="result-item">
              <span>Metraje Con Desperdicio:</span>
              <strong>{(totalLength * (1 + wastePercentage / 100)).toFixed(2)} m</strong>
            </div>

            {/* Breakdown per size */}
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
              <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Desglose por Diámetro</h5>
              {Object.entries(pipeBreakdown).map(([size, length]) => {
                if (length === 0) return null;
                const lengthWithWaste = length * (1 + wastePercentage / 100);
                const tubes = Math.ceil(lengthWithWaste / standardLength);
                return (
                  <div key={size} className="result-item" style={{ fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                    <span>Tubo {size}:</span>
                    <strong>{length.toFixed(1)}m → {tubes} {tubes === 1 ? 'tubo' : 'tubos'}</strong>
                  </div>
                );
              })}
              {Object.values(pipeBreakdown).every(l => l === 0) && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Sin tuberías dibujadas
                </div>
              )}
            </div>

            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Tubos por Medida:</span>
              <strong style={{ fontSize: '1.05rem', color: 'var(--primary-color)', textAlign: 'right' }}>
                {(() => {
                  const items = Object.entries(pipeBreakdown)
                    .map(([size, length]) => {
                      if (length === 0) return null;
                      const lengthWithWaste = length * (1 + wastePercentage / 100);
                      const tubes = Math.ceil(lengthWithWaste / standardLength);
                      return `${tubes} (${size})`;
                    })
                    .filter(Boolean);
                  return items.length > 0 ? items.join(' + ') : '0 tubos';
                })()}
              </strong>
            </div>
          </div>

          <div className="result-card">
            <h4>Uniones y Codos</h4>
            <div className="result-item">
              <span>Codos 90°:</span>
              <strong>{fittingsCount.elbows}</strong>
            </div>
            <div className="result-item">
              <span>Tees (3 vías):</span>
              <strong>{fittingsCount.tees}</strong>
            </div>
            <div className="result-item">
              <span>Cruces (4 vías):</span>
              <strong>{fittingsCount.crosses}</strong>
            </div>
          </div>

          <div className="result-card" style={{ borderLeft: '3px solid var(--success-color)' }}>
            <h4 style={{ color: 'var(--success-color)' }}>Equipos Agregados</h4>
            <div className="result-item">
              <span>Gabinetes:</span>
              <strong>{elementsCount.gabinetes}</strong>
            </div>
            <div className="result-item">
              <span>Cajas 4x4:</span>
              <strong>{elementsCount.caja4x4}</strong>
            </div>
            <div className="result-item">
              <span>Cajas 2x4:</span>
              <strong>{elementsCount.caja2x4}</strong>
            </div>
            <div className="result-item">
              <span>Cámaras:</span>
              <strong>{elementsCount.camaras}</strong>
            </div>
          </div>

          {/* Reference Sizing Table */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Capacidad Máxima de Cables UTP (40% Ocupación)</h4>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem', textAlign: 'center', minWidth: '340px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 'bold' }}>
                    <th style={{ padding: '6px 4px', textAlign: 'left' }}>Tubo</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat5e' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>5e</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_354' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6A(.35)</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_330' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6A(.33)</th>
                    <th style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6_ftp' ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}>6FTP</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { size: '1/2"', c5: 2, c6: 2, c6a1: 1, c6a2: 1, cftp: 1 },
                    { size: '3/4"', c5: 5, c6: 4, c6a1: 2, c6a2: 2, cftp: 3 },
                    { size: '1"', c5: 9, c6: 6, c6a1: 3, c6a2: 4, cftp: 5 },
                    { size: '1 1/4"', c5: 15, c6: 10, c6a1: 5, c6a2: 6, cftp: 7 },
                    { size: '1 1/2"', c5: 25, c6: 14, c6a1: 7, c6a2: 8, cftp: 11 },
                    { size: '2"', c5: 40, c6: 26, c6a1: 13, c6a2: 15, cftp: 19 },
                    { size: '2 1/2"', c5: 70, c6: 40, c6a1: 20, c6a2: 23, cftp: 30 },
                    { size: '3"', c5: 100, c6: 58, c6a1: 29, c6a2: 33, cftp: 43 },
                  ].map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: idx < 7 ? '1px solid var(--border-color)' : 'none', color: 'var(--text-muted)' }}>
                      <td style={{ padding: '6px 4px', textAlign: 'left', fontWeight: 'bold', color: 'var(--text-main)' }}>{row.size}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat5e' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat5e' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat5e' ? 'bold' : 'normal' }}>{row.c5}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6' ? 'bold' : 'normal' }}>{row.c6}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_354' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6a_354' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6a_354' ? 'bold' : 'normal' }}>{row.c6a1}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6a_330' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6a_330' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6a_330' ? 'bold' : 'normal' }}>{row.c6a2}</td>
                      <td style={{ padding: '6px 4px', backgroundColor: cableType === 'cat6_ftp' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: cableType === 'cat6_ftp' ? 'var(--primary-color)' : 'inherit', fontWeight: cableType === 'cat6_ftp' ? 'bold' : 'normal' }}>{row.cftp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic', lineHeight: '1.2' }}>
              * La columna resaltada indica la categoría seleccionada actualmente en la calculadora.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const PipingCalculatorPilot: React.FC = () => {
  return (
    <ReactFlowProvider>
      <PipingCalculatorInner />
    </ReactFlowProvider>
  );
};

export default PipingCalculatorPilot;
