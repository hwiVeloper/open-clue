import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variantClass: Record<Variant, string> = {
  primary: 'bg-green-500 hover:bg-green-400 text-black font-semibold',
  secondary: 'bg-zinc-700 hover:bg-zinc-600 text-white',
  danger: 'bg-red-700 hover:bg-red-600 text-white',
  ghost: 'bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white',
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${variantClass[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
