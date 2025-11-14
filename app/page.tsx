'use client'

import dynamic from 'next/dynamic'

const MapComponent = dynamic(() => import('./components/MapComponent'), {
  ssr: false,
})

export default function Home() {
  return (
    <main style={{ height: '100vh', width: '100vw' }}>
      <MapComponent />
    </main>
  )
}
