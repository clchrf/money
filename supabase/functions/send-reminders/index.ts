// Supabase Edge Function: send-reminders
//
// Triggered twice a day by pg_cron (see ../../cron.sql) — once for the
// 12:00 Asia/Taipei slot, once for 19:00. For every user who has that slot
// enabled and has NOT recorded a transaction yet today (Asia/Taipei), sends
// a short reminder email via Resend.
//
// Deploy: paste this file into Supabase Dashboard → Edge Functions →
// New function (name it "send-reminders"), or `supabase functions deploy
// send-reminders`.
//
// Secrets this function needs (Dashboard → Edge Functions → Secrets, or
// `supabase secrets set`):
//   RESEND_API_KEY   — from resend.com/api-keys
//   EMAIL_FROM        — a sender address on a domain verified in Resend,
//                        e.g. "記帳提醒 <reminder@yourdomain.com>"
//                        (falls back to Resend's shared test sender, which
//                        can only deliver to the Resend account's own
//                        verified email — fine for a first test, not for
//                        real users)
//   CRON_SECRET       — a random string only pg_cron and this function
//                        know, sent as the x-cron-secret header (not
//                        Authorization — that one has to hold an actual
//                        Supabase key, see below). Rejects any caller
//                        that isn't the scheduler; this function iterates
//                        every user's data, so it must never be publicly
//                        triggerable. Generate the string however you
//                        like; it just has to match the value stored in
//                        Vault by cron.sql.
//
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically by
// Supabase for every Edge Function — nothing to configure for those; they're
// used only to build the DB client, not for caller authentication (see
// CRON_SECRET above for why).
//
// Note: Supabase's own platform gateway independently requires the
// `Authorization` header to be a real project key before it will even
// invoke this function — cron.sql sends the public anon key there, which
// is fine to hardcode since that key is designed to be public.

import { createClient } from 'npm:@supabase/supabase-js@2'

const TAIPEI_OFFSET_MINUTES = 8 * 60 // Asia/Taipei is UTC+8 year-round, no DST

type Slot = 'noon' | 'evening'

interface ReminderRow {
  user_id: string
  email: string | null
}

function taipeiTodayRangeUtc(now: Date): { startUtc: string; endUtc: string; dateLabel: string } {
  const taipeiMs = now.getTime() + TAIPEI_OFFSET_MINUTES * 60_000
  const taipei = new Date(taipeiMs)
  const y = taipei.getUTCFullYear()
  const m = taipei.getUTCMonth()
  const d = taipei.getUTCDate()
  // Midnight Taipei, expressed back in UTC, is midnight-minus-8h UTC.
  const startUtc = new Date(Date.UTC(y, m, d, 0, 0, 0) - TAIPEI_OFFSET_MINUTES * 60_000)
  const endUtc = new Date(Date.UTC(y, m, d + 1, 0, 0, 0) - TAIPEI_OFFSET_MINUTES * 60_000)
  return {
    startUtc: startUtc.toISOString(),
    endUtc: endUtc.toISOString(),
    dateLabel: `${y}/${m + 1}/${d}`,
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  const from = Deno.env.get('EMAIL_FROM') ?? 'onboarding@resend.dev'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  })
  if (!res.ok) return { ok: false, error: `Resend ${res.status}: ${await res.text()}` }
  return { ok: true }
}

function reminderEmailHtml(dateLabel: string, slot: Slot): string {
  const timeLabel = slot === 'noon' ? '中午' : '晚上'
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#111;">
      <p style="font-size:15px;color:#666;margin:0 0 8px;">${dateLabel}</p>
      <h1 style="font-size:22px;margin:0 0 16px;">今天還沒記帳</h1>
      <p style="font-size:15px;line-height:1.6;color:#333;">
        現在是${timeLabel}，你今天還沒有任何一筆記帳紀錄。花幾秒鐘打開 App 記一筆吧。
      </p>
    </div>
  `
}

Deno.serve(async (req) => {
  // The platform's own gateway requires `Authorization` to be a real
  // Supabase-issued key (any project key satisfies it — see cron.sql,
  // which sends the public anon key there since that's what it's for).
  // Our own authorization is a *separate* header, so it never collides
  // with whatever format Supabase's key system uses: only pg_cron knows
  // CRON_SECRET, and this function iterates every user's data, so it must
  // never be triggerable by anyone who merely holds a project API key.
  const cronSecret = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret')
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  let slot: Slot
  try {
    const body = await req.json()
    if (body.slot !== 'noon' && body.slot !== 'evening') throw new Error('invalid slot')
    slot = body.slot
  } catch {
    return new Response(JSON.stringify({ error: 'body must be {"slot":"noon"|"evening"}' }), { status: 400 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  const enabledColumn = slot === 'noon' ? 'noon_enabled' : 'evening_enabled'

  const { data: candidates, error: settingsError } = await supabase
    .from('reminder_settings')
    .select('user_id, email')
    .eq(enabledColumn, true)
    .not('email', 'is', null)
    .neq('email', '')

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 })
  }

  const rows = (candidates ?? []) as ReminderRow[]
  const { startUtc, endUtc, dateLabel } = taipeiTodayRangeUtc(new Date())

  let sent = 0
  let skippedAlreadyRecorded = 0
  const errors: string[] = []

  for (const row of rows) {
    const { count, error: txError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', row.user_id)
      .gte('created_at', startUtc)
      .lt('created_at', endUtc)

    if (txError) {
      errors.push(`${row.user_id}: ${txError.message}`)
      continue
    }
    if ((count ?? 0) > 0) {
      skippedAlreadyRecorded++
      continue
    }

    const result = await sendEmail(row.email!, '記帳提醒', reminderEmailHtml(dateLabel, slot))
    if (result.ok) sent++
    else errors.push(`${row.user_id}: ${result.error}`)
  }

  return new Response(
    JSON.stringify({ slot, dateLabel, candidates: rows.length, sent, skippedAlreadyRecorded, errors }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
