import { useMemo, useState } from 'react'
import { CategoryBottomSheet } from '../components/CategoryBottomSheet'
import { DateSheet, dateKeyToISO, formatDateLabel, todayKey } from '../components/DateSheet'
import { NumberPad } from '../components/NumberPad'
import { computeUsed, getTotalBudget } from '../lib/budgets'
import { getCategory, getDefaultCategoryId, setLastCategoryId } from '../lib/categories'
import { addTransaction } from '../lib/storage'
import { useAmountInput } from '../lib/useAmountInput'
import { useStore } from '../lib/useStore'
import { Icon } from '../ui/Icon'
import { MetaRow } from '../ui/MetaRow'
import { TextField } from '../ui/Field'

const CURRENCY = 'TWD'

function formatAmount(raw: string): string {
  const [intPart, decPart] = raw.split('.')
  const withCommas = Number(intPart || '0').toLocaleString('en-US')
  return decPart === undefined ? withCommas : `${withCommas}.${decPart}`
}

/** Step down the amount ramp as the entry grows so it never overflows. */
function amountClass(display: string): string {
  const len = display.length
  if (len <= 6) return 'text-amount-lg'
  if (len <= 9) return 'text-amount-md'
  return 'text-amount-sm'
}

export function RecordPage() {
  const { value, handleKey, numeric, reset } = useAmountInput()
  const [category, setCategory] = useState<string>(() => getDefaultCategoryId())
  const [date, setDate] = useState<string>(() => todayKey())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dateOpen, setDateOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [note, setNote] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const store = useStore()

  const remaining = useMemo(() => {
    const total = getTotalBudget()
    if (!total) return null
    return total.amount - computeUsed(null, total.period)
  }, [store, refreshKey])

  const flash = () => {
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 1000)
  }

  const canSave = numeric > 0 && category !== '' && !saving

  const save = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await addTransaction({ amount: numeric, category, note, created_at: dateKeyToISO(date) })
      // Only clear the form once the write actually lands — a failed request
      // must leave the amount and category exactly as the user entered them.
      setLastCategoryId(category)
      reset()
      setNote('')
      setNoteOpen(false)
      flash()
      setRefreshKey((k) => k + 1)
    } catch {
      setSaveError('儲存失敗，請檢查網路後再試一次')
      window.setTimeout(() => setSaveError(null), 2500)
    } finally {
      setSaving(false)
    }
  }

  const selectedCategory = category ? getCategory(category) : null
  const display = formatAmount(value)

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Top bar — date on the left, a quiet save action on the right. */}
      <div className="safe-top shrink-0">
        <div className="flex h-12 items-center justify-between px-4">
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

          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="flex h-11 items-center px-1 text-body font-semibold text-primary transition-opacity duration-100 active:opacity-50 disabled:text-tertiary"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>

      {/* Amount — the anchor. Slack collects above it; the gap down to the meta
          rows stays fixed, so the two read as one block like the reference. */}
      <div className="flex min-h-0 flex-[16] flex-col items-center justify-end px-6">
        {/* The currency sits outside the flow so the amount itself stays optically centred. */}
        <div className="relative max-w-full">
          <span className={`${amountClass(display)} block tabular-nums text-primary`}>
            <span>$</span>
            <span>{display}</span>
          </span>
          <span className="absolute bottom-1 left-full ml-2 text-callout font-medium text-tertiary">
            {CURRENCY}
          </span>
        </div>
        <div className={`mt-2 h-4 text-caption ${saveError ? 'text-primary' : 'text-secondary'}`}>
          {saveError
            ? saveError
            : savedFlash
              ? '已記錄'
              : remaining !== null
                ? `本期預算剩餘 $${remaining.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
                : ''}
        </div>
      </div>

      {/* Meta — category, then note under a hairline. */}
      <div className="mt-8 shrink-0 px-6">
        <MetaRow
          leading={<span className="text-title leading-none">{selectedCategory?.icon ?? '📦'}</span>}
          label={selectedCategory?.label ?? '選擇分類'}
          chevron
          onClick={() => setPickerOpen(true)}
          ariaLabel={selectedCategory ? `分類：${selectedCategory.label}，點擊變更` : '選擇分類'}
        />
        <div className="border-t border-divider" />
        {noteOpen ? (
          <div className="flex h-12 items-center gap-3">
            <span className="flex w-6 shrink-0 justify-center">
              <Icon name="note" size="md" className="text-tertiary" />
            </span>
            <TextField
              value={note}
              onChange={setNote}
              placeholder="備註"
              ariaLabel="備註"
              className="h-9 bg-transparent px-0"
            />
          </div>
        ) : (
          <MetaRow
            icon="note"
            label={note || '+ 備註'}
            muted={!note}
            onClick={() => setNoteOpen(true)}
            ariaLabel="新增備註"
          />
        )}
      </div>

      {/* Breathing room between the note row and the keypad. */}
      <div className="min-h-0 flex-[5]" />

      <div className="shrink-0 px-5">
        <NumberPad onKey={handleKey} />
      </div>

      {/* Slack below the keypad keeps it clear of the tab bar, and scales with
          the viewport instead of a fixed offset. */}
      <div className="min-h-0 flex-[7]" />

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
    </div>
  )
}
