import { useState } from 'react'
import { getCategory } from '../lib/categories'
import type { Transaction } from '../lib/types'
import { useAmountInput } from '../lib/useAmountInput'
import { TextButton } from '../ui/Button'
import { TextField } from '../ui/Field'
import { ModalScreen } from '../ui/Sheet'
import { CategoryBottomSheet } from './CategoryBottomSheet'
import { CategoryPillButton } from './CategoryPillButton'
import { NumberPad } from './NumberPad'

function formatAmount(raw: string): string {
  const [intPart, decPart] = raw.split('.')
  const withCommas = Number(intPart || '0').toLocaleString('en-US')
  return decPart === undefined ? withCommas : `${withCommas}.${decPart}`
}

export function EditTransactionModal({
  transaction,
  onCancel,
  onSave,
}: {
  transaction: Transaction
  onCancel: () => void
  onSave: (patch: { amount: number; category: string; note: string }) => void
}) {
  const { value, handleKey, numeric } = useAmountInput(String(transaction.amount))
  const [category, setCategory] = useState<string>(transaction.category)
  const [note, setNote] = useState(transaction.note)
  const [pickerOpen, setPickerOpen] = useState(false)

  const canSave = numeric > 0

  return (
    <ModalScreen
      title="編輯紀錄"
      left={<TextButton onClick={onCancel}>取消</TextButton>}
      right={
        <TextButton
          emphasis="strong"
          disabled={!canSave}
          onClick={() => canSave && onSave({ amount: numeric, category, note })}
        >
          儲存
        </TextButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 pb-[3dvh]">
        <div className="flex items-baseline text-display-sm tabular-nums text-primary">
          <span>$</span>
          <span>{formatAmount(value)}</span>
        </div>
        <CategoryPillButton category={getCategory(category)} onClick={() => setPickerOpen(true)} />
        <div className="w-full max-w-[260px]">
          <TextField value={note} onChange={setNote} placeholder="備註（選填）" align="center" />
        </div>
      </div>

      <div className="shrink-0 px-5 pb-2">
        <NumberPad onKey={handleKey} />
      </div>

      {pickerOpen && (
        <CategoryBottomSheet
          selected={category}
          onSelect={(id) => {
            setCategory(id)
            setPickerOpen(false)
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      )}
    </ModalScreen>
  )
}
