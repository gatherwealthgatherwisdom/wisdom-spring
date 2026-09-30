import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { client } from "../session";

const ACTIONS = [
  "",
  "user.update",
  "model.update",
  "model.probe",
  "model.enable.denied",
  "flag.update",
  "announcement.create",
  "announcement.update",
  "announcement.delete",
  "catalog.sync",
  "catalog.probe",
  "catalog.update",
  "catalog.create",
];

export function AuditPage() {
  const [action, setAction] = useState("");
  const audit = useQuery({
    queryKey: ["admin-audit", action],
    queryFn: () => client.adminAudit(action || undefined),
  });
  return (
    <section>
      <h1>審計</h1>
      <div className="toolbar">
        <select value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="">全部動作</option>
          {ACTIONS.filter(Boolean).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>時間</th>
              <th>動作</th>
              <th>內容</th>
            </tr>
          </thead>
          <tbody>
            {(audit.data?.items ?? []).map((row) => (
              <tr key={row.id}>
                <td>{row.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td>{row.action}</td>
                <td>
                  <code>{JSON.stringify(row.payload)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {audit.isLoading ? <p className="muted">載入中…</p> : null}
      </div>
    </section>
  );
}
