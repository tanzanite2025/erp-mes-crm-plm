'use client'

import { useLanguage } from '@/context/language-provider'

export function Test() {
  const { t } = useLanguage()

  return <div>{t('equipmentTooling.layout.title')}</div>
}
