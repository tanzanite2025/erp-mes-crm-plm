'use client'

import { createFileRoute } from '@tanstack/react-router'
import { MaterialAssemblyManager } from '@/features/material-archive/components/material-assembly-manager'

export const Route = createFileRoute('/_authenticated/materials/assembly')({
  component: () => <MaterialAssemblyManager />,
})
