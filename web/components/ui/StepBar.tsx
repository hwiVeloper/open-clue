const STEPS = ['메타 정보', '방 목록', '방 상세', '검증', '내보내기']

interface StepBarProps {
  current: number
  onClickStep?: (index: number) => void
}

export function StepBar({ current, onClickStep }: StepBarProps) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => onClickStep?.(i)}
              disabled={i > current}
              className={`flex flex-col items-center gap-1 disabled:cursor-not-allowed group`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${done ? 'bg-green-600 text-black' : active ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs ${active ? 'text-green-400' : done ? 'text-green-600' : 'text-zinc-500'}`}>
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 mt-[-16px] ${done ? 'bg-green-600' : 'bg-zinc-700'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
