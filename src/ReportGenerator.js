import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {Object} TableData
 * @property {number} totalRequests - Total number of requests.
 * @property {number} virtualUsers - Number of virtual users.
 * @property {string} avgTotalLatency - Average total latency.
 * @property {string} p90TotalLatency - 90th percentile of total latency.
 * @property {string} p95TotalLatency - 95th percentile of total latency.
 * @property {string} p99TotalLatency - 99th percentile of total latency.
 * @property {string} avgInitialLatency - Average initial latency.
 * @property {string} p90InitialLatency - 90th percentile of initial latency.
 * @property {string} p95InitialLatency - 95th percentile of initial latency.
 * @property {string} p99InitialLatency - 99th percentile of initial latency.
 * @property {string} testDuration - Test duration in seconds.
 */

/**
 * Title of the report
 * @typedef {string} ReportTitle
 * Request Body
 * @typedef {Object} RequestData
 * Benchmark Results
 * @typedef {Object} BenchmarkResults
 * Data to be displayed in the report
 * @param {TableData} tableData - List of data to be displayed in the report.
 */
export const generateReport = async (
  reportTitle,
  requestData,
  results,
  tableData
) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const htmlFilePath = `file://${__dirname}/html/report.html`;

  await page.goto(htmlFilePath, { waitUntil: 'networkidle0' });

  await page.evaluate(
    ({ reportTitle, requestData, tableData }) => {
      document.title = reportTitle;
      document.getElementById('title').textContent = reportTitle;
      document.getElementById('request').textContent = JSON.stringify(
        requestData,
        null,
        4
      );
      document.getElementById('dataInicio').textContent =
        tableData.initialDate.toLocaleString();
      document.getElementById('dataFim').textContent =
        tableData.finalDate.toLocaleString();
      document.getElementById('model').textContent = requestData.model;
      document.getElementById('testDuration').textContent =
        tableData.testDuration;

      const tabela = document.querySelector('table');
      const tbody = tabela.querySelector('tbody');
      const tr = document.createElement('tr');
      tr.innerHTML = `
      <td>${tableData.totalRequests}</td>
      <td>${tableData.virtualUsers}</td>
      <td>${tableData.avgTotalLatency}</td>
      <td>${tableData.p90TotalLatency}</td>
      <td>${tableData.p95TotalLatency}</td>
      <td>${tableData.p99TotalLatency}</td>
      <td>${tableData.avgInitialLatency}</td>
      <td>${tableData.p90InitialLatency}</td>
      <td>${tableData.p95InitialLatency}</td>
      <td>${tableData.p99InitialLatency}</td>
    `;
      tbody.appendChild(tr);
    },
    { reportTitle, requestData, tableData }
  );

  const invalidCharsRegex = /[\/:*?"<>|,]/g;
  const dateGen = new Date().toLocaleString().replace(invalidCharsRegex, '-');
  const modelName = requestData.model.replace(invalidCharsRegex, '-');

  await page.pdf({
    path: `reports/report-${dateGen}--${modelName}.pdf`,
    format: 'A4',
    printBackground: true,
  });

  const htmlContent = await page.content();
  fs.writeFileSync(`reports/report-${dateGen}--${modelName}.html`, htmlContent);
  await browser.close();

  console.log('HTML and PDF created successfully.');
};
