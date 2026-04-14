import { Card } from '@/components/ui/card'

type Props = {
  className?: string
  children: React.ReactNode
}

export function PlanOverviewSectionCard({ className = '', children }: Props) {
  return <Card className={`rounded-[24px] border border-dashed border-border/55 shadow-none px-5 py-4 ${className}`}>{children}</Card>
}
