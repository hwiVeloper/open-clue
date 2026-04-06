import { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base = [
  'bg-zinc-800 border border-zinc-600 rounded',
  'px-3 py-2.5 text-sm text-white w-full',
  'placeholder:text-zinc-500',
  'focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/20',
  'transition-colors duration-150',
].join(' ')

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} ${className ?? ''}`} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={4}
      className={`${base} resize-y leading-relaxed ${className ?? ''}`}
      {...props}
    />
  )
}

export function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs text-zinc-400 mb-1">
      {children}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
  )
}
