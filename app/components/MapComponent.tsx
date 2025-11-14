'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polygon, useMapEvents, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getUTMZone, projectToUTM, projectFromUTM, calculateCentroid } from '../utils/projection'
// @ts-ignore
import * as turf from '@turf/turf'

interface PolygonData {
  id: string
  positions: [number, number][]
  originalArea: number
}

function MapEvents({
  onDrawingComplete,
  isDrawing,
  setIsDrawing
}: {
  onDrawingComplete: (positions: [number, number][]) => void
  isDrawing: boolean
  setIsDrawing: (value: boolean) => void
}) {
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([])

  useMapEvents({
    click(e) {
      if (isDrawing) {
        const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng]
        setDrawingPoints(prev => [...prev, newPoint])
      }
    },
    contextmenu(e) {
      L.DomEvent.preventDefault(e.originalEvent)
      if (isDrawing && drawingPoints.length >= 3) {
        onDrawingComplete(drawingPoints)
        setDrawingPoints([])
        setIsDrawing(false)
      }
    }
  })

  return drawingPoints.length > 0 ? (
    <Polygon positions={drawingPoints} color="blue" fillOpacity={0.3} />
  ) : null
}

function DraggablePolygon({
  polygon,
  onUpdate
}: {
  polygon: PolygonData
  onUpdate: (id: string, newPositions: [number, number][]) => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<[number, number] | null>(null)

  useMapEvents({
    mousedown(e) {
      const layer = e.originalEvent.target as any
      if (layer && layer.classList && layer.classList.contains('leaflet-interactive')) {
        setIsDragging(true)
        setDragStart([e.latlng.lat, e.latlng.lng])
        L.DomEvent.stop(e)
      }
    },
    mousemove(e) {
      if (isDragging && dragStart) {
        const deltaLat = e.latlng.lat - dragStart[0]
        const deltaLng = e.latlng.lng - dragStart[1]

        const newPositions = polygon.positions.map(([lat, lng]) =>
          [lat + deltaLat, lng + deltaLng] as [number, number]
        )

        const newCentroid = calculateCentroid(newPositions)
        const utmZone = getUTMZone(newCentroid[1], newCentroid[0])

        const projectedPositions = newPositions.map(([lat, lng]) =>
          projectToUTM(lng, lat, utmZone)
        )

        const currentArea = Math.abs(turf.area(turf.polygon([[...projectedPositions.map(p => [p.x, p.y]), projectedPositions[0]]])))

        const scaleFactor = Math.sqrt(polygon.originalArea / currentArea)

        const centroidUTM = projectToUTM(newCentroid[1], newCentroid[0], utmZone)

        const scaledProjected = projectedPositions.map(p => ({
          x: centroidUTM.x + (p.x - centroidUTM.x) * scaleFactor,
          y: centroidUTM.y + (p.y - centroidUTM.y) * scaleFactor
        }))

        const adjustedPositions = scaledProjected.map(p => {
          const latLng = projectFromUTM(p.x, p.y, utmZone)
          return [latLng.lat, latLng.lng] as [number, number]
        })

        onUpdate(polygon.id, adjustedPositions)
        setDragStart([e.latlng.lat, e.latlng.lng])
      }
    },
    mouseup() {
      setIsDragging(false)
      setDragStart(null)
    }
  })

  const area = (polygon.originalArea / 1000000).toFixed(2)

  return (
    <Polygon
      positions={polygon.positions}
      color="red"
      fillOpacity={0.4}
      eventHandlers={{
        mousedown: (e) => {
          L.DomEvent.stop(e)
        }
      }}
    >
      <Popup>Area: {area} km²</Popup>
    </Polygon>
  )
}

export default function MapComponent() {
  const [polygons, setPolygons] = useState<PolygonData[]>([])
  const [isDrawing, setIsDrawing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleDrawingComplete = (positions: [number, number][]) => {
    const centroid = calculateCentroid(positions)
    const utmZone = getUTMZone(centroid[1], centroid[0])

    const projectedPositions = positions.map(([lat, lng]) =>
      projectToUTM(lng, lat, utmZone)
    )

    const area = Math.abs(turf.area(turf.polygon([[...projectedPositions.map(p => [p.x, p.y]), projectedPositions[0]]])))

    const newPolygon: PolygonData = {
      id: Date.now().toString(),
      positions,
      originalArea: area
    }

    setPolygons(prev => [...prev, newPolygon])
  }

  const handlePolygonUpdate = (id: string, newPositions: [number, number][]) => {
    setPolygons(prev =>
      prev.map(p => p.id === id ? { ...p, positions: newPositions } : p)
    )
  }

  if (!mounted) return null

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        background: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }}>
        <button
          onClick={() => setIsDrawing(!isDrawing)}
          style={{
            padding: '10px 20px',
            background: isDrawing ? '#ff4444' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          {isDrawing ? 'Cancel Drawing (Right-click to finish)' : 'Draw Polygon'}
        </button>
        <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
          {isDrawing && 'Click to add points, right-click to finish'}
          {polygons.length > 0 && !isDrawing && `${polygons.length} polygon(s) drawn`}
        </div>
      </div>
      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents
          onDrawingComplete={handleDrawingComplete}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
        />
        {polygons.map(polygon => (
          <DraggablePolygon
            key={polygon.id}
            polygon={polygon}
            onUpdate={handlePolygonUpdate}
          />
        ))}
      </MapContainer>
    </div>
  )
}
