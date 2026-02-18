import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { formatShortTime } from '../lib/time'

export function LogsOverTimeChart({ data }: { data: { time: string; total: number; errors: number }[] }) {
  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Log Volume</CardTitle>
      </CardHeader>
      <CardContent className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <LineChart data={data}>
            <XAxis dataKey='time' tickFormatter={formatShortTime} stroke='hsl(var(--muted-foreground))' />
            <YAxis stroke='hsl(var(--muted-foreground))' />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', borderRadius: 8, borderColor: 'hsl(var(--border))' }} />
            <Line type='monotone' dataKey='total' stroke='hsl(var(--chart-1))' strokeWidth={2} dot={false} />
            <Line type='monotone' dataKey='errors' stroke='hsl(var(--chart-3))' strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ErrorsByServiceChart({ data }: { data: { service: string; errors: number }[] }) {
  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Errors by Service</CardTitle>
      </CardHeader>
      <CardContent className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data}>
            <XAxis dataKey='service' stroke='hsl(var(--muted-foreground))' />
            <YAxis stroke='hsl(var(--muted-foreground))' />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', borderRadius: 8, borderColor: 'hsl(var(--border))' }} />
            <Bar dataKey='errors' fill='hsl(var(--chart-2))' radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))']

export function IncidentSeverityChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <Card className='glass-panel'>
      <CardHeader>
        <CardTitle>Incident Severity</CardTitle>
      </CardHeader>
      <CardContent className='h-64'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie data={data} dataKey='value' nameKey='name' innerRadius={50} outerRadius={90} paddingAngle={4}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', borderRadius: 8, borderColor: 'hsl(var(--border))' }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
