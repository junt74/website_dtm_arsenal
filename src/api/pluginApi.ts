import Ajv2020 from 'ajv/dist/2020.js';
import pluginDatabaseSchema from '../../schema/plugins.schema.json';
import type { PluginDatabase } from '../domain/Plugin';

const DEFAULT_PLUGIN_API_URL =
  'https://script.google.com/macros/s/AKfycbzbqd6iZPblh6e0-pm_WzhgyVVTLQhyyc9pjK-E7rwn8vSfkFNwLnv0NH8d8LGx9LIJ/exec';

const JSONP_TIMEOUT_MS = 15_000;

const ajv = new Ajv2020({ allErrors: true, strict: true });
const validatePluginDatabase = ajv.compile<PluginDatabase>(pluginDatabaseSchema);

interface JsonpCallbackRegistry {
  [key: string]: unknown;
}

function assertPluginDatabase(data: unknown): PluginDatabase {
  if (!validatePluginDatabase(data)) {
    const detail = ajv.errorsText(validatePluginDatabase.errors, { separator: '; ' });
    throw new Error(`Plugin API returned invalid JSON: ${detail}`);
  }

  return data;
}

function loadPluginDatabaseJsonp(url: string): Promise<PluginDatabase> {
  return new Promise((resolve, reject) => {
    const callbackName = `__dtmArsenalJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const callbackRegistry = window as unknown as JsonpCallbackRegistry;

    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error('Plugin API request timed out'));
    }, JSONP_TIMEOUT_MS);

    const cleanup = (): void => {
      window.clearTimeout(timeoutId);
      delete callbackRegistry[callbackName];
      script.remove();
    };

    callbackRegistry[callbackName] = (data: unknown): void => {
      try {
        resolve(assertPluginDatabase(data));
      } catch (error) {
        reject(error);
      } finally {
        cleanup();
      }
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Plugin API script could not be loaded'));
    };

    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
    script.async = true;
    document.head.appendChild(script);
  });
}

export async function loadPluginDatabase(): Promise<PluginDatabase> {
  const url = import.meta.env.VITE_PLUGIN_API_URL || DEFAULT_PLUGIN_API_URL;
  return loadPluginDatabaseJsonp(url);
}
