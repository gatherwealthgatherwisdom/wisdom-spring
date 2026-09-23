import { createContext } from "../context";

const slug = process.argv[2];
const ctx = await createContext();
if (slug) {
  await ctx.probe.probeSlug(slug);
  console.log(JSON.stringify({ slug }));
} else {
  const result = await ctx.probe.run();
  console.log(JSON.stringify(result));
}
await ctx.disconnect();
