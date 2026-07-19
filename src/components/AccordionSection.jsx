// status: 'locked' | 'active' | 'done'
export default function AccordionSection({ stepNumber, title, subtitle, status, isOpen, onToggle, children }) {
  const locked = status === 'locked'
  const done = status === 'done'
  const active = status === 'active'

  return (
    <div
      className={
        'rounded-xl mb-3 overflow-hidden bg-white transition ' +
        (active ? 'border-2 border-primary' : 'border border-gray-200') +
        (locked ? ' opacity-60' : '')
      }
    >
      <button
        type="button"
        disabled={locked}
        onClick={onToggle}
        className={
          'w-full flex items-center justify-between px-4 py-3 text-left ' +
          (active ? 'bg-primary/20' : 'bg-gray-50') +
          (locked ? ' cursor-not-allowed' : ' cursor-pointer')
        }
      >
        <span className="flex items-center gap-2 text-base font-semibold text-gray-800">
          {locked && <LockIcon />}
          {done && <CheckIcon />}
          {stepNumber}. {title}
        </span>
        {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
      </button>

      {isOpen && !locked && <div className="p-4">{children}</div>}
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
