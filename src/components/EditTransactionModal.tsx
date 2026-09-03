import { useState } from 'react'
import { getCategory } from '../lib/categories'
import type { Transaction } from '../lib/types'
import { useAmountInput } from '../lib/useAmountInput'
import { TextButton } from '../ui/Button'
import { TextField } from '../ui/Field'
import { Icon } from '../ui/Icon'
import { ModalScreen } from '../ui/Sheet'
import { CategoryBottomSheet } from './CategoryBottomSheet'
import { CategoryPillButton } from './CategoryPillButton'
import { DateSheet, dateKeyToISO, formatDateLabel, toDateKey } from './DateSheet'
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
  onSave: (patch: { amount: number; category: string; note: string; created_at: string }) => void
}) {
  const { value, handleKey, numeric } = useAmountInput(String(transaction.amount))
  const [category, setCategory] = useState<string>(transaction.category)
  const [note, setNote] = useState(transaction.note)
  const [date, setDate] = useState<string>(() => toDateKey(new Date(transaction.created_at)))
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)

  const canSave = numeric > 0

  const save = () => {
    if (!canSave) return
    onSave({ amount: numeric, category, note, created_at: dateKeyToISO(date) })
  }

  return (
    <ModalScreen
      title="編輯紀錄"
      left={<TextButton onClick={onCancel}>取消</TextButton>}
      right={
        <TextButton emphasis="strong" disabled={!canSave} onClick={save}>
          儲存
        </TextButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 pb-[3dvh]">
        <div className="flex items-baseline text-display-sm tabular-nums text-primary">
          <span>$</span>
          <span>{formatAmount(value)}</span>
        </div>

        {/* Same pill family as the record screen's date button and the
            category pill — reused as-is, not a new date-field pattern. */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            aria-label={`日期：${formatDateLabel(date)}，點擊變更`}
            className="group flex h-11 items-center"
          >
            <span className="flex h-9 items-center gap-2 rounded-full bg-fill pl-3 pr-2.5 text-callout font-medium text-primary transition-colors duration-100 group-active:bg-fill-strong">
              <Icon name="calendar" size="sm" className="text-secondary" />
              {formatDateLabel(date)}
              <Icon name="chevronDown" size="sm" className="text-tertiary" />
            </span>
          </button>
          <CategoryPillButton category={getCategory(category)} onClick={() => setPickerOpen(true)} />
        </div>

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

      {dateOpen && (
        <DateSheet
          value={date}
          onSelect={(key) => {
            setDate(key)
            setDateOpen(false)
          }}
          onDismiss={() => setDateOpen(false)}
        />
      )}
    </ModalScreen>
  )
}
