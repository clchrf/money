-- 極簡記帳 — Email 提醒排程 (pg_cron + pg_net)
--
-- 執行順序：
--   1. Dashboard → Database → Extensions，啟用 pg_cron 與 pg_net（勾選即可，
--      這一步無法用 SQL 完成，因為需要 superuser 權限安裝 extension）。
--   2. 部署兩個 Edge Function：send-reminders、send-monthly-report
--      （見 supabase/functions/，可用 Dashboard 貼上程式碼部署）。
--   3. 到 Edge Functions → Secrets 設定 RESEND_API_KEY 與 EMAIL_FROM。
--   4. 在這裡的 SQL Editor 執行以下全部內容 —— 記得把
--      <PROJECT_REF> 換成你的專案網址（例如 ynqoxbjuuectbvlsuhgz），
--      並把 <SERVICE_ROLE_KEY> 換成 Project Settings → API 裡的
--      service_role key（只會存進 Supabase 自己的加密 Vault，
--      不會出現在任何檔案或 GitHub 裡）。
--
-- 時區換算（Asia/Taipei 全年 UTC+8，沒有日光節約時間）：
--   12:00 台北 = 04:00 UTC
--   19:00 台北 = 11:00 UTC
--   每月 1 號 09:00 台北 = 每月 1 號 01:00 UTC

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- service_role key 只存這一次，加密存放於 Supabase Vault。
-- 如果要更新，重新執行這行即可（同名會覆蓋）。
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');

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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
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
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 確認排程已建立：
-- select jobid, jobname, schedule, active from cron.job;

-- 如果要移除某個排程：
-- select cron.unschedule('send-noon-reminder');
