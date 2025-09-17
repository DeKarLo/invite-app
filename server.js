// server.js
require('dotenv').config()
const express = require('express')
const path = require('path')
const fs = require('fs')
const mongoose = require('mongoose')

const app = express()

// --- Basic config ---
const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI

// --- DB ---
mongoose.set('strictQuery', true)
mongoose
  .connect(MONGODB_URI, { dbName: process.env.DB_NAME || 'invite_db' })
  .then(async () => {
    console.log('✅ MongoDB connected')
    await initializeGuests()
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  })

const guestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    attending: { type: Boolean, default: null },
  },
  { timestamps: true }
)

const Guest = mongoose.model('Guest', guestSchema)

// --- Middlewares ---
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

// --- Healthcheck (удобно для Render) ---
app.get('/health', (_req, res) => res.status(200).send('OK'))

// --- Pages ---
app.get('/invite/:name', async (req, res) => {
  const nameParam = decodeURIComponent(req.params.name || '').trim()
  if (!nameParam) return res.status(400).render('error', { message: 'Некорректное имя гостя' })

  const guest = await findGuestByName(nameParam)
  if (!guest) return res.status(404).render('error', { message: `Гость "${nameParam}" не найден` })

  res.render('invite', { guest })
})

// --- API ---
app.get('/api/guests', async (_req, res) => {
  const guests = await Guest.find().sort({ name: 1 }).lean()
  res.json(guests)
})

app.post('/api/respond/:name', async (req, res) => {
  try {
    const nameParam = decodeURIComponent(req.params.name || '').trim()
    const { attending } = req.body

    if (typeof attending !== 'boolean') {
      return res.status(400).json({ error: 'attending must be boolean' })
    }

    const guest = await findGuestByName(nameParam)
    if (!guest) {
      return res.status(404).json({ error: `Guest "${nameParam}" not found` })
    }

    guest.attending = attending
    await guest.save()
    res.json({ ok: true, name: guest.name, attending: guest.attending })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// --- Start ---
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
})

// --- Helpers ---
async function initializeGuests() {
  const count = await Guest.countDocuments()
  if (count > 0) {
    console.log(`ℹ️ Guests already initialized (${count})`)
    return
  }
  const filePath = path.join(__dirname, 'guests.json')
  if (!fs.existsSync(filePath)) {
    console.log('ℹ️ guests.json not found, skipping seeding')
    return
  }
  const raw = fs.readFileSync(filePath, 'utf8')
  let names = []
  try {
    const json = JSON.parse(raw)
    names = Array.isArray(json) ? json : Array.isArray(json.names) ? json.names : []
  } catch (e) {
    console.error('Invalid guests.json. Expected an array of names or { "names": [...] }')
  }
  if (!names.length) {
    console.log('ℹ️ No names to seed')
    return
  }
  const docs = names
    .filter(Boolean)
    .map((n) => ({ name: String(n).trim() }))
    .filter((d) => d.name.length > 0)

  if (!docs.length) {
    console.log('ℹ️ No valid names to seed')
    return
  }

  await Guest.insertMany(docs, { ordered: false })
  const seeded = await Guest.countDocuments()
  console.log(`✅ Seeded guests: ${seeded}`)
}

async function findGuestByName(name) {
  // case-insensitive exact match
  return Guest.findOne({ name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } })
}

function escapeRegex(s) {
  return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}
