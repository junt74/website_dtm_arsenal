import './styles/main.css';
import type { Plugin } from './domain/Plugin';

const samplePlugins: Plugin[] = [
  {
    id: 'air-music-tech-flavor-pro',
    developer: 'AIR Music Tech',
    productName: 'Flavor Pro',
    mainCategory: 'エフェクター',
    subCategory: 'マルチエフェクト',
    summary: 'レコード、テープ、チューブなどの質感を再現するLo-Fiエフェクト。',
    usage: '',
  },
  {
    id: 'audiothing-megaphone',
    developer: 'AudioThing',
    productName: 'Megaphone',
    mainCategory: 'エフェクター',
    subCategory: 'Lo-Fi / Distortion',
    summary: 'メガホンの質感やハウリングを再現するキャラクターエフェクト。',
    usage: '',
  },
];

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app not found');

let view: 'list' | 'flashcards' = 'list';
let cardIndex = 0;
let revealed = false;

function render(): void {
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
      render();
    });
  });

  app.querySelector<HTMLButtonElement>('[data-action="reveal"]')?.addEventListener('click', () => {
    revealed = !revealed;
    render();
  });

  app.querySelector<HTMLButtonElement>('[data-action="next"]')?.addEventListener('click', () => {
    cardIndex = (cardIndex + 1) % samplePlugins.length;
    revealed = false;
    render();
  });
}

function renderList(): string {
  return `
    <section>
      <div class="toolbar">
        <input type="search" placeholder="プラグインを検索" disabled aria-label="プラグインを検索" />
        <span>${samplePlugins.length} plugins</span>
      </div>
      <div class="plugin-grid">
        ${samplePlugins
          .map(
            (plugin) => `
              <article class="plugin-card">
                <p class="developer">${plugin.developer}</p>
                <h2>${plugin.productName}</h2>
                <p class="category">${plugin.mainCategory} / ${plugin.subCategory}</p>
                <p>${plugin.summary}</p>
              </article>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
}

function renderFlashcard(): string {
  const plugin = samplePlugins[cardIndex];
  return `
    <section class="flashcard-section">
      <p class="progress">${cardIndex + 1} / ${samplePlugins.length}</p>
      <article class="flashcard">
        <p class="developer">${plugin.developer}</p>
        <h2>${plugin.productName}</h2>
        ${
          revealed
            ? `<div class="answer"><p class="category">${plugin.mainCategory} / ${plugin.subCategory}</p><p>${plugin.summary}</p></div>`
            : '<p class="prompt">これは何をするプラグイン？</p>'
        }
      </article>
      <div class="flashcard-actions">
        <button data-action="reveal">${revealed ? '問題に戻る' : '答えを見る'}</button>
        <button data-action="next">次へ</button>
      </div>
    </section>
  `;
}

render();
