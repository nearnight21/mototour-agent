# 摩旅季节经验推理 Agent

> 输入路线 + 月份 + 车型，综合**通用知识库 + 全网真实经验**，输出分维度的骑行可行性分析。

---

## 快速开始

在 Codex 中直接说：

`
我想9月中旬骑GSX250走川藏线，适合吗？
`

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

Agent 的核心搜索能力依赖以下基础设施。

### 前置条件

| 组件 | 用途 | 必需 |
|------|------|------|
| Python 3.10+ | agent-reach 运行环境 | ✅ |
| Node.js | OpenCLI 运行环境 | ✅ |
| Chrome 浏览器 | OpenCLI 浏览器桥接 | ✅ (小红书/B站) |

### 第一步：安装 agent-reach

`ash
pip install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto
`

验证：
`ash
agent-reach doctor --json   # 应显示 6+ channels active
`

### 第二步：安装 OpenCLI（小红书 + B站）

`ash
npm install -g @jackwener/opencli
`

验证守护进程运行：
`ash
opencli doctor
# 应显示 [OK] Daemon: running
`

### 第三步：安装 Chrome 扩展

1. 下载扩展：[OpenCLI Releases](https://github.com/jackwener/OpenCLI/releases) → 找到 opencli-extension-v*.zip
2. 解压到固定目录（例如 ~/.agent-reach/tools/opencli-extension/）
3. 打开 Chrome → chrome://extensions/ → 开启「开发者模式」
4. 点击「加载已解压的扩展程序」→ 选择解压后的文件夹
5. 在 Chrome 中登录 [xiaohongshu.com](https://www.xiaohongshu.com)（扫码即可）

验证：
`ash
opencli doctor
# 应显示 [OK] Extension: connected
`

### 第四步：安装本插件

将 mototour-agent 放入 Codex skills 目录即可。插件会自动注册到 Codex。

---

## 知识库结构

`
mototour-agent/skills/mototour-agent/
├── SKILL.md                      # Agent 主指令（搜索策略+推理规则+输出模板）
├── knowledge/
│   ├── tires.yaml                # 轮胎类型 × 路面兼容性
│   ├── altitude.yaml             # 海拔效应（人+车的反应）
│   ├── physiology.yaml           # 温度/降水/风力 × 生理风险
│   └── riding_physics.yaml       # 日里程/疲劳累积/编队效率
└── routes/
    └── china_major.yaml           # 7条国内核心摩旅路线基线数据
`

### 四条通用知识域

| 文件 | 内容 | 记录数 |
|------|------|--------|
| 	ires.yaml | 公路胎/两用胎/越野胎的适用路面、湿地性能、寿命 | 3种类型 + 通用规则 |
| ltitude.yaml | 5个海拔带的高反风险 + 电喷/化油器动力损失 + 温降规律 | ~30条记录 |
| physiology.yaml | 6个温度区间 + 4个降水等级 + 4个风力等级 | ~25条记录 |
| iding_physics.yaml | 日里程矩阵(经验×路面) + 疲劳曲线 + 编队效率 + 黄金规则 | ~35条记录 |

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

Agent 使用 agent-reach + OpenCLI 跨三个平台并行搜索：

| 平台 | 后端 | 搜索方式 | 读深度 |
|------|------|---------|--------|
| 小红书 | OpenCLI (需Chrome登录态) | opencli xiaohongshu search → 
ote → comments | 正文+评论 |
| B站 | OpenCLI + Exa 双通道 | opencli bilibili search + xa site:bilibili.com | 标题+简介+数据 |
| 网页/论坛 | Exa (mcporter) | mcporter call exa.web_search_exa | 全文摘要 |

**时效分层：**
- 🟢 近1年：优先采用
- 🟡 1-3年：参考，标注"可能已变化"
- 🔴 3年前：仅作历史参考

---

## 输出示例

`
📊 川藏线（G318）· 9月 骑行分析

可信度：🟢 充分数据 (小红书12篇 + B站8个视频 + 攻略站3篇)

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
`

---

## 故障排查

| 症状 | 检查 |
|------|------|
| 小红书搜不到 | opencli doctor → Extension 是否 connected？Chrome 是否登录了 xiaohongshu.com？ |
| B站搜不到 | 试试 Exa 双通道：mcporter call 'exa.web_search_exa(query: "site:bilibili.com ...")' |
| OpenCLI 报 BROWSER_CONNECT | Chrome 扩展未连接 → 重新加载扩展或 opencli daemon restart |
| mcporter 报 Unknown MCP server | 运行 gent-reach install --env=auto 注册后端 |
| 某路线搜不到结果 | 正常——Agent 会诚实告知并降级为知识库推断 |