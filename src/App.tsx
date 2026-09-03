import { useEffect, useState } from 'react'
import { TabBar, type TabKey } from './components/TabBar'
import { BudgetPage } from './pages/BudgetPage'
import { HistoryPage } from './pages/HistoryPage'
import { RecordPage } from './pages/RecordPage'
import { SettingsPage } from './pages/SettingsPage'
import { ThemeProvider } from './lib/theme'
import { getUserId } from './lib/user'
import { runAutoRecord } from './lib/fixedExpenses'

function App() {
  const [tab, setTab] = useState<TabKey>('record')

  useEffect(() => {
    getUserId()
    runAutoRecord()
  }, [])

  return (
    <ThemeProvider>
      <div className="mx-auto flex h-dvh max-w-md flex-col bg-bg sm:border-x sm:border-divider">
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
