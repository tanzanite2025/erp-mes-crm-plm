import { useCallback } from 'react';
import ReactFlow, { 
  addEdge, 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType,
  Panel,
  MarkerType,
  type Edge,
  type Connection
} from 'reactflow';
import 'reactflow/dist/style.css';

import { MRPNode, RouterNode } from './components/blueprint-node';
import { initialNodes, initialEdges } from './data/mock-data';

/**
 * XDFC Blueprint Lab - 隔离开发中心
 */

const nodeTypes = {
  mrpNode: MRPNode,
  routerNode: RouterNode,
};

const defaultEdgeOptions = {
    animated: true,
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 1.5, opacity: 0.6 },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: 'hsl(var(--primary))',
    },
};

interface BlueprintLabProps {
  orderNo?: string
}

export function BlueprintLab({ orderNo }: BlueprintLabProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="flex flex-col h-full w-full gap-8 animate-in fade-in duration-700 bg-muted/5">
      {/* 实验室顶部页眉 - UDS 1.0 标准 */}
      <div className="flex flex-col gap-2 p-6 rounded-[32px] border-dashed border bg-background/50 backdrop-blur-md">
        <h1 className="text-lg font-black tracking-tighter italic uppercase">
            Order Lifecycle Blueprint {orderNo ? `#${orderNo}` : 'Lab'}
        </h1>
        <p className="text-[9px] font-black tracking-widest opacity-60 uppercase">
            Visual Supply Chain Traceability • Isolated Environment v1.0.0
        </p>
      </div>

      {/* 蓝图画布容器 */}
      <div className="flex-1 rounded-[32px] border-dashed border bg-background overflow-hidden relative shadow-2xl">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
          className="bg-dot-pattern"
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color="#ccc" variant={"dots" as any} gap={20} />
          <Controls />
          <MiniMap 
            nodeStrokeColor={(n: any) => {
                if (n.data?.status === 'CRITICAL') return 'hsl(var(--destructive))';
                return '#eee';
            }}
            nodeColor={(n: any) => {
                if (n.data?.status === 'CRITICAL') return 'hsl(var(--destructive)/0.2)';
                return '#fff';
            }}
          />
          
          <Panel position="top-right" className="flex gap-2">
             <button className="bg-primary text-primary-foreground h-10 px-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg">
                Save Layout
             </button>
             <button className="bg-background border h-10 px-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all hover:bg-muted shadow-lg" onClick={() => (window as any).reactFlowInstance?.fitView()}>
                Recenter
             </button>
          </Panel>
        </ReactFlow>
      </div>

      <style>{`
        .bg-dot-pattern {
            background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .react-flow__edge-path {
            stroke-dasharray: 4;
            animation: dash 10s linear infinite;
        }
        @keyframes dash {
            from {
                stroke-dashoffset: 100;
            }
            to {
                stroke-dashoffset: 0;
            }
        }
      `}</style>
    </div>
  );
}

export default BlueprintLab;
