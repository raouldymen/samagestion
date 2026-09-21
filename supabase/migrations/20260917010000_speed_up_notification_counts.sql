-- The notification bell is present on every authenticated page. This index lets
-- PostgreSQL count unread notifications without scanning already-read entries.
create index if not exists notifications_unread_count_idx
  on public.notifications (business_id, user_id, is_read)
  where is_read = false;
