/**
 * One switch for the whole app: a 46×28 track inside a 44px-tall touch target,
 * so the control stays visually quiet without being hard to hit.
 */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 w-[46px] shrink-0 items-center justify-center"
    >
      <span
        className={`relative block h-7 w-[46px] rounded-full transition-colors duration-200 ${
          checked ? 'bg-accent' : 'bg-fill-strong'
        }`}
      >
        <span
          className={`absolute left-0 top-0.5 h-6 w-6 rounded-full shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-[20px] bg-on-accent' : 'translate-x-0.5 bg-thumb'
          }`}
        />
      </span>
    </button>
  )
}
