import { ACTOR_REGISTRY } from './actor-registry';
import type { AnalysisResult, Platform, ScrapeResult } from './types';
import type { TopItemDisplay } from './scoring';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Rich Markdown → HTML Parser ────────────────────────────────────

function markdownToHtml(md: string): string {
  let html = md;

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');

  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes → styled quote blocks
  html = html.replace(/^>\s*(.+)$/gm, '<div class="quote-block">$1</div>');

  // Tables → rich data tables
  html = html.replace(/(\|.+\|[\s\S]*?\n)(?=\n|$)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter((r) => r.trim());
    if (rows.length < 2) return tableBlock;

    const headerCells = rows[0].split('|').filter((c) => c.trim()).map((c) => c.trim());
    const dataRows = rows.slice(2);

    let table = '<div class="table-wrap"><table class="data-table"><thead><tr>';
    for (const cell of headerCells) {
      table += `<th>${cell}</th>`;
    }
    table += '</tr></thead><tbody>';
    for (const row of dataRows) {
      const cells = row.split('|').filter((c) => c.trim()).map((c) => c.trim());
      table += '<tr>';
      for (const cell of cells) {
        let cellHtml = cell;
        cellHtml = cellHtml.replace(/STRIKE ZONE/g, '<span class="tier-badge strike">STRIKE ZONE</span>');
        cellHtml = cellHtml.replace(/OPPORTUNITY/g, '<span class="tier-badge opportunity">OPPORTUNITY</span>');
        cellHtml = cellHtml.replace(/MONITOR/g, '<span class="tier-badge monitor">MONITOR</span>');
        cellHtml = cellHtml.replace(/SKIP/g, '<span class="tier-badge skip">SKIP</span>');
        table += `<td>${cellHtml}</td>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table></div>';
    return table;
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li class="ol">$1</li>');

  // Paragraphs (lines not already tagged)
  html = html.replace(/^(?!<[a-z/])((?!<).+)$/gm, '<p>$1</p>');

  // Post-process: tier badges in text
  html = html.replace(/(?<!<span[^>]*>)STRIKE ZONE(?!<\/span>)/g, '<span class="tier-badge strike">STRIKE ZONE</span>');
  // Severity scores
  html = html.replace(/Severity:\s*(\d+)\/10/g, '<span class="severity-inline"><span class="sev-num">$1</span>/10</span>');
  html = html.replace(/\[(\d+)\/10\]/g, '<span class="severity-inline"><span class="sev-num">$1</span>/10</span>');

  return html;
}

// ─── Helpers ────────────────────────────────────────────────────────

function platformBadgeHtml(platform: string): string {
  const display = ACTOR_REGISTRY[platform as Platform]?.displayName || platform;
  return `<span class="pbadge ${platform}">${escapeHtml(display)}</span>`;
}

function splitSections(md: string): { title: string; body: string }[] {
  const lines = md.split('\n');
  const sections: { title: string; body: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      if (currentTitle || currentLines.length > 0) {
        const body = currentLines.join('\n').trim();
        if (body) sections.push({ title: currentTitle, body });
      }
      currentTitle = match[1];
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    const body = currentLines.join('\n').trim();
    if (body) sections.push({ title: currentTitle, body });
  }
  return sections;
}

function sectionIcon(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('executive') || lower.includes('summary') || lower.includes('headline')) return '📋';
  if (lower.includes('route')) return '🎨';
  if (lower.includes('strike')) return '🎯';
  if (lower.includes('opportunit')) return '💡';
  if (lower.includes('battleground') || lower.includes('tension')) return '⚡';
  if (lower.includes('competitive') || lower.includes('landscape')) return '⚔️';
  if (lower.includes('audience') || lower.includes('intelligence')) return '👥';
  if (lower.includes('recommend') || lower.includes('action')) return '🚀';
  if (lower.includes('risk') || lower.includes('radar')) return '⚠️';
  if (lower.includes('monitor') || lower.includes('watch')) return '👀';
  if (lower.includes('convergence') || lower.includes('cross-platform')) return '🔗';
  if (lower.includes('sentiment') || lower.includes('emotion')) return '💬';
  if (lower.includes('content') || lower.includes('pattern')) return '📊';
  if (lower.includes('gap') || lower.includes('blind')) return '🔍';
  if (lower.includes('confidence') || lower.includes('assessment')) return '✅';
  if (lower.includes('scorecard') || lower.includes('scoring')) return '📊';
  if (lower.includes('deep dive') || lower.includes('data')) return '🔬';
  if (lower.includes('answer')) return '💬';
  if (lower.includes('top-line') || lower.includes('verdict')) return '⚡';
  return '📌';
}

function buildTopPostsHtml(items: TopItemDisplay[], platform: string): string {
  if (!items || items.length === 0) return '';

  const tierClass = (t: string) => {
    if (t === 'STRIKE ZONE') return 'strike';
    if (t === 'OPPORTUNITY') return 'opportunity';
    if (t === 'MONITOR') return 'monitor';
    return '';
  };

  const platformIcon: Record<string, string> = {
    reddit: '💬', youtube: '▶️', tiktok: '🎵', instagram: '📸', trustpilot: '⭐',
  };

  const cards = items.map((item) => {
    const thumbHtml = item._thumbnail
      ? `<div class="post-thumb"><img src="${escapeHtml(item._thumbnail)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<div class=no-img>${platformIcon[platform] || '📄'}</div>'"></div>`
      : `<div class="post-thumb"><div class="no-img">${platformIcon[platform] || '📄'}</div></div>`;

    const titleHtml = item._url
      ? `<a href="${escapeHtml(item._url)}" target="_blank" rel="noopener">${escapeHtml(item._title || 'View Post')}</a>`
      : escapeHtml(item._title || '—');

    return `
    <div class="post-card">
      ${thumbHtml}
      <div class="post-body">
        <div class="post-head">
          <span class="post-score-badge ${tierClass(item._tier)}">${item._score}</span>
          <span class="tier-badge ${tierClass(item._tier)}">${item._tier}</span>
        </div>
        <div class="post-title">${titleHtml}</div>
        <div class="post-meta">
          ${item._creator ? `<span class="post-creator">${escapeHtml(item._creator)}</span>` : ''}
          ${item._platform_metric ? `<span>${escapeHtml(item._platform_metric)}</span>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');

  return `
  <div class="card" style="margin-top:20px;">
    <div class="card-header">
      <span class="icon">🏆</span>
      <h2>Top Scored Content</h2>
    </div>
    <p style="margin-bottom:16px;font-size:12px;color:var(--text-muted);">Ranked by engagement score. Click to view original content.</p>
    <div class="post-grid">${cards}</div>
  </div>`;
}

function buildRouteCardHtml(section: { title: string; body: string }): string {
  // Extract score from title pattern: "Route N: Name — X.Y/10" or "Route N: Name — X/10"
  const scoreMatch = section.title.match(/—\s*(\d+(?:\.\d+)?)\/10/);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : null;
  const routeName = section.title.replace(/—\s*\d+(?:\.\d+)?\/10/, '').trim();

  if (score !== null) {
    const scoreClass = score >= 8 ? 'high' : score >= 6 ? 'mid' : '';
    return `
    <div class="route-card">
      <div class="route-score-big ${scoreClass}">
        <div class="num">${score}</div>
        <div class="den">/10</div>
      </div>
      <div class="route-content">
        <h3>${escapeHtml(routeName)}</h3>
        <div class="prose">${markdownToHtml(section.body)}</div>
      </div>
    </div>`;
  }

  // Fallback: render as a regular card
  return `
  <div class="card">
    <div class="card-header">
      <span class="icon">🎨</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <div class="prose">${markdownToHtml(section.body)}</div>
  </div>`;
}

function sectionTier(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('executive') || lower.includes('headline') || lower.includes('summary') || lower.includes('top-line') || lower.includes('verdict'))
    return 'tier-executive';
  if (lower.includes('strike'))
    return 'tier-strike';
  if (lower.includes('opportunit') && !lower.includes('white'))
    return 'tier-opportunity';
  if (lower.includes('battleground') || lower.includes('tension'))
    return 'tier-battleground';
  if (lower.includes('risk') || lower.includes('radar'))
    return 'tier-risk';
  if (lower.includes('monitor') || lower.includes('watch'))
    return 'tier-monitor';
  return '';
}

// ─── Chart Data Builder ─────────────────────────────────────────────

function buildChartScript(results: ScrapeResult[]): string {
  const platformCounts: Record<string, number> = {};
  for (const r of results) {
    platformCounts[r.source_platform] = (platformCounts[r.source_platform] || 0) + r.item_count;
  }

  const platformColorMap: Record<string, string> = {
    reddit: '#FF4500',
    trustpilot: '#00B67A',
    youtube: '#FF0000',
    tiktok: '#010101',
    google_trends: '#4285F4',
    instagram: '#E1306C',
  };

  const labels = Object.keys(platformCounts).map(
    (p) => ACTOR_REGISTRY[p as Platform]?.displayName || p
  );
  const data = Object.values(platformCounts);
  const colors = Object.keys(platformCounts).map(
    (p) => platformColorMap[p] || '#888'
  );

  return `
new Chart(document.getElementById('platformChart'), {
  type: 'doughnut',
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: [{
      data: ${JSON.stringify(data)},
      backgroundColor: ${JSON.stringify(colors)},
      borderWidth: 0,
    }]
  },
  options: {
    cutout: '60%',
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter, sans-serif' }, padding: 14, usePointStyle: true } }
    }
  }
});

new Chart(document.getElementById('platformBarChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(labels)},
    datasets: [{
      label: 'Items Collected',
      data: ${JSON.stringify(data)},
      backgroundColor: ${JSON.stringify(colors)},
      borderRadius: 6,
    }]
  },
  options: {
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#F0EDE8' }, ticks: { font: { size: 11 } } },
      y: { grid: { display: false }, ticks: { font: { size: 12, family: 'Inter, sans-serif' } } }
    }
  }
});`;
}

// ─── CSS Design System ──────────────────────────────────────────────

const DASHBOARD_CSS = `
:root {
  --bg: #F7F5F0;
  --bg-card: #FFFFFF;
  --text-primary: #1a1a2e;
  --text-secondary: #444;
  --text-muted: #888;
  --border: #E5E2DC;
  --accent-blue: #2563EB;
  --accent-red: #DC2626;
  --accent-amber: #D97706;
  --accent-green: #059669;
  --accent-indigo: #6366f1;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { background:var(--bg); color:var(--text-primary); font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; line-height:1.6; font-size:14px; -webkit-font-smoothing:antialiased; }
h1,h2,h3,h4 { line-height:1.3; }
.container { max-width:1200px; margin:0 auto; padding:0 24px; }

/* Hero */
.hero { background:linear-gradient(135deg,#1a1a2e 0%,#16213e 60%,#0f3460 100%); color:#fff; padding:48px 0 72px; }
.hero .label { font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:12px; }
.hero h1 { font-size:36px; font-weight:700; margin-bottom:8px; letter-spacing:-0.5px; }
.hero .subtitle { font-size:14px; color:rgba(255,255,255,0.5); margin-bottom:24px; }
.hero .meta { font-size:13px; color:rgba(255,255,255,0.6); display:flex; gap:20px; flex-wrap:wrap; align-items:center; }

/* Stat Row */
.stat-row { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:16px; margin-top:-44px; margin-bottom:32px; position:relative; z-index:2; }
.stat-card { background:var(--bg-card); border-radius:12px; padding:24px 20px; text-align:center; box-shadow:0 4px 16px rgba(0,0,0,0.08); transition:transform 0.2s, box-shadow 0.2s; }
.stat-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,0.12); }
.stat-card .num { font-size:32px; font-weight:800; color:var(--text-primary); line-height:1; }
.stat-card .label { font-size:10px; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); margin-top:6px; font-weight:500; }

/* Platform Badges */
.pbadge { display:inline-block; font-size:10px; font-weight:600; padding:3px 10px; border-radius:20px; color:#fff; letter-spacing:0.3px; }
.pbadge.reddit { background:#FF4500; }
.pbadge.trustpilot { background:#00B67A; }
.pbadge.youtube { background:#FF0000; }
.pbadge.tiktok { background:#010101; }
.pbadge.google_trends { background:#4285F4; }
.pbadge.instagram { background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888); }

/* Tabs */
.tab-nav { display:flex; gap:0; border-bottom:2px solid var(--border); margin-bottom:28px; position:sticky; top:0; background:var(--bg); z-index:10; padding-top:12px; }
.tab-btn { padding:12px 20px; font-size:13px; font-weight:500; color:var(--text-muted); background:none; border:none; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; transition:all 0.15s; white-space:nowrap; }
.tab-btn:hover { color:var(--text-primary); background:rgba(0,0,0,0.02); }
.tab-btn.active { color:var(--accent-indigo); border-bottom-color:var(--accent-indigo); font-weight:600; }
.panel { display:none; }
.panel.active { display:block; }

/* Cards */
.card { background:var(--bg-card); border-radius:12px; padding:24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.05); transition:box-shadow 0.2s; }
.card:hover { box-shadow:0 4px 16px rgba(0,0,0,0.08); }
.card h3 { font-size:16px; font-weight:600; margin-bottom:12px; color:var(--text-primary); }
.card p { color:var(--text-secondary); font-size:13px; line-height:1.7; margin-bottom:8px; }
.card-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.card-header .icon { font-size:22px; }
.card-header h2 { font-size:17px; font-weight:700; color:var(--text-primary); }

/* Tiered Cards */
.card.tier-executive { border-left:4px solid var(--accent-indigo); background:linear-gradient(135deg,#fafaff,#f0f0ff); }
.card.tier-strike { border-left:4px solid var(--accent-red); }
.card.tier-opportunity { border-left:4px solid var(--accent-amber); }
.card.tier-battleground { border-left:4px solid #F97316; }
.card.tier-risk { border-left:4px solid var(--accent-red); background:#FFFBFB; }
.card.tier-monitor { border-left:4px solid var(--accent-blue); }

/* Big Insight (dark hero card) */
.big-insight { background:linear-gradient(135deg,#1a1a2e,#16213e); color:#fff; border-radius:16px; padding:36px; margin:24px 0; box-shadow:0 8px 32px rgba(26,26,46,0.3); }
.big-insight .pre { font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:rgba(255,255,255,0.4); margin-bottom:12px; }
.big-insight h3 { font-size:22px; font-weight:700; margin-bottom:16px; line-height:1.35; color:#fff; }
.big-insight p { color:rgba(255,255,255,0.75); font-size:14px; line-height:1.8; margin-bottom:12px; }
.big-insight .prose h2, .big-insight .prose h3, .big-insight .prose h4 { color:#fff; }
.big-insight .prose p, .big-insight .prose li { color:rgba(255,255,255,0.8); }
.big-insight .prose strong { color:#fff; }
.big-insight .prose em { color:rgba(255,255,255,0.85); }
.big-insight .prose hr { border-color:rgba(255,255,255,0.15); }
.big-insight .prose li::before { color:rgba(255,255,255,0.5); }
.big-insight .prose a { color:#93c5fd; }
.big-insight .table-wrap { border-color:rgba(255,255,255,0.15); }
.big-insight .data-table th { background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.6); border-color:rgba(255,255,255,0.15); }
.big-insight .data-table td { color:rgba(255,255,255,0.8); border-color:rgba(255,255,255,0.08); }
.big-insight .data-table tr:hover td { background:rgba(255,255,255,0.05); }
.big-insight .tier-badge { opacity:0.9; }

/* Quote Block */
.quote-block { border-left:4px solid var(--accent-amber); background:#FFFBEB; padding:14px 20px; border-radius:0 8px 8px 0; margin:14px 0; font-style:italic; color:#92400E; font-size:13px; line-height:1.7; }

/* Info Boxes */
.info-box { display:flex; gap:12px; padding:16px 18px; border-radius:10px; margin:14px 0; font-size:13px; line-height:1.7; }
.info-box .icon { font-size:18px; flex-shrink:0; margin-top:1px; }
.info-box.alert { background:#FEF2F2; border:1px solid #FECACA; color:#991B1B; }
.info-box.insight { background:#F0FDF4; border:1px solid #BBF7D0; color:#166534; }
.info-box.opportunity { background:#FFFBEB; border:1px solid #FDE68A; color:#92400E; }

/* DO / DON'T Panels */
.do-dont { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0; }
.do-panel, .dont-panel { border-radius:10px; padding:18px; }
.do-panel { background:#F0FDF4; border:1px solid #BBF7D0; }
.dont-panel { background:#FEF2F2; border:1px solid #FECACA; }
.panel-label { font-size:12px; font-weight:700; letter-spacing:0.5px; margin-bottom:10px; }
.do-panel .panel-label { color:#166534; }
.dont-panel .panel-label { color:#991B1B; }
.do-panel ul, .dont-panel ul { list-style:none; padding:0; }
.do-panel li, .dont-panel li { font-size:12px; line-height:1.7; padding:3px 0; color:var(--text-secondary); }

/* Versus Row */
.versus-row { display:grid; grid-template-columns:1fr auto 1fr; gap:0; margin:16px 0; align-items:stretch; }
.side-a, .side-b { padding:16px 18px; border-radius:10px; font-size:13px; line-height:1.7; }
.side-a { background:#EFF6FF; border:1px solid #BFDBFE; }
.side-b { background:#FEF2F2; border:1px solid #FECACA; }
.side-label { font-size:11px; font-weight:700; letter-spacing:0.5px; margin-bottom:8px; }
.vs-badge { display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#fff; background:#333; width:32px; border-radius:16px; margin:8px -2px; z-index:1; }

/* Section Labels */
.section-label { display:inline-block; font-size:9px; font-weight:700; letter-spacing:2px; text-transform:uppercase; background:var(--text-primary); color:#fff; padding:4px 10px; border-radius:4px; margin-bottom:12px; }

/* Tables */
.table-wrap { overflow-x:auto; margin:14px 0; border-radius:8px; border:1px solid var(--border); }
.data-table { width:100%; border-collapse:collapse; font-size:13px; }
.data-table th { background:#F8F7F4; padding:10px 14px; text-align:left; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-muted); border-bottom:2px solid var(--border); }
.data-table td { padding:10px 14px; border-bottom:1px solid #F0EDE8; color:var(--text-secondary); }
.data-table tr:hover td { background:#FAFAF8; }

/* Tier Badges */
.tier-badge { display:inline-block; font-size:9px; font-weight:700; letter-spacing:0.5px; padding:2px 8px; border-radius:4px; text-transform:uppercase; }
.tier-badge.strike { background:#FEE2E2; color:#991B1B; }
.tier-badge.opportunity { background:#FEF3C7; color:#92400E; }
.tier-badge.monitor { background:#DBEAFE; color:#1E40AF; }
.tier-badge.skip { background:#F3F4F6; color:#6B7280; }

/* Severity Inline */
.severity-inline { font-weight:700; color:var(--accent-red); }
.severity-inline .sev-num { font-size:18px; }

/* Grid Layouts */
.grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.grid-3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; }

/* Chart Container */
.chart-container { background:var(--bg-card); border-radius:12px; padding:24px; margin-bottom:16px; box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.chart-container h3 { font-size:14px; font-weight:600; margin-bottom:16px; color:var(--text-primary); }
.chart-wrap { position:relative; max-height:280px; }

/* Prose (rendered markdown) */
.prose h2 { font-size:17px; font-weight:700; margin:28px 0 12px; padding-bottom:8px; border-bottom:1px solid var(--border); color:var(--text-primary); }
.prose h3 { font-size:15px; font-weight:600; margin:20px 0 8px; color:var(--text-primary); }
.prose h4 { font-size:14px; font-weight:600; margin:16px 0 6px; color:var(--text-primary); }
.prose p { font-size:13px; color:var(--text-secondary); line-height:1.7; margin:8px 0; }
.prose hr { border:none; border-top:1px solid var(--border); margin:28px 0; }
.prose ul { list-style:none; padding:0; margin:8px 0; }
.prose li { padding:4px 0 4px 18px; position:relative; font-size:13px; color:var(--text-secondary); line-height:1.7; }
.prose li::before { content:'•'; position:absolute; left:0; color:var(--accent-blue); font-weight:bold; }
.prose li.ol { list-style:decimal; margin-left:20px; padding-left:4px; }
.prose li.ol::before { display:none; }
.prose strong { color:var(--text-primary); font-weight:600; }
.prose em { font-style:italic; }

/* Post Cards Grid */
.post-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; margin:20px 0; }
.post-card { background:var(--bg-card); border-radius:10px; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.05); transition:transform 0.2s,box-shadow 0.2s; display:flex; flex-direction:column; }
.post-card:hover { transform:translateY(-2px); box-shadow:0 4px 16px rgba(0,0,0,0.08); }
.post-thumb { aspect-ratio:16/9; overflow:hidden; background:#f0ede8; display:flex; align-items:center; justify-content:center; }
.post-thumb img { width:100%; height:100%; object-fit:cover; }
.post-thumb .no-img { font-size:28px; color:var(--text-muted); }
.post-body { padding:14px; flex:1; display:flex; flex-direction:column; }
.post-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.post-score-badge { font-size:11px; font-weight:700; background:var(--accent-indigo); color:#fff; padding:2px 8px; border-radius:4px; }
.post-score-badge.strike { background:#DC2626; }
.post-score-badge.opportunity { background:#D97706; }
.post-score-badge.monitor { background:#2563EB; }
.post-title { font-size:13px; font-weight:600; line-height:1.4; margin-bottom:8px; flex:1; }
.post-title a { color:var(--text-primary); text-decoration:none; }
.post-title a:hover { color:var(--accent-blue); text-decoration:underline; }
.post-meta { font-size:11px; color:var(--text-muted); display:flex; gap:12px; flex-wrap:wrap; margin-top:auto; }
.post-creator { font-weight:500; }

/* Route Cards */
.route-card { display:flex; gap:24px; background:var(--bg-card); border-radius:12px; padding:28px; margin-bottom:20px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border-left:4px solid var(--accent-indigo); }
.route-score-big { min-width:80px; text-align:center; }
.route-score-big .num { font-size:48px; font-weight:800; color:var(--accent-indigo); line-height:1; }
.route-score-big .den { font-size:18px; color:var(--text-muted); font-weight:600; }
.route-score-big.high .num { color:#DC2626; }
.route-score-big.mid .num { color:#D97706; }
.route-content { flex:1; min-width:0; }
.route-content h3 { font-size:18px; font-weight:700; margin-bottom:12px; }

/* Footer */
footer { background:#1a1a2e; color:rgba(255,255,255,0.4); padding:28px; text-align:center; font-size:12px; margin-top:48px; letter-spacing:0.3px; }

/* Print */
@media print {
  .tab-nav, .no-print { display:none; }
  .panel { display:block !important; page-break-before:always; }
  .panel:first-child { page-break-before:avoid; }
  body { font-size:11px; background:#fff; }
  .hero { padding:24px 0; }
  .stat-row { margin-top:0; }
  .card { box-shadow:none; border:1px solid #ddd; }
  .big-insight { color:#000; background:#f0f0f0; }
  .big-insight p, .big-insight h3 { color:#000; }
}

/* Responsive */
@media (max-width:768px) {
  .grid-2, .grid-3 { grid-template-columns:1fr; }
  .do-dont { grid-template-columns:1fr; }
  .versus-row { grid-template-columns:1fr; }
  .vs-badge { width:auto; height:32px; margin:0; }
  .hero h1 { font-size:24px; }
  .stat-row { grid-template-columns:repeat(2,1fr); }
  .tab-nav { overflow-x:auto; }
}
`;

// ─── Main Dashboard Builder ─────────────────────────────────────────

export function buildHtmlDashboard(
  title: string,
  results: ScrapeResult[],
  analyses: AnalysisResult[]
): string {
  const narrative = analyses.find((a) => a.pass_type === 'strategic_narrative');
  const crossSource = analyses.find((a) => a.pass_type === 'cross_source');
  const creativeRoutes = analyses.find((a) => a.pass_type === 'creative_routes');
  const perSource = analyses.filter((a) => a.pass_type === 'per_source');

  const platforms = [...new Set(results.map((r) => r.source_platform))];
  const totalItems = results.reduce((sum, r) => sum + r.item_count, 0);
  const date = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const narrativeSections = narrative ? splitSections(narrative.analysis_content) : [];

  // Build executive summary as a big-insight card (first section)
  const execSection = narrativeSections.find(
    (s) => s.title.toLowerCase().includes('executive') || s.title.toLowerCase().includes('headline')
  );
  const otherSections = narrativeSections.filter((s) => s !== execSection);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — Research Intelligence</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <style>${DASHBOARD_CSS}</style>
</head>
<body>

<!-- Hero Header -->
<header class="hero">
  <div class="container">
    <div class="label">Research Intelligence Report</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(date)}</div>
    <div class="meta">
      <span>${totalItems.toLocaleString()} data points analyzed</span>
      <span>·</span>
      <span>${platforms.length} platforms</span>
      <span>·</span>
      <span>${perSource.length} source analyses</span>
    </div>
  </div>
</header>

<!-- Stat Cards -->
<div class="container">
  <div class="stat-row">
    <div class="stat-card">
      <div class="num">${totalItems.toLocaleString()}</div>
      <div class="label">Data Points</div>
    </div>
    <div class="stat-card">
      <div class="num">${platforms.length}</div>
      <div class="label">Platforms</div>
    </div>
    <div class="stat-card">
      <div class="num">${narrativeSections.length}</div>
      <div class="label">Insight Sections</div>
    </div>
    <div class="stat-card">
      <div class="num">${perSource.length}</div>
      <div class="label">Source Analyses</div>
    </div>
  </div>
</div>

<!-- Tab Navigation -->
<div class="container no-print">
  <div class="tab-nav" id="tab-nav" role="tablist">
    <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel-overview" onclick="showTab('overview',this)">Overview</button>
    ${perSource.map((a) => {
      const p = a.source_platform || '';
      const displayName = ACTOR_REGISTRY[p as Platform]?.displayName || p;
      return `<button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-${p}" onclick="showTab('${p}',this)">${escapeHtml(displayName)}</button>`;
    }).join('\n    ')}
    ${crossSource ? `<button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-cross-source" onclick="showTab('cross-source',this)">Cross-Source</button>` : ''}
    ${creativeRoutes ? `<button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-creative-routes" onclick="showTab('creative-routes',this)">Creative Routes</button>` : ''}
    <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel-data" onclick="showTab('data',this)">Data Overview</button>
  </div>
</div>

<!-- ═══ Overview Tab ═══ -->
<div id="panel-overview" class="panel active container" role="tabpanel" style="padding-bottom:48px;">
  ${execSection ? `
  <div class="big-insight">
    <div class="pre">${escapeHtml(execSection.title)}</div>
    <div class="prose" style="color:rgba(255,255,255,0.85);">${markdownToHtml(execSection.body).replace(/class="quote-block"/g, 'class="quote-block" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.9);"')}</div>
  </div>` : ''}

  ${otherSections.map((section) => {
    const icon = sectionIcon(section.title);
    const tier = sectionTier(section.title);
    return `
  <div class="card ${tier}">
    <div class="card-header">
      <span class="icon">${icon}</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <div class="prose">${markdownToHtml(section.body)}</div>
  </div>`;
  }).join('')}
</div>

<!-- ═══ Per-Source Tabs ═══ -->
${perSource.map((analysis) => {
  const platform = analysis.source_platform || '';
  const sections = splitSections(analysis.analysis_content);
  const platformResults = results.filter((r) => r.source_platform === platform);
  const itemCount = platformResults.reduce((sum, r) => sum + r.item_count, 0);

  // Find executive/top-line section for this platform
  const topLine = sections.find(
    (s) => s.title.toLowerCase().includes('top-line') || s.title.toLowerCase().includes('verdict')
  );
  const otherPlatformSections = sections.filter((s) => s !== topLine);

  return `
<div id="panel-${platform}" class="panel container" role="tabpanel" style="padding-bottom:48px;">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
    ${platformBadgeHtml(platform)}
    <span style="font-size:13px;color:var(--text-muted);">${itemCount.toLocaleString()} items collected</span>
  </div>

  ${topLine ? `
  <div class="big-insight" style="margin-top:0;">
    <div class="pre">${escapeHtml(topLine.title)}</div>
    <div class="prose" style="color:rgba(255,255,255,0.85);">${markdownToHtml(topLine.body).replace(/class="quote-block"/g, 'class="quote-block" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.9);"')}</div>
  </div>` : ''}

  ${otherPlatformSections.map((section) => {
    const icon = sectionIcon(section.title);
    const tier = sectionTier(section.title);
    return `
  <div class="card ${tier}">
    <div class="card-header">
      <span class="icon">${icon}</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <div class="prose">${markdownToHtml(section.body)}</div>
  </div>`;
  }).join('')}

  ${platform === 'google_trends' ? '' : buildTopPostsHtml((analysis.metadata?.top_items || []) as TopItemDisplay[], platform)}
</div>`;
}).join('')}

<!-- ═══ Cross-Source Tab ═══ -->
${crossSource ? `
<div id="panel-cross-source" class="panel container" role="tabpanel" style="padding-bottom:48px;">
  ${(() => {
    const sections = splitSections(crossSource.analysis_content);
    const headline = sections.find(
      (s) => s.title.toLowerCase().includes('headline') || s.title.toLowerCase().includes('summary')
    );
    const others = sections.filter((s) => s !== headline);
    return `
  ${headline ? `
  <div class="big-insight" style="margin-top:0;">
    <div class="pre">${escapeHtml(headline.title)}</div>
    <div class="prose" style="color:rgba(255,255,255,0.85);">${markdownToHtml(headline.body).replace(/class="quote-block"/g, 'class="quote-block" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.3);color:rgba(255,255,255,0.9);"')}</div>
  </div>` : ''}

  ${others.map((section) => {
    const icon = sectionIcon(section.title);
    const tier = sectionTier(section.title);
    return `
  <div class="card ${tier}">
    <div class="card-header">
      <span class="icon">${icon}</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <div class="prose">${markdownToHtml(section.body)}</div>
  </div>`;
  }).join('')}`;
  })()}
</div>` : ''}

<!-- ═══ Creative Routes Tab ═══ -->
${creativeRoutes ? `
<div id="panel-creative-routes" class="panel container" role="tabpanel" style="padding-bottom:48px;">
  <div class="big-insight" style="margin-top:0;">
    <div class="pre">Creative Routes</div>
    <h3 style="color:#fff;">Strategic directions anchored in cultural truths from the data</h3>
    <p>Each route is scored 0-10 based on cultural relevance, brand fit, and creative potential.</p>
  </div>

  ${(() => {
    const sections = splitSections(creativeRoutes.analysis_content);
    return sections.map((section) => {
      if (section.title.toLowerCase().includes('route')) {
        return buildRouteCardHtml(section);
      }
      const icon = sectionIcon(section.title);
      const tier = sectionTier(section.title);
      return `
  <div class="card ${tier}">
    <div class="card-header">
      <span class="icon">${icon}</span>
      <h2>${escapeHtml(section.title)}</h2>
    </div>
    <div class="prose">${markdownToHtml(section.body)}</div>
  </div>`;
    }).join('');
  })()}
</div>` : ''}

<!-- ═══ Data Overview Tab ═══ -->
<div id="panel-data" class="panel container" role="tabpanel" style="padding-bottom:48px;">
  <div class="grid-2">
    <div class="chart-container">
      <h3>Platform Distribution</h3>
      <div class="chart-wrap">
        <canvas id="platformChart"></canvas>
      </div>
    </div>
    <div class="chart-container">
      <h3>Items by Platform</h3>
      <div class="chart-wrap">
        <canvas id="platformBarChart"></canvas>
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:8px;">
    <h3>Collection Summary</h3>
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Platform</th>
            <th>Items</th>
            <th>Scrape Jobs</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${platforms.map((p) => {
            const pResults = results.filter((r) => r.source_platform === p);
            const pItems = pResults.reduce((sum, r) => sum + r.item_count, 0);
            const pct = totalItems > 0 ? ((pItems / totalItems) * 100).toFixed(1) : '0';
            const displayName = ACTOR_REGISTRY[p as Platform]?.displayName || p;
            return `
          <tr>
            <td>${platformBadgeHtml(p)} ${escapeHtml(displayName)}</td>
            <td><strong>${pItems.toLocaleString()}</strong></td>
            <td>${pResults.length}</td>
            <td>${pct}%</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h3>Platform Badges</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      ${platforms.map((p) => platformBadgeHtml(p)).join(' ')}
    </div>
  </div>
</div>

<!-- ═══ Scripts ═══ -->
<script>
// Tab switching with scroll position memory
const tabScrollPositions = {};
let currentTab = 'overview';

function showTab(name, btn) {
  tabScrollPositions[currentTab] = window.scrollY;

  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
  if (btn) {
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
  }

  history.replaceState(null, '', '#' + name);
  currentTab = name;

  const saved = tabScrollPositions[name];
  window.scrollTo(0, saved || 0);
}

// Keyboard nav for tabs
document.addEventListener('keydown', function(e) {
  const tabs = Array.from(document.querySelectorAll('.tab-btn'));
  const idx = tabs.indexOf(document.activeElement);
  if (idx === -1) return;
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    e.preventDefault();
    const next = e.key === 'ArrowRight'
      ? tabs[(idx + 1) % tabs.length]
      : tabs[(idx - 1 + tabs.length) % tabs.length];
    next.focus();
    next.click();
  }
});

// Load tab from URL hash
document.addEventListener('DOMContentLoaded', function() {
  const hash = window.location.hash.replace('#', '');
  if (hash && document.getElementById('panel-' + hash)) {
    const btn = document.querySelector('.tab-btn[aria-controls="panel-' + hash + '"]');
    showTab(hash, btn);
  }
});

// Charts
${buildChartScript(results)}
</script>

<!-- Footer -->
<footer>
  Research Intelligence Report &middot; Generated ${escapeHtml(date)} &middot; ${totalItems.toLocaleString()} data points across ${platforms.length} platforms
</footer>

</body>
</html>`;
}
