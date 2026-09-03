import { useEffect, useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { BudgetPage } from './pages/BudgetPage'
import { HistoryPage } from './pages/HistoryPage'
import { RecordPage } from './pages/RecordPage'
import { SettingsPage } from './pages/SettingsPage'
import { ThemeProvider } from './lib/theme'
import { isConfigured } from './lib/db'
import { loadAll } from './lib/store'
import { useStore } from './lib/useStore'
import { runAutoRecord } from './lib/fixedExpenses'

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-app items-center justify-center bg-bg px-10 text-center">
      <div className="max-w-xs text-callout leading-relaxed text-secondary">{children}</div>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<TabKey>('record')
  const store = useStore()

  useEffect(() => {
    if (!isConfigured) return
    void loadAll().then(() => {
      void runAutoRecord()
    })
  }, [])

  if (!isConfigured) {
    return (
      <ThemeProvider>
        <Centered>
          尚未設定資料庫連線。
          <br />
          請提供 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。
        </Centered>
      </ThemeProvider>
    )
  }

  if (store.status === 'loading') {
    // A single centered mark rather than a bare screen — flex-centered
    // against the full viewport (not an inset sub-container), so it holds
    // its position regardless of notch height or device height.
    return (
      <ThemeProvider>
        <div className="flex h-app items-center justify-center bg-bg">
          <span className="text-headline font-bold text-primary">$</span>
        </div>
      </ThemeProvider>
    )
  }

  if (store.status === 'error') {
    return (
      <ThemeProvider>
        <Centered>
          無法連線到資料庫。
          <br />
          請檢查網路後重新開啟。
          <br />
          <span className="mt-2 block text-caption text-tertiary">{store.error}</span>
        </Centered>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <div className="mx-auto flex h-app max-w-md flex-col bg-bg sm:border-x sm:border-divider">
        <div className="min-h-0 flex-1">
          {tab === 'record' && <RecordPage />}
          {tab === 'history' && <HistoryPage />}
          {tab === 'budget' && <BudgetPage />}
          {tab === 'settings' && <SettingsPage />}
        </div>
        <TabBar active={tab} onChange={setTab} />
      </div>
    </ThemeProvider>
  )
}

export default App
