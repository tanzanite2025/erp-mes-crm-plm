import { useCallback } from 'react'
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
  type Connection,
  type Node,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { MRPNode, RouterNode } from './components/blueprint-node'
import { initialNodes, initialEdges } from './data/mock-data'

/**
 * XDFC Blueprint Lab - 隔离开发中心
 */

const nodeTypes = {
  mrpNode: MRPNode,
  routerNode: RouterNode,
}

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: 'hsl(var(--primary))', strokeWidth: 1.5, opacity: 0.6 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'hsl(var(--primary))',
  },
}

interface ReactFlowViewportController {
  fitView: () => void
}

type WindowWithReactFlow = Window & {
  reactFlowInstance?: ReactFlowViewportController
}

interface BlueprintLabProps {
  orderNo?: string
}

export function BlueprintLab({ orderNo }: BlueprintLabProps) {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds: Edge[]) => addEdge(params, eds)),
    [setEdges]
  )

  return (
    <div className='flex h-full w-full animate-in flex-col gap-8 bg-muted/5 duration-700 fade-in'>
      {/* 实验室顶部页眉 - UDS 1.0 标准 */}
      <div className='flex flex-col gap-2 rounded-[32px] border border-dashed bg-background/50 p-6 backdrop-blur-md'>
        <h1 className='text-lg font-black tracking-tighter uppercase italic'>
          Order Lifecycle Blueprint {orderNo ? `#${orderNo}` : 'Lab'}
        </h1>
        <p className='text-[9px] font-black tracking-widest uppercase opacity-60'>
          Visual Supply Chain Traceability • Isolated Environment v1.0.0
        </p>
      </div>

      {/* 蓝图画布容器 */}
      <div className='relative flex-1 overflow-hidden rounded-[32px] border border-dashed bg-background shadow-2xl'>
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
          className='bg-dot-pattern'
          minZoom={0.2}
          maxZoom={2}
        >
          <Background color='#ccc' variant='dots' gap={20} />
          <Controls />
          <MiniMap
            nodeStrokeColor={(n: Node) => {
              if (n.data?.status === 'CRITICAL')
                return 'hsl(var(--destructive))'
              return '#eee'
            }}
            nodeColor={(n: Node) => {
              if (n.data?.status === 'CRITICAL')
                return 'hsl(var(--destructive)/0.2)'
              return '#fff'
            }}
          />

          <Panel position='top-right' className='flex gap-2'>
            <button className='h-10 rounded-full bg-primary px-4 text-[10px] font-black tracking-widest text-primary-foreground uppercase shadow-lg transition-all hover:scale-105 active:scale-95'>
              Save Layout
            </button>
            <button
              className='h-10 rounded-full border bg-background px-4 text-[10px] font-black tracking-widest uppercase shadow-lg transition-all hover:bg-muted'
              onClick={() =>
                (window as WindowWithReactFlow).reactFlowInstance?.fitView()
              }
            >
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
  )
}

export default BlueprintLab
