import { useMemo, useState } from 'react'

export function useQuoteWorkspaceController() {
  const [dialogMode, setDialogMode] = useState<'create' | 'detail'>('detail')
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false)
  const [editedAmountLabel, setEditedAmountLabel] = useState('')
  const [editedRequirements, setEditedRequirements] = useState('')

  const isCreateModeOpen = useMemo(
    () => isDialogOpen && dialogMode === 'create',
    [dialogMode, isDialogOpen]
  )

  const handleSelectQuote = (quoteId: string) => {
    setDialogMode('detail')
    setSelectedQuoteId(quoteId)
    setIsDialogOpen(true)
  }

  const handleCreateQuote = () => {
    setDialogMode('create')
    setSelectedQuoteId(null)
    setEditedAmountLabel('')
    setEditedRequirements('')
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setDialogMode('detail')
      setSelectedQuoteId(null)
      setEditedAmountLabel('')
      setEditedRequirements('')
    }
  }

  const switchToDetailMode = (quoteId: string) => {
    setDialogMode('detail')
    setSelectedQuoteId(quoteId)
  }

  return {
    dialogMode,
    selectedQuoteId,
    isDialogOpen,
    isPrintPreviewOpen,
    editedAmountLabel,
    editedRequirements,
    isCreateModeOpen,
    setIsPrintPreviewOpen,
    setEditedAmountLabel,
    setEditedRequirements,
    handleSelectQuote,
    handleCreateQuote,
    handleDialogOpenChange,
    switchToDetailMode,
  }
}
