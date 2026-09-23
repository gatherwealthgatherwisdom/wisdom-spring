import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client } from "../session";

export function FlagsPage() {
  const queryClient = useQueryClient();
  const flags = useQuery({ queryKey: ["admin-flags"], queryFn: () => client.adminFlags() });
  const update = useMutation({
    mutationFn: ({ key, enabled }: { key: string; enabled: boolean }) => client.adminUpdateFlag(key, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-flags"] }),
  });
  return (
    <section>
      <h1>旗標</h1>
      <div className="card">
        {(flags.data?.items ?? []).map((flag) => (
          <label className="row" key={flag.key} style={{ marginBottom: 10 }}>
            <input type="checkbox" checked={flag.enabled} onChange={(event) => update.mutate({ key: flag.key, enabled: event.target.checked })} />
            <span>{flag.key}</span>
            {flag.key === "user_model_picker" ? <span className="muted">用戶端暫不提供模型選擇</span> : null}
          </label>
        ))}
      </div>
    </section>
  );
}
