import { Users } from 'lucide-react'
import { EmployeeManagementList } from './employee-management-list'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

export function EmployeeMgmt() {
    const { t } = useLanguage()
    return (
        <div className='flex flex-col gap-2 animate-in fade-in duration-700'>
            <PageHeader 
                title={t('orgPersonnel.org.personnelProfile.title' as any)}
                description={t('orgPersonnel.org.personnelProfile.desc' as any)}
                icon={Users}
            />
            <div className='px-1'>
                <EmployeeManagementList />
            </div>
        </div>
    )
}
