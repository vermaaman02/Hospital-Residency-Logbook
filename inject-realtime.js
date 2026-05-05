const fs = require('fs');
const path = require('path');

const dir = 'src/actions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  if (content.includes('emitRealtimeEvent') && !f.includes('inbox.ts') && !f.includes('realtime')) {
    let modified = false;

    // We look for patterns like:
    // revalidatePath("...");
    // return { success: true ... };
    content = content.replace(/(revalidatePath\([^\)]+\);\s*)(return\s*{\s*success:\s*true[\s\S]*?};)/g, (match, p1, p2) => {
      if (!match.includes('emitRealtimeEvent')) {
        modified = true;
        return p1 + 'emitRealtimeEvent("entry:updated");\n\t' + p2;
      }
      return match;
    });

    if (modified) {
      console.log(`Updated ${f}`);
      fs.writeFileSync(p, content);
    }
  }
});
