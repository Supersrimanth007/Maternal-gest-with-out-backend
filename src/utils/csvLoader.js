import Papa from "papaparse";

export async function loadCSV(filePath) {
  const response = await fetch(filePath);
  const text = await response.text();

  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data);
      },
    });
  });
}
