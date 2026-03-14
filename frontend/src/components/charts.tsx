import { useMemo, useEffect, useState } from 'react'
import { Maximize2 } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'
import { formatShortTime, parseApiDate } from '../lib/time'

type TooltipItem = {
  name?: string
  value?: number | string
  color?: string
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className='flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
      {message}
    </div>
  )
}

function formatTooltipLabel(value?: string) {
  if (!value) return ''
  const parsed = parseApiDate(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function hasMultipleDates(values: string[]) {
  const dayKeys = new Set(
    values.map((value) => {
      const parsed = parseApiDate(value)
      if (Number.isNaN(parsed.getTime())) return value
      return `${parsed.getFullYear()}-${parsed.getMonth()}-${parsed.getDate()}`
    }),
  )
  return dayKeys.size > 1
}

function formatAxisTime(value: string, includeDate: boolean) {
  const parsed = parseApiDate(value)
  if (Number.isNaN(parsed.getTime())) return value

  if (!includeDate) {
    return formatShortTime(value)
  }

  return parsed.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className='rounded-xl border border-border/80 bg-card/95 px-3 py-2 shadow-xl backdrop-blur'>
      {label ? <p className='mb-2 text-xs font-medium text-muted-foreground'>{formatTooltipLabel(String(label))}</p> : null}
      <div className='space-y-1.5'>
        {payload.map((item, index) => (
          <div key={`${item.name}-${index}`} className='flex items-center justify-between gap-4 text-sm'>
            <div className='flex items-center gap-2'>
              <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: item.color }} />
              <span className='text-muted-foreground'>{item.name}</span>
            </div>
            <span className='font-medium'>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const SEVERITY_COLORS: Record<string, string> = {
  high: 'hsl(var(--destructive))',
  medium: 'hsl(var(--chart-2))',
  low: 'hsl(var(--chart-1))',
}

const LEVEL_COLORS: Record<string, string> = {
  ERROR: 'hsl(var(--destructive))',
  WARN: 'hsl(var(--chart-2))',
  INFO: 'hsl(var(--chart-1))',
  DEBUG: 'hsl(var(--chart-4))',
}

export function LogsOverTimeChart({ data }: { data: { time: string; total: number; errors: number }[] }) {
  if (data.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>How Busy The System Is</CardTitle>
          <CardDescription>Total logs and error logs over time.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='No log activity is available yet for this time range.' />
        </CardContent>
      </Card>
    )
  }

  const peakTotal = Math.max(...data.map((point) => point.total))
  const axisMax = Math.max(peakTotal + 1, 5)
  const multiDate = useMemo(() => hasMultipleDates(data.map((point) => point.time)), [data])
  const [yMin, setYMin] = useState(0)
  const [yMax, setYMax] = useState(axisMax)
  const [brushStartIndex, setBrushStartIndex] = useState(0)
  const [brushEndIndex, setBrushEndIndex] = useState(Math.max(data.length - 1, 0))
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setYMin((prev) => Math.min(Math.max(prev, 0), Math.max(axisMax - 1, 0)))
    setYMax((prev) => Math.min(Math.max(prev, 1), axisMax))
  }, [axisMax])

  useEffect(() => {
    const maxIndex = Math.max(data.length - 1, 0)
    setBrushStartIndex((prev) => Math.min(Math.max(prev, 0), maxIndex))
    setBrushEndIndex((prev) => Math.min(Math.max(prev, 0), maxIndex))
  }, [data.length])

  const safeYMin = Math.min(yMin, yMax - 1)
  const safeYMax = Math.max(yMax, safeYMin + 1)
  const safeBrushStart = Math.min(brushStartIndex, brushEndIndex)
  const safeBrushEnd = Math.max(brushEndIndex, safeBrushStart)

  const resetZoom = () => {
    setYMin(0)
    setYMax(axisMax)
    setBrushStartIndex(0)
    setBrushEndIndex(Math.max(data.length - 1, 0))
  }

  const renderChartBody = (chartHeightClass: string) => (
    <>
      <div className='mb-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground'>
        <p className='mb-2 text-foreground'>Zoom controls</p>
        <div className='grid gap-2'>
          <div className='flex justify-end'>
            <Button size='sm' variant='outline' onClick={resetZoom}>
              Reset zoom
            </Button>
          </div>
          <label className='flex items-center justify-between gap-3'>
            <span>Y-axis min</span>
            <input
              type='range'
              min={0}
              max={Math.max(axisMax - 1, 0)}
              value={safeYMin}
              onInput={(event) => {
                const value = Number(event.currentTarget.value)
                setYMin(Math.min(value, safeYMax - 1))
              }}
              className='w-40'
            />
            <input
              type='number'
              min={0}
              max={Math.max(safeYMax - 1, 0)}
              value={safeYMin}
              onChange={(event) => {
                const value = Number(event.currentTarget.value)
                if (Number.isNaN(value)) return
                setYMin(Math.min(Math.max(value, 0), safeYMax - 1))
              }}
              className='w-20 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-right text-xs'
            />
          </label>
          <label className='flex items-center justify-between gap-3'>
            <span>Y-axis max</span>
            <input
              type='range'
              min={1}
              max={axisMax}
              value={safeYMax}
              onInput={(event) => {
                const value = Number(event.currentTarget.value)
                setYMax(Math.max(value, safeYMin + 1))
              }}
              className='w-40'
            />
            <input
              type='number'
              min={Math.min(safeYMin + 1, axisMax)}
              max={axisMax}
              value={safeYMax}
              onChange={(event) => {
                const value = Number(event.currentTarget.value)
                if (Number.isNaN(value)) return
                setYMax(Math.min(Math.max(value, safeYMin + 1), axisMax))
              }}
              className='w-20 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-right text-xs'
            />
          </label>
          <p>Use the bottom chart slider to zoom on time (X-axis).</p>
        </div>
      </div>
      <div className={chartHeightClass}>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id='logsTotalFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='hsl(var(--chart-1))' stopOpacity={0.35} />
                <stop offset='95%' stopColor='hsl(var(--chart-1))' stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id='logsErrorFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='hsl(var(--destructive))' stopOpacity={0.4} />
                <stop offset='95%' stopColor='hsl(var(--destructive))' stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' vertical={false} opacity={0.35} />
            <XAxis
              dataKey='time'
              tickFormatter={(value) => formatAxisTime(String(value), multiDate)}
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              allowDataOverflow
              domain={[safeYMin, safeYMax]}
              width={64}
              tickMargin={8}
            />
            <Tooltip content={<ChartTooltip label='Time bucket' />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type='linear'
              dataKey='total'
              name='Total logs'
              stroke='hsl(var(--chart-1))'
              fill='url(#logsTotalFill)'
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type='linear'
              dataKey='errors'
              name='Error logs'
              stroke='hsl(var(--destructive))'
              fill='url(#logsErrorFill)'
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Brush
              dataKey='time'
              height={22}
              stroke='hsl(var(--chart-1))'
              travellerWidth={10}
              tickFormatter={(value) => formatAxisTime(String(value), multiDate)}
              startIndex={safeBrushStart}
              endIndex={safeBrushEnd}
              onChange={(range) => {
                if (!range) return
                if (typeof range.startIndex === 'number') setBrushStartIndex(range.startIndex)
                if (typeof range.endIndex === 'number') setBrushEndIndex(range.endIndex)
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </>
  )

  return (
    <>
      <Card className='glass-panel'>
        <CardHeader className='flex-row items-start justify-between space-y-0'>
          <div className='space-y-1.5'>
            <CardTitle>How Busy The System Is</CardTitle>
            <CardDescription>Total logs and error logs over time.</CardDescription>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsFullscreen(true)}
            aria-label='Open busy system chart in full screen'
          >
            <Maximize2 className='h-4 w-4' />
          </Button>
        </CardHeader>
        <CardContent className='space-y-3'>{renderChartBody('h-64')}</CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className='h-[92vh] w-[96vw] max-w-[96vw] gap-0 overflow-hidden p-0'>
          <div className='flex h-full flex-col overflow-hidden'>
            <DialogHeader className='border-b border-border/60 px-6 pb-4 pt-6'>
              <DialogTitle>How Busy The System Is</DialogTitle>
              <DialogDescription>Total logs and error logs over time.</DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-auto px-6 pb-6 pt-4'>
              <div className='space-y-3'>{renderChartBody('h-[62vh] min-h-[420px]')}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ErrorRateTrendChart({ data }: { data: { time: string; errorRate: number }[] }) {
  if (data.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Error Rate Trend</CardTitle>
          <CardDescription>Percentage of logs that are errors.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='Error rate will appear once logs are available.' />
        </CardContent>
      </Card>
    )
  }

  const peakRate = Math.max(...data.map((point) => point.errorRate), 1)
  const axisMax = Math.ceil(peakRate + 2)
  const multiDate = useMemo(() => hasMultipleDates(data.map((point) => point.time)), [data])
  const [yMin, setYMin] = useState(0)
  const [yMax, setYMax] = useState(axisMax)
  const [brushStartIndex, setBrushStartIndex] = useState(0)
  const [brushEndIndex, setBrushEndIndex] = useState(Math.max(data.length - 1, 0))
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setYMin((prev) => Math.min(Math.max(prev, 0), Math.max(axisMax - 1, 0)))
    setYMax((prev) => Math.min(Math.max(prev, 1), axisMax))
  }, [axisMax])

  useEffect(() => {
    const maxIndex = Math.max(data.length - 1, 0)
    setBrushStartIndex((prev) => Math.min(Math.max(prev, 0), maxIndex))
    setBrushEndIndex((prev) => Math.min(Math.max(prev, 0), maxIndex))
  }, [data.length])

  const safeYMin = Math.min(yMin, yMax - 1)
  const safeYMax = Math.max(yMax, safeYMin + 1)
  const safeBrushStart = Math.min(brushStartIndex, brushEndIndex)
  const safeBrushEnd = Math.max(brushEndIndex, safeBrushStart)

  const resetZoom = () => {
    setYMin(0)
    setYMax(axisMax)
    setBrushStartIndex(0)
    setBrushEndIndex(Math.max(data.length - 1, 0))
  }

  const renderChartBody = (chartHeightClass: string) => (
    <>
      <div className='mb-3 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground'>
        <p className='mb-2 text-foreground'>Zoom controls</p>
        <div className='grid gap-2'>
          <div className='flex justify-end'>
            <Button size='sm' variant='outline' onClick={resetZoom}>
              Reset zoom
            </Button>
          </div>
          <label className='flex items-center justify-between gap-3'>
            <span>Y-axis min</span>
            <input
              type='range'
              min={0}
              max={Math.max(axisMax - 1, 0)}
              value={safeYMin}
              onInput={(event) => {
                const value = Number(event.currentTarget.value)
                setYMin(Math.min(value, safeYMax - 1))
              }}
              className='w-40'
            />
            <div className='flex items-center gap-1'>
              <input
                type='number'
                min={0}
                max={Math.max(safeYMax - 1, 0)}
                value={safeYMin}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value)
                  if (Number.isNaN(value)) return
                  setYMin(Math.min(Math.max(value, 0), safeYMax - 1))
                }}
                className='w-20 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-right text-xs'
              />
              <span>%</span>
            </div>
          </label>
          <label className='flex items-center justify-between gap-3'>
            <span>Y-axis max</span>
            <input
              type='range'
              min={1}
              max={axisMax}
              value={safeYMax}
              onInput={(event) => {
                const value = Number(event.currentTarget.value)
                setYMax(Math.max(value, safeYMin + 1))
              }}
              className='w-40'
            />
            <div className='flex items-center gap-1'>
              <input
                type='number'
                min={Math.min(safeYMin + 1, axisMax)}
                max={axisMax}
                value={safeYMax}
                onChange={(event) => {
                  const value = Number(event.currentTarget.value)
                  if (Number.isNaN(value)) return
                  setYMax(Math.min(Math.max(value, safeYMin + 1), axisMax))
                }}
                className='w-20 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-right text-xs'
              />
              <span>%</span>
            </div>
          </label>
          <p>Use the bottom chart slider to zoom on time (X-axis).</p>
        </div>
      </div>
      <div className={chartHeightClass}>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data} margin={{ top: 12, right: 10, left: 8, bottom: 0 }}>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' vertical={false} opacity={0.35} />
            <XAxis
              dataKey='time'
              tickFormatter={(value) => formatAxisTime(String(value), multiDate)}
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              allowDataOverflow
              domain={[safeYMin, safeYMax]}
              width={64}
              tickMargin={8}
            />
            <Tooltip content={<ChartTooltip label='Error rate' />} />
            <Line
              type='linear'
              dataKey='errorRate'
              name='Error rate %'
              stroke='hsl(var(--chart-3))'
              strokeWidth={2.5}
              dot={{ r: 2.5 }}
              activeDot={{ r: 5 }}
            />
            <Brush
              dataKey='time'
              height={22}
              stroke='hsl(var(--chart-3))'
              travellerWidth={10}
              tickFormatter={(value) => formatAxisTime(String(value), multiDate)}
              startIndex={safeBrushStart}
              endIndex={safeBrushEnd}
              onChange={(range) => {
                if (!range) return
                if (typeof range.startIndex === 'number') setBrushStartIndex(range.startIndex)
                if (typeof range.endIndex === 'number') setBrushEndIndex(range.endIndex)
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  )

  return (
    <>
      <Card className='glass-panel'>
        <CardHeader className='flex-row items-start justify-between space-y-0'>
          <div className='space-y-1.5'>
            <CardTitle>Error Rate Trend</CardTitle>
            <CardDescription>Percentage of logs that are errors.</CardDescription>
          </div>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setIsFullscreen(true)}
            aria-label='Open error rate chart in full screen'
          >
            <Maximize2 className='h-4 w-4' />
          </Button>
        </CardHeader>
        <CardContent className='space-y-3'>{renderChartBody('h-64')}</CardContent>
      </Card>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className='h-[92vh] w-[96vw] max-w-[96vw] gap-0 overflow-hidden p-0'>
          <div className='flex h-full flex-col overflow-hidden'>
            <DialogHeader className='border-b border-border/60 px-6 pb-4 pt-6'>
              <DialogTitle>Error Rate Trend</DialogTitle>
              <DialogDescription>Percentage of logs that are errors.</DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-auto px-6 pb-6 pt-4'>
              <div className='space-y-3'>{renderChartBody('h-[62vh] min-h-[420px]')}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ServiceVolumeChart({ data }: { data: { service: string; total: number }[] }) {
  const top = [...data].sort((a, b) => b.total - a.total).slice(0, 6)

  if (top.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Most Active Services</CardTitle>
          <CardDescription>Services generating the most logs.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='No service activity is available for the current filters.' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Most Active Services</CardTitle>
        <CardDescription>Services generating the most logs.</CardDescription>
      </CardHeader>
      <CardContent className='h-72'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={top} layout='vertical' margin={{ top: 8, right: 22, left: 8, bottom: 8 }}>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' horizontal={false} opacity={0.3} />
            <XAxis type='number' stroke='hsl(var(--muted-foreground))' tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              dataKey='service'
              type='category'
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<ChartTooltip label='Service activity' />} />
            <Bar dataKey='total' name='Total logs' fill='hsl(var(--chart-2))' radius={[0, 8, 8, 0]}>
              <LabelList dataKey='total' position='right' fill='hsl(var(--foreground))' fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function LogLevelBreakdownChart({ data }: { data: { level: string; value: number }[] }) {
  const nonZero = data.filter((item) => item.value > 0)
  const total = nonZero.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Log Level Breakdown</CardTitle>
        <CardDescription>How many logs are info, warning, and error.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='h-56'>
          {nonZero.length === 0 ? (
            <EmptyChartState message='No logs are available for the selected filters.' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={nonZero}
                  dataKey='value'
                  nameKey='level'
                  innerRadius={54}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke='none'
                >
                  {nonZero.map((entry) => (
                    <Cell key={entry.level} fill={LEVEL_COLORS[entry.level] || 'hsl(var(--chart-4))'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip label='Log levels' />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {nonZero.length > 0 ? (
          <div className='grid gap-2'>
            <div className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm'>
              <span className='text-muted-foreground'>Total logs</span>
              <span className='font-semibold'>{total}</span>
            </div>
            {nonZero.map((item) => (
              <div key={item.level} className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: LEVEL_COLORS[item.level] || 'hsl(var(--chart-4))' }} />
                  <span className='text-muted-foreground'>{item.level}</span>
                </div>
                <span className='font-medium'>{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function IncidentSeverityChart({ data }: { data: { name: string; value: number }[] }) {
  const nonZero = data.filter((item) => item.value > 0)
  const total = nonZero.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Incidents By Severity</CardTitle>
        <CardDescription>How serious the current incidents are.</CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='h-56'>
          {nonZero.length === 0 ? (
            <EmptyChartState message='No incidents are available for the current dashboard view.' />
          ) : (
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={nonZero}
                  dataKey='value'
                  nameKey='name'
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={4}
                  stroke='none'
                >
                  {nonZero.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || 'hsl(var(--chart-1))'} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip label='Incident severity' />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
        {nonZero.length > 0 ? (
          <div className='grid gap-2'>
            <div className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm'>
              <span className='text-muted-foreground'>Total incidents</span>
              <span className='font-semibold'>{total}</span>
            </div>
            {nonZero.map((item) => (
              <div key={item.name} className='flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm'>
                <div className='flex items-center gap-2'>
                  <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: SEVERITY_COLORS[item.name] || 'hsl(var(--chart-1))' }} />
                  <span className='capitalize text-muted-foreground'>{item.name}</span>
                </div>
                <span className='font-medium'>{item.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function IncidentServiceChart({ data }: { data: { service: string; incidents: number }[] }) {
  const top = [...data].sort((a, b) => b.incidents - a.incidents).slice(0, 6)

  if (top.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Incident Hotspots</CardTitle>
          <CardDescription>Services with the most incident involvement.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='No incidents are available for this time range.' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Incident Hotspots</CardTitle>
        <CardDescription>Services with the most incident involvement.</CardDescription>
      </CardHeader>
      <CardContent className='h-72'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={top} layout='vertical' margin={{ top: 8, right: 22, left: 8, bottom: 8 }}>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' horizontal={false} opacity={0.3} />
            <XAxis type='number' stroke='hsl(var(--muted-foreground))' tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              dataKey='service'
              type='category'
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <Tooltip content={<ChartTooltip label='Incident hotspots' />} />
            <Bar dataKey='incidents' name='Incident count' fill='hsl(var(--destructive))' radius={[0, 8, 8, 0]}>
              <LabelList dataKey='incidents' position='right' fill='hsl(var(--foreground))' fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
