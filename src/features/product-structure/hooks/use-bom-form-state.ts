import { useFieldArray, useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bomSchema, type BOM } from '../data/schema'

interface UseBOMFormStateParams {
  initialValues: BOM
}

export function useBOMFormState({ initialValues }: UseBOMFormStateParams) {
  const form = useForm<BOM>({
    resolver: zodResolver(bomSchema) as Resolver<BOM>,
    defaultValues: initialValues,
  })

  const fieldArray = useFieldArray({
    control: form.control,
    name: 'items',
  })

  return {
    form,
    ...fieldArray,
  }
}
