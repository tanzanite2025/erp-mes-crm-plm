'use client'

import { useEffect, useMemo, useState } from 'react'
import { ListTree, Pencil, Plus, Trash2, Workflow } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createLogger } from '@/lib/logger'
import { normalizeMachineCode } from '@/lib/codecs/code-normalization'
import type { ProductionProcessStep as ProcessStep } from '../../../data/production-process'
import { useProcessLibraryProcesses } from '../hooks/use-process-library-processes'

const logger = createLogger('ProcessLibraryPanel')

interface ProcessFormState {
  id: string
  code: string
  name: string
  description: string
  sortOrder: number
  isActive: boolean
  createdAt: string
}

function createEmptyProcessState(): ProcessFormState {
  return {
    id: '',
    code: '',
    name: '',
    description: '',
    sortOrder: 0,
    isActive: true,
    createdAt: '',
  }
}

function toProcessFormState(process?: ProcessStep): ProcessFormState {
  if (!process) {
    return createEmptyProcessState()
  }

  return {
    id: process.id,
    code: normalizeMachineCode(process.code),
    name: process.name,
    description: process.description || '',
    sortOrder: process.sortOrder || 0,
    isActive: process.isActive ?? true,
    createdAt: process.createdAt || '',
  }
}

export function ProcessLibraryPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formState, setFormState] = useState<ProcessFormState>(createEmptyProcessState())
  const [isSaving, setIsSaving] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ProcessStep | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { processes, isLoading, error, saveProcess, deleteProcess } = useProcessLibraryProcesses()
  const availableProcesses = useMemo(() => processes, [processes])

  useEffect(() => {
    if (!error) {
      return
    }

    toast.error('Failed to load global process library')
    logger.error('Failed to load production processes', error)
  }, [error])

  const filteredProcesses = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()
    if (!keyword) {
      return availableProcesses
    }

    return availableProcesses.filter((process) => {
      const haystack = [process.code, process.name, process.description].join(' ').toLowerCase()
      return haystack.includes(keyword)
    })
  }, [availableProcesses, searchTerm])

  const openCreateDialog = () => {
    setFormState(createEmptyProcessState())
    setIsDialogOpen(true)
  }

  const openEditDialog = (process: ProcessStep) => {
    setFormState(toProcessFormState(process))
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!normalizeMachineCode(formState.code) || !formState.name.trim()) {
      toast.error('Process code and name are required')
      return
    }

    setIsSaving(true)

    try {
      await saveProcess({
        id: formState.id,
        code: normalizeMachineCode(formState.code),
        name: formState.name.trim(),
        description: formState.description.trim(),
        sortOrder: Number.isFinite(formState.sortOrder) ? formState.sortOrder : 0,
        isActive: formState.isActive,
        createdAt: formState.createdAt,
      })
      setIsDialogOpen(false)
    } catch {
      // Errors are already surfaced by the domain hook.
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) {
      return
    }

    setIsDeleting(true)

    try {
      await deleteProcess(pendingDelete)
      setPendingDelete(null)
    } catch {
      // Errors are already surfaced by the domain hook.
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className='rounded-[28px] border-dashed border-muted/50 bg-muted/5'>
        <CardHeader className='gap-4 border-b border-dashed border-muted/50 pb-5'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-2'>
              <div className='flex items-center gap-2 text-primary'>
                <Workflow className='size-4' />
                <CardTitle className='text-base font-black italic tracking-tighter text-slate-800'>
                  Global Process Library
                </CardTitle>
              </div>
              <p className='text-[10px] font-black tracking-widest text-muted-foreground/60'>
                STANDARD PROCESS RESOURCES
              </p>
            </div>

            <Button
              onClick={openCreateDialog}
              className='h-11 rounded-full px-5 text-[10px] font-black uppercase tracking-widest'
            >
              <Plus className='mr-2 size-4' />
              Add Process
            </Button>
          </div>

          <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
            <div className='relative max-w-md flex-1'>
              <ListTree className='absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40' />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='Search code, name, or description'
                className='h-11 rounded-2xl border-none bg-background pl-10 text-sm font-medium'
              />
            </div>
            <Badge variant='outline' className='h-8 rounded-full px-3 font-mono text-[10px]'>
              {filteredProcesses.length} / {availableProcesses.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className='space-y-3 p-4'>
          {isLoading && availableProcesses.length === 0 ? (
            <div className='space-y-3'>
              {[1, 2, 3].map((item) => (
                <div key={item} className='rounded-[20px] border border-dashed border-muted/50 p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-36' />
                      <Skeleton className='h-3 w-24' />
                    </div>
                    <Skeleton className='h-8 w-20 rounded-full' />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className='rounded-[24px] border border-dashed border-muted/50 bg-background/70 px-6 py-12 text-center'>
              <p className='text-sm font-black italic tracking-tighter text-muted-foreground/70'>
                No process resources found
              </p>
              <p className='mt-1 text-[10px] font-black tracking-widest text-muted-foreground/40'>
                CREATE YOUR FIRST STANDARD PROCESS
              </p>
            </div>
          ) : (
            filteredProcesses.map((process) => (
              <div
                key={process.id}
                className='flex flex-col gap-3 rounded-[22px] border border-dashed border-muted/50 bg-background/80 p-4 md:flex-row md:items-start md:justify-between'
              >
                <div className='min-w-0 space-y-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <h4 className='text-sm font-black tracking-tight text-slate-800'>{process.name}</h4>
                    <Badge variant='outline' className='rounded-full font-mono text-[10px]'>
                      {process.code}
                    </Badge>
                    {!process.isActive && (
                      <Badge variant='outline' className='rounded-full text-[10px] text-muted-foreground'>
                        INACTIVE
                      </Badge>
                    )}
                  </div>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/45'>
                    SORT {process.sortOrder || 0}
                  </p>
                  <p className='text-sm text-muted-foreground/70'>
                    {process.description || 'No description'}
                  </p>
                </div>

                <div className='flex items-center gap-2 self-end md:self-start'>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full'
                    onClick={() => openEditDialog(process)}
                  >
                    <Pencil className='mr-2 size-3.5' />
                    Edit
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    className='rounded-full text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                    onClick={() => setPendingDelete(process)}
                  >
                    <Trash2 className='mr-2 size-3.5' />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-w-2xl rounded-[32px] border-none p-0 shadow-2xl'>
          <div className='space-y-6 p-8'>
            <DialogHeader className='space-y-1 text-left'>
              <DialogTitle className='text-lg font-black tracking-tighter italic text-slate-800'>
                {formState.id ? 'Edit Process Resource' : 'Create Process Resource'}
              </DialogTitle>
              <DialogDescription className='text-[10px] font-black uppercase tracking-widest opacity-60'>
                GLOBAL PROCESS LIBRARY ENTRY
              </DialogDescription>
            </DialogHeader>

            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50'>CODE</p>
                <Input
                  value={formState.code}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, code: normalizeMachineCode(event.target.value) }))
                  }
                  placeholder='e.g. PROC-ANODIZE'
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50'>SORT ORDER</p>
                <Input
                  type='number'
                  value={formState.sortOrder}
                  onChange={(event) =>
                    setFormState((prev) => ({
                      ...prev,
                      sortOrder: Number.parseInt(event.target.value || '0', 10) || 0,
                    }))
                  }
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2 md:col-span-2'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50'>NAME</p>
                <Input
                  value={formState.name}
                  onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder='Standard process name'
                  className='h-11 rounded-2xl'
                />
              </div>

              <div className='space-y-2 md:col-span-2'>
                <p className='text-[10px] font-black tracking-widest text-muted-foreground/50'>DESCRIPTION</p>
                <Textarea
                  value={formState.description}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder='Describe when and how this process should be used'
                  className='min-h-28 rounded-2xl'
                />
              </div>

              <div className='flex items-center justify-between rounded-[24px] border border-dashed border-muted/50 bg-muted/5 px-4 py-3 md:col-span-2'>
                <div>
                  <p className='text-sm font-black tracking-tight text-slate-800'>Active Status</p>
                  <p className='text-[10px] font-black tracking-widest text-muted-foreground/45'>
                    CONTROL WHETHER THIS PROCESS STAYS AVAILABLE
                  </p>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(checked) =>
                    setFormState((prev) => ({ ...prev, isActive: Boolean(checked) }))
                  }
                />
              </div>
            </div>

            <DialogFooter className='gap-3 sm:justify-end'>
              <Button
                variant='outline'
                onClick={() => setIsDialogOpen(false)}
                className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleSave()}
                disabled={isSaving}
                className='h-11 rounded-full px-6 text-[10px] font-black uppercase tracking-widest'
              >
                {isSaving ? 'Saving...' : formState.id ? 'Save Changes' : 'Create Process'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete process resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the global process definition and any existing mapping that references it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
