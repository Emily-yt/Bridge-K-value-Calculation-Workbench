# 桥梁 K 值计算工作台

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Private-ff69b4)]()

**版本**: v1.0.0  
**更新日期**: 2026-05-28  
**适用范围**: 朔黄铁路桥梁检定承载系数计算与管理

面向朔黄铁路等场景的桥梁**检定承载系数（K 值）**计算与记录管理：React 前端 + Node.js REST API，数据以 JSON 文件持久化。

---

## 功能概览

- **首页仪表盘**：统计卡片（桥梁总数、待计算桥梁、K 值偏低桥梁、本月到期桥梁）、最近计算记录列表、即将到期检定桥梁列表、K 值分布饼图、计算趋势折线图
- **K 值计算**：按选定孔跨发起计算，支持弯矩、偏载系数、K1～K5 分项与最小值计算，支持损伤修正系数
- **计算历史**：查看、对比历史计算记录，支持报告生成与预览
- **统计分析**：K 值分布统计、桥梁状态分析、时间趋势分析、梁型分布统计、线路分布统计、损伤因子统计、详细数据表格
- **预警提醒**：即将到期检定桥梁提醒，K 值偏低预警

详细业务与公式说明见仓库内 **`docs/`** 目录（《后端设计说明》《K 值计算逻辑说明》《页面布局设计》等）。

---

## 技术栈

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React | 18.3+ | 组件化 UI 开发 |
| 开发语言 | TypeScript | 5.5+ | 类型安全 |
| 构建工具 | Vite | 5.4+ | 快速开发与构建 |
| 样式框架 | Tailwind CSS | 3.4+ | 原子化 CSS |
| 图表库 | Recharts | 2.12+ | 数据可视化 |
| 图标库 | Lucide React | 0.344+ | 现代图标系统 |
| 后端框架 | Express | 5.2+ | REST API 服务 |
| 数据存储 | JSON 文件 | - | 本地文件持久化 |
| 开发工具 | concurrently | 9.1+ | 并行运行脚本 |

---

## 环境要求

- **Node.js** 18+（推荐当前 LTS 版本）
- **npm** 9+ 或 **yarn** 1.22+ 包管理器
- 支持现代浏览器（Chrome 90+、Edge 90+、Firefox 88+、Safari 14+）

---

## 快速开始

### 1. 克隆与安装

```bash
# 进入项目目录
cd Bridge-K-value-Calculation-Workbench

# 安装依赖
npm install
```

### 2. 启动开发环境

**推荐方式（一条命令启动前后端）：**

```bash
npm run dev:full
```

访问地址：
- 前端界面：`http://localhost:5173`
- 后端 API：`http://localhost:3000`

**分别启动（调试时使用）：**

```bash
# 终端 1：启动后端 API
npm run server

# 终端 2：启动前端开发服务器
npm run dev
```

### 3. 生产部署

```bash
# 构建前端
npm run build

# 启动生产服务（包含 API 和静态资源）
npm start
```

生产服务默认运行在 `http://localhost:3000`，可通过环境变量 `PORT` 修改端口。

---

## 项目结构

```
Bridge-K-value-Calculation-Workbench/
├── data/                          # 运行时数据（JSON）
│   ├── bridges.json              # 桥梁基础信息
│   ├── fixed_params.json         # 梁型固定参数
│   └── k_calculations.json       # K值计算记录
├── server/                        # 后端服务
│   ├── index.mjs                 # Express 入口与路由
│   └── kValueEngine.mjs          # K 值计算核心引擎
├── docs/                          # 设计与算法说明文档
│   ├── K值计算逻辑.md
│   ├── 后端设计.md
│   ├── 页面布局设计.md
│   └── ...
├── public/                        # 静态资源
│   └── icons/
│       └── bridge.svg
├── src/                           # React 前端源码
│   ├── components/               # 可复用组件
│   │   ├── Sidebar.tsx          # 侧边栏导航
│   │   ├── MobileNav.tsx        # 移动端底部导航
│   │   ├── Header.tsx           # 顶部栏
│   │   ├── BridgeCard.tsx       # 桥梁卡片
│   │   ├── BridgeDetailModal.tsx    # 桥梁详情弹窗
│   │   ├── CalculationDrawer.tsx    # K值计算抽屉
│   │   ├── CalculationResultModal.tsx   # 计算结果弹窗
│   │   ├── ReportPreviewModal.tsx       # 报告预览弹窗
│   │   └── QValueTooltip.tsx            # Q值提示组件
│   ├── pages/                    # 页面组件
│   │   ├── Dashboard.tsx        # 首页仪表盘
│   │   ├── KValueCalculation.tsx    # K值计算页面
│   │   └── Statistics.tsx       # 统计分析页面
│   ├── lib/                      # 工具库
│   │   ├── types.ts             # TypeScript 类型定义
│   │   └── db.ts                # 数据操作（API 封装）
│   ├── static/                   # 静态资源
│   │   └── logo.png
│   ├── App.tsx                   # 应用入口
│   ├── main.tsx                  # React 挂载点
│   └── index.css                 # 全局样式
├── .gitignore
├── README.md
├── eslint.config.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vercel.json
```

---

## 页面功能说明

### 1. 首页（Dashboard）

- **统计卡片**：桥梁总数、待计算桥梁、K 值偏低桥梁、本月到期桥梁（点击可查看详情弹窗）
- **最近计算记录列表**：展示最新计算记录，支持查看详情和报告
- **即将到期检定桥梁列表**：按到期时间排序的预警列表
- **K 值分布饼图**：按桥梁维度展示 K 值等级分布（优秀/良好/预警/危险）
- **计算趋势折线图**：展示月度计算次数趋势
- **时间范围筛选**：支持全部/近30天/近90天/近一年的数据筛选

### 2. K 值计算（KValueCalculation）

- **桥梁卡片列表**：展示所有桥梁信息，支持搜索筛选
- **快捷计算入口**：每座桥梁显示各孔跨计算状态，未计算的孔跨可一键发起计算
- **桥梁详情弹窗**：查看桥梁完整信息和历史计算记录
- **计算抽屉（CalculationDrawer）**：
  - 选择计算孔跨
  - 配置计算参数：梁体位置（直线/曲线）、曲线半径、线梁偏心、道砟厚度、冲击系数
  - 损伤修正系数设置（截面折减、刚度折减等）
  - 实时计算并显示 K1~K5 及最终 K 值
  - 保存结果并生成报告

### 3. 计算结果弹窗（CalculationResultModal）

- 展示详细计算结果（K1/K2/K3/K4/K5 分项值）
- 历史对比功能（与该孔跨历史计算记录对比）
- 查看报告入口

### 4. 报告预览（ReportPreviewModal）

- 完整的检定承载系数计算报告
- 支持编辑备注、审核人信息
- 保存报告内容
- 包含桥梁概况、检算依据、计算参数、计算结果、结论与建议

### 5. 统计分析（Statistics）

- **关键指标卡片**：总计算次数、平均 K 值、预警桥梁数、计算覆盖率
- **K 值分布分析**：按优秀(≥2.0)、满足运营(1.5-2.0)、承载偏低(1.0-1.5)、不满足运营(<1.0)分级统计
- **线路分布统计**：各线路桥梁数量占比饼图
- **梁型分布统计**：各梁型计算次数统计
- **损伤因子统计**：各类损伤修正系数应用情况
- **时间趋势分析**：月度计算次数趋势折线图
- **详细数据表格**：每座桥梁的计算统计（次数、平均/最小/最大 K 值）
- **数据导出**：支持导出统计结果为 JSON 格式
- **时间范围筛选**：支持全部/近30天/近90天/近一年的数据筛选

---

## 数据存储

### 数据目录（`data/`）

| 文件 | 说明 | 结构 |
|------|------|------|
| `bridges.json` | 桥梁基础信息与各孔 `spans[]`（含 `beamType`、`beamLength` 等） | 数组或 `{list: []}` |
| `fixed_params.json` | 按梁型图号配置的恒载内力、偏载表、材料与截面等 | `{version, spanTypes: {}}` |
| `k_calculations.json` | K 值计算记录（`version` + `calculations` 数组） | `{version, calculations: []}` |

### 新增梁型配置

新增梁型时，需在 **`fixed_params.json`** 的 `spanTypes` 中补充完整参数：

```json
{
  "version": "1.0",
  "spanTypes": {
    "专桥2059": {
      "name": "专桥2059",
      "description": "32m预应力钢筋混凝土梁",
      "moment": { /* 弯矩参数 */ },
      "stress": { /* 应力参数 */ },
      "shear": { /* 剪力参数 */ },
      "eccentricity": { /* 偏载系数表 */ }
    }
  }
}
```

当前示例中 **「专桥2059」** 配置最全，其它梁型未配置时接口会返回明确错误提示。

---

## API 接口文档

### 基础信息

- **基础路径**: `/api`
- **开发代理**: Vite 已将 `/api` 代理到后端 `http://localhost:3000`
- **响应格式**: `{ code: 0, message: "success", data: ... }`
- **错误响应**: `code` 非 0，附 `message` 说明

### 桥梁管理

| 方法 | 路径 | 说明 | 响应 |
|------|------|------|------|
| GET | `/api/bridges` | 获取桥梁列表 | `Bridge[]` |
| GET | `/api/bridges/:id` | 获取桥梁详情 | `Bridge` |
| GET | `/api/bridges/:id/calculations` | 获取某桥计算历史 | `KValueCalculation[]` |

### 计算记录管理

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|-------------|
| GET | `/api/calculations` | 获取全部计算记录 | - |
| GET | `/api/calculations/:id` | 获取单条计算详情（含桥梁信息） | - |
| POST | `/api/kvalue-calculate` | 仅计算 K 值，不保存 | `{bridgeId, spanIndex, input}` |
| POST | `/api/kvalue-save` | 保存计算记录 | `{bridgeId, spanIndex, input, output, intermediate}` |
| DELETE | `/api/calculations/:id` | 删除计算记录 | - |
| PUT | `/api/calculations/:id/report` | 保存报告内容 | `{htmlContent, notes, reviewer}` |

### 计算请求示例

```bash
# 计算 K 值（不保存）
curl -X POST http://localhost:3000/api/kvalue-calculate \
  -H "Content-Type: application/json" \
  -d '{
    "bridgeId": "BRG001",
    "spanIndex": 1,
    "input": {
      "beamPosition": "直线",
      "curveRadius": null,
      "eccentricityE": 0,
      "ballastThicknessT": 0,
      "impactFactor": 1.1935,
      "damageFactors": {
        "z1m": 1, "z1q": 1, "z2m": 1,
        "z2q": 1, "z3h": 1, "z3y": 1, "z4y": 1
      }
    }
  }'
```

---

## K 值计算逻辑

### 计算流程

```
┌─────────────────────────────────────────────────────────────┐
│                      K值计算流程                             │
├─────────────────────────────────────────────────────────────┤
│  步骤1: 确定梁型 → 根据孔跨式样匹配固定参数                    │
│  步骤2: 用户输入 → 道砟厚度t、偏心值e、冲击系数1+μ、曲线半径R   │
│  步骤3: 查表获取 → 根据e、R、梁体类型查表得到ηM、ηQ            │
│  步骤4: 主力组合 → M = Mq0+Mq1+Mq2+t/10·Mq3+(1+μ)·ηM·ML      │
│  步骤5: 分项计算 → K1~K5 五项检定承载系数                      │
│  步骤6: 最终K值 → K = min{K1, K2, K3, K4, K5}                │
└─────────────────────────────────────────────────────────────┘
```

### 主力组合公式

**跨中截面弯矩：**
$$M = M_{q0} + M_{q1} + M_{q2} + \frac{t}{10} \times M_{q3} + (1+\mu) \times \eta_M \times M_L$$

**跨中截面下缘正应力：**
$$\sigma = \sigma_{q0} + \sigma_{q1} + \sigma_{q2} + \frac{t}{10} \times \sigma_{q3} + (1+\mu) \times \eta_M \times \sigma_L$$

**L/8截面剪应力：**
$$\tau = \tau_{q0} + \tau_{q1} + \tau_{q2} + \frac{t}{10} \times \tau_{q3} + (1+\mu) \times \eta_M \times \tau_L$$

### 检算项目说明

| 编号 | 检算项目 | 检算截面 | 控制指标 |
|------|----------|----------|----------|
| K1 | 正截面抗弯强度 | 跨中截面 | 弯矩 M |
| K2 | 正截面抗裂性 | 跨中截面 | 下缘正应力 σ |
| K3 | 正截面应力 | 跨中截面 | 下缘正应力 σ |
| K4 | 斜截面剪应力 | L/8截面 | 剪应力 τ |
| K5 | 斜截面抗裂性 | L/8截面 | 主拉应力 σtp |

### K 值判定标准（含 Q 值）

系统采用四级判定逻辑，综合考虑 K 值和 Q 值（运营列车荷载系数）：

| 等级 | 判定条件 | 说明 | 颜色 |
|------|----------|------|------|
| 安全 | K ≥ 1.0 | K 值满足中-活载要求 | 🟢 绿色 |
| 安全 | K < 1.0 且 Q_C80 < K 且 Q_KM98 < K | 满足 C80 和 KM98 运营列车要求 | 🟢 绿色 |
| 部分满足 | K < 1.0 且 (Q_C80 ≥ K 或 Q_KM98 ≥ K) 但不同时满足 | 仅满足一种运营列车要求 | 🟡 橙色 |
| 危险 | K < 1.0 且 Q_C80 ≥ K 且 Q_KM98 ≥ K | 不满足中-活载，也不满足任何运营列车 | 🔴 红色 |

**Q 值计算：**
- Q_C80 = max(M_L_C80/M_L_中活载, V_L_C80/V_L_中活载)
- Q_KM98 = max(M_L_KM98/M_L_中活载, V_L_KM98/V_L_中活载)

### K 值等级分布

| K 值范围 | 等级 | 颜色 | 建议措施 |
|----------|------|------|----------|
| K ≥ 2.0 | 优秀 | 🟢 绿色 | 承载能力充裕 |
| 1.5 ≤ K < 2.0 | 良好 | 🔵 蓝色 | 加强日常监测 |
| 1.0 ≤ K < 1.5 | 预警 | 🟡 黄色 | 限制通行荷载，尽快安排加固 |
| K < 1.0 | 危险 | 🔴 红色 | 立即限制通行，安排专项检测 |

---

## 常用脚本

| 命令 | 作用 | 环境 |
|------|------|------|
| `npm run dev` | 启动前端开发服务器（Vite） | 开发 |
| `npm run server` | 启动后端 API 服务 | 开发/生产 |
| `npm run dev:full` | 并行启动前端 + 后端 | 开发 |
| `npm run build` | 前端生产构建 | 生产 |
| `npm run start` | 启动生产服务（API + 静态资源） | 生产 |
| `npm run preview` | 预览构建结果（不含后端） | 测试 |
| `npm run typecheck` | TypeScript 类型检查 | 开发 |
| `npm run lint` | ESLint 代码检查 | 开发 |

---

## 开发注意事项

1. **新增梁型**：需在 `fixed_params.json` 中补充完整的梁型参数，包括恒载内力、偏载系数表、材料参数等
2. **数据备份**：`data/` 目录下的 JSON 文件为运行时数据，建议定期备份
3. **计算精度**：K 值计算保留 4 位小数，报告展示保留 2 位小数
4. **浏览器兼容**：推荐使用 Chrome、Edge、Firefox 等现代浏览器
5. **响应式设计**：系统支持桌面端和移动端自适应，移动端使用底部导航栏
6. **时区处理**：系统使用北京时间（UTC+8）进行时间记录

---

## 导航菜单说明

| 菜单项 | 图标 | 功能说明 | 路径 |
|--------|------|----------|------|
| 首页 | 🏠 | 统计概览、快捷入口、待办提醒 | `/` |
| K值计算 | 🧮 | 桥梁列表、详情、计算（核心功能） | `/kvalue-calculation` |
| 统计分析 | 📊 | K值分布、趋势图表、预警列表 | `/statistics` |

---

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `PORT` | `3000` | 后端服务端口 |

---

## 部署指南

### 本地部署

```bash
# 1. 安装依赖
npm install

# 2. 构建前端
npm run build

# 3. 启动服务
npm start
```

### Vercel 部署

项目已配置 `vercel.json`，支持一键部署到 Vercel：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### Docker 部署（可选）

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [docs/K值计算逻辑.md](docs/K值计算逻辑.md) | K值计算详细算法说明 |
| [docs/后端设计.md](docs/后端设计.md) | 后端架构与数据设计 |
| [docs/页面布局设计.md](docs/页面布局设计.md) | UI布局与交互设计 |
| [docs/K值计算交互设计文档.md](docs/K值计算交互设计文档.md) | 交互流程说明 |
| [docs/桥梁K值统计页面设计方案.md](docs/桥梁K值统计页面设计方案.md) | 统计页面设计 |
| [docs/桥梁列表卡片设计说明.md](docs/桥梁列表卡片设计说明.md) | 桥梁卡片组件设计 |
| [docs/设置页功能设计.md](docs/设置页功能设计.md) | 设置功能设计 |
| [docs/用户数据表设计.md](docs/用户数据表设计.md) | 数据结构定义 |

---

## 更新日志

### v1.0.0 (2026-05-28)

- ✨ 初始版本发布
- 🚀 实现 K1~K5 五项检定承载系数计算
- 📊 新增统计分析页面
- 📱 支持移动端响应式布局
- 📄 新增报告生成与预览功能
- ⚠️ 新增预警提醒功能

---

## 许可证

私有项目；如需开源请自行补充 LICENSE。

---

## 联系方式

如有问题或建议，请联系项目维护者。

---

<p align="center">Made with ❤️ for 朔黄铁路桥梁运维</p>
