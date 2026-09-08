export interface Plugin {
  id: string;
  developer: string;
  productName: string;
  mainCategory: string;
  subCategory: string;
  summary: string;
  usage: string;
}

export interface PluginDatabase {
  schemaVersion: string;
  generatedAt: string;
  source: {
    spreadsheet: string;
    sheet: string;
  };
  plugins: Plugin[];
}
