import { useQuery } from "@tanstack/react-query";
import { client } from "../session";

export function AuditPage() {
  const audit = useQuery({ queryKey: ["admin-audit"], queryFn: () => client.adminAudit() });
  return (
    <section>
      <h1>審計</h1>
      <div className="card">
        <table>
          <thead><tr><th>時間</th><th>動作</th><th>內容</th></tr></thead>
          <tbody>
            {(audit.data?.items ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td>{row.action}</td>
                <td><code>{JSON.stringify(row.payload)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
