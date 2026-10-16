import { useEffect, useRef } from 'react'
import { useAudioPlayer } from './AudioPlayerContext'

export type VisualizerMode = 'bars' | 'mirror' | 'wave'

interface Props {
  width?: number
  height?: number
  barCount?: number
  mode?: VisualizerMode
  isPlaying?: boolean
  className?: string
  accentColor?: string
}

export function AudioVisualizer({
  width = 80,
  height = 30,
  barCount = 14,
  mode = 'bars',
  isPlaying = false,
  className,
  accentColor,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const { getAnalyser } = useAudioPlayer()
  const animFrameRef = useRef<number | null>(null)
  const prevHeightsRef = useRef<number[]>([])
  const peakCapsRef = useRef<{ y: number; speed: number }[]>([])
  const phaseRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Initialize state arrays
    if (prevHeightsRef.current.length !== barCount) {
      prevHeightsRef.current = new Array(barCount).fill(2)
      peakCapsRef.current = new Array(barCount).fill(0).map(() => ({ y: 0, speed: 0 }))
    }

    let analyser: AnalyserNode | null = null
    let dataArray: Uint8Array | null = null

    const render = () => {
      animFrameRef.current = requestAnimationFrame(render)

      if (!analyser) {
        analyser = getAnalyser()
        if (analyser) {
          dataArray = new Uint8Array(analyser.frequencyBinCount)
        }
      }

      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      let hasRealAudio = false
      if (analyser && dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray)
        for (let i = 0; i < dataArray.length; i++) {
          if (dataArray[i] > 0) {
            hasRealAudio = true
            break
          }
        }
      }

      phaseRef.current += 0.08
      const phase = phaseRef.current

      // Calculate target heights for each bar
      const targetHeights: number[] = []
      const totalBins = dataArray ? dataArray.length : 0

      for (let i = 0; i < barCount; i++) {
        let val = 0
        if (isPlaying) {
          if (hasRealAudio && dataArray && totalBins > 0) {
            // Map bars logarithmically to match human pitch perception
            // (Low bass on the left, mids in center, treble/air on the right)
            const norm = barCount > 1 ? i / (barCount - 1) : 0
            // Focus on musical spectrum (up to ~16-18 kHz, ignoring inaudible bins)
            const maxBin = Math.max(1, Math.floor(totalBins * 0.85))
            const centerBin = Math.min(
              maxBin,
              Math.max(0, Math.round(Math.pow(norm, 1.5) * maxBin))
            )

            // Average adjacent bins in that frequency band to capture rich dynamics
            const span = Math.max(1, Math.floor(norm * 3))
            const startBin = Math.max(0, centerBin - span)
            const endBin = Math.min(totalBins - 1, centerBin + span)
            let sum = 0
            let count = 0
            for (let b = startBin; b <= endBin; b++) {
              sum += dataArray[b]
              count++
            }
            const raw = count > 0 ? (sum / count) / 255 : 0

            // Apply equal-loudness gain curve (high frequencies naturally carry lower amplitude than kicks)
            const gainCompensation = 1 + Math.pow(norm, 0.75) * 0.6
            val = Math.min(1, raw * gainCompensation)
          } else {
            // Harmonic fallback when audio is playing but analyser is pending user gesture
            const harmonic1 = Math.sin(phase * 1.5 + i * 0.45)
            const harmonic2 = Math.cos(phase * 2.2 + i * 0.8)
            const harmonic3 = Math.sin(phase * 0.7 - i * 0.3)
            val = Math.max(0.1, (harmonic1 + harmonic2 + harmonic3 + 3) / 6)
          }
        } else {
          val = 0.05
        }
        targetHeights.push(val)
      }

      // Smooth interpolation
      for (let i = 0; i < barCount; i++) {
        const target = targetHeights[i] * (height - 4)
        const prev = prevHeightsRef.current[i] || 2
        // Lerp
        const current = prev + (target - prev) * 0.25
        prevHeightsRef.current[i] = current

        // Update peak caps
        const peak = peakCapsRef.current[i] || { y: 0, speed: 0 }
        if (current > peak.y) {
          peak.y = current
          peak.speed = 0
        } else {
          peak.speed += 0.25
          peak.y = Math.max(0, peak.y - peak.speed)
        }
        peakCapsRef.current[i] = peak
      }

      // Draw according to mode
      if (mode === 'wave') {
        drawWave(ctx, width, height, prevHeightsRef.current, accentColor)
      } else if (mode === 'mirror') {
        drawMirrorBars(ctx, width, height, barCount, prevHeightsRef.current, accentColor)
      } else {
        drawStandardBars(ctx, width, height, barCount, prevHeightsRef.current, peakCapsRef.current, accentColor)
      }

      ctx.restore()
    }

    render()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [width, height, barCount, mode, isPlaying, getAnalyser, accentColor])

  return <canvas ref={canvasRef} className={className} />
}

function drawStandardBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barCount: number,
  heights: number[],
  peaks: { y: number; speed: number }[],
  accentColor?: string
) {
  const gap = 2
  const barWidth = Math.max(2, (width - (barCount - 1) * gap) / barCount)

  const gradient = ctx.createLinearGradient(0, height, 0, 0)
  if (accentColor) {
    gradient.addColorStop(0, accentColor)
    gradient.addColorStop(1, '#ffffff')
  } else {
    gradient.addColorStop(0, '#06b6d4') // Cyan
    gradient.addColorStop(0.55, '#8b5cf6') // Purple
    gradient.addColorStop(1, '#ec4899') // Pink
  }

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap)
    const barHeight = Math.max(3, Math.min(height - 4, heights[i]))
    const y = height - barHeight

    // Draw bar
    ctx.fillStyle = gradient
    ctx.beginPath()
    const radius = Math.min(barWidth / 2, 2.5)
    ctx.roundRect(x, y, barWidth, barHeight, [radius, radius, 0, 0])
    ctx.fill()

    // Draw peak cap
    const peakY = height - Math.max(barHeight + 2, peaks[i]?.y || 0)
    ctx.fillStyle = '#fdf2f8'
    ctx.beginPath()
    ctx.roundRect(x, Math.max(1, peakY), barWidth, 1.5, 1)
    ctx.fill()
  }
}

function drawMirrorBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  barCount: number,
  heights: number[],
  accentColor?: string
) {
  const gap = 2.5
  const barWidth = Math.max(2, (width - (barCount - 1) * gap) / barCount)
  const centerY = height / 2

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  if (accentColor) {
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(0.5, accentColor)
    gradient.addColorStop(1, '#ffffff')
  } else {
    gradient.addColorStop(0, '#ec4899')
    gradient.addColorStop(0.5, '#8b5cf6')
    gradient.addColorStop(1, '#06b6d4')
  }

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap)
    const halfH = Math.max(2, (heights[i] / 2))
    const y = centerY - halfH

    ctx.fillStyle = gradient
    ctx.beginPath()
    const radius = Math.min(barWidth / 2, 2)
    ctx.roundRect(x, y, barWidth, halfH * 2, radius)
    ctx.fill()
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  heights: number[],
  accentColor?: string
) {
  const pointsCount = heights.length
  const step = width / (pointsCount - 1)
  const centerY = height / 2

  ctx.beginPath()
  ctx.moveTo(0, centerY)

  for (let i = 0; i < pointsCount; i++) {
    const x = i * step
    const offset = ((heights[i] - height / 4) / (height / 2)) * (height * 0.4)
    const y = centerY - offset

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      const prevX = (i - 1) * step
      const prevOffset = ((heights[i - 1] - height / 4) / (height / 2)) * (height * 0.4)
      const prevY = centerY - prevOffset
      const midX = (prevX + x) / 2
      const midY = (prevY + y) / 2
      ctx.quadraticCurveTo(prevX, prevY, midX, midY)
    }
  }

  ctx.strokeStyle = accentColor || '#a855f7'
  ctx.lineWidth = 2.5
  ctx.stroke()
}
