import { useState } from 'react'
import {
  addFixedExpense,
  deleteFixedExpense,
  listFixedExpenses,
  updateFixedExpense,
} from '../lib/fixedExpenses'
import { getCategory, listCategories } from '../lib/categories'
import type { FixedExpense, FixedFrequency } from '../lib/types'
import { TextButton } from '../ui/Button'
import { FieldLabel, Segmented, TextField } from '../ui/Field'
import { IconButton } from '../ui/IconButton'
import { ListGroup, ListRow } from '../ui/List'
import { ModalScreen } from '../ui/Sheet'
import { Switch } from '../ui/Switch'
import { CategoryBottomSheet } from './CategoryBottomSheet'
import { CategoryPillButton } from './CategoryPillButton'

const FREQUENCIES: { value: FixedFrequency; label: string }[] = [
  { value: 'monthly', label: '每月' },
  { value: 'weekly', label: '每週' },
]

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function FixedExpenseFormSheet({
  initial,
  onCancel,
  onSave,
}: {
  initial?: FixedExpense
  onCancel: () => void
  onSave: (input: Omit<FixedExpense, 'id' | 'user_id' | 'enabled'>) => void
}) {
  const firstCategory = listCategories()[0]
  const [name, setName] = useState(initial?.name ?? '')
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '')
  const [category, setCategory] = useState(initial?.category ?? firstCategory?.id ?? '')
  const [frequency, setFrequency] = useState<FixedFrequency>(initial?.frequency ?? 'monthly')
  const [nextDate, setNextDate] = useState(initial?.next_date ?? todayStr())
  const [note, setNote] = useState(initial?.note ?? '')
  const [autoRecord, setAutoRecord] = useState(initial?.auto_record ?? false)
  const [reminderEnabled, setReminderEnabled] = useState(initial?.reminder_enabled ?? true)
  const [pickerOpen, setPickerOpen] = useState(false)

  const numericAmount = Number(amount)
  const canSave = name.trim().length > 0 && numericAmount > 0 && category !== '' && nextDate !== ''

  return (
    <ModalScreen
      title={initial ? '編輯固定支出' : '新增固定支出'}
      tone="grouped"
      left={<TextButton onClick={onCancel}>取消</TextButton>}
      right={
        <TextButton
          emphasis="strong"
          disabled={!canSave}
          onClick={() =>
            canSave &&
            onSave({
              name: name.trim(),
              amount: numericAmount,
              category,
              frequency,
              next_date: nextDate,
              note: note.trim(),
              auto_record: autoRecord,
              reminder_enabled: reminderEnabled,
            })
          }
        >
          儲存
        </TextButton>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 pt-2">
        <FieldLabel>名稱</FieldLabel>
        <TextField value={name} onChange={setName} placeholder="例如：房租" className="mb-5" />

        <FieldLabel>金額</FieldLabel>
        <TextField
          value={amount}
          onChange={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
          inputMode="decimal"
          placeholder="0"
          ariaLabel="金額"
          className="mb-5"
        />

        <FieldLabel>分類</FieldLabel>
        <div className="mb-5">
          <CategoryPillButton
            category={category ? getCategory(category) : null}
            onClick={() => setPickerOpen(true)}
          />
        </div>

        <FieldLabel>週期</FieldLabel>
        <div className="mb-5">
          <Segmented options={FREQUENCIES} value={frequency} onChange={setFrequency} fullWidth />
        </div>

        <FieldLabel>下次日期</FieldLabel>
        <TextField value={nextDate} onChange={setNextDate} type="date" ariaLabel="下次日期" className="mb-5" />

        <FieldLabel>備註（選填）</FieldLabel>
        <TextField value={note} onChange={setNote} ariaLabel="備註" className="mb-6" />

        <ListGroup className="mx-0">
          <ListRow
            label="自動記帳"
            detail="到期自動加入紀錄，而不只是提醒"
            trailing={<Switch checked={autoRecord} onChange={setAutoRecord} label="自動記帳" />}
          />
          <ListRow
            label="到期提醒"
            detail="需在設定中連接 Email 才會實際寄送"
            trailing={<Switch checked={reminderEnabled} onChange={setReminderEnabled} label="到期提醒" />}
          />
        </ListGroup>
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

export function FixedExpenseManagerSheet({ onDismiss }: { onDismiss: () => void }) {
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState<FixedExpense | 'new' | null>(null)
  const items = listFixedExpenses()
  const refresh = () => setVersion((v) => v + 1)
  void version

  return (
    <ModalScreen
      title="固定支出"
      tone="grouped"
      left={<TextButton onClick={onDismiss}>完成</TextButton>}
      right={
        <TextButton emphasis="strong" onClick={() => setEditing('new')}>
          新增
        </TextButton>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto pb-6 pt-2">
        {items.length === 0 ? (
          <p className="pt-12 text-center text-callout text-secondary">還沒有固定支出</p>
        ) : (
          <ListGroup>
            {items.map((fx) => {
              const cat = getCategory(fx.category)
              return (
                <div
                  key={fx.id}
                  className={`flex min-h-12 items-center gap-2 pl-4 pr-2 ${fx.enabled ? '' : 'opacity-45'}`}
                >
                  <span className="flex w-6 shrink-0 justify-center text-body">{cat.icon}</span>
                  <button
                    type="button"
                    onClick={() => setEditing(fx)}
                    aria-label={`編輯 ${fx.name}`}
                    className="min-w-0 flex-1 py-2.5 text-left"
                  >
                    <span className="block truncate text-callout text-primary">{fx.name}</span>
                    <span className="mt-0.5 block truncate text-caption tabular-nums text-secondary">
                      ${fx.amount.toLocaleString('en-US')} ·{' '}
                      {fx.frequency === 'monthly' ? '每月' : '每週'} · {fx.next_date}
                    </span>
                  </button>
                  <Switch
                    checked={fx.enabled}
                    label={`啟用 ${fx.name}`}
                    onChange={(v) => {
                      updateFixedExpense(fx.id, { enabled: v })
                      refresh()
                    }}
                  />
                  <IconButton
                    name="trash"
                    label={`刪除 ${fx.name}`}
                    size="sm"
                    compact
                    onClick={() => {
                      deleteFixedExpense(fx.id)
                      refresh()
                    }}
                  />
                </div>
              )
            })}
          </ListGroup>
        )}
      </div>

      {editing && (
        <FixedExpenseFormSheet
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(input) => {
            if (editing === 'new') addFixedExpense(input)
            else updateFixedExpense(editing.id, input)
            setEditing(null)
            refresh()
          }}
        />
      )}
    </ModalScreen>
  )
}
