import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from './contexts/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tender - Yacht Crew Finder',
  description: 'Find your perfect yacht crew match',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Tender',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1B3B5B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* interactive-widget tells modern browsers (Chrome/Edge) to resize the
            visual viewport when the on-screen keyboard appears, so 100dvh works
            with the keyboard open. iOS Safari handles this best when combined
            with the focus-scroll behaviour in ChatInterface. */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content"
        />
      </head>
      <body className={`${inter.className} bg-background`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
} 