const fs = require('fs');
const content = fs.readFileSync('e:/Projects/whiskies/app/api/whiskies/route.ts', 'utf8');
for (let i = 0; i < content.length; i++) {
  const code = content.charCodeAt(i);
  if (code > 127) {
    console.log(`Non-ASCII at pos ${i} (line ${content.slice(0, i).split('\n').length}): ${code}`);
  }
}
