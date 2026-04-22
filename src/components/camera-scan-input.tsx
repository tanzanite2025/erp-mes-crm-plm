import { TrackingNumberInput } from '@/components/tracking-number-input'

export interface CameraScanInputProps {
  value: string
  onValueChange: (value: string) => void
  onScanComplete?: (code: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  inputClassName?: string
}

export function CameraScanInput({
  value,
  onValueChange,
  onScanComplete,
  placeholder,
  disabled,
  className,
  inputClassName,
}: CameraScanInputProps) {
  return (
    <TrackingNumberInput
      value={value}
      onValueChange={onValueChange}
      onScanComplete={onScanComplete}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      inputClassName={inputClassName}
    />
  )
}
