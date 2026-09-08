import Ajv2020 from 'ajv/dist/2020.js';
import pluginDatabaseSchema from '../../schema/plugins.schema.json';
import type { PluginDatabase } from '../domain/Plugin';

const DEFAULT_PLUGIN_API_URL =
  'https://script.google.com/macros/s/AKfycbw5XVbE6rm2tXiNAzxTNXZHeXJgChMbm3pY2WBBlDdHoMO0zgp_R9af3qf40MdxAbIy/exec';

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePluginDatabase = ajv.compile<PluginDatabase>(pluginDatabaseSchema);

export async function loadPluginDatabase(): Promise<PluginDatabase> {
  const url = import.meta.env.VITE_PLUGIN_API_URL || DEFAULT_PLUGIN_API_URL;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Plugin API request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();

  if (!validatePluginDatabase(data)) {
    const detail = ajv.errorsText(validatePluginDatabase.errors, { separator: '; ' });
    throw new Error(`Plugin API returned invalid JSON: ${detail}`);
  }

  return data;
}
