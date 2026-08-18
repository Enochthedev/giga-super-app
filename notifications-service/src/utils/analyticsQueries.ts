/**
 * Analytics aggregations for notification_logs.
 *
 * These replace a set of raw SQL statements that were executed through a
 * `supabase.rpc('execute_sql', { query, params })` call. That RPC does not exist in the
 * database, so all five analytics endpoints returned 500 on every request.
 *
 * It was deliberately not created: a generic "run this SQL string" function callable with
 * the service role is an arbitrary-execution primitive, and the callers interpolated values
 * (the DATE_TRUNC unit) straight into the statement. The aggregations are small and are done
 * here instead, against ordinary filtered reads.
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export type GroupBy = 'day' | 'week' | 'month';

export interface LogFilters {
  date_from?: string;
  date_to?: string;
  type?: string;
  template_id?: string;
  user_id?: string;
}

interface LogRow {
  created_at: string;
  sent_at: string | null;
  type: string | null;
  status: string | null;
  template_id: string | null;
  user_id: string | null;
}

const PAGE = 1000;
const MAX_ROWS = 50000;

/** Read the log rows a request needs, paging so a large window cannot be silently truncated. */
async function fetchLogs(filters: LogFilters): Promise<LogRow[]> {
  const rows: LogRow[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = supabase
      .from('notification_logs')
      .select('created_at, sent_at, type, status, template_id, user_id')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE - 1);

    if (filters.date_from) q = q.gte('created_at', filters.date_from);
    if (filters.date_to) q = q.lte('created_at', filters.date_to);
    if (filters.type) q = q.eq('type', filters.type);
    if (filters.template_id) q = q.eq('template_id', filters.template_id);
    if (filters.user_id) q = q.eq('user_id', filters.user_id);

    const { data, error } = await q;
    if (error) throw new Error(`notification_logs read failed: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as LogRow[]));
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Start of the day/week/month containing `iso`, as an ISO string (matches DATE_TRUNC). */
export function periodStart(iso: string, unit: GroupBy): string {
  const d = new Date(iso);
  d.setUTCHours(0, 0, 0, 0);
  if (unit === 'week') {
    // ISO weeks start on Monday, as DATE_TRUNC('week', …) does.
    const dow = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dow);
  } else if (unit === 'month') {
    d.setUTCDate(1);
  }
  return d.toISOString();
}

const rate = (num: number, den: number): number =>
  den === 0 ? 0 : Math.round((num / den) * 10000) / 100;

const SUCCESS = ['sent', 'delivered', 'opened', 'clicked'];
const DELIVERED_PLUS = ['delivered', 'opened', 'clicked'];
const OPENED_PLUS = ['opened', 'clicked'];
const has = (list: string[], s: string | null) => (s ? list.includes(s) : false);

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const bucket = out.get(k);
    if (bucket) bucket.push(r);
    else out.set(k, [r]);
  }
  return out;
}

/** Rows shaped like the old delivery-rates query. */
export async function deliveryRates(unit: GroupBy, filters: LogFilters) {
  const logs = await fetchLogs(filters);
  const groups = groupBy(logs, r => `${periodStart(r.created_at, unit)}|${r.type ?? ''}`);
  return [...groups.entries()]
    .map(([key, rs]) => {
      const [period, type] = key.split('|');
      const total = rs.length;
      const successful = rs.filter(r => has(SUCCESS, r.status)).length;
      const delivered = rs.filter(r => r.status === 'delivered').length;
      return {
        period,
        type,
        total_sent: total,
        successful,
        delivered,
        failed: rs.filter(r => r.status === 'failed').length,
        bounced: rs.filter(r => r.status === 'bounced').length,
        success_rate: rate(successful, total),
        delivery_rate: rate(delivered, total),
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period) || a.type.localeCompare(b.type));
}

/** Rows shaped like the old engagement query. */
export async function engagement(unit: GroupBy, filters: LogFilters) {
  const logs = await fetchLogs(filters);
  const groups = groupBy(
    logs,
    r => `${periodStart(r.created_at, unit)}|${r.type ?? ''}|${r.template_id ?? ''}`
  );
  return [...groups.entries()]
    .map(([key, rs]) => {
      const [period, type, template_id] = key.split('|');
      const sent = rs.filter(r => has(SUCCESS, r.status)).length;
      const delivered = rs.filter(r => has(DELIVERED_PLUS, r.status)).length;
      const opened = rs.filter(r => has(OPENED_PLUS, r.status)).length;
      const clicked = rs.filter(r => r.status === 'clicked').length;
      return {
        period,
        type,
        template_id: template_id || null,
        sent,
        delivered,
        opened,
        clicked,
        open_rate: rate(opened, delivered),
        click_rate: rate(clicked, opened),
        click_through_rate: rate(clicked, delivered),
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period) || a.type.localeCompare(b.type));
}

/** Rows shaped like the old volume query. */
export async function volume(unit: GroupBy, filters: LogFilters) {
  const logs = await fetchLogs(filters);
  const groups = groupBy(logs, r => `${periodStart(r.created_at, unit)}|${r.type ?? ''}`);
  return [...groups.entries()]
    .map(([key, rs]) => {
      const [period, type] = key.split('|');
      const durations = rs
        .filter(r => r.sent_at && r.created_at)
        .map(r => (new Date(r.sent_at!).getTime() - new Date(r.created_at).getTime()) / 1000);
      return {
        period,
        type,
        total_notifications: rs.length,
        unique_users: new Set(rs.map(r => r.user_id).filter(Boolean)).size,
        unique_templates: new Set(rs.map(r => r.template_id).filter(Boolean)).size,
        avg_processing_time_seconds: durations.length
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : null,
      };
    })
    .sort((a, b) => b.period.localeCompare(a.period) || a.type.localeCompare(b.type));
}

/** Rows shaped like the old template-performance query (templates with no logs included). */
export async function templatePerformance(filters: LogFilters) {
  const [{ data: templates, error }, logs] = await Promise.all([
    supabase.from('notification_templates').select('id, name, type'),
    fetchLogs(filters),
  ]);
  if (error) throw new Error(`notification_templates read failed: ${error.message}`);

  const byTemplate = groupBy(logs, r => r.template_id ?? '');
  return (templates ?? [])
    .map(t => {
      const rs = byTemplate.get(t.id) ?? [];
      const total = rs.length;
      const delivered = rs.filter(r => has(DELIVERED_PLUS, r.status)).length;
      const opened = rs.filter(r => has(OPENED_PLUS, r.status)).length;
      const clicked = rs.filter(r => r.status === 'clicked').length;
      return {
        id: t.id,
        name: t.name,
        type: t.type,
        total_sent: total,
        delivered,
        opened,
        clicked,
        failed: rs.filter(r => r.status === 'failed').length,
        delivery_rate: rate(delivered, total),
        open_rate: rate(opened, delivered),
        click_rate: rate(clicked, opened),
      };
    })
    .sort((a, b) => b.total_sent - a.total_sent);
}

/** Rows shaped like the old per-user query. */
export async function userAnalytics(filters: LogFilters, limit = 50) {
  const logs = await fetchLogs(filters);
  const byUser = groupBy(
    logs.filter(r => r.user_id),
    r => r.user_id!
  );

  const userIds = [...byUser.keys()];
  const emails = new Map<string, string>();
  if (userIds.length) {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, email')
      .in('id', userIds.slice(0, 1000));
    for (const p of data ?? []) emails.set(p.id, p.email);
  }

  return [...byUser.entries()]
    .map(([user_id, rs]) => {
      const delivered = rs.filter(r => has(DELIVERED_PLUS, r.status)).length;
      const opened = rs.filter(r => has(OPENED_PLUS, r.status)).length;
      return {
        user_id,
        email: emails.get(user_id) ?? null,
        total_notifications: rs.length,
        delivered,
        opened,
        clicked: rs.filter(r => r.status === 'clicked').length,
        unique_templates_received: new Set(rs.map(r => r.template_id).filter(Boolean)).size,
        last_notification_at: rs
          .map(r => r.created_at)
          .sort()
          .at(-1),
        engagement_rate: rate(opened, delivered),
      };
    })
    .sort((a, b) => b.total_notifications - a.total_notifications)
    .slice(0, limit);
}

/** Plain count of matching log rows (replaces the two `SELECT COUNT(*)` statements). */
export async function countLogs(filters: LogFilters): Promise<number> {
  let q = supabase.from('notification_logs').select('id', { count: 'exact', head: true });
  if (filters.date_from) q = q.gte('created_at', filters.date_from);
  if (filters.date_to) q = q.lte('created_at', filters.date_to);
  if (filters.type) q = q.eq('type', filters.type);
  const { count, error } = await q;
  if (error) throw new Error(`notification_logs count failed: ${error.message}`);
  return count ?? 0;
}
