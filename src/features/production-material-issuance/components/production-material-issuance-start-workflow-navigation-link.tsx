import { Link } from '@tanstack/react-router'
import { PackagePlus } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { buttonVariants } from '@/components/ui/button'
import { matchesPathPermissionProjection } from '@/features/authz/guards/route-access'
import { usePermissionActions } from '@/features/authz/hooks/use-permission-access'

/** Navigation only. Reading a guide or warehouse instructions never mounts business queries. */
export function ProductionMaterialIssuanceStartWorkflowNavigationLink() {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const { allowsAction } = usePermissionActions()
  if (
    !matchesPathPermissionProjection(
      user,
      '/mrp/production-material-issuance'
    ) ||
    !allowsAction('action_production_material_issuance_view') ||
    !allowsAction('action_production_material_issuance_dispatch')
  )
    return (
      <p className='text-xs leading-6 text-muted-foreground'>
        {t('mrp.productionMaterialIssuance.start.permissionRequired')}
      </p>
    )
  return (
    <Link
      to='/mrp/production-material-issuance'
      search={{ intent: 'start' }}
      className={buttonVariants({
        className:
          'h-auto min-h-10 max-w-full rounded-full px-5 py-2 whitespace-normal',
      })}
    >
      <PackagePlus aria-hidden='true' className='size-4' />
      {t('mrp.productionMaterialIssuance.start.action')}
    </Link>
  )
}
