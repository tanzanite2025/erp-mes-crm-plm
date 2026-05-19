import { Users } from 'lucide-react'
import { EmployeeManagementList } from './employee-management-list'
import { IndustrialHeader } from '@/components/uds/industrial-header'
import { useLanguage } from '@/context/language-provider'

export function EmployeeMgmt() {
    const { t } = useLanguage()

    return (
        <div className='flex flex-col gap-1 animate-in fade-in duration-700'>
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
