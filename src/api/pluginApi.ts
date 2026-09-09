import Ajv2020 from 'ajv/dist/2020.js';
import pluginDatabaseSchema from '../../schema/plugins.schema.json';
import type { PluginDatabase } from '../domain/Plugin';

const PLUGIN_DATA_URL =
  'https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnSttiEhOs0IDfcLKPAerzh0iSekmx_oQUJ6c5IjF9EzMAkdwJJXjQMWcIeUk6A6TtAfi7qJDuBhGE5B7L9VEswt44ZxoSFo2jrEt6Us2WeMprrJblJN4lcmXNhLqcDwprSW0nF7StHMg6xH3IAwob1sEUKRfXPim1h1u7bkQXEbl6QxTL0xDOlMOhktCV_zasErOHgSgku_cM-HzpCzEchnj1BNusJXxUp7b5_ldPo0FkyF3O3yqzaMfoOGvV4YoOcgVwRUdK22_3pwfeCvlDkfuloNpw&lib=MkbbXuzFhmjvstQgbqov0gnDRHw0gHSXQ';

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
