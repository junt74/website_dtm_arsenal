import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPluginDatabase } from './api/pluginApi';

const pluginDatabase = {
  schemaVersion: '1.0.0',
  generatedAt: '2026-09-17T16:24:10.004Z',
  source: {
    spreadsheet: 'DTM 所有プラグインリスト',
    sheet: '所有プラグイン',
  },
  plugins: [
    {
      id: 'test-plugin',
      developer: 'Test Developer',
      productName: 'Test Plugin',
      mainCategory: 'エフェクター',
      subCategory: 'テスト',
      summary: 'Test summary',
      usage: 'Test usage',
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loadPluginDatabase', () => {
  it('loads the published arsenal.json as a valid plugin database', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(pluginDatabase), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const database = await loadPluginDatabase();

    expect(fetchMock).toHaveBeenCalledWith('/website_dtm_arsenal/data/arsenal.json', {
      cache: 'no-store',
    });
    expect(database.schemaVersion).toBe('1.0.0');
    expect(database.source.sheet).toBe('所有プラグイン');
    expect(database.plugins.length).toBeGreaterThan(0);
    expect(database.plugins[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        productName: expect.any(String),
      }),
    );
  });
});
