import { useLanguage } from '@/context/language-provider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnitsQuery } from '../hooks/use-units-query'

interface ConfiguredActiveUnitSelectProps {
  labels: {
    placeholder: string
    empty: string
    loadFailed: string
    unavailable: string
  }
  id: string
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  enabled?: boolean
}

export function ConfiguredActiveUnitSelect({
  labels,
  id,
  value,
  onValueChange,
  disabled = false,
  enabled = true,
}: ConfiguredActiveUnitSelectProps) {
  const { t } = useLanguage()
  const { units, isLoading, error, refetch } = useUnitsQuery({ enabled })
  const activeUnits = units.filter((unit) => unit.status === 'active')
  const selectedUnit = units.find((unit) => unit.code === value)
  const hasUnavailableSelectedUnit =
    !isLoading &&
    !error &&
    Boolean(value) &&
    !activeUnits.some((unit) => unit.code === value)

  return (
    <div className='space-y-1'>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading || Boolean(error)}
      >
        <SelectTrigger
          id={id}
          aria-invalid={!disabled && hasUnavailableSelectedUnit}
          className='h-9 w-full rounded-xl bg-background'
        >
          <SelectValue placeholder={labels.placeholder}>
            <span>
              {selectedUnit
                ? `${selectedUnit.name} (${selectedUnit.code})`
                : value || labels.placeholder}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeUnits.map((unit) => (
            <SelectItem key={unit.id} value={unit.code}>
              {unit.name} ({unit.code})
            </SelectItem>
          ))}
          {activeUnits.length === 0 ? (
            <p className='px-3 py-2 text-[11px] text-muted-foreground'>
              {labels.empty}
            </p>
          ) : null}
        </SelectContent>
      </Select>
      {isLoading ? (
        <p className='text-[10px] text-muted-foreground'>
          {t('common.actions.loading')}
        </p>
      ) : error ? (
        <div className='text-[10px] text-destructive'>
          {labels.loadFailed}
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void refetch()}
            disabled={disabled}
            className='rounded-full'
          >
            {t('common.actions.retry')}
          </Button>
        </div>
      ) : null}
      {!disabled && hasUnavailableSelectedUnit ? (
        <p className='text-[10px] text-destructive'>{labels.unavailable}</p>
      ) : null}
    </div>
  )
}
