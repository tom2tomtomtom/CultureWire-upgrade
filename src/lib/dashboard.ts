import { ACTOR_REGISTRY } from './actor-registry';
import type { AnalysisResult, Platform, ScrapeResult } from './types';

interface DashboardData {
  title: string;
  date: string;
  platforms: string[];
  totalItems: number;
  strategicNarrative: string;
  crossSource: string;
  perSourceAnalyses: { platform: string; content: string }[];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function markdownToHtml(md: string): string {
  let html = md;

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr class="my-8 border-gray-200">');

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-8 mb-3 text-gray-900">$1</h2>');

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>');

  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Blockquotes
  html = html.replace(/^>\s*(.+)$/gm, '<blockquote class="border-l-4 border-indigo-300 bg-indigo-50/50 px-4 py-2 my-3 text-sm italic text-gray-700">$1</blockquote>');

  // Tables
  html = html.replace(/(\|.+\|[\s\S]*?\n)(?=\n|$)/g, (tableBlock) => {
    const rows = tableBlock.trim().split('\n').filter((r) => r.trim());
    if (rows.length < 2) return tableBlock;

    const headerCells = rows[0].split('|').filter((c) => c.trim()).map((c) => c.trim());
    // Skip separator row (row[1] with dashes)
    const dataRows = rows.slice(2);

    let table = '<div class="overflow-x-auto my-4"><table class="w-full text-sm border-collapse">';
    table += '<thead><tr class="bg-gray-100">';
    for (const cell of headerCells) {
      table += `<th class="px-3 py-2 text-left font-semibold text-gray-700 border-b">${cell}</th>`;
    }
    table += '</tr></thead><tbody>';
    for (const row of dataRows) {
      const cells = row.split('|').filter((c) => c.trim()).map((c) => c.trim());
      table += '<tr class="border-b border-gray-100 hover:bg-gray-50">';
      for (const cell of cells) {
        table += `<td class="px-3 py-2 text-gray-600">${cell}</td>`;
      }
      table += '</tr>';
    }
    table += '</tbody></table></div>';
    return table;
  });

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li class="text-sm text-gray-600 ml-4 list-disc">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*<\/li>\n?)+)/g, '<ul class="my-2 space-y-1">$1</ul>');

  // Ordered lists
  html = html.replace(/^\d+\.\s(.+)$/gm, '<li class="text-sm text-gray-600 ml-4 list-decimal">$1</li>');

  // Paragraphs (lines not already tagged)
  html = html.replace(/^(?!<[a-z])((?!<).+)$/gm, '<p class="text-sm text-gray-600 my-2 leading-relaxed">$1</p>');

  return html;
}

function platformBadge(platform: string): string {
  const classes: Record<string, string> = {
    reddit: 'bg-orange-500 text-white',
    trustpilot: 'bg-green-600 text-white',
    youtube: 'bg-red-600 text-white',
    tiktok: 'bg-black text-white',
    google_trends: 'bg-blue-500 text-white',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  };
  const display = ACTOR_REGISTRY[platform as Platform]?.displayName || platform;
  return `<span class="text-xs font-semibold px-2.5 py-0.5 rounded-full ${classes[platform] || 'bg-gray-500 text-white'}">${escapeHtml(display)}</span>`;
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
  if (lower.includes('answer')) return '💬';
  return '📌';
}

function tierClass(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('strike')) return 'border-l-4 border-red-500 bg-red-50/50';
  if (lower.includes('opportunit') && !lower.includes('white')) return 'border-l-4 border-amber-500 bg-amber-50/50';
  if (lower.includes('battleground') || lower.includes('tension') || lower.includes('risk')) return 'border-l-4 border-orange-500 bg-orange-50/50';
  if (lower.includes('monitor') || lower.includes('watch')) return 'border-l-4 border-blue-500 bg-blue-50/50';
  if (lower.includes('executive') || lower.includes('headline') || lower.includes('summary')) return 'border-l-4 border-indigo-500 bg-indigo-50/50';
  return '';
}

export function buildHtmlDashboard(
  title: string,
  results: ScrapeResult[],
  analyses: AnalysisResult[]
): string {
  const narrative = analyses.find((a) => a.pass_type === 'strategic_narrative');
  const crossSource = analyses.find((a) => a.pass_type === 'cross_source');
  const perSource = analyses.filter((a) => a.pass_type === 'per_source');

  const platforms = [...new Set(results.map((r) => r.source_platform))];
  const totalItems = results.reduce((sum, r) => sum + r.item_count, 0);
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Split narrative into sections for tabbed display
  const narrativeSections = narrative ? splitSections(narrative.analysis_content) : [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — Research Intelligence</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        strike: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
                        opportunity: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
                        monitor: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
                    }
                }
            }
        }
    </script>
    <style>
        .card { background: white; border-radius: 0.75rem; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: box-shadow 0.2s; }
        .card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .tab-active { border-bottom: 2px solid #6366f1; color: #4f46e5; font-weight: 600; }
        .tab-inactive { color: #6b7280; cursor: pointer; }
        .tab-inactive:hover { color: #374151; }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        @media print { .no-print { display: none; } body { font-size: 11px; } }
    </style>
</head>
<body class="bg-gray-50 text-gray-900">

<!-- Hero Header -->
<header class="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
    <div class="max-w-7xl mx-auto px-6">
        <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-mono bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">RESEARCH INTELLIGENCE</span>
            <span class="text-xs text-gray-400">${escapeHtml(date)}</span>
        </div>
        <h1 class="text-4xl font-bold mb-2">${escapeHtml(title)}</h1>
        <div class="flex flex-wrap gap-4 mt-6 text-sm">
            <div><span class="text-gray-400">Content Analyzed:</span> <span class="font-semibold">${totalItems.toLocaleString()}</span></div>
            <div><span class="text-gray-400">Platforms:</span> <span class="flex gap-1 inline-flex">${platforms.map(platformBadge).join(' ')}</span></div>
        </div>
    </div>
</header>

<!-- Stat Cards -->
<div class="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-6 max-w-7xl mx-auto px-6 mb-8">
    <div class="card text-center">
        <div class="text-3xl font-bold text-gray-900">${platforms.length}</div>
        <div class="text-sm text-gray-500">PLATFORMS</div>
    </div>
    <div class="card text-center">
        <div class="text-3xl font-bold text-gray-900">${totalItems.toLocaleString()}</div>
        <div class="text-sm text-gray-500">DATA POINTS</div>
    </div>
    <div class="card text-center">
        <div class="text-3xl font-bold text-gray-900">${narrativeSections.length}</div>
        <div class="text-sm text-gray-500">SECTIONS</div>
    </div>
    <div class="card text-center">
        <div class="text-3xl font-bold text-gray-900">${perSource.length}</div>
        <div class="text-sm text-gray-500">SOURCE ANALYSES</div>
    </div>
</div>

<!-- Tab Navigation -->
<div class="max-w-7xl mx-auto px-6 mb-6 no-print">
    <div class="flex gap-6 border-b border-gray-200 pb-0" id="tab-nav">
        <button class="tab-active pb-3 text-sm" onclick="showTab('overview')">Overview</button>
        ${perSource.map((a) => `<button class="tab-inactive pb-3 text-sm" onclick="showTab('${a.source_platform}')">${escapeHtml(ACTOR_REGISTRY[a.source_platform as Platform]?.displayName || a.source_platform || '')}</button>`).join('\n        ')}
        ${crossSource ? '<button class="tab-inactive pb-3 text-sm" onclick="showTab(\'cross-source\')">Cross-Source</button>' : ''}
    </div>
</div>

<!-- Overview Tab -->
<div class="tab-content active max-w-7xl mx-auto px-6 pb-12" id="tab-overview">
    ${narrativeSections.map((section, i) => {
      const icon = sectionIcon(section.title);
      const tier = tierClass(section.title);
      const isFirst = i === 0;
      return `
    <div class="card mb-4 ${tier}${isFirst ? ' ring-1 ring-indigo-200' : ''}">
        <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">${icon}</span>
            <h2 class="text-lg font-bold text-gray-900">${escapeHtml(section.title)}</h2>
        </div>
        <div class="prose-content">${markdownToHtml(section.body)}</div>
    </div>`;
    }).join('')}
</div>

<!-- Per-Source Tabs -->
${perSource.map((analysis) => {
  const platform = analysis.source_platform || '';
  const sections = splitSections(analysis.analysis_content);
  const platformResults = results.filter((r) => r.source_platform === platform);
  const itemCount = platformResults.reduce((sum, r) => sum + r.item_count, 0);
  return `
<div class="tab-content max-w-7xl mx-auto px-6 pb-12" id="tab-${platform}">
    <div class="flex items-center gap-3 mb-6">
        ${platformBadge(platform)}
        <span class="text-sm text-gray-500">${itemCount.toLocaleString()} items collected</span>
    </div>
    ${sections.map((section) => {
      const icon = sectionIcon(section.title);
      const tier = tierClass(section.title);
      return `
    <div class="card mb-4 ${tier}">
        <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">${icon}</span>
            <h2 class="text-lg font-bold text-gray-900">${escapeHtml(section.title)}</h2>
        </div>
        <div class="prose-content">${markdownToHtml(section.body)}</div>
    </div>`;
    }).join('')}
</div>`;
}).join('')}

<!-- Cross-Source Tab -->
${crossSource ? `
<div class="tab-content max-w-7xl mx-auto px-6 pb-12" id="tab-cross-source">
    ${splitSections(crossSource.analysis_content).map((section) => {
      const icon = sectionIcon(section.title);
      const tier = tierClass(section.title);
      return `
    <div class="card mb-4 ${tier}">
        <div class="flex items-center gap-2 mb-3">
            <span class="text-xl">${icon}</span>
            <h2 class="text-lg font-bold text-gray-900">${escapeHtml(section.title)}</h2>
        </div>
        <div class="prose-content">${markdownToHtml(section.body)}</div>
    </div>`;
    }).join('')}
</div>` : ''}

<!-- Tab Switching Script -->
<script>
function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-nav button').forEach(el => {
        el.classList.remove('tab-active');
        el.classList.add('tab-inactive');
    });
    const target = document.getElementById('tab-' + tabId);
    if (target) target.classList.add('active');
    event.target.classList.remove('tab-inactive');
    event.target.classList.add('tab-active');
}
</script>

<!-- Footer -->
<footer class="bg-gray-900 text-gray-400 py-6 mt-12">
    <div class="max-w-7xl mx-auto px-6 text-center text-sm">
        Generated by Research Intelligence Agent &middot; ${escapeHtml(date)}
    </div>
</footer>

</body>
</html>`;
}
