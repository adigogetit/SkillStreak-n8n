function dateInTimezone(timezone, date = new Date()) {
  let formatter
  try { formatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }) } catch { formatter = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) }
  const parts = Object.fromEntries(formatter.formatToParts(date).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}
function weekDates(timezone, referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
  const parts = Object.fromEntries(formatter.formatToParts(referenceDate).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]))
  const current = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)))
  const weekday = current.getUTCDay()
  const mondayOffset = (weekday + 6) % 7
  const monday = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - mondayOffset))
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i)).toISOString().slice(0, 10))
}
function monthDates(timezone, referenceDate = new Date()) {
  const [year, month] = dateInTimezone(timezone, referenceDate).split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return Array.from({ length: daysInMonth }, (_, index) => new Date(Date.UTC(year, month - 1, index + 1)).toISOString().slice(0, 10))
}
module.exports = { dateInTimezone, weekDates, monthDates }
