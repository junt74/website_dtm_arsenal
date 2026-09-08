import { describe, expect, it } from 'vitest';
import { loadPluginDatabase } from './api/pluginApi';

describe('loadPluginDatabase', () => {
  it('loads the bundled arsenal.json as a valid plugin database', async () => {
    const database = await loadPluginDatabase();

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
