# Biotech Demo V3 · Integrated Intelligence

V3 基于 `v2/index.html` 独立创建，不修改线上 V2。报告中的外部基准、结论链和条件情景已直接融入“交易情报”，不再拆成独立研究页面。

## 页面入口

- `./` 或 `./?view=live`：交易情报（默认；报告洞察、交易结构与实时研发信号一体呈现）
- `./?view=landscape`：78 笔项目具名样本的自建管线分析
- `./?view=library`：来源资料库（集中收录交易公告、监管材料与外部研究报告链接）
- `./report/global-biopharma-bd-report-2021-2026h1.html`：修订版完整研究报告

## 交易情报的证据结构

1. 市场基准：用政府和机构报告定位市场周期，交易情报只展示报告名称，原文链接统一进入来源资料库。
2. 研究结论：把宏观数据收束成资产筛选、条款比较和买方能力判断。
3. 交易证据：用具名交易、代表性汇编与公共 API 信号检验结论。
4. 条件情景：用触发条件、领先指标和失效信号跟踪后续变化。

## 内部研究数据资产

页面与报告不提供数据下载入口；以下文件只作为内部数据源和一致性校验资产：

- `data/research_benchmarks.csv`：外部基准、口径、来源链接、可信度和限制
- `data/research_findings.csv`：结论、内部依据与边界、面向读者的交易启示
- `data/research_scenarios.csv`：条件情景、领先指标与失效条件
- `research-data.js`：交易情报直接使用的浏览器数据镜像

## 本地校验

```bash
node v3/validate.js
python3 -m http.server 8765
```

然后打开 `http://127.0.0.1:8765/v3/`。
