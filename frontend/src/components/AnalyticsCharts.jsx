import { useLayoutEffect, useRef, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Panel } from './UI'

const chartPalette = {
  coral: '#ff6b57',
  ink: '#07111f',
  sky: '#8cc9ff',
  mint: '#7ce3bf',
  gold: '#ffd166',
  grid: '#d5deea',
  text: '#587392',
}

function ChartContainer({ className, fallbackMinHeight = 288, children }) {
  const containerRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return

    const updateSize = () => {
      const { width, height } = node.getBoundingClientRect()
      setSize((current) => {
        const nextWidth = Math.max(0, Math.floor(width))
        const nextHeight = Math.max(0, Math.floor(height || fallbackMinHeight))

        if (current.width === nextWidth && current.height === nextHeight) {
          return current
        }

        return {
          width: nextWidth,
          height: nextHeight,
        }
      })
    }

    updateSize()

    let frameId = window.requestAnimationFrame(updateSize)
    let observer

    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(updateSize)
      observer.observe(node)
    } else {
      window.addEventListener('resize', updateSize)
    }

    return () => {
      window.cancelAnimationFrame(frameId)
      observer?.disconnect()
      window.removeEventListener('resize', updateSize)
    }
  }, [fallbackMinHeight])

  const isReady = size.width > 0 && size.height > 0

  return (
    <div ref={containerRef} className={className}>
      {isReady ? children(size) : <div className="w-full" style={{ minHeight: fallbackMinHeight }} />}
    </div>
  )
}

function AnalyticsTooltip({ active, payload, label, formatterLabel = 'Score' }) {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm font-medium text-ink-700">
            {entry.name ?? formatterLabel}: {entry.value}
          </p>
        ))}
      </div>
    </div>
  )
}

export function ScoreTrendChart({ data }) {
  return (
    <Panel title="Score trend" copy="Your interview scores are trending upward across the latest practice sessions.">
      <ChartContainer className="h-72 w-full min-w-0" fallbackMinHeight={288}>
        {({ width, height }) => (
          <LineChart width={width} height={height} data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <YAxis
              domain={[60, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: chartPalette.text, fontSize: 12 }}
            />
            <Tooltip content={<AnalyticsTooltip formatterLabel="Score" />} />
            <Line
              type="monotone"
              dataKey="score"
              stroke={chartPalette.coral}
              strokeWidth={3}
              dot={{ r: 4, fill: chartPalette.coral, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: chartPalette.ink }}
            />
          </LineChart>
        )}
      </ChartContainer>
    </Panel>
  )
}

export function InterviewsPerMonthChart({ data }) {
  return (
    <Panel title="Interviews per month" copy="A clear rise in practice volume as you approach your target interview loop.">
      <ChartContainer className="h-72 w-full min-w-0" fallbackMinHeight={288}>
        {({ width, height }) => (
          <BarChart width={width} height={height} data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap={20}>
            <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <Tooltip content={<AnalyticsTooltip formatterLabel="Interviews" />} />
            <Bar dataKey="interviews" fill={chartPalette.sky} radius={[14, 14, 6, 6]} />
          </BarChart>
        )}
      </ChartContainer>
    </Panel>
  )
}

export function SkillImprovementChart({ data }) {
  return (
    <Panel title="Skill improvement" copy="Compare earlier sessions with your current performance across core interview dimensions.">
      <ChartContainer className="h-80 w-full min-w-0" fallbackMinHeight={320}>
        {({ width, height }) => (
          <RadarChart width={width} height={height} data={data} outerRadius="72%">
            <PolarGrid stroke={chartPalette.grid} />
            <PolarAngleAxis dataKey="skill" tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <Tooltip content={<AnalyticsTooltip formatterLabel="Level" />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: chartPalette.text }} />
            <Radar
              name="Previous"
              dataKey="previous"
              stroke={chartPalette.gold}
              fill={chartPalette.gold}
              fillOpacity={0.2}
            />
            <Radar
              name="Current"
              dataKey="current"
              stroke={chartPalette.mint}
              fill={chartPalette.mint}
              fillOpacity={0.28}
            />
          </RadarChart>
        )}
      </ChartContainer>
    </Panel>
  )
}

export function ResultsBreakdownChart({ data }) {
  return (
    <Panel title="Performance chart" copy="A visual comparison across the competencies scored in this interview.">
      <ChartContainer className="h-72 w-full min-w-0" fallbackMinHeight={288}>
        {({ width, height }) => (
          <BarChart width={width} height={height} data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }} barCategoryGap={18}>
            <CartesianGrid stroke={chartPalette.grid} strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: chartPalette.text, fontSize: 12 }} />
            <Tooltip content={<AnalyticsTooltip formatterLabel="Score" />} />
            <Bar dataKey="score" fill={chartPalette.coral} radius={[14, 14, 6, 6]} />
          </BarChart>
        )}
      </ChartContainer>
    </Panel>
  )
}
