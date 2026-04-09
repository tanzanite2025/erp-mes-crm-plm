import { Info, Users } from 'lucide-react'
import { EmployeeManagementList } from './employee-management-list'
import { PageHeader } from '@/components/layout/page-header'
import { useLanguage } from '@/context/language-provider'

export function EmployeeMgmt() {
    const { locale, t } = useLanguage()
    const deptBindingHint = locale === 'zh-CN'
        ? '人员管理中的“部门”字段固定关联组织管理中的二级部门；三级生产单元仅用于生产组织，不作为人员部门。'
        : 'The Department field in Personnel Management is fixed to level-2 departments from Organization Management. Level-3 production units are not valid personnel departments.'

    return (
        <div className='flex flex-col gap-2 animate-in fade-in duration-700'>
            <PageHeader 
                title={t('orgPersonnel.org.personnelProfile.title')}
                description={t('orgPersonnel.org.personnelProfile.desc')}
                icon={Users}
            />
            <div className='px-1'>
                <div className='mb-3 flex items-start gap-3 rounded-[20px] border border-dashed border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-900 shadow-sm'>
                    <Info className='mt-0.5 size-4 shrink-0 text-blue-600' />
                    <p className='text-[12px] font-bold leading-relaxed'>{deptBindingHint}</p>
                </div>
                <EmployeeManagementList />
            </div>
        </div>
    )
}
