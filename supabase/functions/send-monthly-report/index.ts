// Supabase Edge Function: send-monthly-report
//
// Triggered on the 1st of every month by pg_cron (see ../../cron.sql).
// For every user with monthly_report_enabled, emails a summary of *last*
// month's spending: total, per-category breakdown, top category, and (if
// the user has a monthly total budget set) usage against it.
//
// Deploy: paste this file into Supabase Dashboard → Edge Functions →
// New function (name it "send-monthly-report"), or `supabase functions
// deploy send-monthly-report`.
//
// Needs the same secrets as send-reminders: RESEND_API_KEY, EMAIL_FROM.
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from 'npm:@supabase/supabase-js@2'

const TAIPEI_OFFSET_MINUTES = 8 * 60

interface CategoryRow {
  id: string
  name: string
  icon: string
}

interface TransactionRow {
  amount: number
  category_id: string | null
}

interface BudgetRow {
  amount: number
  period: string
}

/** [start, end) of the Taipei calendar month before `now`, in UTC. */
function previousTaipeiMonthRangeUtc(now: Date): { startUtc: string; endUtc: string; label: string } {
  const taipei = new Date(now.getTime() + TAIPEI_OFFSET_MINUTES * 60_000)
  const y = taipei.getUTCFullYear()
  const m = taipei.getUTCMonth() // month of "today" in Taipei; report covers m-1
  const startUtc = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0) - TAIPEI_OFFSET_MINUTES * 60_000)
  const endUtc = new Date(Date.UTC(y, m, 1, 0, 0, 0) - TAIPEI_OFFSET_MINUTES * 60_000)
  const labelDate = new Date(Date.UTC(y, m - 1, 1))
  const label = `${labelDate.getUTCFullYear()}年${labelDate.getUTCMonth() + 1}月`
  return { startUtc: startUtc.toISOString(), endUtc: endUtc.toISOString(), label }
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

function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

function reportEmailHtml(
  label: string,
  total: number,
  byCategory: { icon: string; name: string; amount: number }[],
  budget: number | null,
): string {
  const rows = byCategory
    .map(
      (c) => `
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">${c.icon} ${c.name}</td>
        <td style="padding:6px 0;font-size:14px;color:#333;text-align:right;">$${fmt(c.amount)}</td>
      </tr>`,
    )
    .join('')

  const budgetLine =
    budget !== null
      ? `<p style="font-size:14px;color:#666;margin:4px 0 0;">預算 $${fmt(budget)}，使用率 ${Math.round(
          (total / budget) * 100,
        )}%</p>`
      : ''

  const top = byCategory[0]
  const topLine = top ? `<p style="font-size:14px;color:#666;margin:4px 0 0;">花最多：${top.icon} ${top.name} $${fmt(top.amount)}</p>` : ''

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#111;">
      <p style="font-size:15px;color:#666;margin:0 0 8px;">${label} 消費報告</p>
      <h1 style="font-size:32px;margin:0 0 4px;">$${fmt(total)}</h1>
      <p style="font-size:13px;color:#999;margin:0 0 4px;">總支出</p>
      ${budgetLine}
      ${topLine}
      <table style="width:100%;border-collapse:collapse;margin-top:24px;border-top:1px solid #eee;">
        ${rows || '<tr><td style="padding:12px 0;color:#999;font-size:14px;">這個月沒有支出紀錄</td></tr>'}
      </table>
    </div>
  `
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)
  const { startUtc, endUtc, label } = previousTaipeiMonthRangeUtc(new Date())

  const { data: recipients, error: settingsError } = await supabase
    .from('reminder_settings')
    .select('user_id, email')
    .eq('monthly_report_enabled', true)
    .not('email', 'is', null)
    .neq('email', '')

  if (settingsError) {
    return new Response(JSON.stringify({ error: settingsError.message }), { status: 500 })
  }

  let sent = 0
  const errors: string[] = []

  for (const recipient of recipients ?? []) {
    const [{ data: txs, error: txError }, { data: cats, error: catError }, { data: budgets, error: budError }] =
      await Promise.all([
        supabase
          .from('transactions')
          .select('amount, category_id')
          .eq('user_id', recipient.user_id)
          .gte('created_at', startUtc)
          .lt('created_at', endUtc),
        supabase.from('categories').select('id, name, icon').eq('user_id', recipient.user_id),
        supabase.from('budgets').select('amount, period').eq('user_id', recipient.user_id).is('category_id', null),
      ])

    if (txError || catError || budError) {
      errors.push(`${recipient.user_id}: ${(txError ?? catError ?? budError)!.message}`)
      continue
    }

    const categoryById = new Map((cats as CategoryRow[]).map((c) => [c.id, c]))
    const totals = new Map<string, number>()
    let total = 0
    for (const t of (txs as TransactionRow[]) ?? []) {
      const key = t.category_id ?? '其他'
      totals.set(key, (totals.get(key) ?? 0) + Number(t.amount))
      total += Number(t.amount)
    }

    const byCategory = Array.from(totals.entries())
      .map(([id, amount]) => {
        const cat = categoryById.get(id)
        return { icon: cat?.icon ?? '📦', name: cat?.name ?? '其他', amount }
      })
      .sort((a, b) => b.amount - a.amount)

    const monthlyBudget = (budgets as BudgetRow[])?.find((b) => b.period === 'monthly')
    const budgetAmount = monthlyBudget ? Number(monthlyBudget.amount) : null

    const result = await sendEmail(
      recipient.email!,
      `${label}消費報告`,
      reportEmailHtml(label, total, byCategory, budgetAmount),
    )
    if (result.ok) sent++
    else errors.push(`${recipient.user_id}: ${result.error}`)
  }

  return new Response(
    JSON.stringify({ label, recipients: recipients?.length ?? 0, sent, errors }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
