# Prompt Maker — Project Hub

> 盤點時間：2026-08-07 17:07 UTC  
> 階段：Project Kickoff 前的 repository inventory  
> 範圍：目前 repository 內可驗證的程式、資料、文件與開發工具；本文件只建立 Issue Index，不另寫個別 Issue 文件。

---

## Index：所有相關 Issue

| ID | Issue | 對應模組 | 現況 | 分類 |
|---|---|---|---|---|
| PM-01 | 維護單頁應用殼層、路由與導覽 | App Shell | 已有實作 | ✅ |
| PM-02 | 編輯 Prompt 與同步 placeholder 欄位 | Template Editor | 已有實作 | ✅ |
| PM-03 | 即時代入欄位值並預覽 Prompt | Preview Engine | 已有實作 | ✅ |
| PM-04 | 保存、還原與清除本機草稿 | Persistence | 已有實作 | ✅ |
| PM-05 | 產生及載入 Base64 `?data=` 分享連結 | Sharing | 已有實作 | ✅ |
| PM-06 | 以 `?file=` 載入超長 Prompt | Template Library | 已有實作 | ✅ |
| PM-07 | 維護模板目錄、分類與搜尋頁 | Template Library | 已有實作 | ✅ |
| PM-08 | 用 CLI 新增模板並自動選擇分享載體 | Template Tooling | 已有實作 | ✅ |
| PM-09 | 在本機開發伺服器回寫模板來源 | Dev Update | 已有實作及測試 | ✅ |
| PM-10 | 維護使用教學、SEO 與站點探索資訊 | Documentation / Discovery | 已有實作 | ✅ |
| PM-11 | 建立可重複的瀏覽器端核心流程驗收 | QA | 尚未定義自動化範圍 | ⬜ Spike P1 |
| PM-12 | 明確定義產品下一階段範圍與成功指標 | Product | 尚未提供 | ⬜ Spike P0 |
| PM-13 | 決定 curated template library 的治理規則 | Template Governance | 部分慣例存在，正式準則未確認 | ⬜ Spike P2 |
| PM-14 | 定義部署環境、發布流程與 production 驗證 | Delivery | repository 未見明確配置 | ⬜ Spike P1 |

---

## 1. 主模組總覽

| 主模組 | 一句話職責 | 主要位置 |
|---|---|---|
| App Shell | 載入 Vue 3、Vue Router、Tailwind，組合導覽與首頁。 | `index.html`, `js/main.js`, `js/router.js`, `js/pages/Navbar.js` |
| Template Editor | 編輯 Prompt、抽取 `{{field_name}}`、管理欄位設定與模式切換。 | `js/pages/components/Editor.js`, `FieldList.js`, `ModeSwitch.js` |
| Preview Engine | 將欄位值代入 Prompt 並呈現可複製的最終結果。 | `js/pages/components/Preview.js`, `js/utils/template.js` |
| State & Persistence | 正規化 editor state，並以 `localStorage` 保存/還原草稿。 | `js/pages/Home.js`, `js/utils/editor-state.mjs` |
| Sharing | 將 editor state 編碼為 Base64 URL，並解碼 `?data=` 分享內容。 | `js/utils/share-core.mjs`, `js/utils/share.js` |
| Template Library | 提供 curated template metadata、長模板 JSON 來源與搜尋/分類入口。 | `templates.json`, `prompts/`, `templates.html` |
| Template Tooling | 從 JSON 輸入產生分享項目，超過 URL 長度時改寫為 `?file=`。 | `js/cli/generate-share-links.mjs` |
| Dev Update | 僅在 loopback 開發環境提供模板來源讀取、revision 檢查與安全回寫。 | `js/dev-server.mjs`, `js/dev/template-source.mjs`, `js/utils/dev-update.mjs` |
| Documentation & Discovery | 說明操作方式並提供 SEO、sitemap、robots 與產品需求背景。 | `how-to.html`, `how-to/`, `PRODUCT_REQUIREMENTS.md`, `sitemap.xml`, `robots.txt` |

---

## 2. 模組關係與交互

```text
Browser
  |
  | GET index.html (Vue / Router / Tailwind CDN)
  v
App Shell --> Home ----------------------------------------------+
               |                                                 |
               | props/events: template, fields, fieldValues     |
               v                                                 |
          Template Editor -- fields + values --> Preview Engine  |
               |                         |                       |
               | save/share             | rendered prompt       |
               v                         v                       |
       State & Persistence         Clipboard / User              |
       localStorage key:                                           |
       template-editor-content                                    |
               |                                                 |
               +--> Sharing: state -> JSON -> UTF-8 Base64        |
               |       |                                         |
               |       +--> ?data=<encodedData> -----------------+
               |                                                   load precedence
               +<-- Template Library: ?file=<slug> ---------------+ ?file > ?data > localStorage
                         |
                         +--> prompts/<slug>.json

Authoring path
  _new-prompt.json
        |
        v
  Template CLI -- encoded URL <= 2048 --> templates.json (?data=)
        |
        +------ encoded URL > 2048 ----> prompts/<slug>.json + templates.json (?file=)

Local-only update path
  Home -- GET /__dev/status --> Dev Server
       -- GET /__dev/templates/<entry> --> {entry, link, revision, state, sourcePath}
       -- PUT /__dev/templates/<entry> --> {revision, state}
                                      --> guarded source update
```

### 關鍵交換資料

| 邊界 | 關鍵參數 / 資訊 | 約束 |
|---|---|---|
| Home ↔ Editor | `template`, `fields`, `fieldValues`, update context | state 必須可正規化；fields 與 fieldValues 需對齊。 |
| Editor → Preview | Prompt 字串、欄位值 map | placeholder 僅接受英數與底線名稱。 |
| Sharing ↔ URL | `data`（URI-encoded Base64 JSON） | 分享 URL 上限以 `2048` 字元判斷。 |
| Library ↔ Home | `file` slug 或 `data` payload | 載入優先序為 `file`、`data`、localStorage。 |
| CLI → Library | `title`, `category`, editor state, `link` | 超長內容寫入 `prompts/<slug>.json`。 |
| Home ↔ Dev API | `entry`, `revision`, normalized `state` | 僅 loopback 啟用；revision 防止覆蓋外部修改。 |

---

## 3. 子模組拆解

| 主模組 | 子模組 | 職責 |
|---|---|---|
| App Shell | HTML bootstrap | CDN dependencies、metadata、app mount point。 |
| App Shell | Router | 將 `/` 對應 Home。 |
| App Shell | Navbar | 站內導覽。 |
| Template Editor | Editor orchestrator | 管理 setting/working mode、欄位與分享/更新事件。 |
| Template Editor | FieldList | 編輯 placeholder 對應欄位與預設值。 |
| Template Editor | ModeSwitch | 切換編輯與預覽狀態。 |
| Preview Engine | Variable extraction | 驗證括號並抽取不重複 placeholder。 |
| Preview Engine | Template rendering | 依欄位名稱代入值。 |
| State & Persistence | State normalization | 驗證並建立一致 editor state。 |
| State & Persistence | Browser persistence | 讀寫 `template-editor-content`。 |
| Sharing | Core codec | Node/browser 共用 UTF-8 Base64 encode/decode。 |
| Sharing | Browser URL builder | 組合目前 origin/path 與 `?data=`。 |
| Template Library | Catalog | `templates.json` 的 title/category/link 索引。 |
| Template Library | File-backed prompts | 保存超過分享 URL 限制的完整 state。 |
| Template Library | Catalog UI | 分類、搜尋及模板連結展示。 |
| Template Tooling | Input normalization | 將 authoring JSON 收斂為 editor state。 |
| Template Tooling | Link strategy | 依 2048 字元門檻選擇 `?data=` 或 `?file=`。 |
| Dev Update | Static dev server | 提供靜態資源與本機 API。 |
| Dev Update | Source resolver/writer | 定位 catalog entry、revision 與安全寫入來源。 |
| Dev Update | Client discovery | 判斷來源唯一 entry 並控制 Update UI。 |
| Documentation & Discovery | How-to | 圖文操作流程。 |
| Documentation & Discovery | Search metadata | SEO metadata、robots、sitemap。 |

---

## 4. 主要工作細節（Issue Index）

> 本節只描述 Issue 範圍、輸入與完成判準，不建立個別 Issue 文件。

| ID | 工作範圍 | 主要輸入 | 完成判準 |
|---|---|---|---|
| PM-01 | 維護 app bootstrap、首頁 route 與全域導覽。 | CDN globals、route config。 | `/` 可載入 Home，Navbar 與 editor shell 正常呈現。 |
| PM-02 | 編輯 Prompt、解析 placeholder、同步欄位定義。 | `template`, prior `fields`。 | 合法 placeholder 生成唯一欄位；括號不平衡顯示錯誤。 |
| PM-03 | 以使用者值渲染最終 Prompt。 | `template`, `fieldValues`。 | 所有已知 placeholder 正確替換，缺值時行為一致。 |
| PM-04 | 保存與恢復 editor state。 | `template`, `fields`, `fieldValues`。 | 重新載入可恢復草稿；無效 storage 可安全 fallback。 |
| PM-05 | 分享與匯入短模板。 | normalized editor state。 | URL 可跨 reload 還原相同 state；無效 payload 顯示錯誤。 |
| PM-06 | 分享與載入超長模板。 | safe file slug、prompt JSON。 | `?file=` 能載入；路徑穿越字元被拒絕。 |
| PM-07 | 維護 template catalog 與可探索頁面。 | title/category/link metadata。 | 模板依 category 呈現且搜尋可篩選。 |
| PM-08 | 自動產生 catalog link 與 file fallback。 | prompt authoring array。 | CLI append 成功；state invariants 不被破壞。 |
| PM-09 | 本機直接更新既有模板來源。 | entry、revision、normalized state。 | 唯一來源可更新；衝突、安全路徑與長度轉換有防護。 |
| PM-10 | 維護教學與搜尋引擎入口。 | 產品流程、正式站 URL。 | 文件與現行 UI 一致；metadata/robots/sitemap 指向正確資源。 |
| PM-11 | 建立瀏覽器驗收策略。 | 核心 user journeys、支援瀏覽器範圍。 | 需 Spike 後定義；至少覆蓋編輯、預覽、分享匯入、模板載入、持久化。 |
| PM-12 | 收斂下一階段產品目標。 | owner priorities、user evidence、success metrics。 | 需使用者確認明確範圍、非目標、優先序與可量測完成定義。 |
| PM-13 | 定義模板治理。 | category taxonomy、review ownership、品質門檻。 | 需 Spike 後形成新增/更新/淘汰與分類規則。 |
| PM-14 | 定義 delivery lifecycle。 | hosting platform、CI、domain、release owner。 | 需 Spike 後形成可重複發布與 production smoke check。 |

---

## 5. 三態分類與 Spike 風險排序

> 使用者要求「三態標記」，但只提供兩個狀態（✅、⬜）；本文件不自行創造第三種標記，列入待確認問題。

### ✅ 一開始就清晰、可直接做

| ID | 為何清晰 | 可直接進行的下一步 |
|---|---|---|
| PM-01～PM-10 | repository 已有可定位的實作、資料流或文件，工作邊界可由現況驗證。 | 依個別變更需求進行維護、回歸與文件同步。 |

### ⬜ 還不確定、需要 Spike

| 優先序 | ID | 風險 | 要回答的核心問題 | Spike 產出 |
|---|---|---|---|---|
| P0 | PM-12 | 若沒有目標，後續 Issue 優先序與驗收都可能失焦。 | 下一階段要解決哪一類使用者問題？明確非目標、成功指標及時程是什麼？ | 經 owner 確認的 scope、non-goals、metrics、排序。 |
| P1 | PM-11 | 核心流程目前主要依賴人工驗證，回歸風險不可量化。 | 哪些 journey 必須自動化？目標瀏覽器、工具、fixture 與 CI 門檻為何？ | QA matrix、工具選型、最小 smoke suite 計畫。 |
| P1 | PM-14 | hosting/CI 不明會使發布與 production 驗證不可重複。 | 正式部署在哪裡？誰觸發發布？哪些檢查是 release gate？如何 rollback？ | delivery diagram、release checklist、rollback/owner 定義。 |
| P2 | PM-13 | catalog 擴張後可能發生重複、分類漂移或品質不一。 | 誰擁有分類？模板接受、更新、去重與淘汰標準是什麼？ | taxonomy、review checklist、lifecycle policy。 |

---

## 待我確認的問題

1. 「三態標記」的第三個狀態與符號是什麼？目前 prompt 只定義 ✅ 與 ⬜。
2. 本次 Project Hub 的「所有相關 Issue」是只盤點既有能力與已知缺口，還是要加入尚未提供的下一階段產品需求？
3. 下一階段 Project Kickoff 的目標、成功指標、預計時程與明確非目標為何？
4. production 的 hosting、CI/CD、發布負責人與 rollback 方式為何？
5. 支援的瀏覽器/裝置範圍，以及是否希望導入瀏覽器自動化測試？
6. `project implement` 分類的模板是否需要固定編號或排序？新加入的 Project Hub 模板目前沿用分類，但未擅自重排既有項目。

---

## 本輪盤點界線

- 已完成：repository 結構、主要 runtime/data flow、開發工具、模板管線與現有測試的靜態盤點。
- 已完成：Project Hub prompt template 加入 `project implement` 分類。
- 未進行：建立個別 Issue 文件、定義未提供的產品 roadmap、變更應用功能或 UI。
- 後續溝通檔案：依要求應放在本資料夾 `dev-hub-2026-08-07-1707/`。
