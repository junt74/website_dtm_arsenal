import './styles/main.css';
import { loadPluginDatabase } from './api/pluginApi';
import type { Plugin } from './domain/Plugin';
import { shuffleCopy } from './domain/shuffle';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('#app not found');
const app: HTMLDivElement = appElement;

let plugins: Plugin[] = [];
let filteredPlugins: Plugin[] = [];
let flashcardPlugins: Plugin[] = [];
let view: 'list' | 'flashcards' = 'list';
let cardIndex = 0;
let revealed = false;
let query = '';
let selectedDeveloper = '';
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

function listDevelopers(): string[] {
	return [
		...new Set(plugins.map((plugin) => plugin.developer).filter(Boolean)),
	].sort((a, b) => a.localeCompare(b, 'ja'));
}

function matchesQuery(plugin: Plugin, normalized: string): boolean {
	if (!normalized) return true;

	return [
		plugin.productName,
		plugin.developer,
		plugin.mainCategory,
		plugin.subCategory,
		plugin.summary,
		plugin.usage,
	].some((value) => value.toLocaleLowerCase('ja-JP').includes(normalized));
}

function applyFilter(): void {
	const normalized = query.trim().toLocaleLowerCase('ja-JP');

	filteredPlugins = plugins.filter((plugin) => {
		if (selectedDeveloper && plugin.developer !== selectedDeveloper)
			return false;
		return matchesQuery(plugin, normalized);
	});

	flashcardPlugins = shuffleCopy(filteredPlugins);
	cardIndex = 0;
	revealed = false;
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
		app
			.querySelector<HTMLButtonElement>('[data-action="retry"]')
			?.addEventListener('click', () => {
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
			const nextView = button.dataset.view as 'list' | 'flashcards';
			if (nextView === 'flashcards' && view !== 'flashcards') {
				flashcardPlugins = shuffleCopy(filteredPlugins);
				cardIndex = 0;
			}
			view = nextView;
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

	const developerSelect =
		app.querySelector<HTMLSelectElement>('[data-developer]');
	developerSelect?.addEventListener('change', () => {
		selectedDeveloper = developerSelect.value;
		applyFilter();
		render();
	});

	const flashcard = app.querySelector<HTMLElement>(
		'[data-action="advance-card"]',
	);
	const advanceFlashcard = (): void => {
		if (!revealed) {
			revealed = true;
		} else {
			cardIndex = (cardIndex + 1) % flashcardPlugins.length;
			revealed = false;
		}
		render();
	};

	flashcard?.addEventListener('click', advanceFlashcard);
	flashcard?.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter' && event.key !== ' ') return;
		event.preventDefault();
		advanceFlashcard();
	});
}

function renderDeveloperOptions(): string {
	return listDevelopers()
		.map((developer) => {
			const selected = developer === selectedDeveloper ? ' selected' : '';
			return `<option value="${escapeHtml(developer)}"${selected}>${escapeHtml(developer)}</option>`;
		})
		.join('');
}

function renderList(): string {
	return `
    <section>
      <div class="toolbar">
        <div class="toolbar-filters">
          <input
            data-search
            type="search"
            value="${escapeHtml(query)}"
            placeholder="製品名、メーカー、カテゴリ、概要、使い方から検索"
            aria-label="プラグインを検索"
          />
          <select data-developer aria-label="メーカーで絞り込み">
            <option value=""${selectedDeveloper === '' ? ' selected' : ''}>すべてのメーカー</option>
            ${renderDeveloperOptions()}
          </select>
        </div>
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
	if (flashcardPlugins.length === 0) {
		return '<section class="flashcard-section"><p class="status">出題できるプラグインがありません。</p></section>';
	}

	const plugin = flashcardPlugins[cardIndex];

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
        <span>${cardIndex + 1} / ${flashcardPlugins.length}</span>
      </div>
      <article
        class="flashcard"
        data-action="advance-card"
        role="button"
        tabindex="0"
        aria-label="${revealed ? '次の問題へ進む' : '答えを表示する'}"
      >
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
        <p class="flashcard-hint">${revealed ? '押すと次の問題へ' : '押すと答えを表示'}</p>
      </article>
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
