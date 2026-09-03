-- 極簡記帳 — Email 提醒排程 (pg_cron + pg_net)
--
-- 執行順序：
--   1. Dashboard → Database → Extensions，啟用 pg_cron 與 pg_net（勾選即可，
--      這一步無法用 SQL 完成，因為需要 superuser 權限安裝 extension）。
--   2. 部署兩個 Edge Function：send-reminders、send-monthly-report
--      （見 supabase/functions/，可用 Dashboard 貼上程式碼部署）。
--   3. 到 Edge Functions → Secrets 設定 RESEND_API_KEY、EMAIL_FROM，
--      以及 CRON_SECRET（自己隨便生一組夠長的隨機字串即可，例如用
--      `openssl rand -base64 32`，或任何密碼產生器）。
--      這組字串只是用來讓 Function 分辨「這是排程呼叫的」，
--      跟 Supabase 自己的金鑰系統無關，所以不受它換版本格式影響。
--   4. 在這裡的 SQL Editor 執行以下全部內容 —— 記得把
--      <PROJECT_REF> 換成你的專案網址（例如 ynqoxbjuuectbvlsuhgz），
--      把 <ANON_KEY> 換成 Project Settings → API 裡的 anon / publishable
--      key（這把設計上就是公開的，直接寫進這份檔案沒問題 —— Supabase
--      自己的 Edge Function 閘道器要求 Authorization 帶一把合法專案金鑰
--      才會放行，這只是滿足這個平台層檢查，不是我們自己的授權機制），
--      並把 <CRON_SECRET> 換成跟第 3 步「完全相同」的那組字串
--      （只會存進 Supabase 自己的加密 Vault，不會出現在任何檔案或
--      GitHub 裡 —— 我們自己的授權檢查靠的是這個，不是上面的 anon key）。
--
-- 時區換算（Asia/Taipei 全年 UTC+8，沒有日光節約時間）：
--   12:00 台北 = 04:00 UTC
--   19:00 台北 = 11:00 UTC
--   每月 1 號 09:00 台北 = 每月 1 號 01:00 UTC

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- CRON_SECRET 加密存放於 Supabase Vault。
-- vault.create_secret 本身不是 upsert，同名重複執行會噴 duplicate key
-- 錯誤 —— 所以這裡用「不存在就新增，存在就更新」，整段可以安全重複執行。
do $$
begin
  if exists (select 1 from vault.secrets where name = 'cron_secret') then
    perform vault.update_secret(
      (select id from vault.secrets where name = 'cron_secret'),
      '<CRON_SECRET>'
    );
  else
    perform vault.create_secret('<CRON_SECRET>', 'cron_secret');
  end if;
end $$;

-- ---------------------------------------------------------------
-- 12:00 台北 記帳提醒
-- ---------------------------------------------------------------
select cron.schedule(
  'send-noon-reminder',
  '0 4 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('slot', 'noon')
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------
-- 19:00 台北 記帳提醒
-- ---------------------------------------------------------------
select cron.schedule(
  'send-evening-reminder',
  '0 11 * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('slot', 'evening')
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------
-- 每月 1 號 09:00 台北 — 上個月消費報告
-- ---------------------------------------------------------------
select cron.schedule(
  'send-monthly-report',
  '0 1 1 * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-monthly-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <ANON_KEY>',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 確認排程已建立：
-- select jobid, jobname, schedule, active from cron.job;

-- 如果要移除某個排程：
-- select cron.unschedule('send-noon-reminder');
