import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from './auth-layout'

export type LegalPageSection = {
  title: string
  paragraphs: string[]
}

type LegalPageProps = {
  title: string
  description: string
  sections: LegalPageSection[]
}

export function LegalPage({
  title,
  description,
  sections,
}: LegalPageProps) {
  return (
    <AuthLayout>
      <Card className='mx-auto max-w-3xl gap-0'>
        <CardHeader className='gap-3 border-b'>
          <p className='text-sm font-medium text-muted-foreground'>
            Internal Policy Summary
          </p>
          <CardTitle className='text-2xl'>{title}</CardTitle>
          <CardDescription className='leading-6'>
            {description}
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-8 py-6'>
          {sections.map((section) => (
            <section key={section.title} className='space-y-3'>
              <h2 className='text-lg font-semibold'>{section.title}</h2>
              <div className='space-y-3 text-sm leading-6 text-muted-foreground'>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </CardContent>
        <CardFooter className='flex flex-wrap items-center justify-between gap-3 border-t'>
          <p className='text-sm text-muted-foreground'>
            If you need the organization&apos;s full legal text, contact your
            administrator or compliance owner.
          </p>
          <Button variant='outline' asChild>
            <Link to='/sign-in'>Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
