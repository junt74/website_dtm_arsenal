const SPREADSHEET_ID = '1hYApsahi3kvSoNrvVv6xMlnNB94eVErP7zYBgftVrW8';
const SHEET_NAME = '所有プラグイン';
const SCHEMA_VERSION = '1.0.0';

function doGet(e) {
  try {
    const database = buildPluginDatabase();
    const callback = e && e.parameter ? e.parameter.callback : '';

    if (callback) {
      if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
        return ContentService
          .createTextOutput('Invalid callback')
          .setMimeType(ContentService.MimeType.TEXT);
      }

      return ContentService
        .createTextOutput(`${callback}(${JSON.stringify(database)});`)
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService
      .createTextOutput(JSON.stringify(database))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    const payload = {
      error: true,
      message: String(error),
    };

    return ContentService
      .createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildPluginDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    throw new Error(`Sheet not found: ${SHEET_NAME}`);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error('Plugin sheet is empty');
  }

  const [header, ...rows] = values;
  const columns = Object.fromEntries(
    header.map((name, index) => [String(name).trim(), index]),
  );

  const requiredColumns = [
    'developer',
    'ProductName',
    'MainCategory',
    'SubCategory',
    '概要',
    '使い方',
  ];

  for (const column of requiredColumns) {
    if (!(column in columns)) {
      throw new Error(`Required column not found: ${column}`);
    }
  }

  const plugins = rows
    .filter((row) => stringValue(row[columns.ProductName]) !== '')
    .map((row) => normalizePlugin(row, columns));

  validatePlugins(plugins);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    source: {
      spreadsheet: ss.getName(),
      sheet: SHEET_NAME,
    },
    plugins,
  };
}

function normalizePlugin(row, columns) {
  const developer = stringValue(row[columns.developer]);
  const productName = stringValue(row[columns.ProductName]);

  return {
    id: makePluginId(developer, productName),
    developer,
    productName,
    mainCategory: stringValue(row[columns.MainCategory]),
    subCategory: stringValue(row[columns.SubCategory]),
    summary: stringValue(row[columns['概要']]),
    usage: stringValue(row[columns['使い方']]),
  };
}

function stringValue(value) {
  return value == null ? '' : String(value).trim();
}

function makePluginId(developer, productName) {
  return `${developer}-${productName}`
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validatePlugins(plugins) {
  const ids = new Set();

  for (const plugin of plugins) {
    if (!plugin.id) {
      throw new Error(`Plugin ID is empty: ${plugin.productName}`);
    }

    if (ids.has(plugin.id)) {
      throw new Error(`Duplicate plugin ID: ${plugin.id}`);
    }

    ids.add(plugin.id);
  }
}
