// web/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import '@xyflow/react/dist/style.css'

export const metadata: Metadata = {
  title: 'OpenClue Builder',
  description: '방탈출 시나리오 제작 도구',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-zinc-950 text-white min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
