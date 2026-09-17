import Ajv2020 from 'ajv/dist/2020.js';
import pluginDatabaseSchema from '../../schema/plugins.schema.json';
import type { PluginDatabase } from '../domain/Plugin';

const PLUGIN_DATA_URL = `${import.meta.env.BASE_URL}data/arsenal.json`;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePluginDatabase = ajv.compile<PluginDatabase>(pluginDatabaseSchema);

function assertPluginDatabase(data: unknown): PluginDatabase {
  if (!validatePluginDatabase(data)) {
    const detail = ajv.errorsText(validatePluginDatabase.errors, { separator: '; ' });
    throw new Error(`Plugin data is invalid: ${detail}`);
  }

  return data;
}

export async function loadPluginDatabase(): Promise<PluginDatabase> {
  const response = await fetch(PLUGIN_DATA_URL, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Plugin data request failed: ${response.status} ${response.statusText}`);
  }

  const data: unknown = await response.json();
  return assertPluginDatabase(data);
}
