export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

export function parseCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index++) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") { record.push(field); field = ""; }
    else if (char === "\n") { record.push(field.replace(/\r$/, "")); records.push(record); record = []; field = ""; }
    else field += char;
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  if (field || record.length) { record.push(field.replace(/\r$/, "")); records.push(record); }

  const [headers, ...rows] = records;
  if (!headers?.length) throw new Error("CSV is empty");
  if (new Set(headers).size !== headers.length || headers.some((header) => !header)) throw new Error("CSV has duplicate or empty headers");
  return rows.filter((row) => row.some(Boolean)).map((row, index) => {
    if (row.length !== headers.length) throw new Error(`CSV line ${index + 2}: expected ${headers.length} columns, got ${row.length}`);
    return { line: index + 2, values: Object.fromEntries(headers.map((header, column) => [header, row[column]!])) };
  });
}
