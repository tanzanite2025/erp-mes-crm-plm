'use client'

import { useState } from 'react'
import { ArrowRight, History, Layers3, PackageSearch, PhoneCall, Truck, Users } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const tabItems = [
  { value: 'virtual-warehouse', label: '虚拟发货仓', icon: Layers3 },
  { value: 'vehicle-match', label: '车型匹配', icon: Truck },
  { value: 'contacts', label: '联系人', icon: Users },
  { value: 'history', label: '发货记录', icon: History },
] as const

type VirtualWarehouseShipment = {
  id: string
  orderNo: string
  customerName: string
  warehouseName: string
  boxCount: number
  volumeM3: number
  weightKg: number
  status: '待匹配' | '待联系' | '已锁定'
}

const virtualWarehouseShipments: VirtualWarehouseShipment[] = [
  {
    id: 'VW-001',
    orderNo: 'SO-2026-0415-001',
    customerName: '华东科技',
    warehouseName: '虚拟发货仓',
    boxCount: 18,
    volumeM3: 12.4,
    weightKg: 2680,
    status: '待匹配',
  },
  {
    id: 'VW-002',
    orderNo: 'SO-2026-0415-002',
    customerName: '恒远制造',
    warehouseName: '虚拟发货仓',
    boxCount: 10,
    volumeM3: 8.1,
    weightKg: 1640,
    status: '待联系',
  },
  {
    id: 'VW-003',
    orderNo: 'SO-2026-0415-003',
    customerName: '北辰供应链',
    warehouseName: '虚拟发货仓',
    boxCount: 24,
    volumeM3: 17.8,
    weightKg: 3520,
    status: '已锁定',
  },
]

function EmptyBlock({ title, description, actionLabel }: { title: string; description: string; actionLabel: string }) {
  return (
    <Card className='rounded-[28px] border-dashed border-border/60 bg-background/80 p-6 shadow-none'>
      <div className='flex items-start justify-between gap-4'>
        <div className='space-y-2'>
          <div className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/60'>{title}</div>
          <div className='max-w-2xl text-sm leading-relaxed text-muted-foreground'>{description}</div>
        </div>
        <Badge className='h-6 rounded-full border-none bg-primary/10 px-3 text-[10px] font-black text-primary'>
          待接逻辑
        </Badge>
      </div>
      <div className='mt-6 flex flex-wrap gap-3'>
        <Button
          type='button'
          className='h-10 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20'
        >
          {actionLabel}
        </Button>
        <Button
          type='button'
          variant='outline'
          className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'
        >
          预留按钮
        </Button>
      </div>
    </Card>
  )
}

function VirtualShipmentRow({ item }: { item: VirtualWarehouseShipment }) {
  return (
    <Card className='rounded-[24px] border-dashed border-border/60 bg-background/90 p-5 shadow-none'>
      <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge className='h-6 rounded-full border-none bg-primary/10 px-3 text-[10px] font-black text-primary'>{item.status}</Badge>
            <span className='text-[10px] font-black uppercase tracking-widest text-muted-foreground/50'>{item.warehouseName}</span>
          </div>
          <div>
            <div className='text-sm font-black text-foreground'>{item.customerName}</div>
            <div className='mt-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60'>{item.orderNo}</div>
          </div>
        </div>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-4 lg:min-w-[520px]'>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>箱数</div>
            <div className='mt-1 text-sm font-black'>{item.boxCount}</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>体积</div>
            <div className='mt-1 text-sm font-black'>{item.volumeM3.toFixed(1)} m³</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-muted/[0.03] px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-muted-foreground/50'>重量</div>
            <div className='mt-1 text-sm font-black'>{item.weightKg.toFixed(0)} kg</div>
          </div>
          <div className='rounded-2xl border border-dashed border-border/60 bg-primary/5 px-3 py-2'>
            <div className='text-[9px] font-black uppercase tracking-widest text-primary/60'>当前动作</div>
            <div className='mt-1 text-sm font-black text-primary'>待发货</div>
          </div>
        </div>
      </div>

      <div className='mt-5 flex flex-wrap gap-3'>
        <Button
          type='button'
          className='h-10 rounded-full bg-primary px-5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20'
        >
          车型匹配
          <ArrowRight className='ml-2 size-4' />
        </Button>
        <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'>
          查看详情
        </Button>
        <Button type='button' variant='outline' className='h-10 rounded-full border-dashed px-5 text-[10px] font-black uppercase tracking-widest'>
          <PhoneCall className='mr-2 size-4' />
          联系人
        </Button>
      </div>
    </Card>
  )
}

export function ShippingManagementTab() {
  const [activeTab, setActiveTab] = useState<(typeof tabItems)[number]['value']>('virtual-warehouse')

  return (
    <div className='flex flex-col gap-8 animate-in fade-in duration-700'>
      <PageHeader
        icon={PackageSearch}
        title='发货管理'
        description='从虚拟发货仓查看待发货货物，后续在这里完成车型匹配、联系人触达和发货确认。'
      />

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className='space-y-6'>
        <TabsList className='grid h-auto w-full grid-cols-2 gap-2 rounded-[24px] border border-dashed border-border/60 bg-muted/20 p-2 md:grid-cols-4'>
          {tabItems.map((item) => {
            const Icon = item.icon
            return (
              <TabsTrigger
                key={item.value}
                value={item.value}
                className='flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground'
              >
                <Icon className='size-4' />
                {item.label}
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value='virtual-warehouse' className='m-0 space-y-4'>
          <Card className='rounded-[28px] border-dashed border-border/60 bg-primary/5 p-5 shadow-none'>
            <div className='flex items-center justify-between gap-4'>
              <div>
                <div className='text-[10px] font-black uppercase tracking-widest text-primary/70'>虚拟发货仓</div>
                <div className='mt-2 text-sm font-black'>待发货货物列表</div>
              </div>
              <Badge className='h-6 rounded-full border-none bg-white/70 px-3 text-[10px] font-black text-primary'>系统保护仓</Badge>
            </div>
            <div className='mt-4 text-[11px] leading-relaxed text-primary/80'>
              后续这里会直接拉取仓库侧的“虚拟发货仓”数据，用来承接待发货货物、真实占库存并进入车型计算流程。
            </div>
          </Card>

          <div className='space-y-4'>
            {virtualWarehouseShipments.map((item) => (
              <VirtualShipmentRow key={item.id} item={item} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value='vehicle-match' className='m-0 space-y-4'>
          <EmptyBlock
            title='车型匹配'
            description='这里后续会接入装载计算结果，展示推荐车型、装载率、是否需要多车以及打开装载示意弹窗的入口。'
            actionLabel='开始匹配'
          />
        </TabsContent>

        <TabsContent value='contacts' className='m-0 space-y-4'>
          <EmptyBlock
            title='联系人'
            description='这里后续会显示车型绑定的供应商和联系人，支持电话、微信、复制联系方式和一键触达。'
            actionLabel='查看联系人'
          />
        </TabsContent>

        <TabsContent value='history' className='m-0 space-y-4'>
          <EmptyBlock
            title='发货记录'
            description='这里后续会展示发货确认、车型匹配、联系结果和历史流转，形成从发货到联系的闭环记录。'
            actionLabel='查看历史'
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
