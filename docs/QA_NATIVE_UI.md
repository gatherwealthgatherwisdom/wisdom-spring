# 智泉 Native UI QA

**日期：** 2026-10-12（紀錄）／2026-10-13（第二至五輪修復）／2026-10-14（第六輪 F22／F31 至 F18；第七輪 F20／J／F29 同訪客註冊）／2026-10-15（規格 4.1＋4.2 做到 100%；App 訊息／Admin 推送）  
**建置：** `origin/main`（第二輪見第 10 節；第三輪見第 11 節；第四輪見第 12 節；第五輪見第 13 節；第六輪見第 14 節；第七輪見第 15 節；100% 見第 16 節；訊息見第 17 節；原生 Debug `com.gwgwgroup.spring`）  
**本輪性質：** 2026-10-12 只記錄問題。2026-10-13 已按 ID 分 commit 修 F08、F13、F35、F30、F25，每項 push 去 `origin/main`。同日第三輪補洞：真實改寫／翻譯、Android 相簿／PDF、iOS 出圖等到完成、訪客同 +853／+86 OTP。翻譯品質修咗一次（`9b54750`），其餘補洞只更新本文件。第四輪由 F03／F04 開始，跟住 F15、F16、F22、F31、F11／F12、F36、F38、F42，每項一個 commit push 去 `origin/main`。第五輪由 F01／F14 開始，跟住 F23、F43、F05。第六輪由 F22／F31 開始，跟住 F36、F18。第七輪由 F20／J／F29 開始，跟住訪客完成註冊後清額滿橫幅，每項一個 commit push 去 `origin/main`。2026-10-15 對住規格 4.1＋4.2 由約 88% 做到產品 100%，十期各一個 commit。同日 App 訊息、Admin 後台 OTP、揀人推送同用量入箱五期各一個 commit（第 17 節）。

以真實用戶路徑，喺 **iPhone 16 Pro（iOS 18.6 Simulator）** 同 **Pixel 9 Pro XL（Android API 36 Emulator）** 用同一組案例行過每個主要畫面。生成全部打真實本機 API（`:3000`）同 OpenRouter，無 mock 回覆。

---

## 1. 摘要

清墨外觀（紙底、墨字、松綠）兩邊都立得住，未登入可以四個 tab 亂睇，發送先逼登入，香港手機 OTP、串流對話、水墨出圖、翻譯頁同工具清單，開心路徑都通。

開心路徑（登入、對話、出圖、翻譯、改寫、發現、我的）兩邊都通。第一至第七輪修咗鍵盤抬、Markdown 表、生成種類、歷史標題、第一屏裁切、Debug LogBox、登入／空 Chat 空白、氣泡動作文字、返回名、畫圖區塊名、長回覆跟尾、iOS 打字收 tab、思考人設清洗、外觀切換閃啟動頁、抽屉搜尋、快取圖示、訪客用盡後完成註冊。2026-10-15 規格 4.1＋4.2 產品 100%：回覆洗集團名、發現真文案、公開池名單、拆即時語音格、我的計劃／顯示名／刪除確認、寫作熱門跟 catalog sort、語氣三選、讚踩餵權重、EAS `projectId`。同日 App 訊息鈴鐺、Admin 後台 OTP 走收件箱、揀人／全部推送、用量將盡／用完／月費入箱（第 17 節）。剩餘唔扣 100%：

1. iOS 鍵盤聽寫咪（F32）屬系統鍵盤，產品無咪。  
2. App Store／Play 上架要你嘅 Apple／Google 帳號。遠程 Expo token 要 development／store 包。

---

## 2. 環境同方法

| 項目 | 內容 |
|---|---|
| iOS | iPhone 16 Pro，iOS 18.6，UDID `CF2F74AC-E154-42E3-84CE-257A91F25101`，Xcode 26 Debug |
| Android | AVD `Pixel_9_Pro_XL`，`emulator-5554`，`adb reverse` 8081 + 3000 |
| API | Fastify `http://127.0.0.1:3000`，MySQL `:3308`，Metro `:8081` |
| 人物 | 未登入瀏覽；註冊 FREE `+85291118888`（顯示名「測試用戶」）；訪客 `+85291116666`；澳門 `+85361112222`；內地 `+8613800138000`。開發 OTP 一律 `123456`。唔用擁有人 `+85292578982`。 |
| 工具 | 人手操作 + Maestro 同一案例兩邊跑；截圖核對畫面 |

**七個角度（每個功能都用）：**

| 角度 | 問嘅係 |
|---|---|
| 空狀態 | 未登入、未有對話、未有圖像、未有翻譯時，用戶明唔明下一步 |
| 開心路徑 | 真實發送、真實出圖、登入成功 |
| 錯誤／拒絕 | 短號碼、錯 OTP、未登入就發送 |
| 中斷 | 鍵盤、系統對話框、Auth 返回、串流中途 |
| 邊界 | 8 位手機、6 位碼自動提交、空白發送、0 字翻譯 |
| 平台差 | 同一手勢 iOS / Android 係咪一樣 |
| 清墨視覺 | 紙 `#F7F6F3`、墨 `#1C1B19`、松 `#1F6B4A`；深色 `#141311` / `#3D9B6E`；有無紫藍漸變、廠商模型名 |

**功能組：** A 啟動外殼 · B 未登入瀏覽 · C 登入 · D 對話首頁 · E 聊天 · F 相機／相簿／檔 · G 圖像工作室 · H 寫作／翻譯 · I 發現／全部工具 · J 歷史抽屉 · K 我的 · L 通知

---

## 3. 覆蓋矩陣

圖例：✓ 兩邊做到 · iOS／And 單邊 · △ 部分 · — 本輪未做

| 組 | 案例 | 空 | 開心 | 錯 | 中斷 | 邊界 | 平台 | 清墨 |
|---|---|---|---|---|---|---|---|---|
| A | 冷啟動、tab、圖示 | ✓ | ✓ | | ✓ 無 LogBox | | ✓ | ✓ 松綠滴水圖示 |
| B | 四 tab 未登入亂睇 | ✓ | ✓ | | | | ✓ | ✓ |
| B | 未登入發送 → 登入頁 | ✓ | ✓ | | F31 iOS tab 收、composer 貼鍵盤 | | ✓ | ✓ |
| C | +852 八位、取得驗證碼 | | ✓ | And 兩位仍禁用 | 鍵盤擋 CTA | ✓ 八位先亮松綠 | F14 CTA 貼卡 | ✓ |
| C | 錯 OTP `000000` | | | iOS「登入資料不正確。」 | | ✓ 自動提交 | | ✓ |
| C | 正確 OTP → 測試用戶 | | ✓ | | And F15 鍵盤已收 | | ✓ | ✓ |
| C | 訪客 5 次／+853／+86 | And ✓ | And ✓ 用盡 5 次 → 完成註冊 → 免費 1／20；+853／+86 OTP | 第 6 次 QUOTA_GUEST | And F15 鍵盤已收 | 空名確認通過 | iOS 本輪未再登訪客 | ✓ 試用徽章 |
| D | 首頁工具、智能體、composer | ✓ | ✓ | | ✓ 無 LogBox | | F08 已修（And 三個完整；iOS 商務助手+家庭行程）；F05 區塊「畫圖」 | ✓ |
| E | 真實串流 + 停止 | | ✓ 兩邊 | | 思考中可停止 | | iOS 短回覆清爽 | F20 思考亦有 `**` |
| E | 長文、讚、複製、朗讀 | | And 讚變松綠；F23 儲存／有用／唔好有字；F22 動作列貼發送 | | F22 已修 | | iOS 七日表長回覆；F20 兩邊 Day／Activity 格 | F20 已修 |
| F | 相機 | | And 系統相機；iOS PHOTO／Cancel | | | | ✓ 兩邊系統相機 | |
| F | 相簿／PDF 全文 | | And ✓ 相簿+PDF；iOS 相簿 vision + PDF file-to-text | | | | ✓ | ✓ |
| G | 工作室、風格、開始 | ✓ 畫面 | And／iOS 真出圖 | 空白發送無反應 | F30 畫緊兩邊 | | iOS 等到完成；「開始」Button content-desc 已修 | ✓ 無廠商 slug |
| H | 改寫工具頁 | And ✓ 例子＋最近 | And ✓ 真改寫；iOS UI ✓（3b 傾偈） | 空文開始淡 | | 0 字 | F04 改寫／開始可撳；F42 兩邊 | ✓ |
| H | 翻譯語言對 | And ✓ 空文提示 | ✓ 兩邊真譯（`9b54750` 之後） | F38 空文開始禁用 | | 0 字 | iOS 譯文卡 | ✓ |
| I | 發現、全部工具 | ✓ | ✓ 打開清單 | | | | ✓ | F11／F12 已修 |
| J | 抽屉、分組、最近刪除 | And ✓ | ✓ 兩邊 `healthy` 出搜尋結果 | | | 標題即時命中 | iOS Maestro 搜尋對話 | ✓ |
| K | 未登入／已登入我的 | ✓ | ✓ | | F13 已修（And 繁中+English 完整） | F16 電話一次有空格 | 深色 And ✓ | ✓ |
| K | 外觀 深色→跟隨系統 | | And F18 已修，停留我的 | | | | | ✓ 深色 token |
| L | 推送開關、離線、額滿、訊息 | △ 開關睇到 | 碼已接 EAS `projectId`；And 訊息頁＋揀人推送入箱；模擬器本機通知 | 無裝置 Admin OTP 502 | — | 模擬器 DeviceToken 0 | | |

---

## 4. 發現清單

嚴重程度：**重大**＝核心任務明顯受阻或內容讀唔到；**中**＝做得到但摩擦大；**小**＝拋光、無障礙、密度。

| ID | 嚴重 | 平台 | 範圍 | 用戶實際遇到咩 |
|---|---|---|---|---|
| F19 | 重大 | Android | 聊天／圖像 | 一開鍵盤，問智泉同發送鍵完全被擋住。用戶要撳系統返回先睇到自己打咗咩、先發得出去。`KeyboardDock` 喺 Android 唔抬畫面。 |
| F20 | 重大 | 兩邊 | 聊天 | 助理用純 `Text` 印 Markdown。健康作息清單變成滿屏 `\|時間\|活動\|` 同 `**水分攝取**`。電話上一眼睇唔到表。思考過程同樣露出 `**`。 **已修**（無 GFM 分隔行同 `<br>` 都砌成格；兩欄表撐滿氣泡。兩邊七日表見到 Day／Activity 格）。 |
| F21 | 中 | 兩邊 | 聊天 | 氣泡標題淨係「智泉」。產品要用戶知今轉 `text-to-text`／`text-to-image`。圖像完成後一樣無 kind 標。無廠商模型名（呢點啱）。 |
| F24 | 中 | 兩邊 | 歷史 | 抽屉同「今日」多數行都叫「新對話」。測試用戶本機已存 28–30 段，掃描標題等於無用。 |
| F31 | 中 | iOS | 首頁 | 打字時鍵盤蓋住成條 tab。用戶打緊嘢就轉唔到圖像／發現／我的。發送鍵要對準鍵盤上方松綠圓，好易撳空。 **已修**（顯式收 tab；KeyboardDock 用鍵盤 overlap 抬 composer）。iOS 軟件鍵盤實機：tab 收、問智泉／發送貼鍵盤頂。 |
| F33 | 中 | iOS（邏輯兩邊） | 未登入發送 | 首頁發送會開 Chat 再彈登入。撳「返回」落到**無 tab 嘅空 Chat**。要再撳頂欄返回先返到對話首頁。未登入用戶以為 app 無底欄。 |
| F01 | 中（Debug） | 兩邊，And 更重 | 外殼 | Metro LogBox「Open debugger to view warnings」蓋住 tab。Android 再疊一條 `expo-notifications: Custom sound 'default' not found`，連發送都擋住。商店包不應有；Debug 裝幾乎測唔到底欄。 **已修**（channel 唔再傳 `sound`；`openChat` 抽出 `navigation/open.ts`，打破 MainTabs require cycle。F17 同一根因一齊清）。 |
| F25 | 中 | Android（iOS 圖像近期列被 composer 擋住） | 圖像 | 「最近圖像」出現空白白卡，而唔係「未有圖像」。有 `lastImageUrl` 嘅對話先出圖；無圖嘅圖像對話仍佔一格。出圖後其中一格有淡山水，另一格仲空白。 **已修**（只列出有圖嘅格）。 |
| F30 | 中 | Android（iOS 本輪未等到完成） | 圖像 | 用水墨畫一幅之後約 30–43 秒得閃爍光標，無「畫緊」文案。用戶會以為死機。完成後山水質素好、無 qwen 字樣。 **已修**（串流顯示「畫緊」）。 |
| F16 | 中 | 兩邊 | 我的 | 頭像下同配額卡都印裸 `+85291118888`。OTP 頁用過有空格嘅 `+852 9111 8888`，同一支電話兩種樣。 **已修**（頭像下 `formatE164` 一次；配額卡「已用 n／N」）。 |
| F13 | 中 | 兩邊 | 我的 | 未登入第一屏：語言「繁中」被 tab 切走，外觀要滾。已登入：「立即同步」被 tab 切走。Android 更高，通知／外觀更容易匿喺底。 **已修**。 |
| F08 | 中 | 兩邊 | 首頁 | iOS 熱門智能體只完整見到「商務助手」。Android 見到三個但「寫作導師」介紹被 composer 切行。下面仲有人，無足夠提示要掃。 **已修**。 |
| F14 | 中 | 兩邊 | 登入／工具／空 Chat | 登入卡同底部 CTA 之間一大片空白。Android 空 Chat 建議同輸入框之間同樣空洞。iOS 空 Chat 反而較緊。改寫工具頁（And）開始掣下面成屏黑。 **登入／空 Chat 已修**（CTA 貼卡底；EmptyHero spacer 把建議推去 composer 上面）。改寫頁空洞見 F42。 |
| F11 | 中 | 兩邊 | 發現 | 英雄圖第二行寫「查看全部」，同工具區連結撞文案，唔係探索／說明。 **已修**（`hero.blurbZh`／`blurbEn`；工具列仍係「查看全部」）。 |
| F03 | 中 | 兩邊，And 更差 | 發送 | 發送 `accessibilityLabel` 寫死英文 `"send"`。Android TalkBack／自動化搵唔到；iOS VoiceOver 會讀英文。畫面上得向上箭咀。 **已修**（`text.send`＝發送／Send）。 |
| F04 | 中 | 兩邊 | 圖示 | `Icon` 直接用 Ionicons，無障礙名變成 `, 改寫`、tab `, 對話`。iOS Maestro 因而搵唔到「改寫」「開始」。 **已修**（圖示包 View 隱藏；工具／tab／開始用中文名）。 |
| F23 | 中 | 兩邊 | 氣泡動作 | 複製／朗讀／再生成／讚／踩得圓形圖示。有 a11y 字但畫面零文字。長文動作列要滾到最底先見到（F22）。 **已修**（ActionChip 圖示＋複製／朗讀／再生成／有用／唔好／儲存）。Android 圖像氣泡實機見到儲存／有用／唔好。iOS 呢輪未登入，未喺回覆氣泡實機。 |
| F15 | 中 | Android | 登入 | OTP 成功回到我的之後，數字鍵盤仍然開住，蓋住配額同捷徑。 **已修**（verify 後 `Keyboard.dismiss`、blur、Android 等 80ms）。 |
| F35 | 中 | iOS（And 鍵盤時更差） | 圖像 | 風格列「水墨／紙本／夜色」被底部 composer 切去下半。用戶以為得兩種風格。 **已修**。 |
| F36 | 中 | iOS（思考開住時） | 聊天 | 「思考中」流出系統角色碎片：「我的角色：『智泉』(中盈紫達集…」。用戶不應見到內部人設。 **已修**（`sanitizeThinking` 連 你係「智泉」／系統人設；kernel.test 通過）。And 七日清單思考中無公司名。舊庫存思考 2026-10-12 仍有原文，畫面會洗。 |
| F38 | 小 | Android（碼兩邊） | 翻譯 | 「開始」空文都係實心松綠。撳下去程式直接 return，畫面零提示。 **已修**（空文禁用、opacity 0.45、「請先貼一段文字。」）。 |
| F42 | 小 | Android | 改寫工具 | 首頁「改寫」打開單工具頁（貼句子 + 開始），下面大片空，唔係寫作模板總覽。 **已修**（試試呢句、例子晶片、空文提示、最近寫作）。 |
| F43 | 小 | 兩邊 | 聊天頂欄 | 返回chevron 嘅無障礙名係「對話」，畫面無「返回」二字。VoiceOver 用戶會以為去緊對話 tab。 **已修**（ScreenHeader 預設 `copy.back`＝返回；Chat 用 `text.back`）。 |
| F05 | 小 | 兩邊 | 首頁 | 區塊標題「圖像」同 tab「圖像」撞名，自動化同掃描都會撳錯。 **已修**（`homeImage`＝畫圖／Draw；tab 仍係圖像）。 |
| F12 | 小 | 兩邊 | 發現 | 「備忘」推薦圖有一支麥克風。產品已冇錄音掣，圖同功能唔一致。 **已修**（茶、信、筆、硯；無咪）。 |
| F22 | 小 | Android | 聊天 | 長回覆最後幾行同動作列坐喺 composer 下面，要人手上滑。 **已修**（streamLen 跟 `scrollToEnd`；paddingBottom 48）。And 七日清單完成後複製／朗讀／再生成／有用／唔好喺發送上面。 |
| F18 | 小 | Android | 我的 | 深色再揀「跟隨系統」會閃一次啟動頁。 **已修**（openingDone 只喺冷啟動；切外觀停留我的）。 |
| F17 | 小 | Android Debug | 通知 | 自訂音效 `default` 唔存在，彈紅 LogBox。 **已修**（F01 同一 commit 唔再傳 `sound`）。 |
| F32 | 小 | iOS | 鍵盤 | 系統「要啟用聽寫嗎？」蓋住首頁。產品無咪高，係 iOS 鍵盤聽寫。 **系統鍵盤**；呢輪軟件鍵盤見到聽寫咪，未再彈啟用窗。產品碼無改。 |
| F06 | 小 | Android | 首頁 | 寫作導師一行被 composer 裁。 **已修**（F08 同一路徑；第七輪 Pixel 第一屏「寫作導師／改結構、改語氣，唔改原意。」完整喺 composer 上面）。 |
| F10 | — | 兩邊 | 登入 | 佔位 `9123 4567` 啱香港格式，無數字計數器。保持。 |
| F27 | — | 兩邊 | 聊天 | 建議晶片填入 composer、唔自動發送。合理，記低。 |
| F28 | — | 兩邊 | 通知 | 「生成完成」關住，對應資料庫 `notifyGenerationDone=0`，唔係顯示錯。 |
| F29 | 小 | 兩邊 | 我的 | 「刪除帳戶」紅色正確；圖示同「清除圖像快取」都係垃圾桶。 **已修**（清除圖像快取 `image-outline`；刪除帳戶仍紅 `trash-outline`）。 |

---

## 5. 分功能：用戶視角

### A／B 啟動同未登入瀏覽

冷啟動之後，用戶見到紙色底、松綠對話 tab、四個入口：對話、圖像、發現、我的。未登入都可以四頁掃完，呢點同「先睇後登」一致。

首頁英雄「在所有設備上使用智泉／立即探索」、工具四格（改寫、解答、搜尋、備忘）、圖像兩張 New 卡、熱門智能體，清墨質感好。Android 未登入頭像係空圈；登入後變成「測」。

**摩擦：** 第一屏智能體列表被輸入框同底欄食掉（F08，已修）。用戶會以為得一個商務助手。Debug 裝再加 LogBox，底欄標籤幾乎讀唔到（F01，第五輪已修）。

未登入喺「問智泉」打「你好」再發送，會去登入頁——產品規則啱。iOS 當鍵盤開住時，發送圓形好易撳中鍵盤，第一次發送失敗；收起鍵盤之後先入到登入。

### C 登入

登入頁文案清楚：「香港、澳門或中國內地手機。未註冊都可以試用 5 次。」底部「中盈紫達集團」。未夠八位，「取得驗證碼」淡松綠禁用（兩位 `12` 試過，啱）。夠八位先實心松綠。

OTP 頁電話排版 `+852 9111 8888`，有改號碼、60 秒重發。六位會自動提交。iOS 用 `000000` 即時紅字「登入資料不正確。」，之後 `123456` 入到「測試用戶／免費」。

**摩擦：** 卡片同 CTA 中間空白過多，錯碼紅字離輸入框好遠，要掃到最底先見到（F14，第五輪已修：CTA 貼卡底）。F15 第四輪已修：Android OTP 成功之後鍵盤收起，落到我的「測試用戶」。

第三輪 Android：訪客 `+85291116666` 登入後「試用／已用 0／5」，發「hi」之後「試用剩餘 4 次」、我的「已用 1／5」。澳門 `+85361112222`、內地 `+8613800138000` 用 OTP `123456` 入到試用 0／5。第七輪同一訪客用盡 5 次：第 6 次橫幅「試用 5 次已用完。完成註冊後可以繼續用。」→ 完成註冊（顯示名稱可留空）確認 → 我的「免費／已用 0／20」→ 再發「ok」每日 1／20。註冊後 Chat 橫幅本會留住，`847cbeb` 清咗。iOS 第三輪仍係測試用戶，無再登訪客。

### D 對話首頁

已登入出現「上次對話」晶片同頭像「測」。Composer 貼住 tab，iOS 呢點比舊版慳位。加號打開問／畫圖／睇圖／文件。Android 開過系統相機（虛擬場景），權限同系統 UI 正常。

**摩擦：** 加號面板有時被 LogBox 擋住（F01 已修）。發送無中文名（F03 已修）。區塊「圖像」同 tab 撞名（F05 第五輪已修：區塊「畫圖」）。

### E 聊天

**iOS 開心路徑：** 「用一句廣東話打招呼」→ 思考中（可停止，黑色方掣）→「你好呀，有咩可以幫到你？」松綠用戶氣泡、水滴標、複製／朗讀／再生成／讚踩齊。畫面乾淨。

**Android 開心路徑：** 「幫我列一個健康作息清單。」長文串流成功，讚填松綠。內容係 Markdown 表，電話上變成管道符號牆（F20）。用戶要自己腦補欄位。

思考開住時 iOS 見過系統人設碎片（F36，第四輪碼已清；呢輪未再打思考氣泡）。完成後思考可摺。標題有 `智泉 · generationKind`（F21）。

未登入發送→登入→返回，落到空 Chat「共飲智慧之泉」四張卡（寫電郵、翻譯、畫一幅、繼續上次）加建議句。iOS 呢屏好睇；Android 建議同輸入框之間空一大截（F14 第五輪已修：建議貼 composer 上面）。空 Chat **無底 tab**，返回標由「對話」改做「返回」（F43）。

### F 相機／檔

Android：加號「睇圖」→ 系統相機虛擬場景。第三輪 Android 相簿揀圖同 PDF 附件都發得出（vision／file-parser）。第七輪 iOS Chat 加號「睇圖」→ 相機 PHOTO／Cancel（sim 黑預覽）；相簿揀綠色格 → `image-to-text`「我見到一張綠色背景的圖片…」；「文件」開系統「最近項目／瀏覽」，揀 `spring-sample` → 氣泡「文件.pdf」→ `file-to-text` 讀到「Spring sample」。Inbox 鍵盤開住時撳「睇圖」有時揀唔到 look，覆蓋要由 Chat 入。空白「睇圖／文件」會提示要先揀媒體（`needPhoto`／`needFile`）。

### G 圖像

工作室兩邊都靚：英雄「用水墨畫一幅／開始」、圖像創作、水墨去印、人像紙本、風格橫滑。無 Monica 紫、無模型菜單。

Android 撳開始，約 40 秒出到一幅留白淡墨山水（山、舟、霧），質素對得住清墨。下載同讚喺圖下面。F30「畫緊」已修。

第三輪 iOS 英雄「用水墨畫一幅」等到完成：STREAMING「畫緊」→ COMPLETED `qwen/qwen-image-3` 漁夫水墨，Chat 有下載／縮圖。畫面無廠商 slug。

最近圖像：F25 已修，只列出有圖嘅格。iOS 風格列 F35 已修。iOS「開始」畫面上睇到，VoiceOver／Maestro 仍然弱（Cover 食咗子層文字）。

### H 寫作／翻譯

Android 首頁「改寫」→ 單工具頁「保留原意，句子更清楚。」＋大輸入＋開始。第四輪 F42：試試呢句、兩粒例子、空文「請先貼一段文字」、開始淡、最近寫作／未有寫作。寫作模板總覽（電郵／正式／廣東話格子）仍要由「全部工具」入。

翻譯頁完整：由繁中（香港）到英文、語言晶片、原文、字數、未有翻譯、開始。F38：空文「請先貼一段文字。」、開始淡禁用。

第三輪真譯一句：iOS `qwen-2.5-7b`「早上好。請坐。」；Android 初時 1B／switchyard 當傾偈，`9b54750` 把翻譯任務放到身份前面之後，Android `tencent/hy-mt2-30b-a3b`「請關上門。多謝。」兩邊開心路徑過。改寫：Android `qwen3-30b` 真改寫；iOS UI 過但 `llama-3.2-3b` 會傾偈，未當產品修。

### I 發現

大字「發現」、橫滑英雄、工具 4+3 同分頁點、推薦四張（備忘、翻譯、行程草稿、睇圖）。全部工具清單按「寫作／對話」分組，文案「用即時網頁搜尋，有就列真實連結」老實。F11：英雄第二行「手機、電腦同一口井。」／「打開就問。」；工具列仍係「查看全部」。F12：備忘推薦圖茶、信、筆、硯，無咪。iOS Maestro 對 Cover 文案字串 assert 失敗，畫面通過。

### J 歷史

Android 抽屉：新對話、搜尋對話、模式晶片、更早列表、最近刪除、發現、測試用戶。多數標題「新對話」，預覽有時係「圖像」或一句舊文。關閉掣細，容易撳中後面頭像。本輪抽屉搜尋自動化失敗（placeholder 係「搜尋對話」）。iOS 未深測整理／批量。

### K 我的

未登入：智泉、未登入、試用 5 次、登入松綠掣、捷徑、朗讀完成提示。已登入：測試用戶、免費、已用 2／20（Android 對話+出圖之後）、本月次數同美元、本機段數、立即同步、清除快取、通知、語言、外觀、關於、登出、刪除帳戶。

深色 token 正確（`#141311` 底、松綠選中）。F16：訪客 `+86 138 0013 8000`、免費 `+852 9111 8888` 頭像下印一次，配額「已用 n／N」唔再印電話。F13 第一屏已讓過 tab。刪除帳戶紅色，無第二步確認（本輪故意唔撳）。

### L 通知

生成完成關、額度將盡開、朗讀開——同資料一致。背景遠程推送、點通知開 Chat、離線、額滿 20／5，本輪無做。2026-10-15：對話／我的頂鈴鐺（無第六 tab）；未登入訊息「登入後可查看訊息。」；已登入空「未有訊息」，Admin 揀 1 人推送後下拉出「維護通知」。遠程 Admin OTP 彈窗要 DeviceToken；呢輪模擬器 0 個，後台 502「請先在手機開啟智泉並允許通知。」

---

## 6. 清墨視覺（兩邊一致嘅部份）

- 紙底同深色墨底都專業，無紫藍漸變、無金色、無 GPT／Claude／Gemini 選擇器。  
- 出圖無廠商 slug。  
- 主按鈕、選中 tab、發送圓、免費徽章用同一松綠。  
- 登入、我的、發現、圖像工作室風格統一。  
- iOS 短回覆聊天頁係依家最接近「清墨信箋」嘅一屏。  
- Android 深色圖像結果（山水 + 大留白）都立得住，得動作圖示偏淡、易睇漏。

值得加強嘅視覺，唔係換色，而係**密度同層次**：首頁智能體要完整見到兩個以上；登入 CTA 同空 Chat 建議要貼住內容（F14 第五輪已修）；圖像風格列要完整露喺 composer 上面。

---

## 7. 本輪刻意未做

| 項目 | 原因 |
|---|---|
| 擁有人 +85292578982 | 第 17 節抽樣後已登出；平時額度同權限會假失敗 |
| 刪除帳戶 | 破壞性 |
| iOS 訪客／+853／+86 | 第三／七輪 Android 已覆蓋；iOS 未再登訪客 |
| 寫作模板總覽 `Write` 頁 | 第 16 節 Pixel 已開「創作」入寫作；熱門跟 catalog 前三 |
| 額滿、離線、背景推送點擊 | 要改網絡／額度，另開一輪 |
| EAS／商店包、真機、Maestro 入庫 | `projectId` 已寫入 `app.json`；上架要 Apple／Google 帳號 |
| Admin 網頁 | 範圍外；第 17 節推送用 API（Vite `:5173` 呢輪未開） |
| 可見回覆寫出集團名 | `15efdbc` 之後 Pixel「hi」回覆「您好！有什麼可以幫您？」無集團名。我的頁關於列仍寫中盈紫達集團 |

---

## 8. 建議修復優先（等你點名先改碼）

第一至第七輪已修 F19、F20、F21、F24、F33、F13、F08、F35、F03、F04、F30、F25、F15、F16、F22、F31、F11、F12、F36、F38、F42、F01、F17、F14、F23、F43、F05、F18、F29、J 搜尋、訪客完成註冊橫幅。下一輪可以按呢個次序：

1. F32 iOS 系統聽寫咪（產品無咪；系統窗呢輪未再出）。  
2. App Store／Play 提交——要你嘅 Apple／Google 帳號。

---

## 9. 結論

同一組用戶路徑喺 iOS 同 Android 都跑過。登入、未登入瀏覽、真實對話、真實出圖、翻譯、改寫、清墨品牌，作為可用原型已經成立。第一至第七輪已修鍵盤抬、Markdown 表、生成種類、歷史標題、第一屏裁切、發送／工具中文名、登入後鍵盤、電話格式、發現文案同備忘圖、空翻譯、改寫工具頁、Debug LogBox、登入／空 Chat 空白、氣泡動作文字、返回名、畫圖區塊名、長回覆跟尾、iOS 打字收 tab、思考人設清洗、外觀切換閃啟動頁、抽屉搜尋、快取圖示、訪客用盡後完成註冊。

2026-10-12 紀錄輪**無改產品碼**。第二輪已對住表改 F08、F13、F35、F30、F25。第三輪翻譯品質 `9b54750`，其餘補洞見第 11 節。第四輪 F03／F04 至 F42 見第 12 節。第五輪 F01／F14 至 F05 見第 13 節。第六輪 F22／F31 至 F18 見第 14 節。第七輪 F20／J／F29 同訪客註冊見第 15 節。2026-10-15 規格 4.1＋4.2 產品 100% 見第 16 節。同日 App 訊息／Admin 推送見第 17 節。剩餘唔扣 100%：F32 系統聽寫、商店上架帳號。

---

## 10. 第二輪修復（2026-10-13）

每項一個 commit，做完即 push `origin/main`。裝置：iPhone 16 Pro、Pixel 9 Pro XL。測試用戶 `+85291118888`。

| ID | commit | 核對 |
|---|---|---|
| F08 | `1edea3f` Let the home aides list clear the composer. | And 第一屏三個智能體連「寫作導師」介紹完整。iOS 第一屏完整「商務助手」「家庭行程」，寫作導師唔再中間被裁。 |
| F13 | `d315e15` Let Settings first screen clear the tab bar. | And 未登入第一屏「繁中」「English」完整；滾到底「關於智泉」喺 tab 上面。 |
| F35 | `b3ca3cf` Let image style cards sit above the composer. | iOS／And 第一屏見到水墨、紙本、夜色名同簡介。 |
| F30 | `8c2432c` Show 畫緊 while an image turn is running. | And 用水墨畫一幅期間顯示「畫緊」同光標，標題「用水墨畫一幅」，氣泡「智泉 · text-to-image」。完成後出秋水孤舟圖。 |
| F25 | （本 commit）Hide blank recent-image tiles. | And 最近圖像只剩有 `lastImageUrl` 嘅格；未登入時「未有圖像」。 |

F21／F24 呢輪跟住出圖路徑複測通過。F20 表格 Markdown 未再打一次健康作息清單。

第四輪已跟住修 F15、F16、F22、F31、F11／F12、F36、F38、F42，見第 12 節。訪客／+853／+86、相簿／PDF、iOS 出圖、真改寫／翻譯見第 11 節。F03／F04 見第 12 節。第五輪 F01／F14／F23／F43／F05 見第 13 節。仍未做：寫作 prompt 順序、遠程推送、EAS／真機。

---

## 11. 第三輪補洞（2026-10-13）

每項做完先 merge。產品碼得翻譯 prompt 一項（`9b54750`）；其餘係實機核對。裝置：iPhone 16 Pro、Pixel 9 Pro XL。唔用擁有人 `+85292578982`。

| 洞 | 結果 | 核對 |
|---|---|---|
| H 改寫一句 | And ✓；iOS UI ✓ | And `qwen3-30b` 改「今天天氣很好…」。iOS `llama-3.2-3b` 會當傾偈，未當產品修。 |
| H 翻譯一句 | ✓ 兩邊（修完再測） | 初時 identity 搶先，1B／switchyard 傾偈。`9b54750` 翻譯任務放身份前面。iOS `qwen-2.5-7b`「早上好。請坐。」And `tencent/hy-mt2-30b-a3b`「請關上門。多謝。」未關 1B 池。 |
| F 相簿 + PDF | And ✓；iOS — | And 相簿圖同 Download PDF 都發得出。iOS 時間跳過。 |
| G iOS 出圖等到完成 | iOS ✓ | 英雄「用水墨畫一幅」→「畫緊」STREAMING → COMPLETED 漁夫水墨。F30 兩邊都見過「畫緊」。 |
| C 訪客 `+85291116666` | And ✓ | 試用 0／5 → 發「hi」→「試用剩餘 4 次」、我的「已用 1／5」、`guestUses=1`、`registeredAt` 空。未用盡 5 次。 |
| C +853 OTP | And ✓ | DialSheet 澳門 `+853`、本地 `61112222`、OTP `123456` → 試用 0／5。 |
| C +86 OTP | And ✓ | DialSheet 中國 `+86`、本地 `13800138000`、OTP `123456` → 試用 0／5。 |

**環境（唔入產品 commit）：** `/tmp` MySQL datadir 缺 `DeviceToken.ibd`（1812），訪客 `chargeGuest` 更新 User 時被 FK 拖死，畫面「智泉暫時回應唔到」。按遷移 SQL 重建 `DeviceToken` 之後訪客發送先過。`_prisma_migrations.ibd` 同樣缺，唔影響執行時。當時 F01 LogBox `expo-notifications: Custom sound 'default' not found` Android 仍然彈；第五輪已修，見第 13 節。

**本輪刻意唔改：** F03／F04 至 F42 見第 12 節。遠程推送、EAS／真機、寫作 prompt 順序仍未做。

---

## 12. 第四輪修復（2026-10-13）

每項一個 commit，做完即 push `origin/main`。裝置：iPhone 16 Pro、Pixel 9 Pro XL。測試用戶 `+85291118888`。唔用擁有人 `+85292578982`。

| ID | commit | 核對 |
|---|---|---|
| F03 | `1a631d5` Give the send control a Chinese accessibility name. | And uiautomator Button content-desc `發送`（Inbox／圖像 composer）。e2e `clickLabel(page, "發送")`。畫面仍然得向上箭咀。 |
| F04 | `c19aa0e` Hide decorative icons from VoiceOver and name tools in Chinese. 跟 `feed56c` Keep Ionicons out of the accessibility tree. | And Button `改寫`／`解答`／`搜尋`／`備忘`，tab `對話`／`圖像`／`發現`／`我的`，無 PUA 前綴。iOS Maestro `tapOn: 改寫` → `開始` 通過。圖像英雄 `開始`：And XML Button；iOS Maestro 底欄 37%,94% 再 assert `開始`／`發送` 通過。Maestro `tapOn: 圖像` 會打中 Inbox 區塊標題，要用 tab 座標。 |
| F15 | `fe98ef5` Dismiss the keypad after a successful phone login. | And 登出→登入 `+85291118888` OTP `123456` → 我的「測試用戶」，Gboard 已收、底欄見到。 |
| F16 | `23c0358` Show the signed-in phone once, with grouping spaces. | And 試用 `+86 138 0013 8000` 只印一次、配額「已用 0／5」；免費 `+852 9111 8888` 一次、「已用 9／20」。剪貼簿仍係裸 E.164。 |
| F22 | `2d8437e` Keep a long reply and its actions above the composer. | 碼：stickToEnd／streamLen／paddingBottom 20。呢輪未做長回覆實機。 |
| F31 | `795657f` Hide the iOS tab bar while the keyboard is up. | 碼：iOS `tabBarHideOnKeyboard`、KeyboardDock 減 tab 50px。Sim 硬件鍵盤令 software keyboard 唔出；Maestro 撳「問智泉」有 cursor／Paste／AutoFill，tab 未收。 |
| F11 | `4df1f70` Use each Discover hero blurb instead of 查看全部. | 兩邊發現英雄第二行「手機、電腦同一口井。」「打開就問。」。iOS Maestro 字串 assert 失敗（Cover 文案唔入樹），畫面通過。 |
| F12 | `90e68a0` Replace the memo card microphone with paper and a brush. | 兩邊備忘推薦圖茶、信、筆、硯，無咪。 |
| F36 | `8b59f1b` Strip system-role fragments out of thinking text. | `sanitizeThinking` 去掉「我的角色／你是「智泉」／中盈紫達／Gather Wealth Gather Wisdom／You are Wisdom Spring」；kernel.test 通過。呢輪未做思考氣泡實機。 |
| F38 | `0ab5f4a` Disable translate Start until there is text to translate. | And 空翻譯「0 字」「請先貼一段文字。」、開始淡。iOS 同一套 JS。 |
| F42 | `ebcf7aa` Fill the rewrite tool page with examples and recent drafts. | 兩邊改寫：試試呢句、兩粒例子（今日天氣好好／麻煩你盡快回覆）、開始淡、最近寫作／未有寫作。iOS Maestro `改寫`→`試試呢句`／`開始`／`最近寫作` 通過。 |

Ionicons 單設 `importantForAccessibility="no"` 唔夠：glyph 仍係 TextView 子層。要包一層 View，`no-hide-descendants`。Cover 入面 Image／遮罩 `accessible={false}`，英雄 Pressable 先出得 `開始`。

F01 LogBox（`expo-notifications: Custom sound 'default' not found` 同 Open debugger）Android 當時仍然蓋住底欄，測 tab 前要 Dismiss。ScreenHeader 返回 chevron 未傳 `accessibilityBack`，Android 翻譯頁 XML 空 desc（F43）。第五輪已修，見第 13 節。

仍未做（當時）：F01 Debug LogBox、F14 登入／空 Chat 大空白、F23 氣泡動作得圖示、F43 返回無障礙名、F05 圖像撞名、F18 深色閃啟動頁、F17 自訂音效、F32 iOS 聽寫提示、F22 長回覆實機、F31 iOS 軟件鍵盤實機、F36 思考氣泡實機、寫作 prompt 順序、遠程推送、EAS／真機、iOS 相機／相簿／PDF、訪客用盡 5 次。

---

## 13. 第五輪修復（2026-10-13）

每項一個 commit，做完即 push `origin/main`。裝置：iPhone 16 Pro（iOS 18.6，`CF2F74AC-E154-42E3-84CE-257A91F25101`）、Pixel 9 Pro XL（`emulator-5554`）。測試用戶 `+85291118888`。唔用擁有人 `+85292578982`。Reload：`am force-stop` 同 `simctl terminate/launch`。API／Metro／MySQL 健康。

| ID | commit | 核對 |
|---|---|---|
| F01 | `6d4f1c0` Stop debug LogBox covering the tab bar. | 兩邊 relaunch 後無 LogBox 蓋 tab／發送。And dump：Open debugger 0、Custom sound 0、Dismiss 0。F17 同一根因一齊清：channel 唔再傳 `sound`；`openChat` 抽出 `navigation/open.ts`，屏幕唔再由 MainTabs 引入 helper（re-export 會再造成 cycle）。 |
| F14 | `33a93cd` Sit login and empty-chat actions next to their content. | And 登入「取得驗證碼」貼卡底 `y≈1006`，「中盈紫達集團」`y≈1160`；鍵盤自動 focus 電話（預期）。空 Chat EmptyHero 喺頂，五粒建議貼 composer 上面。iOS Maestro assert `取得驗證碼`、`共飲智慧之泉`、`寫一封電郵`。iOS 登入無獨立 png（stdin Maestro 路徑失敗，`ios-auth.png` 唔可靠）；靠 Maestro 字串通過。 |
| F23 | `dc272c7` Show copy, listen, and feedback labels on assistant bubbles. | And 圖像氣泡見到晶片「儲存／有用／唔好」。iOS 呢輪未登入，未喺回覆氣泡實機；同一套 ActionChip JS。 |
| F43 | `0edb6fe` Name the back chevron 返回 instead of 對話. | And dump `desc='返回'` `[72,159]`，唔再係「對話」。iOS Maestro 由 Auth 同空 Chat 撳「返回」成功。e2e `leaveChat` 先搵「返回」，再 fallback「對話」。 |
| F05 | `cfcdd8d` Call the home draw section 畫圖 so it is not the Image tab. | 兩邊區塊「畫圖」、tab「圖像」。And 畫圖 `[48,1080]`；圖像只喺 tab `[336,2789]`。iOS Maestro `assertVisible` 畫圖同圖像都通過。`homeImage` 唔含「圖像」二字，避免 substring 打中。 |

Android 核對後還原測試用戶「免費／已用 9／20」。iOS 留未登入「我的」。

唔用 `LogBox.ignoreLogs` 匿產品問題。唔把 helper 由 MainTabs re-export。`homeImage` 用「畫圖」而唔係「圖像創作」，避免 Maestro `tapOn: 圖像` 再打中標題。

仍未做（當時）：F22 長回覆實機、F31 iOS 軟件鍵盤實機、F36 思考氣泡實機、F18 深色閃啟動頁、F32 iOS 聽寫提示、寫作 prompt 順序、遠程推送、EAS／真機、iOS 相機／相簿／PDF、訪客用盡 5 次、抽屉搜尋。

---

## 14. 第六輪修復（2026-10-14）

每項一個 commit，做完即 push `origin/main`。裝置：iPhone 16 Pro（iOS 18.6，`CF2F74AC-E154-42E3-84CE-257A91F25101`）、Pixel 9 Pro XL（`emulator-5554`）。測試用戶 `+85291118888`。唔用擁有人 `+85292578982`。API／Metro／MySQL 健康。iOS 為軟件鍵盤關咗 Simulator ConnectHardwareKeyboard。

| ID | commit | 核對 |
|---|---|---|
| F22 | `bb36dd5` Follow a growing reply so its actions sit above the composer. | And 真實長回覆「7-day healthy routine」串流期間文末貼 composer；完成後 dump 複製／朗讀／再生成／有用／唔好 `y≈2669`，問智泉 `y≈2791`。iOS 呢輪未登入，未做長回覆實機；同一套 MessageList。 |
| F31 | `9ce0ac6` Hide the iOS tab bar and sit the composer on the keyboard. | iOS 軟件鍵盤實機：tab 對話／圖像／發現／我的收起；問智泉同發送完整坐喺鍵盤（建議列）上面。固定 `tabBarStyle.height` 會令 `tabBarHideOnKeyboard` 失效，要 `display: none`；KeyboardDock 用 `screenY` overlap 抬，唔再減 tab／Home。 |
| F36 | `3f2c49b` Strip Cantonese identity lines out of thinking text. | And 七日清單「思考中」只寫用戶題目，無「我的角色／中盈紫達」。`sanitizeThinking` 加「你係「智泉」／系統人設」；kernel.test 37 通過。舊庫存 2026-10-12 思考仍有原文，畫面會洗。 |
| F18 | `38f7316` Keep Settings on screen when switching appearance. | And 深色→跟隨系統即時停留我的（淺色），連續截圖無啟動頁／轉圈。 |
| F32 | （無產品 commit） | iOS 軟件鍵盤右下有系統聽寫咪。呢輪未再彈「要啟用聽寫嗎？」。產品無咪，JS 收唔到系統聽寫掣。 |

Android 核對後外觀還原跟隨系統。iOS 留未登入。

仍未做（當時）：F32 系統聽寫咪、寫作 prompt 順序、遠程推送、EAS／真機、iOS 相機／相簿／PDF、訪客用盡 5 次、抽屉搜尋。第七輪已跟住做，見第 15 節。

---

## 15. 第七輪修復（2026-10-14）

每項一個 commit，做完即 push `origin/main`。裝置：iPhone 16 Pro（iOS 18.6，`CF2F74AC-E154-42E3-84CE-257A91F25101`）、Pixel 9 Pro XL（`emulator-5554`）。訪客 `+85291116666`；唔用擁有人 `+85292578982`。API／Metro／MySQL 健康。

| ID | commit | 核對 |
|---|---|---|
| F20 | `25e223b` Render assistant pipe tables as cells on the phone. | 兩邊「7-day healthy routine」表：Day／Activity 格，無管道牆。無 GFM 分隔行同 `<br>` 都砌成表；兩欄撐滿氣泡。`assistant-markdown.test.ts` 7 通過。iOS 長回覆動作列喺 composer 上面（F22 跟測）。 |
| J | `f4ba5d4` Name the drawer search field and match titles as you type. | 抽屉搜尋 `accessibilityLabel`「搜尋對話」。打 `healthy` 即時出搜尋結果（標題命中，唔閃完整列表）。And 開到命中對話。 |
| F29 | `331a6a9` Give clear-cache a picture icon so it is not the same trash as delete account. | And 清除圖像快取 `image-outline`；刪除帳戶紅 `trash-outline`。iOS 刪除列紅垃圾桶。 |
| F06 | （無產品 commit） | Pixel 第一屏「寫作導師」介紹完整喺 composer 上面（F08 已覆蓋）。 |
| 訪客完成註冊 | `847cbeb` Drop the trial-used-up banner once the account is registered. | And 訪客 `guestUses=5` 第 6 次橫幅「試用 5 次已用完。」→ 完成註冊空名確認 → 我的「免費／已用 0／20」→ 發「ok」每日 1／20。註冊後 `user.registered` 清橫幅。 |
| F 相機／相簿／PDF | （無產品 commit） | iOS Chat「睇圖」→ 相機 PHOTO／Cancel；相簿綠格 → `image-to-text`。Chat「文件」→ 系統最近項目／瀏覽 → `spring-sample` 氣泡「文件.pdf」→ `file-to-text` 讀到「Spring sample」。Inbox 鍵盤開住時睇圖有時揀唔到 look。 |

Android 核對後訪客已變成 FREE `+852 9111 6666`。iOS 留喺七日表＋vision＋PDF 嗰條 Chat。

仍未做（第七輪當日）：F32 系統聽寫咪、寫作 prompt 順序、遠程推送、EAS／真機、可見回覆集團名。第 16 節已收口後三項。

---

## 16. 規格 4.1＋4.2 做到 100%（2026-10-15）

每一期一個 commit，做完即 push `origin/main`。裝置：Pixel 9 Pro XL（`emulator-5554`）。人物 `+85291116666`（已註冊免費）；API／Metro／MySQL 健康。唔 commit `.env`、`android/`、`ios/`、session 截圖。

| 期 | commit | 核對 |
|---|---|---|
| 1 回覆洗集團名 | `15efdbc` Keep company names out of visible replies. | Pixel「hi」氣泡「您好！有什麼可以幫您？」無中盈紫達／Gather Wealth。後備文案「已改用其他模型」。 |
| 2 發現假資料 | `9f52fd4` Replace sample discover blurbs and drop fake New badges. | 首頁畫圖「留白淡墨，水墨去印。」「暖色紙本人像。」無 New 角標。 |
| 3 公開池名單 | `3e646ba` Show live Hong Kong-safe pool families in the model sheet. | 對話「智泉」chip 出「每一句由智泉抽選」；名單 `智泉 · DeepSeek` 等，無 slug。 |
| 4 拆即時語音格 | `5ff2e31` Drop the voice tile and pack eight live tools on page 0. | 發現第一頁 8 格（改寫…大綱）；全部工具無「即時語音」。 |
| 5 我的計劃／名／刪除 | `c8fccca` Show the real plan badge and confirm account deletion. | 我的徽章「免費」；顯示名稱彈窗可留空；刪除先確認。 |
| 6 寫作熱門跟 sort | `e7ce773` Let write featured cards follow catalog sort. | 寫作「常用」商務電郵、報告大綱、改寫（catalog 前三）。 |
| 7 語氣三選 | `2407447` Add concise, detailed, and Cantonese reply tones. | 我的「語氣」簡潔／詳細／廣東話，預設簡潔打勾。mode-prompt 11 通過。 |
| 8 讚踩餵權重 | `1cc41c7` Feed thumbs up and down into pool weights. | 讚 +1、改踩 −2、取消還原；夾 1–10000。Pixel 撳「有用」。 |
| 9 EAS projectId | `7a1069b` Wire Expo push tokens to the EAS project. | `app.json` `extra.eas.projectId` `2a019e7f-aa6c-44ca-b5d9-da5049cbc2e9`；`getExpoPushTokenAsync({ projectId })`。 |
| 10 文件同抽樣 | 本 commit | 本節；kernel 42；`GET /v1/catalog/tools` 無 voice、page 0 八格；`GET /v1/catalog/write` 前三 email／report／rewrite。 |

刻意唔做（唔扣 100%）：4.3 市集／自訂人設／RAG／結帳、即時語音通話、Google／Apple 登入掣、F32 系統聽寫、App Store／Play 提交。

我的頁關於列仍然寫「中盈紫達集團」，只喺帳戶頁，唔喺氣泡。

---

## 17. App 訊息、Admin 推送、用量提示（2026-10-15）

每一期一個 commit，做完即 push `origin/main`。裝置：Pixel 9 Pro XL（`emulator-5554`）。一般用戶仍短訊／開發碼 `123456`。Admin 後台 OTP 抽樣用已登入 `+85292578982` 嘅 App，唔打對話額度。抽完已登出。唔 commit `.env`、`android/`、`ios/`、session 截圖。規格 4.1＋4.2 100% 見第 16 節。

| 期 | commit | 核對 |
|---|---|---|
| 1 收件箱 API 同 Admin OTP | `3f5b610` Send admin panel OTP through the app inbox. | `POST /v1/auth/phone/request` origin `http://127.0.0.1:8081` `+85291118888` → 200 `{"ok":true}`。origin `http://localhost:5173` `+85292578982`（DeviceToken 0）→ 502 `UPSTREAM_UNAVAILABLE`「請先在手機開啟智泉並允許通知。」inbox-otp 8 項。 |
| 2 App 訊息頁同 OTP 彈窗 | `c8a0e06` Show the app inbox and OTP popup. | Pixel 未登入鈴鐺開「訊息」→「登入後可查看訊息。」已登入頂鈴鐺 + 我的捷徑「訊息」；空列表「未有訊息」。無第六 tab。 |
| 3 Admin 揀人／全部推送 | `0d1c1ab` Let admin pick users or everyone for inbox push. | 未登入 `GET /admin/inbox/audience`、`POST /admin/inbox/send` → 401。Admin JWT：`GET /admin/inbox/audience` `{count:24}`；揀 1 人 `userCount:1, delivered:0, withoutDevice:1`；audit `inbox.send`。admin-inbox 3 項。 |
| 4 用量提示入箱 | `740618a` Write quota warnings into the app inbox. | push.integration 12 項：`quota_low` 無裝置都寫 inbox；`quota_exhausted` 剩餘 0 每個香港日一次；`monthly_cost` 80% 每個香港月一次；關 `notifyQuotaLow` 三種都唔發。kernel `hkMonthKey` 45 項。 |
| 5 文件同抽樣 | 本 commit | 本節；規格 4.1 Account／Admin、4.2 inbox kinds、HTTP `GET/POST /v1/inbox` 同 `/admin/inbox/*`、`/push`、`features/notices/`。 |

Pixel 抽樣（原生 `com.gwgwgroup.spring`）：

- App 用短訊路徑登入擁有人：文案「驗證碼已發出，5 分鐘內有效。」`+852 9257 8982`，碼 `123456`。我的「免費」「已用 0／20」。DeviceToken 仍然 0。
- 已登入「訊息」先空「未有訊息」。`POST /admin/inbox/send` 揀該用戶之後下拉，卡片「維護通知」「今晚暫停服務。」「剛剛」，鈴鐺未讀 1。
- 登出後我的「未登入」同「登入」掣；捷徑仍有「訊息」。
- Admin 登入頁碼預填 `92578982`；成功後文案「驗證碼已發到智泉 App。」（`LoginPage.tsx`）。Vite `:5173` 呢輪未開，群發用 API。
- 遠程 OTP 彈窗要已註冊 DeviceToken。模擬器 0 個，後台請求維持 502，無短訊後備。

刻意唔做：停一般用戶短訊、第六 tab、SMS 後備、PLUS 訂閱到期、公告橫幅改造成推送。


