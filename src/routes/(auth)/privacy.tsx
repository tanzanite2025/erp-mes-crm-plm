import { createFileRoute } from '@tanstack/react-router'
import { LegalPage, type LegalPageSection } from '@/features/auth/legal-page'

const sections: LegalPageSection[] = [
  {
    title: 'Information we handle',
    paragraphs: [
      'The platform may process account details, business contacts, operational records, approvals, inventory events, and other data required to run authorized workflows.',
      'Sensitive information should only be entered when there is a clear business purpose and an approved handling path.',
    ],
  },
  {
    title: 'How information is used',
    paragraphs: [
      'Data is used to provide application features, maintain security, support audits, troubleshoot issues, and meet legal or contractual obligations.',
      'Access should be limited by role and shared only with people who need the information to perform approved work.',
    ],
  },
  {
    title: 'Retention and reporting',
    paragraphs: [
      'Operational and audit records may be retained according to internal retention schedules, regulatory requirements, and customer commitments.',
      'If you suspect improper access, disclosure, or retention, report it promptly to your administrator, security contact, or compliance owner.',
    ],
  },
]

function PrivacyPage() {
  return (
    <LegalPage
      title='Privacy Policy'
      description='This page provides a concise summary of how the internal ERP workspace handles business and account data.'
      sections={sections}
    />
  )
}

export const Route = createFileRoute('/(auth)/privacy')({
  component: PrivacyPage,
})
