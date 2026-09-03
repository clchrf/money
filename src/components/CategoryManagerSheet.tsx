import { useState } from 'react'
import { addCategory, deleteCategory, listCategories, moveCategory, updateCategory } from '../lib/categories'
import type { Category } from '../lib/types'
import { Button, TextButton } from '../ui/Button'
import { TextField } from '../ui/Field'
import { IconButton } from '../ui/IconButton'
import { ListGroup } from '../ui/List'
import { ModalScreen, Sheet } from '../ui/Sheet'

function CategoryFormSheet({
  initial,
  onCancel,
  onSave,
}: {
  initial?: Category
  onCancel: () => void
  onSave: (input: { label: string; icon: string }) => void
}) {
  const [label, setLabel] = useState(initial?.label ?? '')
  const [icon, setIcon] = useState(initial?.icon ?? '📦')
  const canSave = label.trim().length > 0 && icon.trim().length > 0

  return (
    <Sheet title={initial ? '編輯分類' : '新增分類'} onDismiss={onCancel} padded>
      <div className="mb-4 flex items-center gap-3">
        <input
          value={icon}
          aria-label="分類圖示"
          onChange={(e) => setIcon(Array.from(e.target.value).slice(-2).join(''))}
          placeholder="🙂"
          className="h-11 w-14 rounded-sm bg-fill text-center text-headline outline-none"
        />
        <div className="flex-1">
          <TextField value={label} onChange={setLabel} placeholder="分類名稱" />
        </div>
      </div>
      <Button disabled={!canSave} onClick={() => canSave && onSave({ label: label.trim(), icon: icon.trim() })}>
        儲存
      </Button>
    </Sheet>
  )
}

export function CategoryManagerSheet({ onDismiss }: { onDismiss: () => void }) {
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState<Category | 'new' | null>(null)
  const categories = listCategories()
  const refresh = () => setVersion((v) => v + 1)
  void version

  return (
    <ModalScreen
      title="管理分類"
      tone="grouped"
      left={<TextButton onClick={onDismiss}>完成</TextButton>}
      right={
        <TextButton emphasis="strong" onClick={() => setEditing('new')}>
          新增
        </TextButton>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto pb-6 pt-2">
        <ListGroup>
          {categories.map((cat, i) => (
            <div key={cat.id} className="flex min-h-12 items-center gap-2 pl-4 pr-2">
              <span className="flex w-6 shrink-0 justify-center text-body">{cat.icon}</span>
              <button
                type="button"
                onClick={() => setEditing(cat)}
                aria-label={`編輯 ${cat.label}`}
                className="min-w-0 flex-1 py-3 text-left text-callout text-primary"
              >
                <span className="block truncate">{cat.label}</span>
              </button>
              <IconButton
                name="moveUp"
                label={`將 ${cat.label} 上移`}
                size="sm"
                compact
                disabled={i === 0}
                onClick={() => {
                  moveCategory(cat.id, 'up')
                  refresh()
                }}
              />
              <IconButton
                name="moveDown"
                label={`將 ${cat.label} 下移`}
                size="sm"
                compact
                disabled={i === categories.length - 1}
                onClick={() => {
                  moveCategory(cat.id, 'down')
                  refresh()
                }}
              />
              <IconButton
                name="trash"
                label={`刪除 ${cat.label}`}
                size="sm"
                compact
                onClick={() => {
                  deleteCategory(cat.id)
                  refresh()
                }}
              />
            </div>
          ))}
        </ListGroup>
      </div>

      {editing && (
        <CategoryFormSheet
          initial={editing === 'new' ? undefined : editing}
          onCancel={() => setEditing(null)}
          onSave={(input) => {
            if (editing === 'new') addCategory(input)
            else updateCategory(editing.id, input)
            setEditing(null)
            refresh()
          }}
        />
      )}
    </ModalScreen>
  )
}
