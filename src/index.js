import { Worker, isMainThread, workerData, parentPort } from 'worker_threads';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { generateReport } from './ReportGenerator.js';

// Configuration parameters - Must be customized to your needs
const title = 'http-stream-performance-tester';
const workersAmount = 10;
const testDuration = 10;
const request = {
  model: 'meta-llama/llama-3-1-70b-instruct',
  raw: true,
  keep_alive: 1800,
  options: {
    num_predict: 2048,
    num_ctx: 128000,
  },
  messages: [
    {
      role: 'user',
      content:
        'Write a Python function to check if a given string is a palindrome. Explain the time complexity of your implementation.',
    },
  ],
};

const __filename = fileURLToPath(import.meta.url);
const workers = [];
const workersResults = {
  latency: {
    initialLatency: [],
    totalLatency: [],
  },
};

if (isMainThread) {
  const initialDate = new Date();

  for (let i = 0; i < workersAmount; i++) {
    workers[i] = {
      id: i,
      w: new Worker(__filename, { workerData: { id: i } }),
    };

    workers[i].w.on('message', (message) => {
      if (message.type === 'result') {
        workersResults.latency.initialLatency.push(message.data.initialLatency);
        workersResults.latency.totalLatency.push(message.data.totalLatency);
      }
    });
  }

  setTimeout(() => {
    workers.forEach((worker) => {
      console.log(`Terminating worker ${worker.id}`);
      worker.w.postMessage('stop');
      worker.w.terminate();
    });

    processResult();

    console.log('result: ', workersResults);

    generateReport(
      title,
      request,
      workersResults,
      formatTableData(workersResults, initialDate)
    );
  }, testDuration * 1000);
} else {
  console.log(`Worker ${workerData.id} started`);

  let keepRunning = true;

  parentPort.on('message', (message) => {
    if (message === 'stop') {
      console.log(`Worker ${workerData.id} stopping`);
      keepRunning = false;
    }
  });

  async function performTask() {
    if (!keepRunning) return;
    const [initialLatency, totalLatency] = await makeRequest();
    parentPort.postMessage({
      type: 'result',
      data: { initialLatency, totalLatency },
    });

    setTimeout(performTask, 500);
  }

  performTask();
}

// Must be customized to your needs
async function makeRequest() {
  const startDate = new Date();

  await axios.get('https://example.com/');

  const endDate = new Date();
  return [1, endDate - startDate];
}

// Can be customized to your needs
function processResult() {
  workersResults.totalRequests = workersResults.latency.totalLatency.length;
  workersResults.latency.avgTotalLatency = Number(
    (
      workersResults.latency.totalLatency.reduce((a, b) => a + b, 0) /
      workersResults.totalRequests
    ).toFixed(2)
  );
  workersResults.latency.p90TotalLatency =
    workersResults.latency.totalLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.9)
    ];
  workersResults.latency.p95TotalLatency =
    workersResults.latency.totalLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.95)
    ];
  workersResults.latency.p99TotalLatency =
    workersResults.latency.totalLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.99)
    ];

  workersResults.latency.avgInitialLatency = Number(
    (
      workersResults.latency.initialLatency.reduce((a, b) => a + b, 0) /
      workersResults.totalRequests
    ).toFixed(2)
  );

  workersResults.latency.p90InitialLatency =
    workersResults.latency.initialLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.9)
    ];
  workersResults.latency.p95InitialLatency =
    workersResults.latency.initialLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.95)
    ];
  workersResults.latency.p99InitialLatency =
    workersResults.latency.initialLatency.sort((a, b) => a - b)[
      Math.floor(workersResults.totalRequests * 0.99)
    ];
}

// Can be customized to your needs also the report.html
function formatTableData(workersResults, initialDate) {
  const finalDate = new Date();
  const testDuration = (finalDate - initialDate) / 1000;
  return {
    totalRequests: workersResults.totalRequests,
    virtualUsers: workersAmount,
    avgTotalLatency: formatLatency(workersResults.latency.avgTotalLatency),
    p90TotalLatency: formatLatency(workersResults.latency.p90TotalLatency),
    p95TotalLatency: formatLatency(workersResults.latency.p95TotalLatency),
    p99TotalLatency: formatLatency(workersResults.latency.p99TotalLatency),
    avgInitialLatency: formatLatency(workersResults.latency.avgInitialLatency),
    p90InitialLatency: formatLatency(workersResults.latency.p90InitialLatency),
    p95InitialLatency: formatLatency(workersResults.latency.p95InitialLatency),
    p99InitialLatency: formatLatency(workersResults.latency.p99InitialLatency),
    initialDate: initialDate.toLocaleString(),
    finalDate: new Date().toLocaleString(),
    testDuration: testDuration.toFixed(1),
  };
}

function formatLatency(latency) {
  return latency + 'ms';
}
