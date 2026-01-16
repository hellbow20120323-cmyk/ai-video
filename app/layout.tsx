import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI 视频生成平台',
  description: '沉浸式 AI 视频创作平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-[#FFFFFF] text-[#1D1D1F] antialiased min-h-screen" style={{ letterSpacing: '-0.01em' }}>
        {children}
      </body>
    </html>
  )
}
