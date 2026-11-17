import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/apiClient.js";
import { getAdminInfo } from "../../lib/adminAuth.js";
import {
  IconArrowUpRight,
  IconClipboard,
  IconClock,
  IconFolder,
  IconGraduation,
  IconPlus,
  IconSparkles,
  IconTrophy,
  IconUsers,
} from "../../admin/icons.jsx";

/**
 * Tổng quan — trang đầu của khu quản trị: số liệu chính, hoạt động luyện thi
 * 14 ngày, tỉ lệ đạt, bài làm mới nhất, nội dung đang có. Tổng hợp từ các API
 * sẵn có (không cần API riêng).
 */
const DAY = 86400000;
const get = (path) => api.get(path);

const useOverviewQuery = (key, path, opts = {}) => useQuery({ queryKey: ["admin-overview", key], queryFn: () => get(path), staleTime: 30000, ...opts });

function useOverview() {
  return {
    students: useOverviewQuery("students", "/students?limit=1"),
    active: useOverviewQuery("active", "/students?status=active&limit=1"),
    attempts: useOverviewQuery("attempts", "/admin/exam/attempts?status=submitted&limit=1000"),
    open: useOverviewQuery("open", "/admin/exam/attempts?status=in_progress&limit=5", { refetchInterval: 30000 }),
    levels: useOverviewQuery("levels", "/admin/exam/levels"),
    courses: useOverviewQuery("courses", "/admin/materials/courses"),
  };
}

const startOfDay = (t) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const fmtDay = (t) => new Date(t).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const fmtTime = (d) => new Date(d).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Chào buổi sáng" : h < 14 ? "Chào buổi trưa" : h < 18 ? "Chào buổi chiều" : "Chào buổi tối";
}

export default function AdminDashboardPage() {
  const d = useOverview();
  const admin = getAdminInfo();
  const rows = useMemo(() => d.attempts.data?.data || [], [d.attempts.data]);
  // Mốc thời gian lấy một lần lúc mở trang (đủ cho số liệu theo ngày).
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    const today = startOfDay(now);
    const days = Array.from({ length: 14 }, (_, i) => ({ t: today - (13 - i) * DAY, pass: 0, fail: 0 }));
    let last7 = 0;
    let prev7 = 0;
    const recent30 = [];
    const sec = { listening: [0, 0], reading: [0, 0], writing: [0, 0] };
    for (const a of rows) {
      const t = new Date(a.submittedAt).getTime();
      const idx = Math.floor((startOfDay(t) - days[0].t) / DAY);
      if (idx >= 0 && idx < 14 && a.result) days[idx][a.result.passed ? "pass" : "fail"]++;
      if (now - t < 7 * DAY) last7++;
      else if (now - t < 14 * DAY) prev7++;
      if (now - t < 30 * DAY && a.result) {
        recent30.push(a.result);
        for (const s of Object.keys(sec)) {
          const x = a.result.sections?.[s];
          if (x?.max) {
            sec[s][0] += x.score / x.max;
            sec[s][1]++;
          }
        }
      }
    }
    const avg = recent30.length ? Math.round(recent30.reduce((n, r) => n + r.total, 0) / recent30.length) : null;
    const max = recent30[0]?.max || 300;
    const passed = recent30.filter((r) => r.passed).length;
    const delta = prev7 ? Math.round(((last7 - prev7) / prev7) * 100) : last7 ? 100 : 0;
    return {
      days,
      last7,
      delta,
      avg,
      max,
      passRate: recent30.length ? Math.round((passed / recent30.length) * 100) : null,
      passed,
      graded: recent30.length,
      sections: Object.fromEntries(Object.entries(sec).map(([k, [sum, n]]) => [k, n ? Math.round((sum / n) * 100) : null])),
      aiPending: rows.filter((a) => a.result?.ai?.status === "pending").length,
    };
  }, [rows, now]);

  const levels = d.levels.data || [];
  const courses = d.courses.data || [];
  const total = d.students.data?.pagination?.total;
  const active = d.active.data?.pagination?.total;
  const openTotal = d.open.data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <p className="text-[13px] text-[var(--a-muted)] capitalize">{new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          <h1 className="!mt-1">
            {greeting()}, {admin?.name?.split(" ").slice(-1)[0] || "Admin"}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/exam/results" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm border border-gray-300">
            Kết quả luyện thi
          </Link>
          <Link to="/admin/students" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-sm bg-primary hover:bg-primary-dark text-gray-900">
            <IconPlus size={15} /> Học viên
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={IconUsers} tone="blue" label="Học viên" value={total} sub={active != null && total != null ? `${active} đang hoạt động · ${total - active} bị khoá` : ""} to="/admin/students" />
        <Kpi
          icon={IconClipboard}
          tone="amber"
          label="Bài luyện thi · 7 ngày"
          value={d.attempts.isLoading ? null : stats.last7}
          badge={stats.delta ? `${stats.delta > 0 ? "+" : ""}${stats.delta}%` : null}
          badgeUp={stats.delta >= 0}
          sub="so với 7 ngày trước"
          to="/admin/exam/results"
        />
        <Kpi
          icon={IconTrophy}
          tone="green"
          label="Điểm trung bình · 30 ngày"
          value={stats.avg}
          suffix={stats.avg != null ? `/${stats.max}` : ""}
          sub={stats.passRate != null ? `${stats.passRate}% bài đạt (${stats.passed}/${stats.graded})` : "Chưa có bài nộp"}
        />
        <Kpi
          icon={IconClock}
          tone="violet"
          label="Đang làm bài"
          value={d.open.isLoading ? null : openTotal}
          live={openTotal > 0}
          sub={stats.aiPending ? `${stats.aiPending} bài AI đang chấm` : "Cập nhật mỗi 30 giây"}
          to="/admin/exam/results?status=in_progress"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="xl:col-span-2" title="Hoạt động luyện thi" desc="Số bài nộp mỗi ngày, 14 ngày gần nhất">
          <BarChart days={stats.days} loading={d.attempts.isLoading} />
        </Card>
        <Card title="Tỉ lệ đạt" desc="Bài nộp trong 30 ngày">
          <Donut pct={stats.passRate} passed={stats.passed} total={stats.graded} />
          <div className="mt-5 space-y-3">
            {[
              ["listening", "Nghe"],
              ["reading", "Đọc"],
              ["writing", "Viết"],
            ].map(([k, label]) => (
              <div key={k}>
                <div className="flex justify-between text-[13px] mb-1">
                  <span className="text-[var(--a-text-4)]">{label}</span>
                  <span className="font-medium text-[var(--a-text)] tabular-nums">{stats.sections[k] != null ? `${stats.sections[k]}%` : "—"}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--a-surface-3)] overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--a-text)] transition-[width] duration-700" style={{ width: `${stats.sections[k] || 0}%` }} />
                </div>
              </div>
            ))}
            <p className="text-[11.5px] text-[var(--a-faint)]">Điểm trung bình từng phần so với điểm tối đa.</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card
          className="xl:col-span-2"
          title="Bài làm mới nhất"
          desc="Luyện thi HSK 3.0"
          action={
            <Link to="/admin/exam/results" className="inline-flex items-center gap-1 text-[13px] text-[var(--a-muted)] hover:text-[var(--a-text)]">
              Xem tất cả <IconArrowUpRight size={14} />
            </Link>
          }
          flush
        >
          {rows.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-[var(--a-muted)]">{d.attempts.isLoading ? "Đang tải…" : "Chưa có bài làm nào."}</p>
          ) : (
            <ul className="divide-y divide-[var(--a-border-soft)]">
              {rows.slice(0, 6).map((a) => (
                <li key={a._id}>
                  <Link to={`/admin/exam/results/${a._id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--a-hover)] transition-colors">
                    <span className="w-9 h-9 rounded-full grid place-items-center text-[12px] font-semibold bg-[var(--a-surface-3)] text-[var(--a-text-3)] shrink-0">
                      {a.candidate.name
                        .split(/\s+/)
                        .slice(-1)[0]
                        ?.slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-medium text-[var(--a-text)] truncate">{a.candidate.name}</p>
                      <p className="text-[12px] text-[var(--a-muted)] truncate">
                        {a.title} · {fmtTime(a.submittedAt)}
                      </p>
                    </div>
                    {a.result ? (
                      <div className="text-right shrink-0">
                        <p className="text-[14px] font-semibold tabular-nums text-[var(--a-text)]">
                          {a.result.total}
                          <span className="text-[var(--a-faint)] font-normal">/{a.result.max}</span>
                        </p>
                        <span className={"text-[11px] font-medium " + (a.result.passed ? "text-green-600" : "text-[var(--a-muted)]")}>{a.result.passed ? "Đạt" : "Chưa đạt"}</span>
                      </div>
                    ) : (
                      <span className="text-[12px] text-[var(--a-muted)]">Đang chấm…</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Nội dung" desc="Đang có trên hệ thống">
          <div className="space-y-2">
            <ContentRow
              icon={IconGraduation}
              title="Luyện thi HSK 3.0"
              stats={[`${levels.length} cấp`, `${levels.reduce((n, l) => n + (l.testCount || 0), 0)} đề`, `${levels.reduce((n, l) => n + (l.videoCount || 0), 0)} video`]}
              to="/admin/exam/tests"
            />
            <ContentRow
              icon={IconFolder}
              title="Học liệu khoá học"
              stats={[`${courses.length} khoá`, `${courses.reduce((n, c) => n + (c.deckCount || 0), 0)} slide`, `${courses.reduce((n, c) => n + (c.videoCount || 0), 0)} video`]}
              to="/admin/materials/courses"
            />
            <ContentRow icon={IconSparkles} title="Cấu hình AI chấm" stats={["Model, hướng dẫn chấm"]} to="/admin/materials/ai-grading" />
          </div>
        </Card>
      </div>
    </div>
  );
}

const TONES = {
  blue: "bg-[#3b82f6]/10 text-[#3b82f6]",
  amber: "bg-[#f59e0b]/[.12] text-[#d97706]",
  green: "bg-[#22c55e]/[.12] text-[#16a34a]",
  violet: "bg-[#8b5cf6]/[.12] text-[#7c3aed]",
};

function Kpi({ icon: Icon, tone, label, value, suffix = "", sub, badge, badgeUp, live, to }) {
  const body = (
    <div className="group h-full rounded-[14px] border border-[var(--a-border)] bg-[var(--a-surface)] p-5 shadow-[var(--a-shadow)] transition-colors hover:border-[var(--a-border-strong)]">
      <div className="flex items-center gap-3">
        <span className={"w-9 h-9 rounded-[10px] grid place-items-center " + TONES[tone]}>
          <Icon size={18} />
        </span>
        <p className="flex-1 text-[13px] font-medium text-[var(--a-muted)]">{label}</p>
        {live && (
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#22c55e] opacity-60 animate-ping" />
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
          </span>
        )}
        {to && <IconArrowUpRight size={15} className="text-[var(--a-faint)] opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        {value == null ? (
          <span className="h-8 w-16 rounded-md bg-[var(--a-surface-3)] animate-pulse" />
        ) : (
          <p className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-[var(--a-text)] tabular-nums">
            {value}
            <span className="text-[15px] font-normal text-[var(--a-faint)] tracking-normal">{suffix}</span>
          </p>
        )}
        {badge && (
          <span className={"text-[11.5px] font-medium px-1.5 py-0.5 rounded-md " + (badgeUp ? "bg-[#22c55e]/[.12] text-[#16a34a]" : "bg-[#ef4444]/[.12] text-[#dc2626]")}>{badge}</span>
        )}
      </div>
      {sub && <p className="mt-2 text-[12.5px] text-[var(--a-muted)] truncate">{sub}</p>}
    </div>
  );
  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function Card({ title, desc, action, children, className = "", flush = false }) {
  return (
    <section className={"rounded-[14px] border border-[var(--a-border)] bg-[var(--a-surface)] shadow-[var(--a-shadow)] " + className}>
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <div className="flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--a-text)]">{title}</h2>
          {desc && <p className="text-[12.5px] text-[var(--a-muted)] mt-0.5">{desc}</p>}
        </div>
        {action}
      </div>
      <div className={flush ? "border-t border-[var(--a-border-soft)]" : "px-5 pb-5"}>{children}</div>
    </section>
  );
}

/** Cột chồng Đạt / Chưa đạt theo ngày (SVG, không cần thư viện). */
function BarChart({ days, loading }) {
  const [hover, setHover] = useState(null);
  const maxV = Math.max(4, ...days.map((d) => d.pass + d.fail));
  const ticks = [0, Math.round(maxV / 2), maxV];
  const W = 640;
  const H = 220;
  const pad = { l: 28, r: 8, t: 10, b: 26 };
  const bw = (W - pad.l - pad.r) / days.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / maxV);
  const total = days.reduce((n, d) => n + d.pass + d.fail, 0);
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[12.5px] text-[var(--a-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--a-accent)]" /> Đạt
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-[var(--a-text-4)] opacity-40" /> Chưa đạt
        </span>
        <span className="ml-auto tabular-nums">
          {hover != null ? `${fmtDay(days[hover].t)}: ${days[hover].pass} đạt · ${days[hover].fail} chưa đạt` : `${total} bài trong 14 ngày`}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={"w-full h-auto " + (loading ? "opacity-40" : "")} role="img" aria-label="Biểu đồ bài nộp 14 ngày">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--a-border-soft)" strokeDasharray={t ? "3 4" : ""} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--a-faint)">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = pad.l + i * bw + bw * 0.22;
          const w = bw * 0.56;
          const hp = (H - pad.t - pad.b) * (d.pass / maxV);
          const hf = (H - pad.t - pad.b) * (d.fail / maxV);
          const base = y(0);
          return (
            <g key={d.t} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill={hover === i ? "var(--a-hover)" : "transparent"} rx="6" />
              {hf > 0 && <rect x={x} y={base - hf - hp} width={w} height={hf} rx="3" fill="var(--a-text-4)" opacity="0.35" />}
              {hp > 0 && <rect x={x} y={base - hp} width={w} height={hp} rx="3" fill="var(--a-accent)" />}
              {d.pass + d.fail === 0 && <rect x={x} y={base - 2} width={w} height="2" rx="1" fill="var(--a-border)" />}
              {(i % 2 === 1 || days.length <= 7) && (
                <text x={pad.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill="var(--a-faint)">
                  {fmtDay(d.t)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Donut({ pct, passed, total }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = pct ?? 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 140 140" className="w-32 h-32 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--a-surface-3)" strokeWidth="14" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--a-accent)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div>
        <p className="text-[34px] leading-none font-semibold tracking-[-0.03em] text-[var(--a-text)] tabular-nums">{pct != null ? `${pct}%` : "—"}</p>
        <p className="text-[12.5px] text-[var(--a-muted)] mt-1.5">{total ? `${passed}/${total} bài đạt` : "Chưa có bài nộp"}</p>
      </div>
    </div>
  );
}

function ContentRow({ icon: Icon, title, stats, to }) {
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-xl border border-[var(--a-border-soft)] px-3.5 py-3 hover:bg-[var(--a-hover)] hover:border-[var(--a-border)] transition-colors">
      <span className="w-9 h-9 rounded-[10px] grid place-items-center bg-[var(--a-surface-3)] text-[var(--a-text-3)] shrink-0">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-medium text-[var(--a-text)]">{title}</p>
        <p className="text-[12px] text-[var(--a-muted)] truncate">{stats.join(" · ")}</p>
      </div>
      <IconArrowUpRight size={15} className="text-[var(--a-faint)] group-hover:text-[var(--a-text)] transition-colors" />
    </Link>
  );
}
