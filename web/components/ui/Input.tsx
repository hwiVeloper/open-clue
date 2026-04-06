import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base = 'bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-500 w-full'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={base} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${base} resize-none`} rows={3} {...props} />
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-zinc-400 mb-1">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}
