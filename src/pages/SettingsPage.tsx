import { useRef, useState, type ChangeEvent } from 'react'
import { CategoryManagerSheet } from '../components/CategoryManagerSheet'
import { FixedExpenseManagerSheet } from '../components/FixedExpenseManagerSheet'
import { exportCSV, exportJSON, importData } from '../lib/storage'
import { updateReminderSettings } from '../lib/reminderSettings'
import { useTheme, type ThemeMode } from '../lib/theme'
import { TextField } from '../ui/Field'
import { ListCaption, ListGroup, ListRow, SectionHeader } from '../ui/List'
import { PageHeader } from '../ui/PageHeader'
import { Switch } from '../ui/Switch'
import { useStore } from '../lib/useStore'

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: 'light', label: '淺色' },
  { key: 'dark', label: '深色' },
  { key: 'system', label: '跟隨系統' },
]

export function SettingsPage() {
  const { mode, setMode } = useTheme()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [fixedExpenseManagerOpen, setFixedExpenseManagerOpen] = useState(false)
  const store = useStore()
  const reminders = store.reminders

  const showToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1600)
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      importData(await file.text())
      showToast('匯入成功')
    } catch {
      showToast('匯入失敗，檔案格式不正確')
    }
  }

  const patchReminders = (patch: Partial<typeof reminders>) => updateReminderSettings(patch)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex h-full flex-col bg-grouped">
      <PageHeader title="設定" />

      <div className="min-h-0 flex-1 overflow-y-auto pb-10">
        <SectionHeader>分類與預算</SectionHeader>
        <ListGroup>
          <ListRow label="管理分類" accessory="chevron" onClick={() => setCategoryManagerOpen(true)} />
          <ListRow label="固定支出" accessory="chevron" onClick={() => setFixedExpenseManagerOpen(true)} />
        </ListGroup>

        <SectionHeader>記帳提醒</SectionHeader>
        <ListGroup>
          <div className="px-4 py-3">
            <span className="mb-2 block text-footnote text-secondary">Email</span>
            <TextField
              value={reminders.email}
              onChange={(v) => patchReminders({ email: v })}
              placeholder="you@example.com"
              type="email"
              inputMode="email"
              ariaLabel="提醒 Email"
            />
          </div>
          <ListRow
            label="12:00 提醒"
            trailing={
              <Switch
                checked={reminders.noon_enabled}
                label="12:00 提醒"
                onChange={(v) => patchReminders({ noon_enabled: v })}
              />
            }
          />
          <ListRow
            label="19:00 提醒"
            trailing={
              <Switch
                checked={reminders.evening_enabled}
                label="19:00 提醒"
                onChange={(v) => patchReminders({ evening_enabled: v })}
              />
            }
          />
          <ListRow
            label="每月報告"
            trailing={
              <Switch
                checked={reminders.monthly_report_enabled}
                label="每月報告"
                onChange={(v) => patchReminders({ monthly_report_enabled: v })}
              />
            }
          />
        </ListGroup>
        <ListCaption>
          今天已記帳就不會重複提醒。設定會保留在這台裝置上；實際寄送 Email 需要連接後端寄信服務後才會啟用。
        </ListCaption>

        <SectionHeader>資料</SectionHeader>
        <ListGroup>
          <ListRow
            label="匯出 JSON"
            accessory="chevron"
            onClick={() => downloadFile(`money-export-${today}.json`, exportJSON(), 'application/json')}
          />
          <ListRow
            label="匯出 CSV"
            accessory="chevron"
            onClick={() => downloadFile(`money-export-${today}.csv`, exportCSV(), 'text/csv')}
          />
          <ListRow label="匯入資料" accessory="chevron" onClick={() => fileInputRef.current?.click()} />
        </ListGroup>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileChange}
        />

        <SectionHeader>外觀</SectionHeader>
        <ListGroup>
          {THEME_OPTIONS.map((opt) => (
            <ListRow
              key={opt.key}
              label={opt.label}
              accessory={mode === opt.key ? 'check' : 'none'}
              onClick={() => setMode(opt.key)}
            />
          ))}
        </ListGroup>
      </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-28 flex justify-center px-8">
          <div className="animate-modal rounded-full bg-accent px-4 py-2 text-footnote text-on-accent">
            {toast}
          </div>
        </div>
      )}

      {categoryManagerOpen && <CategoryManagerSheet onDismiss={() => setCategoryManagerOpen(false)} />}
      {fixedExpenseManagerOpen && (
        <FixedExpenseManagerSheet onDismiss={() => setFixedExpenseManagerOpen(false)} />
      )}
    </div>
  )
}
