import Ajv2020 from 'ajv/dist/2020.js';
import pluginDatabaseSchema from '../../schema/plugins.schema.json';
import localPluginDatabase from '../data/arsenal.json';
import type { PluginDatabase } from '../domain/Plugin';

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
  return assertPluginDatabase(localPluginDatabase);
}
