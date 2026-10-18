const { PDFParse } = require('pdf-parse')
async function extractText(buffer) { const parser = new PDFParse({ data: buffer }); try { const parsed = await parser.getText(); const text = parsed.text.replace(/\s+/g, ' ').trim(); if (text.length < 40) { const err = new Error('This PDF has no readable text. Please upload a text-based PDF; scanned PDFs are not supported yet.'); err.status = 422; err.expose = true; throw err } return text.slice(0, 24000) } finally { await parser.destroy() } }
module.exports = { extractText }
