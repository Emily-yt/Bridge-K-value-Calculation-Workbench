# 桥梁 K 值计算工作台

面向朔黄铁路等场景的桥梁**检定承载系数（K 值）**计算与记录管理：React 前端 + Node.js REST API，数据以 JSON 文件持久化。

## 功能概览

- **桥梁档案管理**：浏览多孔跨桥梁信息，包括 `beamType`、梁长、建成年度等
- **K 值计算**：按选定孔跨发起计算，支持弯矩、偏载系数、K1～K4 分项与最小值计算
- **计算历史**：查看、对比历史计算记录，支持报告生成与预览
- **预警提醒**：即将到期检定桥梁提醒，K 值偏低预警
- **系统设置**：定期巡检天数、提前提醒天数、最低正常 K 值配置
- **用户权限**：计算员与管理员角色区分

详细业务与公式说明见仓库内 **`docs/`** 目录（《后端设计说明》《K 值计算逻辑说明》等）。

## 技术栈

| 层级 | 说明 |
|------|------|
| 前端 | React 18、TypeScript、Vite 5、Tailwind CSS |
| 后端 | Node.js、Express 5，REST API |
| 存储 | `data/` 下 JSON 文件（桥梁、固定参数、计算记录） |

## 环境要求

- **Node.js** 18+（推荐当前 LTS）
- **npm** 或 **yarn** 包管理器

## 安装

```bash
npm install
```

## 本地开发

前端开发服务器默认 **`http://localhost:5173`**，API 默认 **`http://localhost:3000`**。Vite 已将 **`/api`** 代理到后端，因此只需同时启动前后端即可联调。

**推荐（一条命令）：**

```bash
npm run dev:full
```

等价于并行执行：

```bash
npm run server   # 终端 1：API
npm run dev      # 终端 2：Vite
```

首次仅有前端而没有后端时，列表与计算接口会失败，请先启动 **`npm run server`**。

## 生产构建与运行

```bash
npm run build
npm start
```

`npm start` 会启动 Express：既提供 **`/api/*`**，又从 **`dist/`** 提供打包后的静态前端（需先执行 **`npm run build`**）。

可通过环境变量 **`PORT`** 修改端口（默认 `3000`）。

## 数据目录（`data/`）

| 文件 | 说明 |
|------|------|
| `bridges.json` | 桥梁基础信息与各孔 `spans[]`（含 `beamType`、`beamLength` 等） |
| `fixed_params.json` | 按梁型图号配置的恒载内力、偏载表、材料与截面等 |
| `k_calculations.json` | K 值计算记录（`version` + `calculations` 数组） |

新增梁型时，需在 **`fixed_params.json`** 的 `spanTypes` 中补充完整参数；当前示例中 **「专桥2059」** 配置最全，其它梁型未配置时接口会返回明确错误提示。

## 页面功能说明

### 1. 首页（Dashboard）
- 统计卡片：桥梁总数、待计算桥梁、K 值偏低桥梁、本月到期桥梁
- 最近计算记录列表
- 即将到期检定桥梁列表

### 2. 桥梁列表（BridgeList）
- 桥梁档案浏览与搜索
- 按桥梁发起 K 值计算
- 查看桥梁详情与计算历史

### 3. K 值计算抽屉（CalculationDrawer）
- 选择计算孔跨
- 配置计算参数：梁体类型、线梁偏心、道砟超厚、冲击系数
- 损伤修正系数设置
- 实时计算并显示 K1~K4 及最终 K 值
- 保存结果并生成报告

### 4. 计算结果弹窗（CalculationResultModal）
- 展示详细计算结果
- 历史对比功能
- 查看报告入口

### 5. 报告预览（ReportPreviewModal）
- 完整的检定承载系数计算报告
- 支持编辑、保存、下载 PDF
- 包含桥梁概况、检算依据、计算参数、计算结果、结论与建议

### 6. 系统设置（Settings）
- 定期巡检天数配置
- 提前提醒天数配置
- 最低正常 K 值阈值设置
- 用户权限管理

## API 摘要

基础路径：`/api`（开发时经 Vite 代理；生产同源）。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/bridges` | 桥梁列表 |
| GET | `/api/bridges/:id` | 桥梁详情 |
| GET | `/api/bridges/:id/calculations` | 某桥计算历史 |
| GET | `/api/calculations` | 全部计算记录 |
| GET | `/api/calculations/:id` | 单条计算详情 |
| POST | `/api/calculations` | 执行计算并写入记录（body：`bridgeId`、`spanIndex`、`input` 等） |
| PUT | `/api/calculations/:id/review` | 审核 |
| DELETE | `/api/calculations/:id` | 删除记录 |
| GET | `/api/fixed-params/:beamType` | 获取指定梁型固定参数 |

响应格式：`{ code: 0, message: "success", data: ... }`；错误时 `code` 非 0 并附 `message`。

## K 值计算逻辑

### 计算流程

1. **确定梁型**：根据孔跨式样匹配固定参数（内力、强度等）
2. **用户输入参数**：道砟厚度 t、偏心值 e、冲击系数 1+μ、曲线半径 R
3. **查表获取偏载系数**：根据 e、R、梁体类型查表得到 η
4. **计算主力组合弯矩**：M = M_q0 + M_q1 + M_q2 + (t/10)×M_q3 + (1+μ)×η×M_L
5. **计算分项检定承载系数**：
   - K1: 正截面抗弯强度
   - K2: 正截面抗裂性
   - K3: 正截面应力
   - K4: 斜截面抗剪
6. **取最小值**：K = min{K1, K2, K3, K4}

### K 值判定标准

| K 值范围 | 判定结果 | 建议措施 |
|---------|---------|---------|
| K ≥ 2.0 | 设计安全储备满足规范要求 | 承载能力充裕 |
| 1.5 ≤ K < 2.0 | 满足运营要求 | 加强日常监测 |
| 1.0 ≤ K < 1.5 | 承载能力偏低 | 限制通行荷载，尽快安排加固 |
| K < 1.0 | 不满足运营要求 | 立即限制通行，安排专项检测 |

## 常用脚本

| 命令 | 作用 |
|------|------|
| `npm run dev` | 仅前端（Vite） |
| `npm run server` | 仅后端 API |
| `npm run dev:full` | 前端 + 后端并行 |
| `npm run build` | 前端生产构建 |
| `npm run start` | 启动生产服务（API + 静态资源） |
| `npm run preview` | 预览构建结果（不含后端，API 需自行处理） |
| `npm run typecheck` | TypeScript 检查 |
| `npm run lint` | ESLint |

## 仓库结构

```
├── data/                 # 运行时数据（JSON）
│   ├── bridges.json      # 桥梁基础信息
│   ├── fixed_params.json # 梁型固定参数
│   └── k_calculations.json # K值计算记录
├── server/
│   ├── index.mjs         # Express 入口与路由
│   └── kValueEngine.mjs  # K 值计算核心
├── docs/                 # 设计与算法说明文档
│   ├── K值计算逻辑.md
│   ├── 后端设计.md
│   ├── 页面布局设计.md
│   └── ...
├── public/               # 静态资源
└── src/                  # React 前端源码
    ├── components/       # 组件
    │   ├── ReportPreviewModal.tsx
    │   ├── CalculationResultModal.tsx
    │   ├── CalculationDrawer.tsx
    │   └── ...
    ├── pages/            # 页面
    │   ├── Dashboard.tsx
    │   ├── BridgeList.tsx
    │   └── Settings.tsx
    ├── lib/              # 工具库
    │   ├── types.ts      # TypeScript 类型定义
    │   └── db.ts         # 数据操作
    └── App.tsx           # 应用入口
```

## 开发注意事项

1. **新增梁型**：需在 `fixed_params.json` 中补充完整的梁型参数，包括恒载内力、偏载系数表、材料参数等
2. **数据备份**：`data/` 目录下的 JSON 文件为运行时数据，建议定期备份
3. **计算精度**：K 值计算保留 4 位小数，报告展示保留 2 位小数
4. **浏览器兼容**：推荐使用 Chrome、Edge、Firefox 等现代浏览器

## 许可证

私有项目；如需开源请自行补充 LICENSE。

## 联系方式

如有问题或建议，请联系项目维护者。
