import { Icon, type IconName } from '../ui/Icon'

export type TabKey = 'record' | 'history' | 'budget' | 'settings'

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'record', label: '記帳', icon: 'record' },
  { key: 'history', label: '紀錄', icon: 'history' },
  { key: 'budget', label: '預算', icon: 'budget' },
  { key: 'settings', label: '設定', icon: 'settings' },
]

export function TabBar({ active, onChange }: { active: TabKey; onChange: (tab: TabKey) => void }) {
  return (
    <nav className="safe-bottom shrink-0 border-t border-divider bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map(({ key, label, icon }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex h-14 flex-1 flex-col items-center justify-center gap-1 transition-colors duration-100 ${
                isActive ? 'text-primary' : 'text-secondary'
              }`}
            >
              <Icon
                name={icon}
                size="lg"
                strokeWidth={isActive ? 2 : 1.75}
                /* Selection reads through contrast alone: the active record tab
                   fills solid, so no colour is needed to mark it. */
                className={isActive && key === 'record' ? 'fill-primary text-bg' : undefined}
              />
              <span className={`text-tab ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
