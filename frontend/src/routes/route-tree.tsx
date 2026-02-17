import { createRoute } from '@tanstack/react-router'
import { rootRoute } from './root'
import { DashboardPage } from '../pages/dashboard'
import { LogsPage } from '../pages/logs'
import { IncidentsPage } from '../pages/incidents'
import { IncidentsIndexPage } from '../pages/incidents-index'
import { IncidentDetailPage } from '../pages/incident-detail'
import { SettingsPage } from '../pages/settings'
import { AboutPage } from '../pages/about'

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage
})

const logsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/logs',
  component: LogsPage
})

const incidentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/incidents',
  component: IncidentsPage
})

const incidentsIndexRoute = createRoute({
  getParentRoute: () => incidentsRoute,
  path: '/',
  component: IncidentsIndexPage
})

const incidentDetailRoute = createRoute({
  getParentRoute: () => incidentsRoute,
  path: '$incidentId',
  component: IncidentDetailPage
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage
})

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage
})

export const routeTree = rootRoute.addChildren([
  indexRoute,
  logsRoute,
  incidentsRoute.addChildren([incidentsIndexRoute, incidentDetailRoute]),
  settingsRoute,
  aboutRoute
])
