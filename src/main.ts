import './styles/main.css';
import { loadPluginDatabase } from './api/pluginApi';
import type { Plugin } from './domain/Plugin';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

let plugins: Plugin[] = [];
let filteredPlugins: Plugin[] = [];
let view: 'list' | 'flashcards' = 'list';
let cardIndex = 0;
let revealed = false;
let query = '';
let loading = true;
let loadError: string | null = null;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function applyFilter(): void {
  const normalized = query.trim().toLocaleLowerCase('ja-JP');

  filteredPlugins = normalized
    ? plugins.filter((plugin) =>
        [
          plugin.productName,
          plugin.developer,
          plugin.mainCategory,
          plugin.subCategory,
          plugin.summary,
          plugin.usage,
        ].some((value) => value.toLocaleLowerCase('ja-JP').includes(normalized)),
      )
    : [...plugins];

  cardIndex = Math.min(cardIndex, Math.max(filteredPlugins.length - 1, 0));
}

function render(): void {
  if (loading) {
    app.innerHTML = `
      <main class="app-shell">
        <p class="status">プラグイン一覧を読み込んでいます…</p>
      </main>
    `;
    return;
  }

  if (loadError) {
    app.innerHTML = `
      <main class="app-shell">
        <section class="error-panel">
          <p class="eyebrow">DTM Plugin Database</p>
          <h1>DTM Arsenal</h1>
          <h2>データを取得できませんでした</h2>
          <p>${escapeHtml(loadError)}</p>
          <button data-action="retry">再読み込み</button>
        </section>
      </main>
    `;
    app.querySelector<HTMLButtonElement>('[data-action="retry"]')?.addEventListener('click', () => {
      void bootstrap();
    });
    return;
  }

  app.innerHTML = `
    <main class="app-shell">
      <header class="app-header">
        <div>
          <p class="eyebrow">DTM Plugin Database</p>
          <h1>DTM Arsenal</h1>
        </div>
        <nav class="tabs" aria-label="表示切替">
          <button data-view="list" class="tab ${view === 'list' ? 'is-active' : ''}">一覧</button>
          <button data-view="flashcards" class="tab ${view === 'flashcards' ? 'is-active' : ''}">フラッシュカード</button>
        </nav>
      </header>
      ${view === 'list' ? renderList() : renderFlashcard()}
    </main>
  `;

  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      view = button.dataset.view as 'list' | 'flashcards';
      revealed = false;
      render();
    });
  });

  const searchInput = app.querySelector<HTMLInputElement>('[data-search]');
  searchInput?.addEventListener('input', () => {
    query = searchInput.value;
    applyFilter();
    render();
    const nextInput = app.querySelector<HTMLInputElement>('[data-search]');
    nextInput?.focus();
    nextInput?.setSelectionRange(query.length, query.length);
  });

  app.querySelector<HTMLButtonElement>('[data-action="reveal"]')?.addEventListener('click', () => {
    revealed = !revealed;
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener('click', () => {
    if (filteredPlugins.length === 0) return;
    cardIndex = (cardIndex + 1) % filteredPlugins.length;
    revealed = false;
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="previous"]')?.addEventListener('click', () => {
    if (filteredPlugins.length === 0) return;
    cardIndex = (cardIndex - 1 + filteredPlugins.length) % filteredPlugins.length;
    revealed = false;
    render();
  });
}

function renderList(): string {
  return `
    <section>
      <div class="toolbar">
        <input
          data-search
          type="search"
          value="${escapeHtml(query)}"
          placeholder="製品名、メーカー、カテゴリ、概要、使い方から検索"
          aria-label="プラグインを検索"
        />
        <span>${filteredPlugins.length} / ${plugins.length} plugins</span>
      </div>
      ${
        filteredPlugins.length === 0
          ? '<p class="status">該当するプラグインはありません。</p>'
          : `<div class="plugin-grid">
              ${filteredPlugins
                .map(
                  (plugin) => `
                    <article class="plugin-card">
                      <p class="developer">${escapeHtml(plugin.developer)}</p>
                      <h2>${escapeHtml(plugin.productName)}</h2>
                      <p class="category">${escapeHtml(plugin.mainCategory)} / ${escapeHtml(plugin.subCategory)}</p>
                      <p>${escapeHtml(plugin.summary)}</p>
                      ${plugin.usage ? `<p class="usage">${escapeHtml(plugin.usage)}</p>` : ''}
                    </article>
                  `,
                )
                .join('')}
            </div>`
      }
    </section>
  `;
}

function renderFlashcard(): string {
  if (filteredPlugins.length === 0) {
    return '<section class="flashcard-section"><p class="status">出題できるプラグインがありません。</p></section>';
  }

  const plugin = filteredPlugins[cardIndex];

  return `
    <section class="flashcard-section">
      <div class="toolbar flashcard-toolbar">
        <input
          data-search
          type="search"
          value="${escapeHtml(query)}"
          placeholder="出題対象を検索で絞り込み"
          aria-label="フラッシュカード出題対象を検索"
        />
        <span>${cardIndex + 1} / ${filteredPlugins.length}</span>
      </div>
      <article class="flashcard">
        <p class="developer">${escapeHtml(plugin.developer)}</p>
        <h2>${escapeHtml(plugin.productName)}</h2>
        ${
          revealed
            ? `<div class="answer">
                <p class="category">${escapeHtml(plugin.mainCategory)} / ${escapeHtml(plugin.subCategory)}</p>
                <p>${escapeHtml(plugin.summary)}</p>
                ${plugin.usage ? `<p class="usage">${escapeHtml(plugin.usage)}</p>` : ''}
              </div>`
            : '<p class="prompt">これは何をするプラグイン？</p>'
        }
      </article>
      <div class="flashcard-actions">
        <button data-action="previous">前へ</button>
        <button data-action="reveal">${revealed ? '問題に戻る' : '答えを見る'}</button>
        <button data-action="next">次へ</button>
      </div>
    </section>
  `;
}

async function bootstrap(): Promise<void> {
  loading = true;
  loadError = null;
  render();

  try {
    const database = await loadPluginDatabase();
    plugins = [...database.plugins].sort((a, b) => {
      const developerOrder = a.developer.localeCompare(b.developer, 'ja');
      return developerOrder || a.productName.localeCompare(b.productName, 'ja');
    });
    applyFilter();
  } catch (error) {
    loadError = error instanceof Error ? error.message : String(error);
  } finally {
    loading = false;
    render();
  }
}

void bootstrap();
