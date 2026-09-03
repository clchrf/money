import { useState } from 'react'
import type { BudgetPeriod } from '../lib/types'
import { useAmountInput } from '../lib/useAmountInput'
import { TextButton } from '../ui/Button'
import { Segmented } from '../ui/Field'
import { ModalScreen } from '../ui/Sheet'
import { NumberPad } from './NumberPad'

function formatAmount(raw: string): string {
  const [intPart, decPart] = raw.split('.')
  const withCommas = Number(intPart || '0').toLocaleString('en-US')
  return decPart === undefined ? withCommas : `${withCommas}.${decPart}`
}

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'monthly', label: '每月' },
  { value: 'weekly', label: '每週' },
]

export function AmountEditSheet({
  title,
  initialAmount,
  initialPeriod,
  onCancel,
  onConfirm,
  onDelete,
}: {
  title: string
  initialAmount: number
  initialPeriod?: BudgetPeriod
  onCancel: () => void
  onConfirm: (amount: number, period: BudgetPeriod) => void
  onDelete?: () => void
}) {
  const { value, handleKey, numeric } = useAmountInput(initialAmount > 0 ? String(initialAmount) : '0')
  const [period, setPeriod] = useState<BudgetPeriod>(initialPeriod ?? 'monthly')

  const canSave = numeric > 0

  return (
    <ModalScreen
      title={title}
      left={<TextButton onClick={onCancel}>取消</TextButton>}
      right={
        <TextButton emphasis="strong" disabled={!canSave} onClick={() => canSave && onConfirm(numeric, period)}>
          儲存
        </TextButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 pb-[3dvh]">
        <div className="flex items-baseline text-display-sm tabular-nums text-primary">
          <span>$</span>
          <span>{formatAmount(value)}</span>
        </div>
        <Segmented options={PERIODS} value={period} onChange={setPeriod} />
        {onDelete && (
          <TextButton onClick={onDelete}>移除預算</TextButton>
        )}
      </div>

      <div className="shrink-0 px-5 pb-2">
        <NumberPad onKey={handleKey} />
      </div>
    </ModalScreen>
  )
}
