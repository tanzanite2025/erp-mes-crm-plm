import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, type LegalPageSection } from '@/features/auth/legal-page'

const sections: LegalPageSection[] = [
  {
    title: 'Authorized access',
    paragraphs: [
      'This system is provided for authorized employees, contractors, and approved business partners only.',
      'You must use your assigned account, keep credentials confidential, and stop using the platform immediately if your authorization changes.',
    ],
  },
  {
    title: 'Responsible use',
    paragraphs: [
      'Do not bypass permissions, scrape restricted data, upload malicious files, or share internal records outside approved workflows.',
      'All business actions performed in the platform may be logged for security, audit, and operational continuity purposes.',
    ],
  },
  {
    title: 'Business data handling',
    paragraphs: [
      'Records entered into the platform must be accurate, business-relevant, and limited to the minimum information needed for the task.',
      'Organization-specific contracts, employment terms, and customer agreements take precedence over this summary where applicable.',
    ],
  },
]

function TermsPage() {
  return (
    <LegalPage
      title='Terms of Service'
      description='This page summarizes the baseline rules for accessing and using the internal ERP workspace.'
      sections={sections}
    />
  )
}

export const Route = createFileRoute('/(auth)/terms')({
  component: TermsPage,
})
