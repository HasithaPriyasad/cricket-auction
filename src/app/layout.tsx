import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cricket Auction',
  description: 'Cricket player auction system',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800;900&family=Saira+Semi+Condensed:wght@500;600;700&family=Saira:wght@400;500;600;700&family=Oswald:wght@500;600;700&family=Archivo:wght@600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
