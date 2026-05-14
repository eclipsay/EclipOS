:root {
  --bg: #08111f;
  --panel: rgba(18, 28, 43, .82);
  --panel-2: rgba(10, 17, 29, .74);
  --line: rgba(132, 156, 188, .16);
  --text: #eff6ff;
  --muted: #9eb0c5;
  --accent: #2dd4bf;
  --amber: #f8b84e;
  --soft: rgba(45, 212, 191, .12);
  color-scheme: dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* { box-sizing: border-box; }
html[data-theme="oled"] { --bg: #000; --panel: rgba(8, 10, 13, .92); --panel-2: rgba(2, 3, 5, .88); --line: rgba(255,255,255,.12); --text: #f8fafc; --muted: #a3aab7; }
html[data-theme="dark"] { --bg: #080c11; --panel: rgba(17, 24, 33, .9); --panel-2: rgba(13, 19, 27, .86); --line: rgba(148, 163, 184, .16); }
html[data-theme="light"] { --bg: #eef3f8; --panel: rgba(255,255,255,.86); --panel-2: rgba(246,248,251,.92); --line: rgba(40, 54, 72, .14); --text: #172033; --muted: #657184; color-scheme: light; }
html[data-theme="system"] { color-scheme: dark light; }
body { margin: 0; background: radial-gradient(circle at 20% -10%, rgba(45, 212, 191, .13), transparent 30%), radial-gradient(circle at 100% 0%, rgba(248, 184, 78, .08), transparent 22%), var(--bg); color: var(--text); overflow: hidden; }
html.overlay-root, body.overlay-root { background: transparent !important; background-color: transparent !important; overflow: hidden; }
body.overlay-root #root { background: transparent !important; }
button, input, select, textarea { font: inherit; }
button { border: 1px solid var(--line); background: color-mix(in srgb, var(--panel), var(--accent) 5%); color: var(--text); border-radius: 8px; min-height: 36px; padding: 0 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
button:hover, button.active { border-color: color-mix(in srgb, var(--accent), white 15%); background: color-mix(in srgb, var(--panel), var(--accent) 12%); transform: translateY(-1px); }
button:disabled { opacity: .45; cursor: not-allowed; }
input, select, textarea { width: 100%; border: 1px solid var(--line); background: var(--panel-2); color: var(--text); border-radius: 8px; padding: 10px 12px; outline: none; }
input:focus, select:focus, textarea:focus { border-color: var(--accent); }
textarea { min-height: 150px; resize: vertical; }
h1, h2, h3, p { margin: 0; letter-spacing: 0; }
h1 { font-size: 30px; line-height: 1.15; max-width: 720px; }
h2 { font-size: 22px; }
h3 { color: var(--muted); font-size: 12px; text-transform: uppercase; margin: 18px 4px 8px; }
p { color: var(--muted); margin-top: 8px; }

.app-shell { display: grid; grid-template-columns: 228px minmax(0, 1fr) 340px; height: 100vh; }
.sidebar { border-right: 1px solid var(--line); background: color-mix(in srgb, var(--bg), black 12%); padding: 18px 14px; display: flex; flex-direction: column; gap: 18px; backdrop-filter: blur(22px); min-height: 0; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; color: var(--text); padding: 8px; font-size: 17px; }
.sidebar nav { display: grid; gap: 6px; overflow-y: auto; min-height: 0; padding-right: 2px; }
.sidebar nav button, .palette-trigger { justify-content: flex-start; width: 100%; color: color-mix(in srgb, var(--text), var(--muted) 30%); background: transparent; border-color: transparent; }
.palette-trigger { margin-top: auto; border-color: var(--line); background: var(--panel); }
.workspace { min-width: 0; overflow: auto; padding: 18px 20px 28px; }
.topbar, .section-header, .hero-row, .filters { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.command-input { flex: 1; justify-content: flex-start; height: 46px; color: var(--muted); background: var(--panel); box-shadow: inset 0 1px 0 rgba(255,255,255,.03); }
.status-pill { border: 1px solid var(--line); border-radius: 999px; padding: 7px 10px; color: var(--muted); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; font-size: 13px; }
.page { padding-top: 20px; display: grid; gap: 18px; }
.dashboard { gap: 20px; }
.quick-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat, .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 8px; box-shadow: 0 18px 55px rgba(0,0,0,.18); backdrop-filter: blur(18px); }
.stat { padding: 16px; min-height: 88px; }
.stat span, .panel-title, .row span { color: var(--muted); font-size: 12px; }
.stat strong { display: block; margin-top: 10px; font-size: 18px; overflow-wrap: anywhere; }
.columns, .editor-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
.editor-grid { grid-template-columns: minmax(0, 1.2fr) minmax(360px, .8fr); }
.panel { padding: 12px; display: grid; gap: 8px; }
.panel-title { text-transform: none; font-weight: 760; letter-spacing: 0; padding: 2px 2px 8px; color: var(--text); }
.row { min-height: 54px; padding: 10px; border: 1px solid transparent; border-radius: 8px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; align-items: center; background: var(--panel-2); transition: background .16s ease, border-color .16s ease; }
.row:hover { border-color: var(--line); background: color-mix(in srgb, var(--panel-2), var(--accent) 6%); }
.row strong { display: block; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row span { display: block; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-actions { display: flex; gap: 6px; }
.row-actions button { width: 34px; height: 34px; padding: 0; }
.form { display: grid; gap: 10px; }
.inline-form { grid-template-columns: minmax(0, 1fr) auto; align-items: center; margin-top: 10px; }
.form label { color: var(--muted); display: flex; gap: 8px; align-items: center; font-size: 13px; }
.bad-text { color: #ffb4b4 !important; }
.form label input { width: auto; }
.terminal-output { background: color-mix(in srgb, var(--bg), black 25%); border: 1px solid var(--line); border-radius: 8px; padding: 14px; min-height: 180px; white-space: pre-wrap; color: color-mix(in srgb, var(--text), var(--accent) 30%); overflow: auto; max-height: 360px; }
.agent-rail { border-left: 1px solid var(--line); background: color-mix(in srgb, var(--bg), black 10%); padding: 18px 14px; min-width: 0; overflow: auto; }
.today-rail { display: grid; gap: 14px; align-content: start; }
.today-rail h2 { font-size: 24px; }
.focus-ring, .focus-large { display: grid; place-items: center; margin: 8px auto; border-radius: 999px; color: var(--text); background: conic-gradient(var(--accent) 72%, rgba(255,255,255,.08) 0); box-shadow: inset 0 0 0 10px color-mix(in srgb, var(--panel), black 20%); }
.focus-ring { width: 92px; height: 92px; font-size: 28px; font-weight: 800; }
.focus-large { width: 190px; height: 190px; font-size: 56px; font-weight: 850; }
.big-search { height: 58px; font-size: 20px; padding: 0 18px; }
.onboarding-steps { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
.onboarding-steps span { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--panel-2); color: var(--muted); }
.codex-panel { min-height: 0; }
.codex-panel.compact { height: 100%; display: grid; gap: 12px; align-content: start; }
.codex-status { display: grid; grid-template-columns: 12px 1fr; gap: 10px; align-items: start; border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 12px; }
.codex-status strong, .codex-status span { display: block; }
.codex-status span { color: var(--muted); font-size: 12px; margin-top: 4px; overflow-wrap: anywhere; }
.dot { width: 10px; height: 10px; border-radius: 999px; margin-top: 4px; background: var(--amber); }
.dot.ok { background: var(--accent); box-shadow: 0 0 18px color-mix(in srgb, var(--accent), transparent 35%); }
.dot.fail { background: #ff6b6b; }
.setup-box { border: 1px solid #5c4524; background: #20180d; color: #ffd899; border-radius: 8px; padding: 12px; line-height: 1.45; }
.setup-box code { color: var(--accent); }
.action-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.action-grid button { justify-content: flex-start; min-height: 42px; }
.compact-output { max-height: 300px; min-height: 180px; }
.mini-pre { white-space: pre-wrap; color: #bdebdc; background: #05080c; border: 1px solid var(--line); border-radius: 8px; padding: 10px; min-height: 120px; overflow: auto; }
.system-page { animation: pageIn .22s ease; }
.tab-strip { display: flex; gap: 8px; flex-wrap: wrap; position: sticky; top: -18px; z-index: 1; padding: 8px 0; background: color-mix(in srgb, var(--bg), transparent 12%); backdrop-filter: blur(16px); }
.tab-strip button { text-transform: capitalize; min-height: 34px; }
.health-orb { width: 132px; height: 132px; border-radius: 999px; display: grid; place-items: center; align-content: center; border: 1px solid color-mix(in srgb, var(--accent), white 8%); background: radial-gradient(circle, color-mix(in srgb, var(--accent), transparent 70%), var(--panel)); box-shadow: inset 0 0 0 10px color-mix(in srgb, var(--panel), black 10%), 0 18px 50px rgba(0,0,0,.25); }
.health-orb strong { font-size: 34px; line-height: 1; }
.health-orb span { color: var(--muted); font-size: 12px; }
.perf-overlay { width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: flex-end; flex-wrap: nowrap; overflow: hidden; padding: 0 8px; background: transparent !important; background-color: transparent !important; border: 0 !important; box-shadow: none !important; border-radius: 0 !important; backdrop-filter: none !important; font-family: ui-monospace, "Cascadia Mono", "SFMono-Regular", Consolas, monospace; font-weight: 650; line-height: 1.25; white-space: nowrap; letter-spacing: 0; text-align: right; }
.perf-overlay.with-shadow { text-shadow: 0 1px 2px rgba(0,0,0,.95), 0 0 8px rgba(0,0,0,.75); }
.perf-overlay.expanded { justify-content: flex-end; }
.overlay-metric { display: inline-flex; align-items: center; color: inherit; }
.overlay-metric.warn { color: #ffbd7a; }
.overlay-separator { opacity: .62; color: inherit; }
.overlay-metric-toggles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
.stress-page { display: grid; gap: 14px; }
.sensor-card { border: 1px solid var(--line); background: var(--panel-2); border-radius: 8px; padding: 12px; display: grid; gap: 8px; }
.sensor-card div { display: flex; align-items: center; gap: 8px; color: var(--muted); min-width: 0; }
.sensor-card div span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.sensor-card strong { font-size: 24px; }
.sensor-card small, small { color: var(--muted); line-height: 1.45; }
.mini-chart { border: 1px solid var(--line); background: color-mix(in srgb, var(--panel-2), black 10%); border-radius: 8px; padding: 10px; display: grid; gap: 6px; }
.mini-chart span { color: var(--muted); font-size: 12px; }
.mini-chart svg { width: 100%; height: 76px; overflow: visible; }
.mini-chart path { fill: none; stroke: var(--accent); stroke-width: 2.5; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent), transparent 45%)); }
.core-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.core-grid div { border: 1px solid var(--line); border-radius: 8px; padding: 8px; background: var(--panel-2); display: grid; gap: 6px; }
.core-grid span { color: var(--muted); font-size: 12px; }
meter { width: 100%; height: 8px; }
.wide-columns { grid-template-columns: repeat(3, minmax(260px, 1fr)); }
.skeleton-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.skeleton-grid span { height: 92px; border-radius: 8px; background: linear-gradient(90deg, var(--panel-2), color-mix(in srgb, var(--panel-2), white 8%), var(--panel-2)); background-size: 220% 100%; animation: shimmer 1.2s infinite linear; }
.storage-scanner { display: grid; gap: 16px; }
.scanner-layout { display: grid; grid-template-columns: minmax(240px, .9fr) minmax(260px, .8fr) minmax(280px, 1fr); gap: 14px; align-items: start; }
.target-list { display: grid; gap: 8px; max-height: 360px; overflow: auto; }
.target-option { display: grid; grid-template-columns: 20px 1fr; gap: 8px; align-items: start; border: 1px solid var(--line); background: var(--panel-2); border-radius: 8px; padding: 10px; }
.target-option input { width: auto; margin-top: 2px; }
.target-option strong, .target-option small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.target-option small, .scan-path { color: var(--muted); font-size: 12px; overflow-wrap: anywhere; }
.target-mode-card { border: 1px dashed color-mix(in srgb, var(--accent), var(--line) 65%); background: color-mix(in srgb, var(--panel-2), var(--accent) 5%); border-radius: 8px; padding: 12px; display: grid; gap: 6px; min-height: 104px; align-content: center; }
.target-mode-card span { color: var(--accent); font-size: 12px; text-transform: uppercase; font-weight: 760; }
.target-mode-card strong { overflow-wrap: anywhere; }
.target-mode-card small { color: var(--muted); overflow-wrap: anywhere; line-height: 1.45; }
.compact-tabs { position: static; padding: 0; }
.treemap { display: flex; flex-wrap: wrap; gap: 8px; min-height: 240px; }
.tree-tile { flex-grow: 1; align-items: flex-start; justify-content: flex-end; flex-direction: column; text-align: left; padding: 12px; overflow: hidden; background: color-mix(in srgb, var(--panel), var(--accent) 10%); }
.tree-tile.careful { background: color-mix(in srgb, var(--panel), var(--amber) 14%); }
.tree-tile.protected { background: color-mix(in srgb, var(--panel), #ff6b6b 12%); opacity: .75; }
.tree-tile strong, .tree-tile span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tree-tile span { color: var(--muted); font-size: 12px; }
.bar-row { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(180px, 2fr) 90px; gap: 10px; align-items: center; min-height: 32px; }
.bar-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bar-row div { height: 10px; border-radius: 999px; background: var(--panel-2); overflow: hidden; border: 1px solid var(--line); }
.bar-row i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent), white 25%)); border-radius: inherit; }
.bar-row strong { font-size: 12px; color: var(--muted); text-align: right; }
.entertainment-page { animation: pageIn .22s ease; }
.entertainment-hero { min-height: 150px; border: 1px solid var(--line); border-radius: 8px; padding: 20px; display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; background: radial-gradient(circle at 12% 15%, color-mix(in srgb, var(--accent), transparent 72%), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--panel), black 6%), color-mix(in srgb, var(--panel), #6d5dfc 8%)); box-shadow: 0 22px 70px rgba(0,0,0,.22); }
.entertainment-hero span { color: var(--accent); font-size: 12px; text-transform: uppercase; font-weight: 780; }
.entertainment-hero strong { display: block; margin-top: 8px; font-size: 30px; text-transform: capitalize; }
.recommendation-grid { display: grid; gap: 10px; }
.recommendation-card { border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: color-mix(in srgb, var(--panel-2), var(--accent) 4%); display: grid; gap: 6px; }
.recommendation-card span { color: var(--accent); font-size: 11px; text-transform: uppercase; font-weight: 760; }
.recommendation-card strong { font-size: 15px; }
.recommendation-card p { margin: 0; font-size: 13px; line-height: 1.5; }
.recommendation-card small { color: var(--muted); }
.activity-timeline { display: grid; gap: 8px; max-height: 420px; overflow: auto; }
.timeline-item { border: 1px solid var(--line); background: var(--panel-2); border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; gap: 12px; align-items: center; }
.timeline-item strong, .timeline-item span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.timeline-item span, .timeline-item small { color: var(--muted); font-size: 12px; text-transform: capitalize; }
@keyframes shimmer { from { background-position: 220% 0; } to { background-position: -220% 0; } }
@keyframes pageIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.messages { overflow: auto; display: grid; gap: 10px; align-content: start; min-height: 240px; max-height: calc(100vh - 210px); }
.message { border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 11px; color: #d8e4ec; white-space: pre-wrap; line-height: 1.45; font-size: 14px; }
.message.user { background: #10251f; border-color: color-mix(in srgb, var(--accent), black 45%); }
.assistant-page { animation: pageIn .22s ease; }
.assistant-grid { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(320px, .8fr); gap: 14px; align-items: start; }
.assistant-side { display: grid; gap: 14px; }
.suggestion-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.suggestion-chips button { min-height: 32px; font-size: 12px; }
.assistant-chat { display: grid; gap: 12px; max-height: 560px; overflow: auto; padding: 4px; }
.assistant-bubble { max-width: min(92%, 880px); border: 1px solid var(--line); border-radius: 8px; padding: 12px; background: var(--panel-2); line-height: 1.55; }
.assistant-bubble.user { justify-self: end; background: color-mix(in srgb, var(--panel), var(--accent) 14%); }
.assistant-bubble.assistant { justify-self: start; }
.assistant-bubble.error-bubble { border-color: color-mix(in srgb, #ef4444, var(--line) 35%); }
.assistant-bubble details { margin-top: 10px; color: var(--muted); }
.assistant-bubble details small { display: block; margin-top: 6px; }
.assistant-actions { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
.assistant-actions span { border: 1px solid var(--line); border-radius: 999px; padding: 4px 8px; color: var(--muted); font-size: 12px; }
.assistant-input { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.source-chips { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; }
.source-chips span { border: 1px solid var(--line); background: var(--panel-2); border-radius: 999px; color: var(--muted); padding: 6px 10px; font-size: 12px; }
.source-row { border-top: 1px solid var(--line); padding-top: 10px; }
.message-tools { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; opacity: .9; }
.message-tools button { min-height: 30px; font-size: 12px; padding: 0 9px; }
.markdown-body { color: color-mix(in srgb, var(--text), var(--muted) 8%); overflow-wrap: anywhere; }
.markdown-body > *:first-child { margin-top: 0; }
.markdown-body > *:last-child { margin-bottom: 0; }
.markdown-body p { margin: 10px 0; color: color-mix(in srgb, var(--text), var(--muted) 12%); line-height: 1.62; }
.markdown-body h1, .markdown-body h2, .markdown-body h3, .markdown-body h4 { color: var(--text); margin: 18px 0 8px; line-height: 1.2; text-transform: none; }
.markdown-body h1 { font-size: 22px; }
.markdown-body h2 { font-size: 18px; border-bottom: 1px solid var(--line); padding-bottom: 7px; }
.markdown-body h3 { font-size: 15px; color: color-mix(in srgb, var(--text), var(--accent) 20%); letter-spacing: 0; }
.markdown-body h4 { font-size: 14px; }
.markdown-body ul, .markdown-body ol { margin: 10px 0 12px; padding-left: 22px; display: grid; gap: 6px; }
.markdown-body li { padding-left: 2px; }
.markdown-body strong { color: var(--text); font-weight: 760; }
.markdown-body a { color: color-mix(in srgb, var(--accent), white 14%); text-decoration: none; border-bottom: 1px solid color-mix(in srgb, var(--accent), transparent 55%); }
.inline-code, .markdown-body :not(pre) > code { color: color-mix(in srgb, var(--accent), white 18%); background: color-mix(in srgb, var(--panel), black 20%); border: 1px solid var(--line); border-radius: 6px; padding: 2px 5px; font-size: .9em; }
.code-shell { position: relative; margin: 12px 0; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: #05080c; }
.code-shell button { position: absolute; top: 8px; right: 8px; min-height: 28px; font-size: 12px; padding: 0 8px; background: rgba(20, 29, 42, .92); }
.code-shell pre { margin: 0; padding: 42px 14px 14px; overflow: auto; line-height: 1.55; }
.code-shell code { font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; font-size: 13px; }
.table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 8px; margin: 12px 0; }
.markdown-body table { width: 100%; border-collapse: collapse; min-width: 520px; background: var(--panel-2); }
.markdown-body th, .markdown-body td { border-bottom: 1px solid var(--line); padding: 9px 10px; text-align: left; vertical-align: top; }
.markdown-body th { color: var(--text); background: color-mix(in srgb, var(--panel), var(--accent) 8%); }
.markdown-body blockquote.callout { margin: 12px 0; border: 1px solid var(--line); border-left: 4px solid var(--accent); border-radius: 8px; background: color-mix(in srgb, var(--panel), var(--accent) 7%); padding: 10px 12px; }
.markdown-body blockquote.warning { border-left-color: #ff7777; background: color-mix(in srgb, var(--panel), #ff7777 9%); }
.markdown-body blockquote.recommendation { border-left-color: var(--accent); background: color-mix(in srgb, var(--panel), var(--accent) 10%); }
.markdown-body blockquote p { margin: 0; }
.markdown-body hr { border: 0; border-top: 1px solid var(--line); margin: 16px 0; }
.insight-card { border: 1px solid var(--line); border-left: 3px solid var(--accent); border-radius: 8px; padding: 11px; background: var(--panel-2); display: grid; gap: 5px; }
.insight-card.high { border-left-color: #ff7777; }
.insight-card.medium { border-left-color: var(--amber); }
.insight-card.low { border-left-color: var(--accent); }
.insight-card span { color: var(--muted); font-size: 11px; text-transform: uppercase; }
.insight-card p { margin: 0; font-size: 13px; }
.storage-ai { display: grid; gap: 10px; }
.storage-score { width: 110px; height: 110px; border: 1px solid var(--line); border-radius: 999px; display: grid; place-items: center; align-content: center; background: radial-gradient(circle, color-mix(in srgb, var(--accent), transparent 72%), var(--panel-2)); }
.storage-score strong { font-size: 30px; }
.storage-score span { color: var(--muted); font-size: 11px; }
.ai-storage-panel { display: grid; grid-template-columns: 128px minmax(0, 1fr); gap: 14px; align-items: start; border: 1px solid var(--line); border-radius: 8px; padding: 14px; background: var(--panel); }
.insight-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
.chat-input { display: grid; grid-template-columns: 1fr 40px; gap: 8px; }
.chat-input button { width: 40px; padding: 0; }
.empty { min-height: 72px; border: 1px dashed #344254; color: var(--muted); border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px; text-align: center; }
.error { border: 1px solid #7f3131; background: #2b1216; color: #ffc7c7; padding: 10px 12px; border-radius: 8px; margin-top: 12px; }
.overlay { position: fixed; inset: 0; z-index: 10; background: rgba(2, 5, 8, .68); backdrop-filter: blur(12px); display: grid; place-items: start center; padding-top: 9vh; }
.palette { width: min(760px, calc(100vw - 32px)); max-height: 78vh; overflow: auto; background: color-mix(in srgb, var(--panel), var(--bg) 22%); border: 1px solid var(--line); border-radius: 10px; box-shadow: 0 30px 100px rgba(0,0,0,.52); padding: 12px; }
.palette-search { display: grid; grid-template-columns: 24px 1fr; align-items: center; gap: 8px; border-bottom: 1px solid var(--line); padding: 4px 4px 12px; }
.palette-search input { border: 0; background: transparent; font-size: 18px; padding: 8px 0; }
.preview { border: 1px solid var(--line); background: #0b1118; border-radius: 8px; padding: 12px; color: var(--muted); min-height: 92px; }
.danger { border-color: #743636; color: #ffb4b4; }
.reminders-page { animation: pageIn .22s ease; }
.reminder-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.reminder-summary button { min-height: 76px; flex-direction: column; align-items: flex-start; }
.reminder-summary strong { font-size: 24px; }
.reminder-summary span { color: var(--muted); text-transform: capitalize; }
.reminder-composer .panel { padding: 14px; }
.reminder-form-grid { display: grid; grid-template-columns: minmax(180px, 1.2fr) 190px minmax(180px, .9fr) minmax(180px, 1fr) auto; gap: 10px; align-items: center; }
.relative-fields { display: grid; grid-template-columns: minmax(70px, .6fr) minmax(100px, .8fr); gap: 8px; }
.reminder-row-card { min-height: 64px; display: grid; grid-template-columns: 34px minmax(160px, 1fr) minmax(150px, .7fr) 110px auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); }
.reminder-row-card strong, .reminder-row-card span, .reminder-row-card time { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reminder-row-card span, .reminder-row-card time { color: var(--muted); font-size: 12px; }
.check { width: 26px; height: 26px; min-height: 26px; padding: 0; border-radius: 6px; }
.check.completed { background: var(--accent); color: #06211d; font-size: 10px; font-weight: 800; }
.reminder-status { justify-self: start; border: 1px solid var(--line); border-radius: 999px; padding: 5px 8px; color: var(--muted); font-size: 12px; text-transform: capitalize; }
.reminder-status.overdue, .reminder-status.invalid { color: #ffb4b4; border-color: #743636; }
.reminder-status.due-soon { color: var(--amber); border-color: color-mix(in srgb, var(--amber), black 45%); }
.reminder-status.completed { color: var(--accent); border-color: color-mix(in srgb, var(--accent), black 35%); }
.reminder-status.dismissed, .reminder-status.notified { color: var(--muted); opacity: .8; }
.timeline-item { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; padding-bottom: 16px; }
.timeline-marker { width: 14px; height: 14px; margin: 8px auto 0; border: 2px solid var(--accent); border-radius: 50%; }
.timeline-content { border: 1px solid var(--line); border-radius: 8px; background: var(--panel-2); padding: 12px; display: grid; gap: 7px; }
.timeline-topline { display: flex; justify-content: space-between; gap: 12px; align-items: center; }

@media (max-width: 1180px) {
  .app-shell { grid-template-columns: 220px minmax(0, 1fr); }
  .agent-rail { display: none; }
}

@media (max-width: 820px) {
  body { overflow: auto; }
  .app-shell { display: block; height: auto; }
  .sidebar { position: sticky; top: 0; z-index: 2; border-right: 0; border-bottom: 1px solid var(--line); }
  .sidebar nav { grid-template-columns: repeat(3, 1fr); }
  .columns, .editor-grid, .stat-grid, .reminder-summary, .reminder-form-grid, .assistant-grid, .ai-storage-panel, .insight-grid { grid-template-columns: 1fr; }
  .hero-row, .topbar, .section-header { align-items: stretch; flex-direction: column; }
}
