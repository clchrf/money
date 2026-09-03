import { useMemo, useState } from 'react'
import { ActionSheet } from '../components/ActionSheet'
import { EditTransactionModal } from '../components/EditTransactionModal'
import { getCategory } from '../lib/categories'
import { deleteTransaction, listTransactions, updateTransaction } from '../lib/storage'
import type { Transaction } from '../lib/types'
import { SearchField } from '../ui/Field'
import { IconButton } from '../ui/IconButton'
import { ListGroup } from '../ui/List'
import { PageHeader } from '../ui/PageHeader'
import { useStore } from '../lib/useStore'

function dateKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function formatDateHeader(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })
}

function formatAmount(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function HistoryPage() {
  const [version, setVersion] = useState(0)
  const store = useStore()
  const [activeTx, setActiveTx] = useState<Transaction | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [monthOffset, setMonthOffset] = useState(0)
  const [query, setQuery] = useState('')

  const target = useMemo(() => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + monthOffset)
    return d
  }, [monthOffset])

  const monthLabel = target.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })
  const allTransactions = useMemo(() => listTransactions(), [store, version])

  const transactions = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allTransactions.filter((t) => {
      const d = new Date(t.created_at)
      if (d.getFullYear() !== target.getFullYear() || d.getMonth() !== target.getMonth()) return false
      if (!q) return true
      const cat = getCategory(t.category)
      return cat.label.toLowerCase().includes(q) || t.note.toLowerCase().includes(q)
    })
  }, [allTransactions, target, query])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const tx of transactions) {
      const key = dateKey(tx.created_at)
      const list = map.get(key) ?? []
      list.push(tx)
      map.set(key, list)
    }
    return Array.from(map.entries())
  }, [transactions])

  const monthTotal = transactions.reduce((sum, t) => sum + t.amount, 0)
  const refresh = () => setVersion((v) => v + 1)
  const closeSheet = () => {
    setActiveTx(null)
    setConfirmDelete(false)
  }

  return (
    <div className="flex h-full flex-col bg-grouped">
      <PageHeader title="紀錄" />

      <div className="shrink-0 px-5 pb-3">
        <div className="flex items-center justify-between">
          <IconButton name="chevronLeft" label="上個月" size="md" compact onClick={() => setMonthOffset((v) => v - 1)} />
          <div className="flex flex-col items-center">
            <span className="text-callout font-medium text-primary">{monthLabel}</span>
            <span className="text-caption tabular-nums text-secondary">共 ${formatAmount(monthTotal)}</span>
          </div>
          <IconButton
            name="chevronRight"
            label="下個月"
            size="md"
            compact
            disabled={monthOffset >= 0}
            onClick={() => setMonthOffset((v) => Math.min(0, v + 1))}
          />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-3">
        <SearchField value={query} onChange={setQuery} placeholder="搜尋分類或備註" />
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8">
          <p className="text-callout text-secondary">這段期間沒有紀錄</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {groups.map(([key, txs]) => (
            <div key={key} className="pb-2">
              <div className="px-5 pb-2 pt-3 text-footnote text-secondary">
                {formatDateHeader(txs[0].created_at)}
              </div>
              <ListGroup>
                {txs.map((tx) => {
                  const cat = getCategory(tx.category)
                  return (
                    <button
                      key={tx.id}
                      type="button"
                      onClick={() => setActiveTx(tx)}
                      aria-label={`${cat.label} $${formatAmount(tx.amount)}，點擊編輯或刪除`}
                      className="flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 active:bg-fill"
                    >
                      <span className="flex w-6 shrink-0 justify-center text-body">{cat.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-callout text-primary">{cat.label}</span>
                        {tx.note && (
                          <span className="mt-0.5 block truncate text-caption text-secondary">{tx.note}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-callout font-medium tabular-nums text-primary">
                        -${formatAmount(tx.amount)}
                      </span>
                    </button>
                  )
                })}
              </ListGroup>
            </div>
          ))}
        </div>
      )}

      {activeTx && !confirmDelete && (
        <ActionSheet
          onDismiss={closeSheet}
          items={[
            {
              label: '編輯',
              onSelect: () => {
                setEditingTx(activeTx)
                closeSheet()
              },
            },
            { label: '刪除', onSelect: () => setConfirmDelete(true) },
          ]}
        />
      )}

      {activeTx && confirmDelete && (
        <ActionSheet
          onDismiss={closeSheet}
          items={[
            {
              label: '確定刪除此筆紀錄',
              emphasis: true,
              onSelect: () => {
                deleteTransaction(activeTx.id)
                closeSheet()
                refresh()
              },
            },
          ]}
        />
      )}

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          onCancel={() => setEditingTx(null)}
          onSave={(patch) => {
            updateTransaction(editingTx.id, patch)
            setEditingTx(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}
