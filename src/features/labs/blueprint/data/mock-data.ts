import { type Node, type Edge } from 'reactflow';

/**
 * XDFC 工业蓝图 Mock 数据 (实验室隔离版本)
 * 基于 SAP ATP / MRP 可视化逻辑
 */

export const initialNodes: Node[] = [
  {
    id: 'node-requested',
    type: 'mrpNode',
    position: { x: 0, y: 150 },
    data: { 
      label: 'Requested',
      title: 'MZ-FG-E300 - Headlight',
      subtitle: '1710 - Plant 1 US',
      date: '04/23/2023 (ET)',
      quantity: 50,
      unit: 'PC',
      status: 'PRIMARY',
      icon: 'box'
    },
  },
  {
    id: 'node-router',
    type: 'routerNode', // 中央分配路由节点
    position: { x: 300, y: 180 },
    data: {},
  },
  {
    id: 'node-supply-1',
    type: 'mrpNode',
    position: { x: 500, y: 50 },
    data: { 
      title: 'MZ-FG-E300 - Headlight',
      subtitle: '1710 - Plant 1 US',
      quantity: 20,
      unit: 'PC',
      status: 'ALERT', // 橙色警告 (需补足)
      icon: 'factory'
    },
  },
  {
    id: 'node-supply-2',
    type: 'mrpNode',
    position: { x: 500, y: 250 },
    data: { 
      title: 'MZ-FG-E300 - Headlight',
      subtitle: 'US20 - Plant US20',
      quantity: 30, // 补充库存
      unit: 'PC',
      status: 'HEALTHY', // 绿色健康
      icon: 'warehouse'
    },
  },
  {
    id: 'node-delivery-1',
    type: 'mrpNode',
    position: { x: 850, y: 80 },
    data: { 
      date: '04/26/2023 (ET)',
      quantity: 20,
      unit: 'PC',
      status: 'ALERT',
      icon: 'truck'
    },
  },
  {
    id: 'node-delivery-2',
    type: 'mrpNode',
    position: { x: 850, y: 280 },
    data: { 
      date: '04/27/2023 (ET)',
      quantity: 50,
      unit: 'PC',
      status: 'HEALTHY',
      icon: 'check-circle'
    },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e-req-router', source: 'node-requested', target: 'node-router', animated: true },
  { id: 'e-router-s1', source: 'node-router', target: 'node-supply-1', style: { strokeWidth: 2 } },
  { id: 'e-router-s2', source: 'node-router', target: 'node-supply-2', style: { strokeWidth: 2 } },
  { id: 'e-s1-d1', source: 'node-supply-1', target: 'node-delivery-1', type: 'smoothstep' },
  { id: 'e-s2-d2', source: 'node-supply-2', target: 'node-delivery-2', type: 'smoothstep' },
];
