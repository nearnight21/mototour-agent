# 摩旅季节经验推理 Agent

> 输入`路线 + 月份 + 车型`，综合**通用知识库 + 全网真实经验**，输出分维度的骑行可行性分析。

---

## 快速开始

在 Codex 中直接说：

```
我想9月中旬骑GSX250走川藏线，适合吗？
```

Agent 会自动加载知识库 → 搜索小红书/B站/网页 → 合成分维度分析。

---

## 它能做什么

- 🏍️ 分析任意路线在任意月份的骑行可行性
- 🌡️ 结合海拔、温度、降水的生理风险评估
- 🛞 判断车型+轮胎是否适配路线的路面类型
- 📏 评估日里程、疲劳累积、编队效率
- 🎒 给出分层级的装备建议（必带 / 建议带）
- 📊 每条结论附信源引用和置信度标注

## 它不做什么

- 不预报具体某天的天气（只基于历史经验）
- 不转录视频（只看标题+简介+评论的文字层）
- 不输出假精度（不会说"降雨概率72%"）
- 不推荐酒店/餐饮/加油站精确位置
- 不保证小众路线的覆盖率——搜不到就诚实说

---

## 环境要求

### 前置条件

| 组件 | 用途 | 必需 |
|------|------|------|
| Python 3.10+ | agent-reach 运行环境 | ✅ |
| Node.js 18+ | OpenCLI + Tavily 脚本 | ✅ |
| Chrome 浏览器 | OpenCLI 浏览器桥接 | ✅ (小红书/B站) |
| V2RayN 或类似代理 | Tavily/Workers 走代理 | 国内必需 |

### 第一步：安装 agent-reach

```bash
pip install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto
```

验证：
```bash
agent-reach doctor --json   # 应显示 6+ channels active
```

### 第二步：安装 OpenCLI

```bash
npm install -g @jackwener/opencli
```

### 第三步：配置隔离 Chrome + 加载 OpenCLI 扩展

**关键：必须用独立的 user-data-dir，不要污染日常 Chrome。**

1. 下载扩展：[OpenCLI Releases](https://github.com/jackwener/OpenCLI/releases) → 找到 `opencli-extension-v*.zip`
2. 解压到 `C:\Users\Nora\.agent-reach\tools\opencli-extension\`
3. **用 `wmic process call create` 启动隔离 Chrome**（不是 `Start-Process`，原因见"易出问题点"）：

```powershell
wmic process call create "C:\Program Files\Google\Chrome\Application\chrome.exe --user-data-dir=C:\Users\Nora\.agent-reach\chrome-data --load-extension=C:\Users\Nora\.agent-reach\tools\opencli-extension --no-first-run --new-window"
```

4. 在隔离 Chrome 中登录 xiaohongshu.com / bilibili.com
5. 验证：

```bash
opencli doctor
# 应显示:
# [OK] Daemon: running
# [OK] Extension: connected
# Profiles: <id>: connected
```

### 第四步：配置 Tavily（可选但推荐）

详见下方的 **Tavily 配置**章节。

### 第五步：安装本插件

将 `mototour-agent` 放入 Codex skills 目录即可。

---

## OpenCLI 使用方法

### 基础命令

```bash
# 守护进程管理
opencli daemon start | stop | restart | status

# 查看状态
opencli doctor

# 列出当前连接的 Chrome profile
opencli profile list | use <id>
```

### 小红书命令

```bash
# 搜索笔记（控制关键词 < 10 字）
opencli xiaohongshu search "川藏线 摩旅 9月" --limit 8 -f yaml

# 抓笔记正文（注意：必须用完整 signed URL，含 xsec_token）
opencli xiaohongshu note "https://www.xiaohongshu.com/search_result/xxx?xsec_token=..." -f yaml

# 抓评论
opencli xiaohongshu comments "<full_url>" -f yaml

# 查当前登录账号
opencli xiaohongshu whoami  # 普通账号可能返回 AUTH_REQUIRED（whoami 走的是 creator 域名）
```

### B站命令

```bash
# 搜索视频
opencli bilibili search "川藏线 摩旅" --limit 5 -f yaml

# 抓视频详情
opencli bilibili video <bvid> -f yaml

# 抓评论
opencli bilibili comments <bvid> -f yaml
```

---

## OpenCLI 易出问题点（踩过的坑）

### 1. Chrome 进程被 PowerShell 清理

**症状**：用 `Start-Process chrome.exe ...` 启动的 Chrome 在 Codex turn 切换后**消失**（PID 找不到）。

**原因**：`Start-Process` 启动的子进程被 PowerShell session 视为 Job Object 成员，session 结束/重置时子进程被杀。

**解决**：用 **`wmic process call create`** 启动，父进程是 Windows 系统进程 `WmiPrvSE.exe`，完全脱离 PowerShell：

```powershell
wmic process call create "C:\Program Files\Google\Chrome\Application\chrome.exe --user-data-dir=... --load-extension=..."
```

替代方案：用 `start-agent-chrome.bat`（已在本仓库根目录），里面用 `start ""` 也能脱离。

### 2. Cookies 数据库位置（Chrome 149.x）

**症状**：检查 `Default\Cookies` 文件，**不存在**，误以为登录态没保存。

**原因**：Chrome 149.x 把 Cookies 数据库从 `Default\Cookies` 移到了 **`Default\Network\Cookies`**。

**验证**：

```powershell
Test-Path "C:\Users\Nora\.agent-reach\chrome-data\Default\Network\Cookies"
# 应返回 True
```

### 3. `xiaohongshu search` 报 AUTH_REQUIRED

**症状**：明明 Chrome 已经登录小红书，`opencli xiaohongshu search` 还是返回 `AUTH_REQUIRED`。

**原因**：小红书 SPA **忽略 `?keyword=...` URL 参数**——直接打开 `xiaohongshu.com/search?keyword=xxx` 会显示首页热门笔记，**不是**搜索结果。`xiaohongshu search` 内部就是用这个方法触发。

**解决**：让用户**手动**在 11860 Chrome 的搜索框里输入关键词并回车，然后 opencli 接管搜索结果页，再用 `opencli xiaohongshu note <full_url>` 抓正文。

### 4. 临时加载 OpenCLI 扩展会污染 Chrome profile

**症状**：用户的日常 Chrome 里出现 `OpenCLI Browser` 孤儿标签（每次 session 恢复都带回来）。

**原因**：`Start-Process chrome --load-extension=<ext> --load-extension=...` **没带 `--user-data-dir`** 时，Chrome 会用**默认 profile** 启动并**临时加载**扩展，扩展代码会创建 `OpenCLI Browser` webview 标签。即使 Chrome 进程被关，session 数据会保留这个标签。

**解决**：
- 永远带 `--user-data-dir=<独立路径>`
- 卸载已污染的 Chrome profile：在 `chrome://extensions/` → 找 OpenCLI → 移除

### 5. daemon profile ID 是动态的

**症状**：`opencli profile list` 显示的 ID（如 `hrdpa6aj`）在 daemon 重启后**会变**。

**解决**：脚本中需要用 ID 时，每次重新查：

```bash
PROFILE=$(opencli profile list | head -1 | awk '{print $1}')
```

### 6. 多个 Chrome 都装 OpenCLI 扩展时

**症状**：你日常 Chrome 8332 和隔离 Chrome 11860 都加载了 OpenCLI 扩展，`opencli doctor` 只显示 1 个 profile connected。

**原因**：daemon 只接**第一个或最近一个**扩展的连接。

**解决**：确保**只有 1 个 Chrome** 加载 OpenCLI 扩展。日常 Chrome 里**不要**装。

### 7. `note` 命令报 ARGUMENT 错误

**症状**：`opencli xiaohongshu note <note_id>` 报 "now requires a full signed URL"。

**解决**：用 `search` 返回的**完整 URL**（含 `xsec_token` 参数），不是裸 note_id。

### 8. 登录态没保存

**症状**：用户登录小红书后，关闭 Chrome，再启动发现**又没登录**。

**原因**：
- Chrome **正常退出**（菜单"退出"）会写 Cookies 到磁盘
- Chrome **异常退出**（taskkill /F、崩溃、断电）**可能**没写盘
- 用户**关窗口** ≠ **退出 Chrome**（关最后一个窗口会触发退出，但有时不触发）

**解决**：
- 优先用菜单 `⋮` → "退出"
- 让 Chrome **持续在后台跑**（不关电脑、不手动关 Chrome）—— Cookies 一直在内存

---

## Tavily 配置

### 为什么需要 Tavily

Tavily 提供**中文长文、官方新闻、攻略站**的搜索结果。Exa 偏英文社区，Tavily 是中文场景的核心信源。

### Cloudflare Workers 代理（推荐）

**用户场景**：API key 不想明文放在本地，用 Cloudflare Worker 代理 + 多 key 轮询。

#### Cloudflare Worker 配置

- URL: `https://tavily-proxy.xiaobai1423.workers.dev/mcp`
- Header: `x-api-key: tavily-proxy-auth-key-2026`
- Tool name: **`tavily-search`**（**注意是 hyphen 不是 underscore**）
- 走 V2RayN HTTP 代理: `http://127.0.0.1:10808`

#### Node 调用脚本

`skills/mototour-agent/tools/tavily_search.mjs`：

```javascript
import { ProxyAgent, fetch } from "undici";

const proxyUri = "http://127.0.0.1:10808";
const endpoint = "https://tavily-proxy.xiaobai1423.workers.dev/mcp";
const apiKey = "tavily-proxy-auth-key-2026";

const dispatcher = new ProxyAgent({ uri: proxyUri });

const body = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "tavily-search",  // 注意 hyphen
    arguments: {
      query: "川藏线 摩旅 9月 雨季",
      max_results: 8,
      search_depth: "advanced",
      include_answer: true
    }
  }
};

const resp = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json, text/event-stream",
    "x-api-key": apiKey
  },
  body: JSON.stringify(body),
  dispatcher
});
```

#### 安装依赖

```bash
cd skills/mototour-agent/tools
npm install undici
```

#### 用法

```bash
node tavily_search.mjs "川藏线 摩旅 GSX250" 8 advanced
```

### mcporter 配置（可选，备用）

如果想用 `mcporter call` 而不是直接调脚本：

`C:\Users\Nora\.mcporter\mcporter.json`：

```json
{
  "mcpServers": {
    "tavily": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://tavily-proxy.xiaobai1423.workers.dev/mcp",
        "--header", "x-api-key:tavily-proxy-auth-key-2026"
      ],
      "env": {
        "HTTPS_PROXY": "http://127.0.0.1:10808",
        "HTTP_PROXY": "http://127.0.0.1:10808",
        "NODE_USE_ENV_PROXY": "1"
      }
    }
  }
}
```

**关键**：`env` 必须设 `HTTPS_PROXY`！Node 子进程**不继承** shell 环境变量，必须在 mcporter config 里显式声明。

### Tavily 易出问题点

1. **Tool name 拼写**：是 `tavily-search`（hyphen），不是 `tavily_search`（underscore）。mcporter 会自动警告纠正。

2. **Node 子进程不继承 proxy env**：必须在 mcporter.json 的 `env` 字段里设 `HTTPS_PROXY`，不要只在 shell 里 `export`。

3. **国内访问 `*.workers.dev` 被墙**：必须走 V2RayN 代理。

4. **SSE 响应格式**：Tavily MCP 返回 `event: message\ndata: {...}\n\n` 格式，要按行解析 `data:` 前缀。

5. **search_depth 选项**：
   - `basic`：快，1 credit
   - `advanced`：慢，2 credits，质量高

6. **`include_answer: true`**：返回一个 AI 总结的"直接答案"字段（`answer`），在 result.content[0].text 里是 JSON 字符串，需要再 parse 一次。

---

## 知识库结构

```
mototour-agent/skills/mototour-agent/
├── SKILL.md                      # Agent 主指令（搜索策略+推理规则+输出模板）
├── knowledge/
│   ├── tires.yaml                # 轮胎类型 × 路面兼容性
│   ├── altitude.yaml             # 海拔效应（人+车的反应）
│   ├── physiology.yaml           # 温度/降水/风力 × 生理风险
│   └── riding_physics.yaml       # 日里程/疲劳累积/编队效率
├── routes/
│   └── china_major.yaml          # 7条国内核心摩旅路线基线数据
└── tools/
    └── tavily_search.mjs         # Tavily MCP 调用封装
```

### 四条通用知识域

| 文件 | 内容 | 记录数 |
|------|------|--------|
| `tires.yaml` | 公路胎/两用胎/越野胎的适用路面、湿地性能、寿命 | 3种类型 + 通用规则 |
| `altitude.yaml` | 5个海拔带的高反风险 + 电喷/化油器动力损失 + 温降规律 | ~30条记录 |
| `physiology.yaml` | 6个温度区间 + 4个降水等级 + 4个风力等级 | ~25条记录 |
| `riding_physics.yaml` | 日里程矩阵(经验×路面) + 疲劳曲线 + 编队效率 + 黄金规则 | ~35条记录 |

### 路线基线数据

| 路线 | 难度 | 里程 | V1 覆盖 |
|------|------|------|---------|
| G318 川藏线 (成都→拉萨) | intermediate | 2140km | ✅ |
| 独库公路 (独山子→库车) | intermediate | 561km | ✅ |
| 丙察察 (丙中洛→察隅) | **advanced** | 280km | ✅ |
| 阿里大环线 | **advanced** | 3800km | ✅ |
| 甘南-川西小环线 | easy | 1500km | ✅ |
| 云南大环线 | easy | 1800km | ✅ |
| 东北边境环线 | easy | 1200km | ✅ |

> 路线基线只记录物理事实（里程/海拔/路面类型/risk_months），不记录季节经验。季节经验由 agent-reach 实时搜索提供。

---

## 搜索策略

Agent 强制并行调用 **3 个信源**（Tavily + 小红书 + B站）做交叉验证：

| 平台 | 后端 | 搜索方式 | 读深度 |
|------|------|---------|--------|
| 小红书 | OpenCLI (需Chrome登录态) | `opencli xiaohongshu search` → `note` → `comments` | 正文+评论 |
| B站 | OpenCLI (免登录) | `opencli bilibili search` → `video` → `comments` | 标题+简介+评论 |
| 中文长文/新闻 | Tavily (Worker代理) | `node tavily_search.mjs` | 全文+score评分 |

**时效分层：**
- 🟢 近1年：优先采用
- 🟡 1-3年：参考，标注"可能已变化"
- 🔴 3年前：仅作历史参考

---

## 输出示例

```
📊 川藏线（G318）· 9月 骑行分析

可信度：🟢 充分数据 (小红书12篇 + B站8个视频 + Tavily 5篇)

1. 🟡 天气与气候预期
   9月雨季尾声，早晚温差大（成都25°C → 东达山0°C）...

2. 🟢 路况风险
   全线铺装，72拐段施工有碎石需小心...

3. 🟢 车型-轮胎-路面适配
   GSX250原厂公路胎，318全线铺装→可用...

4. 🟡 生理挑战
   理塘4000m过夜需注意高反，日里程舒适...

5. 🟢 装备建议
   必带：雨衣/保暖层/补胎工具...

6. ⚖️ 综合判断
   ✅ 可以走。如果追求舒适，甘南川西更适合仿赛。
```

---

## 故障排查

| 症状 | 检查 |
|------|------|
| 小红书搜不到 | `opencli doctor` → Extension 是否 connected？Chrome 是否登录了 xiaohongshu.com？ |
| 小红书报 AUTH_REQUIRED | 用户**手动**在 Chrome 搜索框输入并提交（URL 参数无效） |
| B站搜不到 | `opencli bilibili search "<query>" --limit 5` 即可 |
| OpenCLI 报 BROWSER_CONNECT | Chrome 扩展未连接 → `opencli daemon restart` |
| 隔离 Chrome 启动后被清理 | 用 `wmic process call create` 而不是 `Start-Process` |
| Cookies 找不到 | 检查 `Default\Network\Cookies`（Chrome 149.x 改了位置） |
| Tavily 报 fetch failed | 检查 V2RayN 代理是否在 10808 端口 |
| Tavily 报 AUTH_REQUIRED | 检查 `x-api-key` header 是否正确传递 |
| 某路线搜不到结果 | 正常——Agent 会诚实告知并降级为知识库推断 |

---

## 变更日志

### v1.1.1 (2026-06-26)
- **强制多信源协作**：每次摩旅查询自动调用 Tavily + 小红书 + B站 三源并行
- **新增 `tools/tavily_search.mjs`**：Tavily MCP Node 调用封装（带 V2RayN 代理）
- **README 扩充**：完整的 OpenCLI 使用方法 + 8 条易出问题点 + Tavily 配置详解
- **SKILL.md 强化**：明确"3 信源协作原则"和"数据不足降级"规则
- 修复启动 Chrome 的方式（用 `wmic process call create` 避免 PowerShell 清理）

### v1.1.0 (2026-06-26)
- 集成 Tavily 中文长文搜索（Cloudflare Workers 代理，多 Key 管理）
- SKILL.md 新增 Tavily 搜索策略章节
- 更新 README 搜索策略表
- 修复 README 编码乱码

### v0.1.0 (2026-06-25)
- 初始版本
- 4 个通用知识域（轮胎/海拔/生理/骑行物理）
- 7 条国内核心摩旅路线基线
- agent-reach + OpenCLI 跨平台搜索