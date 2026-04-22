import {
  CheckCircle2,
  ClipboardCheck,
  ListChecks,
  PackageCheck,
  PackagePlus,
} from 'lucide-react'

type SidebarCommandIconProps = {
  iconName?: string
  className?: string
  fallback?: 'check' | 'list'
}

export function SidebarCommandIcon({
  iconName,
  className,
  fallback = 'check',
}: SidebarCommandIconProps) {
  switch (iconName) {
    case 'SearchCheck':
      return <ListChecks className={className} />
    case 'PackagePlus':
      return <PackagePlus className={className} />
    case 'ScanLine':
      return <PackageCheck className={className} />
    case 'ClipboardCheck':
      return <ClipboardCheck className={className} />
    default:
      return fallback === 'list' ? (
        <ListChecks className={className} />
      ) : (
        <CheckCircle2 className={className} />
      )
  }
}
