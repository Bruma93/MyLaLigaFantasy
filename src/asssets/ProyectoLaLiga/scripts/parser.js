#!/usr/bin/env node
// -*- coding: utf-8 -*-

const fs = require('fs');
const path = require('path');

/**
 * Configuration
 */
const fileName = '009.txt'; // Change this to the desired input file name
const INPUT_FILE = path.join(process.env.USERPROFILE, 'Desktop', 'Proyecto LaLiga', 'Fichajes Fantasy 26', fileName);

function getFileNameWithoutExtension(fileName) {
  return fileName.split('.').slice(0, -1).join('.') || fileName;
}

const fileNameSave = getFileNameWithoutExtension(fileName);

/**
 * Clean and normalize text
 */
function cleanText(text) {
  return text.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parse the fantasy file - line by line processing
 */
function parseFantasyFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const transactions = [];

  let i = 0;
  let currentDate = null;

  while (i < lines.length) {
    const line = lines[i].trim();
    i++;

    // Check if this is a date line
    const dateMatch = line.match(/^(\d{1,2}\/\d{2}\/\d{4})$/);
    if (dateMatch) {
      currentDate = dateMatch[1];
      continue;
    }

    // Skip empty lines
    if (!line) continue;

    // Collect lines for transaction
    let transactionText = line;
    let nextIdx = i;

    // Get next few lines to form complete transaction
    while (nextIdx < lines.length && nextIdx < i + 15) {
      const nextLine = lines[nextIdx].trim();
      if (nextLine) {
        transactionText += ' ' + nextLine;
        nextIdx++;
        // Stop if we hit certain keywords that separate transactions
        if (nextLine.match(/^(Market operation|Shield|Reward|No score)$/) ||
            nextLine.match(/^\d{1,2}\/\d{2}\/\d{4}$/)) {
          break;
        }
      } else {
        nextIdx++;
      }
    }

    // Try to parse this transaction
    let transaction = null;

    if (transactionText.includes('has shielded')) {
      transaction = parseShield(transactionText, currentDate);
    } else if (transactionText.includes('did not score')) {
      transaction = parseNoScore(transactionText, currentDate);
    } else if (transactionText.includes('has earned')) {
      transaction = parseReward(transactionText, currentDate);
    } else if ((transactionText.includes('purchased') || transactionText.includes('sold')) &&
               (transactionText.includes('has purchased') || transactionText.includes('has sold'))) {
      transaction = parseMarketOperation(transactionText, currentDate);
    }

    if (transaction) {
      transactions.push(transaction);
      // Move forward
      i = nextIdx;
    }
  }

  return transactions;
}

/**
 * Parse market operation (transfer)
 */
function parseMarketOperation(text, currentDate) {
  try {
    const clean = cleanText(text);

    // Extract date from text if present
    const dateMatch = clean.match(/(\d{1,2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : currentDate;

    if (!date) return null;

    const isPurchase = clean.includes('purchased');
    const isSale = clean.includes('sold');

    if (isPurchase) {
      // Pattern: "X has purchased Y from Z for VALUE€"
      const pattern = /(\w+(?:\s+\w+)*?)\s+has\s+purchased\s+([^f]+?)\s+from\s+([^f]+?)\s+for\s+([\d,\.]+)€/;
      const match = clean.match(pattern);

      if (match) {
        const by = match[1].trim();
        const player = match[2].trim();
        const fromTeam = match[3].trim();
        const valueStr = match[4].replace(/,|\./g, '');
        const value = parseInt(valueStr);

        if (isNaN(value)) return null;

        const clause = !fromTeam.includes('LALIGA');

        return {
          action: 'Market operation',
          date: date,
          value: value,
          by: by,
          from: fromTeam,
          player: player,
          clause: clause
        };
      }
    } else if (isSale) {
      // Pattern: "X has sold player Y to Z for VALUE€"
      const pattern = /(\w+(?:\s+\w+)*?)\s+has\s+sold\s+player\s+([^t]+?)\s+to\s+([^f]+?)\s+for\s+([\d,\.]+)€/;
      const match = clean.match(pattern);

      if (match) {
        const by = match[1].trim();
        const player = match[2].trim();
        const toTeam = match[3].trim();
        const valueStr = match[4].replace(/,|\./g, '');
        const value = parseInt(valueStr);

        if (isNaN(value)) return null;

        const clause = !toTeam.includes('LALIGA');

        return {
          action: 'Market operation',
          date: date,
          value: value,
          by: toTeam,
          from: by,
          player: player,
          clause: clause
        };
      }
    }
  } catch (e) {
    // Silent fail
  }

  return null;
}

/**
 * Parse reward transaction
 */
function parseReward(text, currentDate) {
  try {
    const clean = cleanText(text);

    // Extract date from text if present
    const dateMatch = clean.match(/(\d{1,2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : currentDate;

    if (!date) return null;

    // Pattern: "On matchday XX, TEAM has earned VALUE€"
    const pattern = /On\s+matchday\s+(\d+),\s+([^h]+?)\s+has\s+earned\s+([\d,\.]+)€/;
    const match = clean.match(pattern);

    if (match) {
      const matchDay = parseInt(match[1]);
      let by = match[2].trim();
      const valueStr = match[3].replace(/,|\./g, '');
      const value = parseInt(valueStr);

      if (isNaN(value)) return null;

      return {
        action: 'Reward',
        date: date,
        matchDay: matchDay,
        by: by,
        value: value,
        cause: null
      };
    }
  } catch (e) {
    // Silent fail
  }

  return null;
}

/**
 * Parse no score transaction
 */
function parseNoScore(text, currentDate) {
  try {
    const clean = cleanText(text);

    // Extract date from text if present
    const dateMatch = clean.match(/(\d{1,2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : currentDate;

    if (!date) return null;

    // Remove "No score" keyword and dates to clean up the text
    let cleanedText = clean.replace(/\s*No score\s*/g, '').replace(/\s*\d{1,2}\/\d{2}\/\d{4}\s*/g, '');

    // Pattern: "On matchday XX, TEAM did not score due to REASON"
    // Match carefully to get everything between "due to" and the end
    const pattern = /On\s+matchday\s+(\d+),\s+(.+?)\s+did\s+not\s+score\s+due\s+to\s+(.+?)$/;
    const match = cleanedText.match(pattern);

    if (match) {
      const matchDay = parseInt(match[1]);
      let by = match[2].trim();
      let cause = match[3].trim();

      return {
        action: 'Reward',
        date: date,
        matchDay: matchDay,
        by: by,
        value: 0,
        cause: cause
      };
    }
  } catch (e) {
    // Silent fail
  }

  return null;
}

/**
 * Parse shield/block transaction
 */
function parseShield(text, currentDate) {
  try {
    const clean = cleanText(text);

    // Extract date from text if present
    const dateMatch = clean.match(/(\d{1,2}\/\d{2}\/\d{4})/);
    const date = dateMatch ? dateMatch[1] : currentDate;

    if (!date) return null;

    // Remove 'Shield' keyword if at the beginning
    let cleanedText = clean.replace(/^Shield\s+/, '');

    // Pattern: "X has shielded PLAYER"
    const pattern = /(\w+(?:\s+\w+)*?)\s+has\s+shielded\s+([^0-9\d]+?)(?:\s*\d{1,2}\/\d{2}\/\d{4}|$)/;
    const match = cleanedText.match(pattern);

    if (match) {
      let by = match[1].trim();
      let player = match[2].trim();

      // Remove date from player if it ended up there
      player = player.replace(/\s*\d{1,2}\/\d{2}\/\d{4}\s*$/, '').trim();

      return {
        action: 'Shield',
        date: date,
        by: by,
        player: player
      };
    }
  } catch (e) {
    // Silent fail
  }

  return null;
}

/**
 * Main function
 */
function main() {
/*   const filePath = path.join(process.env.USERPROFILE, 'Desktop', 'Proyecto LaLiga', 'Fichajes Fantasy 26', '04.txt');
 */
  console.log('Parsing file...\n');
  const transactions = parseFantasyFile(INPUT_FILE);

  console.log(`✓ Successfully parsed ${transactions.length} transactions\n`);

  // Display statistics
  const actionCounts = {};
  for (const trans of transactions) {
    const action = trans.action;
    actionCounts[action] = (actionCounts[action] || 0) + 1;
  }

  console.log('Breakdown by type:');
  for (const [action, count] of Object.entries(actionCounts).sort()) {
    console.log(`  ${action}: ${count}`);
  }

  // Save to JSON file
  // Cambiar la ruta de salida para guardar en la carpeta 'transactions' del proyecto
  const outputPath = path.join(__dirname, '..', 'transactions', `transactions_${fileNameSave}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(transactions, null, 2), 'utf-8');

  console.log(`\n✓ Saved to: transactions.json\n`);

  // Display examples grouped by type
  console.log('='.repeat(70));
  console.log('SAMPLE TRANSACTIONS BY TYPE');
  console.log('='.repeat(70));

  const types = ['Market operation', 'Reward', 'Shield'];
  
  for (const type of types) {
    const examples = transactions.filter(t => t.action === type).slice(0, 2);
    if (examples.length > 0) {
      console.log(`\n${type}:`);
      examples.forEach(ex => {
        console.log(JSON.stringify(ex, null, 2));
      });
    }
  }
}

main();
