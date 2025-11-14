import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Polygon Area Map',
  description: 'Draw and move polygons with constant real area on OpenStreetMap',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
