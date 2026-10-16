import type { FastifyInstance } from "fastify";

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="zh-HK">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} · 智泉</title>
  <style>
    body { margin: 0; background: #F7F6F3; color: #1C1B19; font: 17px/1.6 -apple-system, "PingFang HK", "PingFang TC", sans-serif; }
    main { max-width: 40rem; margin: 0 auto; padding: 2.5rem 1.25rem 4rem; }
    h1 { font-family: Palatino, "Songti TC", serif; font-size: 1.75rem; font-weight: 500; margin: 0 0 0.35rem; }
    .sub { color: #5C5A56; margin-bottom: 1.75rem; }
    h2 { font-size: 1.05rem; margin: 1.6rem 0 0.4rem; }
    p, li { margin: 0 0 0.7rem; }
    a { color: #1F6B4A; }
    footer { margin-top: 2.5rem; color: #5C5A56; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p class="sub">智泉 · 中盈紫達集團</p>
    ${body}
    <footer>Gather Wealth Gather Wisdom Limited · 共飲智慧之泉。</footer>
  </main>
</body>
</html>`;
}

const SUPPORT = page(
  "支援",
  `
    <p>智泉是中盈紫達集團的智能助手。登入、額度、驗證碼或使用上的問題，請電郵聯絡。</p>
    <p>電郵：<a href="mailto:gatherwealthgatherwisdom.it@gmail.com">gatherwealthgatherwisdom.it@gmail.com</a></p>
    <h2>登入</h2>
    <p>支援香港 +852、澳門 +853、中國內地 +86 手機驗證。未登入可先瀏覽各頁；傳送內容時需要驗證。</p>
    <h2>額度</h2>
    <p>未註冊可試用 5 次。完成註冊後，免費計劃每日有額度，以香港日曆計算。</p>
    <h2>私隱</h2>
    <p><a href="/privacy">智泉私隱政策</a></p>
  `,
);

const PRIVACY = page(
  "私隱政策",
  `
    <p>最後更新日期：2026 年 10 月 16 日。本政策說明智泉（Wisdom Spring）如何處理你的資料。營運機構為 Gather Wealth Gather Wisdom Limited（中盈紫達集團）。</p>
    <h2>我們收集甚麼</h2>
    <ul>
      <li>帳戶：你用來驗證的手機號碼，以及你選擇填寫的顯示名稱、語言和語氣。</li>
      <li>內容：你傳送的文字、上載的相片或文件，以及智泉的回覆。</li>
      <li>裝置：若你允許通知，會保存推送代碼，以便傳送驗證碼、額度提示和你選擇接收的訊息。</li>
      <li>使用紀錄：為計算每日額度和維護服務而保存的用量。</li>
    </ul>
    <h2>用途</h2>
    <p>資料用於提供對話、寫作、翻譯和圖像等功能，核對登入，計算額度，以及發送你已允許的通知。我們不會把你的內容出售予第三者作廣告。</p>
    <h2>運算服務</h2>
    <p>為生成回覆，你提交的內容會傳送至我們使用的運算服務供應商。供應商僅為完成該次回覆而處理內容。</p>
    <h2>保留</h2>
    <p>帳戶與對話在你使用服務期間保存。你可在應用程式刪除對話；刪除帳戶後，該手機號碼不能再用來登入，本機對話亦會清除。</p>
    <h2>聯絡</h2>
    <p>私隱查詢請電郵 <a href="mailto:gatherwealthgatherwisdom.it@gmail.com">gatherwealthgatherwisdom.it@gmail.com</a>。</p>
  `,
);

export async function legalRoutes(app: FastifyInstance): Promise<void> {
  app.get("/support", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(SUPPORT);
  });
  app.get("/privacy", async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(PRIVACY);
  });
}
