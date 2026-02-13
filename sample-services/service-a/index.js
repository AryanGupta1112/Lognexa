import express from 'express'

const app = express()
const port = process.env.PORT || 3001

app.get('/', (req, res) => {
  const latency = Math.floor(Math.random() * 200)
  console.log(`[INFO] Request received / latency=${latency}ms`)
  if (Math.random() < 0.08) {
    console.error('[ERROR] Randomized failure on /')
    return res.status(500).json({ error: 'Randomized failure' })
  }
  res.json({ ok: true, latency })
})

app.get('/health', (req, res) => {
  console.log('[INFO] Health check')
  res.json({ status: 'ok' })
})

app.get('/fail', (req, res) => {
  console.error('[ERROR] Simulated failure triggered')
  res.status(500).json({ error: 'Simulated failure triggered' })
})

setInterval(() => {
  console.log('[DEBUG] heartbeat tick')
}, 5000)

app.listen(port, () => {
  console.log(`[INFO] service-a listening on ${port}`)
})
