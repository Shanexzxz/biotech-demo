const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }

  const headers = rows.shift();
  return rows
    .filter(values => values.some(value => value !== ''))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

const files = {
  html: path.join(ROOT, 'index.html'),
  css: path.join(ROOT, 'research.css'),
  data: path.join(ROOT, 'research-data.js'),
  report: path.join(ROOT, 'report', 'global-biopharma-bd-report-2021-2026h1.html'),
  benchmarks: path.join(ROOT, 'data', 'research_benchmarks.csv'),
  findings: path.join(ROOT, 'data', 'research_findings.csv'),
  scenarios: path.join(ROOT, 'data', 'research_scenarios.csv'),
};

Object.entries(files).forEach(([label, file]) => assert(fs.existsSync(file), `${label} is missing: ${file}`));

const html = fs.readFileSync(files.html, 'utf8');
const css = fs.readFileSync(files.css, 'utf8');
const report = fs.readFileSync(files.report, 'utf8');
const benchmarks = parseCsv(fs.readFileSync(files.benchmarks, 'utf8'));
const findings = parseCsv(fs.readFileSync(files.findings, 'utf8'));
const scenarios = parseCsv(fs.readFileSync(files.scenarios, 'utf8'));

assert(benchmarks.length === 13, `expected 13 research benchmarks, got ${benchmarks.length}`);
assert(findings.length === 4, `expected 4 research findings, got ${findings.length}`);
assert(scenarios.length === 3, `expected 3 research scenarios, got ${scenarios.length}`);
assert(benchmarks.every(row => /^https:\/\//.test(row.source_url)), 'every benchmark must have an HTTPS source URL');
assert(benchmarks.some(row => row.source_tier === 'T0_GOVERNMENT'), 'government benchmark is missing');
assert(benchmarks.some(row => row.source_tier === 'T1_ATTRIBUTED'), 'attributed benchmark boundary is missing');

const benchmarkIds = new Set(benchmarks.map(row => row.benchmark_id));
findings.forEach(row => {
  row.evidence_ids.split('|').forEach(id => assert(benchmarkIds.has(id), `${row.finding_id} references missing ${id}`));
});
assert(scenarios.every(row => row.probability_status === 'CONDITIONAL_NOT_PROBABILISTIC'), 'scenarios must remain non-probabilistic');

const context = { globalThis: {} };
vm.runInNewContext(fs.readFileSync(files.data, 'utf8'), context, { filename: 'research-data.js' });
const mirrored = context.globalThis.V3_RESEARCH_DATA;
assert(mirrored, 'research-data.js did not expose V3_RESEARCH_DATA');
assert(mirrored.benchmarks.length === benchmarks.length, 'browser benchmark mirror is out of sync');
assert(mirrored.findings.length === findings.length, 'browser finding mirror is out of sync');
assert(mirrored.scenarios.length === scenarios.length, 'browser scenario mirror is out of sync');
const normalizeSentence = value => String(value || '').replace(/[。；;]+$/, '');
findings.forEach((row, index) => assert(normalizeSentence(mirrored.findings[index].action) === normalizeSentence(row.decision_use), `${row.finding_id} decision use is out of sync`));

[
  'data-view="live"',
  "view: 'live'",
  'function renderIntelligenceLead()',
  'function renderIntelligenceOutlook()',
  './research-data.js',
  './research.css',
  'DEAL EVIDENCE · 逐笔交易下钻',
  '交易情报',
  'r3-structure-board',
  'r3-risk-bar',
  'r3-structure-conclusion',
  'r3-source-handoff',
  'lib-role-research',
  '在来源资料库查看报告链接',
].forEach(token => assert(html.includes(token), `index.html is missing ${token}`));

const intelligenceSourceBlock = html.slice(html.indexOf('function researchPublisherName'), html.indexOf('function renderOverview'));
const intelligenceLeadBlock = html.slice(html.indexOf('function renderIntelligenceLead'), html.indexOf('function renderIntelligenceOutlook'));
assert(!intelligenceSourceBlock.includes('target="_blank"'), 'transaction intelligence research block still links directly to reports');
assert(!intelligenceSourceBlock.includes('打开原始出处'), 'transaction intelligence still exposes an original-source link');
assert(!intelligenceSourceBlock.includes('benchmark.caveat'), 'transaction intelligence still renders methodology caveats on benchmark cards');
assert(!intelligenceSourceBlock.includes('finding.fact'), 'transaction intelligence still renders the internal fact ledger');
assert(!intelligenceSourceBlock.includes('finding.counter'), 'transaction intelligence still renders the internal boundary ledger');
assert(!intelligenceSourceBlock.includes('finding.confidence'), 'transaction intelligence still renders internal confidence labels');
assert(html.includes("role: 'RESEARCH'"), 'research reports are not registered in the source library');
assert(css.includes('@media (max-width: 760px)'), 'mobile research layout is missing');
assert(report.includes('../?view=live'), 'report back link does not target V3 transaction intelligence');
assert(!html.includes('data-view="research"'), 'standalone research navigation is still present');
assert(!html.includes('交易情报实验室'), 'legacy transaction intelligence lab name is still present');
assert(!html.includes('下载'), 'index.html still exposes download copy');
assert(!html.includes('r3-value-bridge'), 'internal risk-adjusted value method is still reader-facing');
assert(!html.includes('r3-scope-bridge'), 'internal evidence-layer bridge is still reader-facing');
assert(!html.includes('r3-metric-card'), 'legacy oversized benchmark cards are still rendered');
assert(!html.includes('r3-reasoning'), 'legacy four-column reasoning ledger is still rendered');
assert(!html.includes('r3-finding-support'), 'internal evidence-and-boundary disclosure is still rendered');
assert(!html.includes('查看依据与边界'), 'internal evidence-and-boundary copy is still reader-facing');
assert(!html.includes('不输出未经校准的概率'), 'internal probability-handling principle is still reader-facing');
assert(!html.includes('不输出单笔成功概率'), 'internal success-probability principle is still reader-facing');
assert(!html.includes('不伪造 rNPV'), 'internal rNPV-handling principle is still reader-facing');
assert(!html.includes('r3-source-register'), 'legacy source register is still rendered in transaction intelligence');
assert(!css.includes('.r3-metric-card'), 'legacy oversized benchmark card styles are still present');
assert(!css.includes('.r3-source-register'), 'legacy source register styles are still present');
assert(!html.includes('披露不足时保留 Unknown'), 'internal unknown-handling principle is still reader-facing');
assert(!html.includes('L3 · 宏观引用层'), 'internal L3 taxonomy is still reader-facing');
assert(!html.includes('13 个外部基准 · 78 笔具名样本'), 'research-process counts remain in the reader-facing status bar');
assert(!html.includes('r3-hero-metrics'), 'duplicate hero metrics are still rendered');
assert(!html.includes('r3-thesis-band'), 'duplicate three-column thesis band is still rendered');
assert(!html.includes('r3-benchmark-list'), 'legacy benchmark card grid is still rendered');
assert(!html.includes('r3-findings-grid'), 'duplicate finding card grid is still rendered');
assert(!html.includes('ci-takeaways'), 'second 60-second conclusion block is still rendered');
assert(!html.includes('四个结论，直接落到资产筛选与条款判断'), 'duplicate finding section title is still reader-facing');
assert(!html.includes('<div class="ci-kpis">'), 'duplicate six-KPI grid is still rendered');
assert(!intelligenceLeadBlock.includes('12.2%'), 'TSR benchmark is still duplicated above the player section');
assert(html.includes('签约首付占 6%，非首付部分占 94%'), 'risk allocation visual is missing its accessible summary');
assert(html.includes('美欧联盟投资额中的中国份额'), 'origin shift visual is missing its denominator label');
assert(html.includes('合伙人判断'), 'partner-level synthesis is missing');
assert(html.includes('./research.css?v=3.2'), 'research stylesheet cache key was not updated');
assert(!css.includes('.r3-benchmark-item'), 'legacy benchmark card styles are still present');
assert(!css.includes('.r3-finding-card'), 'legacy finding card styles are still present');
assert(!html.includes('<span class="ci-flag">研报汇编 · CURATED</span>'), 'curated-report methodology note is still reader-facing');
assert(!html.includes('<strong>覆盖度自评：</strong>'), 'coverage self-assessment is still reader-facing');
assert(html.includes('class="ci-buyer-spend"'), 'buyer spend chart is missing its layout container');
assert(html.includes('class="ci-buyer-spend-track"'), 'buyer spend chart is missing visible bar tracks');
assert(html.includes("var disclosed = r[1] !== null;"), 'buyer spend chart does not preserve undisclosed values');
assert(!html.includes('ci-share-name'), 'buyer spend chart still uses the undefined name class');
assert(!html.includes('ci-share-bar'), 'buyer spend chart still uses the undefined bar class');
assert(!html.includes('ci-share-note'), 'buyer spend chart still uses the undefined note class');
assert(!report.includes('下载'), 'report still exposes download copy');
assert(!report.includes('风险调整价值'), 'report still exposes the internal risk-adjusted value framework');
assert(!report.includes('本项目的落地方式'), 'report still exposes internal implementation guidance');
assert(!report.includes('工作台内 78 笔披露样本'), 'report still exposes internal evidence-layer counts');
assert(!/href=["'][^"']*data\/research_[^"']+\.csv/i.test(html), 'index.html still links to research CSV downloads');
assert(!report.includes('../data/research_'), 'report still links to research data downloads');
assert(!report.includes('biotech-capital-intelligence-v5.html'), 'report still links to the previous project');
assert(!report.includes('../data/real_seed_v5/'), 'report still links to the previous data path');

console.log(JSON.stringify({
  status: 'PASS',
  benchmarks: benchmarks.length,
  findings: findings.length,
  scenarios: scenarios.length,
  reportBytes: fs.statSync(files.report).size,
  indexBytes: fs.statSync(files.html).size,
}, null, 2));
