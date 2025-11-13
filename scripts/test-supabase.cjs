const fs = require('fs')
const path = require('path')

function loadEnvValue(line) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) {
    return null
  }

  const eqIndex = trimmed.indexOf('=')
  if (eqIndex === -1) {
    return null
  }

  const key = trimmed.slice(0, eqIndex).trim()
  let value = trimmed.slice(eqIndex + 1).trim()

  if (!key) {
    return null
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }

  if (value.includes('\\n')) {
    value = value.replace(/\\n/g, '\n')
  }

  return { key, value }
}

function hydrateEnv() {
  const candidates = ['.env.local', '.env']

  for (const candidate of candidates) {
    const fullPath = path.resolve(candidate)
    if (!fs.existsSync(fullPath)) {
      continue
    }

    const content = fs.readFileSync(fullPath, 'utf-8')
    const lines = content.split(/\r?\n/)

    for (const line of lines) {
      const parsed = loadEnvValue(line)
      if (!parsed) {
        continue
      }

      if (process.env[parsed.key] === undefined) {
        process.env[parsed.key] = parsed.value
      }
    }
  }
}

async function main() {
  hydrateEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    process.exit(1)
  }

  const tableName = process.argv[2]
  if (!tableName) {
    console.error('Usage: node scripts/test-supabase.cjs <table_name>')
    process.exit(1)
  }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log(`Querying Supabase table "${tableName}"...`)
  const { data, error } = await supabase.from(tableName).select('*').limit(5)

  if (error) {
    console.error('Supabase query failed:', error)
    process.exit(1)
  }

  console.log(`Successfully fetched ${data?.length ?? 0} row(s).`)
  if (data && data.length > 0) {
    console.dir(data, { depth: null })
  }
}

main().catch((error) => {
  console.error('Unexpected error while querying Supabase:', error)
  process.exit(1)
})


