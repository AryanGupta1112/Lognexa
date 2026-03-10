import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { formatShortTime } from '../lib/time'

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className='flex h-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground'>
      {message}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className='rounded-xl border border-border/80 bg-card/95 px-3 py-2 shadow-xl backdrop-blur'>
      {label ? <p className='mb-2 text-xs font-medium text-muted-foreground'>{label}</p> : null}
      <div className='space-y-1.5'>
        {payload.map((item) => (
          <div key={item.name} className='flex items-center justify-between gap-4 text-sm'>
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

export function LogsOverTimeChart({ data }: { data: { time: string; total: number; errors: number }[] }) {
  if (data.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Log Volume</CardTitle>
          <CardDescription>Traffic and error density across the selected time range.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='No log activity is available yet for this time range.' />
        </CardContent>
      </Card>
    )
  }

  const peakTotal = Math.max(...data.map((point) => point.total))

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Log Volume</CardTitle>
        <CardDescription>Traffic and error density across the selected time range.</CardDescription>
      </CardHeader>
      <CardContent className='h-72'>
        <ResponsiveContainer width='100%' height='100%'>
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id='logsTotalFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='hsl(var(--chart-1))' stopOpacity={0.35} />
                <stop offset='95%' stopColor='hsl(var(--chart-1))' stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id='logsErrorFill' x1='0' y1='0' x2='0' y2='1'>
                <stop offset='5%' stopColor='hsl(var(--chart-3))' stopOpacity={0.4} />
                <stop offset='95%' stopColor='hsl(var(--chart-3))' stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' vertical={false} opacity={0.35} />
            <XAxis
              dataKey='time'
              tickFormatter={formatShortTime}
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
              domain={[0, Math.max(peakTotal + 1, 5)]}
            />
            <Tooltip content={<ChartTooltip label='Log bucket' />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area
              type='monotone'
              dataKey='total'
              name='Total logs'
              stroke='hsl(var(--chart-1))'
              fill='url(#logsTotalFill)'
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type='monotone'
              dataKey='errors'
              name='Errors'
              stroke='hsl(var(--chart-3))'
              fill='url(#logsErrorFill)'
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ErrorsByServiceChart({ data }: { data: { service: string; errors: number }[] }) {
  const sorted = [...data].sort((a, b) => b.errors - a.errors).slice(0, 6)

  if (sorted.length === 0) {
    return (
      <Card className='glass-panel'>
        <CardHeader>
          <CardTitle>Errors by Service</CardTitle>
          <CardDescription>Which services are contributing the most error volume.</CardDescription>
        </CardHeader>
        <CardContent className='h-72'>
          <EmptyChartState message='No error logs are present for the selected filters.' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Errors by Service</CardTitle>
        <CardDescription>Which services are contributing the most error volume.</CardDescription>
      </CardHeader>
      <CardContent className='h-72'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={sorted} layout='vertical' margin={{ top: 6, right: 20, left: 10, bottom: 6 }}>
            <CartesianGrid stroke='hsl(var(--border))' strokeDasharray='3 3' horizontal={false} opacity={0.3} />
            <XAxis type='number' stroke='hsl(var(--muted-foreground))' tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis
              dataKey='service'
              type='category'
              stroke='hsl(var(--muted-foreground))'
              tickLine={false}
              axisLine={false}
              width={90}
            />
            <Tooltip content={<ChartTooltip label='Service errors' />} />
            <Bar dataKey='errors' name='Errors' fill='hsl(var(--chart-2))' radius={[0, 8, 8, 0]}>
              <LabelList dataKey='errors' position='right' fill='hsl(var(--foreground))' fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
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
        <CardTitle>Incident Severity</CardTitle>
        <CardDescription>Current incident load by severity level.</CardDescription>
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
              <span className='text-muted-foreground'>Total active incidents</span>
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
