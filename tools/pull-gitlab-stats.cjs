#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs').promises;
const fs_sync = require('fs');
const path = require('path');

// Define the default output directory
const DEFAULT_OUTPUT_DIR = path.join(process.cwd(), 'src', 'data');
// Allow overriding the output directory via environment variable
const OUTPUT_DIR = process.env.OUTPUT_DIR || DEFAULT_OUTPUT_DIR;

// Configuration with defaults
const config = {
  interval: 'day', // Default interval, will be overridden by args
  startDate: new Date(), // Default will be modified below
  endDate: new Date(),
  months: 1 // Default number of months to look back
};

// Process command line arguments for interval and date range
function processArgs() {
  const args = process.argv.slice(2);
  let repoUrlProvided = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--interval=')) {
      const interval = args[i].split('=')[1].toLowerCase();
      if (['day', 'week', 'month'].includes(interval)) {
        config.interval = interval;
      } else {
        console.warn(`Invalid interval: ${interval}. Using default: ${config.interval}`);
      }
    } else if (args[i].startsWith('--from=')) {
      const fromDate = new Date(args[i].split('=')[1]);
      if (!isNaN(fromDate.getTime())) {
        config.startDate = fromDate;
      } else {
        console.warn(`Invalid from date. Using default.`);
      }
    } else if (args[i].startsWith('--to=')) {
      const toDate = new Date(args[i].split('=')[1]);
      if (!isNaN(toDate.getTime())) {
        config.endDate = toDate;
      } else {
        console.warn(`Invalid to date. Using default.`);
      }
    } else if (args[i].startsWith('--months=')) {
      const months = parseInt(args[i].split('=')[1]);
      if (!isNaN(months) && months > 0) {
        config.months = months;
      } else {
        console.warn(`Invalid months value. Using default: ${config.months}`);
      }
    } else if (!args[i].startsWith('--')) {
      // If it doesn't start with --, assume it's the repo URL
      repoUrl = args[i];
      repoUrlProvided = true;
    }
  }

  // If no specific start date was provided, calculate based on months
  if (args.every(arg => !arg.startsWith('--from='))) {
    config.startDate = new Date();
    config.startDate.setMonth(config.startDate.getMonth() - config.months);
  }

  return repoUrlProvided;
}

// Function to load environment variables from .env file
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs_sync.existsSync(envPath)) {
    const envContent = fs_sync.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      // Remove spaces
      line = line.trim();
      // Skip empty lines and comments
      if (!line || line.startsWith('#')) return;
      // Split by the first '='
      const index = line.indexOf('=');
      if (index === -1) return;
      const key = line.substring(0, index).trim();
      const value = line.substring(index + 1).trim();
      // Set variable in process.env if not already set
      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    });
  }
}
loadEnv();

const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
let repoUrl = '';

// Process command-line arguments
const repoUrlProvided = processArgs();

if (!repoUrlProvided) {
  repoUrl = process.argv[2]; // Fallback to old behavior
}

if (!GITLAB_TOKEN || !repoUrl) {
  console.error(`Usage: export GITLAB_TOKEN={your_token} node pull-gitlab-stats.js https://gitlab.com/username/repo 
Optional parameters:
  --interval=day|week|month (default: ${config.interval})
  --from=YYYY-MM-DD (default: ${config.months} months ago)
  --to=YYYY-MM-DD (default: now)
  --months=number (default: ${config.months}, only used if --from is not specified)`);
  process.exit(1);
}

const projectPath = repoUrl.split('https://gitlab.com/')[1];
const repoName = projectPath.split('/').pop();

const apiBase = 'https://gitlab.com/api/v4';
const headers = {
  'PRIVATE-TOKEN': GITLAB_TOKEN
};

// Function to update status in one line
function logStatus(message) {
  process.stdout.write(`\r${message.padEnd(80)}`); // Clear and update the line
}

async function getProjectId() {
  logStatus('Fetching project ID...');
  try {
    const response = await axios.get(
      `${apiBase}/projects/${encodeURIComponent(projectPath)}`,
      { headers }
    );
    return response.data.id;
  } catch (error) {
    console.error('\nError getting project ID:', error.message);
    process.exit(1);
  }
}

// Get array of intervals (day, week, or month) between start and end dates
function getIntervalArray(startDate, endDate, intervalType) {
  const intervals = [];
  let currentDate = new Date(startDate);

  // Ensure startDate begins at the start of its interval
  switch (intervalType) {
    case 'day':
      currentDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      currentDate = new Date(currentDate.setDate(diff));
      currentDate.setHours(0, 0, 0, 0);
      break;
    case 'month':
      currentDate.setDate(1);
      currentDate.setHours(0, 0, 0, 0);
      break;
  }

  while (currentDate <= endDate) {
    // Format depends on interval type
    switch (intervalType) {
      case 'day':
        intervals.push(currentDate.toISOString().slice(0, 10)); // YYYY-MM-DD
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case 'week':
        // ISO week format: YYYY-Www (e.g., 2023-W01)
        const weekYear = currentDate.getFullYear();
        const weekNum = getWeekNumber(currentDate);
        intervals.push(`${weekYear}-W${weekNum.toString().padStart(2, '0')}`);
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case 'month':
        intervals.push(currentDate.toISOString().slice(0, 7)); // YYYY-MM
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
  }
  return intervals;
}

// Helper to get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Get date of an interval string
function getIntervalDate(intervalStr, intervalType) {
  if (intervalType === 'day') {
    return new Date(intervalStr);
  } else if (intervalType === 'week') {
    // Parse YYYY-Www format
    const year = parseInt(intervalStr.slice(0, 4));
    const week = parseInt(intervalStr.slice(6, 8));
    return getDateOfWeek(week, year);
  } else {
    // Month: YYYY-MM format
    return new Date(`${intervalStr}-01`);
  }
}

// Helper to get date from week number
function getDateOfWeek(week, year) {
  const date = new Date(year, 0, 1 + (week - 1) * 7);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(date.setDate(diff));
}

// Get interval for a commit date based on interval type
function getIntervalForDate(dateStr, intervalType) {
  const date = new Date(dateStr);
  switch (intervalType) {
    case 'day':
      return dateStr.slice(0, 10); // YYYY-MM-DD
    case 'week':
      const weekYear = date.getFullYear();
      const weekNum = getWeekNumber(date);
      return `${weekYear}-W${weekNum.toString().padStart(2, '0')}`;
    case 'month':
      return dateStr.slice(0, 7); // YYYY-MM
  }
}

async function getCommits(projectId) {
  let allCommits = [];
  let page = 1;
  const perPage = 100;
  let totalCommits = 0;

  try {
    // First, get the total number of commits for progress
    const initialResponse = await axios.get(
      `${apiBase}/projects/${projectId}/repository/commits`,
      {
        headers,
        params: {
          since: config.startDate.toISOString(),
          until: config.endDate.toISOString(),
          per_page: 1,
          page: 1
        }
      }
    );
    totalCommits = parseInt(initialResponse.headers['x-total'] || 0);

    while (true) {
      logStatus(`Fetching commits: page ${page}, collected ${allCommits.length}/${totalCommits}`);

      const response = await axios.get(
        `${apiBase}/projects/${projectId}/repository/commits`,
        {
          headers,
          params: {
            since: config.startDate.toISOString(),
            until: config.endDate.toISOString(),
            per_page: perPage,
            page: page,
            all: true,
            with_stats: true
          }
        }
      );

      if (response.data.length === 0) break;
      allCommits = allCommits.concat(response.data);
      page++;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Remove individual diff requests, rely only on stats
    return allCommits;
  } catch (error) {
    console.error('\nError fetching commits:', error.message);
    process.exit(1);
  }
}

function processCommits(commits, intervals) {
  const commitCounts = {};
  const editCounts = {};
  const authors = new Set();
  let processed = 0;

  commits.forEach(commit => {
    processed++;
    logStatus(`Processing commit ${processed}/${commits.length}`);

    const author = commit.author_name;
    authors.add(author);
    const interval = getIntervalForDate(commit.committed_date, config.interval);

    if (!commitCounts[author]) {
      commitCounts[author] = {};
      editCounts[author] = {};
    }
    commitCounts[author][interval] = (commitCounts[author][interval] || 0) + 1;

    let totalEdits = 0;
    if (commit.stats) {
      totalEdits = (commit.stats.additions || 0) + (commit.stats.deletions || 0);
    }
    editCounts[author][interval] = (editCounts[author][interval] || 0) + totalEdits;
  });

  const chartData = intervals.map((interval, index) => {
    logStatus(`Formatting data: interval ${index + 1}/${intervals.length}`);
    const intervalData = { interval };
    authors.forEach(author => {
      intervalData[`${author}_commits`] = commitCounts[author]?.[interval] || 0;
      intervalData[`${author}_edits`] = editCounts[author]?.[interval] || 0;
    });
    return intervalData;
  });

  return {
    data: chartData,
    authors: Array.from(authors),
    config: {
      interval: config.interval,
      startDate: config.startDate.toISOString(),
      endDate: config.endDate.toISOString()
    }
  };
}

async function main() {
  console.log('Starting data collection...');
  console.log(`Date range: ${config.startDate.toISOString().slice(0, 10)} to ${config.endDate.toISOString().slice(0, 10)}`);
  console.log(`Interval: ${config.interval}`);

  const projectId = await getProjectId();
  const commits = await getCommits(projectId);
  const intervals = getIntervalArray(config.startDate, config.endDate, config.interval);
  let chartData = processCommits(commits, intervals);

  logStatus('Saving data to file...');

  // Ensure the output directory exists
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
  } catch (error) {
    console.warn(`Warning: Could not create directory ${OUTPUT_DIR}:`, error.message);
  }

  // Create a formatted date range for the filename
  const startFormatted = config.startDate.toISOString().slice(0, 10);
  const endFormatted = config.endDate.toISOString().slice(0, 10);

  // Include repo name, time period, and interval in the filename
  const outputFile = path.join(
    OUTPUT_DIR,
    `${repoName}_${startFormatted}_to_${endFormatted}_${config.interval}.json`
  );

  await fs.writeFile(
    outputFile,
    JSON.stringify(chartData, null, 2)
  );

  console.log(`\nChart data saved to ${outputFile}`);
  console.log(`Processed ${commits.length} commits from ${chartData.authors.length} authors`);
  console.log(`Time period: ${intervals.length} ${config.interval}s from ${intervals[0]} to ${intervals[intervals.length - 1]}`);
}

main().catch(error => {
  console.error('\nUnexpected error:', error.message);
  process.exit(1);
});