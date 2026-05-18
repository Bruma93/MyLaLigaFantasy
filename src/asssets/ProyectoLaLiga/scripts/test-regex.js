const testText = "On matchday 33, Tele Prados did not score due to incomplete alignment. No score 28/04/2026";

function cleanText(text) {
  return text.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
}

const clean = cleanText(testText);
console.log("Cleaned text:", clean);

let cleanedText = clean.replace(/\s*No score\s*/g, '').replace(/\s*\d{1,2}\/\d{2}\/\d{4}\s*/g, '');
console.log("After removing 'No score' and dates:", cleanedText);

const pattern = /On\s+matchday\s+(\d+),\s+(.+?)\s+did\s+not\s+score\s+due\s+to\s+(.+?)$/;
const match = cleanedText.match(pattern);

if (match) {
  console.log("✓ Match found!");
  console.log("matchDay:", match[1]);
  console.log("by:", match[2].trim());
  console.log("cause:", match[3].trim());
} else {
  console.log("✗ No match found");
}

