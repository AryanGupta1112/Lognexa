import { Link, useRouterState } from '@tanstack/react-router'
import { LayoutDashboard, FileText, AlertTriangle, Settings, Info } from 'lucide-react'

import { cn } from '../lib/utils'
import { useUiStore } from '../lib/store'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/logs', label: 'Logs', icon: FileText },
  { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/about', label: 'About', icon: Info }
]

export function Sidebar() {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen)
  const location = useRouterState({ select: (s) => s.location })

  return (
    <aside
      className={cn(
        'hidden md:flex h-screen w-64 flex-col border-r border-border/70 bg-card/80 backdrop-blur-lg',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className='flex items-center gap-3 px-6 py-6'>
        <div className='h-10 w-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-display text-lg'>
          L
        </div>
        <div>
          <h1 className='text-lg font-semibold tracking-tight'>LOGNEXA</h1>
          <p className='text-xs text-muted-foreground'>AI Log Intelligence</p>
        </div>
      </div>
      <nav className='flex-1 space-y-1 px-3'>
        {navItems.map((item) => {
          const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-all',
                active ? 'bg-muted text-foreground shadow-glow' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              )}
            >
              <Icon className='h-4 w-4' />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className='px-6 py-6 text-xs text-muted-foreground'>
        <div className='rounded-lg border border-border/60 bg-muted/40 p-3'>
          Observability fabric for local Docker stacks.
        </div>
      </div>
    </aside>
  )
}
