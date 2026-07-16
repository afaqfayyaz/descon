import { requirePermission } from "@/lib/auth/permissions";
import { auditService } from "@/lib/services/audit.service";

const LIMIT = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { action?: string; page?: string };
}) {
  await requirePermission("audit.view");

  const page = Math.max(1, Number(searchParams.page ?? "1") || 1);
  const action = searchParams.action?.trim() || undefined;

  const [{ items, total }, actions] = await Promise.all([
    auditService.list({ action }, { page, limit: LIMIT }),
    auditService.actions(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
        <p className="text-sm text-slate-500">
          Immutable record of every state-changing action.
        </p>
      </div>

      <form method="get" className="flex items-center gap-2">
        <select
          name="action"
          defaultValue={action ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="">All actions</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Filter
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-3 py-3 font-medium">Actor</th>
              <th className="px-3 py-3 font-medium">Action</th>
              <th className="px-3 py-3 font-medium">Entity</th>
              <th className="px-3 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                  No audit entries.
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr
                  key={log._id.toString()}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-5 py-3 text-slate-500">
                    {log.timestamp.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-slate-700">
                    {log.actorEmail ?? "system"}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {log.entityType}
                    {log.entityId ? (
                      <span className="text-slate-400">
                        {" "}
                        · {log.entityId.toString().slice(-6)}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {log.actorIp ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>{total} entries</span>
        <div className="flex items-center gap-3">
          {page > 1 && (
            <a
              href={`/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(page - 1) })}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Previous
            </a>
          )}
          <span>
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <a
              href={`/audit?${new URLSearchParams({ ...(action ? { action } : {}), page: String(page + 1) })}`}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
            >
              Next
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
