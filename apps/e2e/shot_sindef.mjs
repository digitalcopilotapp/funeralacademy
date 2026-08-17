import { chromium } from 'playwright'

const out = 'c:/Users/Shadow/Documents/funeralacademy/.localdev/shots'
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage()

await p.goto('http://localhost:3010/login', { waitUntil: 'networkidle' })
await p.screenshot({ path: `${out}/19-sindef-login.png` })

await p.fill('input[type="email"], input[name="email"]', 'aluno@funeralacademy.com.br')
await p.fill('input[type="password"], input[name="password"]', process.env.PW)
await p.click('button[type="submit"]')
await p.waitForTimeout(7000)

await p.goto('http://localhost:3010/courses', { waitUntil: 'networkidle' })
await p.waitForTimeout(5000)
console.log('title:', await p.title())
await p.screenshot({ path: `${out}/18-sindef-cursos.png` })

await b.close()
