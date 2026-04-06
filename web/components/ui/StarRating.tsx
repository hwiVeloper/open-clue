interface StarRatingProps {
  value: number | null
  onChange: (v: number) => void
}

export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl transition-colors ${n <= (value ?? 0) ? 'text-yellow-400' : 'text-zinc-600'} hover:text-yellow-300`}
        >
          ★
        </button>
      ))}
    </div>
  )
}
