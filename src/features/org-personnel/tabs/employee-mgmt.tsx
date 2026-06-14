import { Users } from 'lucide-react'
import { useLanguage } from '@/context/language-provider'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { EmployeeManagementList } from './employee-management-list'

export function EmployeeMgmt() {
  const { t } = useLanguage()

  return (
    <div className='flex animate-in flex-col gap-1 duration-700 fade-in'>
      <IndustrialHeader
        title={t('orgPersonnel.org.personnelProfile.title')}
        description={t('orgPersonnel.org.personnelProfile.desc')}
        icon={Users}
      />
      <div className='px-1'>
        <EmployeeManagementList />
      </div>
    </div>
  )
}
