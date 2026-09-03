import { useMemo, useState } from 'react'
import { AmountEditSheet } from '../components/AmountEditSheet'
import { CategoryBottomSheet } from '../components/CategoryBottomSheet'
import {
  computeUsed,
  deleteCategoryBudget,
  getTotalBudget,
  listBudgets,
  setCategoryBudget,
  setTotalBudget,
} from '../lib/budgets'
import { getCategory, listCategories } from '../lib/categories'
import { IconButton } from '../ui/IconButton'
import { PageHeader } from '../ui/PageHeader'

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

export function BudgetPage() {
  const [version, setVersion] = useState(0)
  const [editingTotal, setEditingTotal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const refresh = () => setVersion((v) => v + 1)

  const total = useMemo(() => getTotalBudget(), [version])
  const totalUsed = useMemo(() => (total ? computeUsed(null, total.period) : 0), [total, version])

  const categoryBudgets = useMemo(
    () =>
      listBudgets()
        .filter((b) => b.category !== null)
        .map((b) => ({
          budget: b,
          category: getCategory(b.category as string),
          used: computeUsed(b.category, b.period),
        }))
        .sort((a, b) => b.used / b.budget.amount - a.used / a.budget.amount),
    [version],
  )

  const budgetedIds = new Set(categoryBudgets.map((c) => c.category.id))
  const unbudgeted = listCategories().filter((c) => !budgetedIds.has(c.id))
  const monthLabel = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
  const editingEntry = categoryBudgets.find((c) => c.category.id === editingCategory)

  return (
    <div className="flex h-full flex-col bg-grouped">
      <PageHeader
        title="預算"
        action={
          <IconButton
            name="add"
            label="新增分類預算"
            size="lg"
            disabled={unbudgeted.length === 0}
            onClick={() => setPickerOpen(true)}
          />
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-8">
        <div className="px-5 pb-2 text-footnote text-secondary">{monthLabel}</div>

        <div className="px-4">
          <button
            type="button"
            onClick={() => setEditingTotal(true)}
            aria-label={total ? '編輯總預算' : '設定總預算'}
            className="flex w-full flex-col items-center gap-1.5 rounded-md bg-surface px-5 py-7 transition-colors duration-100 active:bg-fill"
          >
            {total ? (
              <>
                <span className="text-footnote text-secondary">總預算</span>
                <span className="text-display-sm tabular-nums text-primary">
                  ${formatAmount(total.amount)}
                </span>
                <span className="text-footnote tabular-nums text-secondary">
                  已使用 ${formatAmount(totalUsed)} · 剩餘 ${formatAmount(total.amount - totalUsed)}
                </span>
              </>
            ) : (
              <span className="py-1 text-callout text-secondary">設定總預算</span>
            )}
          </button>
        </div>

        {categoryBudgets.length > 0 ? (
          <div className="px-4 pt-6">
            {categoryBudgets.map(({ budget, category, used }) => {
              const pct = budget.amount > 0 ? Math.min(100, (used / budget.amount) * 100) : 0
              const over = used > budget.amount
              return (
                <button
                  key={budget.id}
                  type="button"
                  onClick={() => setEditingCategory(category.id)}
                  aria-label={`編輯 ${category.label} 預算`}
                  className="mb-2 block w-full rounded-md bg-surface px-4 py-3 text-left transition-colors duration-100 active:bg-fill"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex w-6 shrink-0 justify-center text-body">{category.icon}</span>
                    <span className="flex-1 truncate text-callout text-primary">{category.label}</span>
                    <span className="shrink-0 text-caption text-tertiary">
                      {budget.period === 'weekly' ? '每週' : '每月'}
                    </span>
                    <span className="shrink-0 text-callout font-medium tabular-nums text-primary">
                      ${formatAmount(used)} / ${formatAmount(budget.amount)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-fill">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-accent' : 'bg-secondary'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {over && (
                    <div className="mt-1.5 text-right text-caption font-semibold tabular-nums text-primary">
                      已超支 ${formatAmount(used - budget.amount)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="px-8 pt-12 text-center text-callout text-secondary">
            用右上角的加號新增分類預算
          </p>
        )}
      </div>

      {editingTotal && (
        <AmountEditSheet
          title="總預算"
          initialAmount={total?.amount ?? 0}
          initialPeriod={total?.period}
          onCancel={() => setEditingTotal(false)}
          onConfirm={(amount, period) => {
            setTotalBudget(amount, period)
            setEditingTotal(false)
            refresh()
          }}
        />
      )}

      {editingCategory && (
        <AmountEditSheet
          title={getCategory(editingCategory).label}
          initialAmount={editingEntry?.budget.amount ?? 0}
          initialPeriod={editingEntry?.budget.period}
          onCancel={() => setEditingCategory(null)}
          onConfirm={(amount, period) => {
            setCategoryBudget(editingCategory, amount, period)
            setEditingCategory(null)
            refresh()
          }}
          onDelete={
            editingEntry
              ? () => {
                  deleteCategoryBudget(editingCategory)
                  setEditingCategory(null)
                  refresh()
                }
              : undefined
          }
        />
      )}

      {pickerOpen && (
        <CategoryBottomSheet
          selected={null}
          filterIds={unbudgeted.map((c) => c.id)}
          onSelect={(id) => {
            setPickerOpen(false)
            setEditingCategory(id)
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
