import { createLazyFileRoute } from '@tanstack/react-router'
import { PersonalWorkbenchCaptureRouteComponent } from './capture-route-component'

export const Route = createLazyFileRoute('/_authenticated/personal-workbench/capture')({
  component: PersonalWorkbenchCaptureRouteComponent,
})
