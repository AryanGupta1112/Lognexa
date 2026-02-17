import { useQuery } from '@tanstack/react-query'
import { Search, SunMoon, Server } from 'lucide-react'

import { getContainers } from '../lib/api'
import { useUiStore } from '../lib/store'
import { Input } from './ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Button } from './ui/button'
import { MobileNav } from './mobile-nav'

const ranges = [
  { value: '15m', label: 'Last 15m' },
  { value: '1h', label: 'Last 1h' },
  { value: '6h', label: 'Last 6h' },
  { value: '24h', label: 'Last 24h' }
]

export function TopBar() {
  const { data: containers } = useQuery({ queryKey: ['containers'], queryFn: getContainers })
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const selectedService = useUiStore((s) => s.selectedService)
  const setSelectedService = useUiStore((s) => s.setSelectedService)
  const timeRange = useUiStore((s) => s.timeRange)
  const setTimeRange = useUiStore((s) => s.setTimeRange)
  const theme = useUiStore((s) => s.theme)
  const setTheme = useUiStore((s) => s.setTheme)

  const services = Array.from(new Set(containers?.map((c) => c.service) || [])).sort()

  return (
    <div className='flex flex-wrap items-center gap-3 border-b border-border/60 bg-card/80 px-6 py-4 backdrop-blur-lg'>
      <MobileNav />
      <div className='flex items-center gap-2 text-sm text-muted-foreground'>
        <Server className='h-4 w-4 text-primary' />
        <span className='font-medium text-foreground'>Live Environment</span>
      </div>
      <div className='relative flex-1 min-w-[200px] max-w-md'>
        <Search className='pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
        <Input
          placeholder='Search logs, services, incidents...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='pl-9 bg-muted/40'
        />
      </div>
      <Select value={selectedService} onValueChange={setSelectedService}>
        <SelectTrigger className='w-[170px] bg-muted/40'>
          <SelectValue placeholder='Service' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>All services</SelectItem>
          {services.map((service) => (
            <SelectItem key={service} value={service}>
              {service}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={timeRange} onValueChange={setTimeRange}>
        <SelectTrigger className='w-[140px] bg-muted/40'>
          <SelectValue placeholder='Range' />
        </SelectTrigger>
        <SelectContent>
          {ranges.map((range) => (
            <SelectItem key={range.value} value={range.value}>
              {range.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant='outline'
        size='icon'
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className='bg-muted/40'
      >
        <SunMoon className='h-4 w-4' />
      </Button>
    </div>
  )
}
