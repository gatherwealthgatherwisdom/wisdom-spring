import { createContext } from "../context";

const ctx = await createContext();
const result = await ctx.sync.run();
console.log(JSON.stringify(result));
await ctx.disconnect();
