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
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/wan2land/d2coding/d2coding-ligature-full.css"
        />
      </head>
      <body className="bg-zinc-950 text-white min-h-screen antialiased" style={{ fontFamily: '"D2Coding", "D2Coding ligature", monospace' }}>
        {children}
      </body>
    </html>
  )
}
