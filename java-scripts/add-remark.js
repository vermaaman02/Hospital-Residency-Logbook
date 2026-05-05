const fs = require('fs');
let content = fs.readFileSync('src/actions/inbox.ts', 'utf8');

// Add remark to interface
if (!content.includes('remark?: string | null;')) {
  content = content.replace(/export interface InboxItem \{([\s\S]*?)href:\s*string;\n\}/, 'export interface InboxItem {$1href: string;\n\tremark?: string | null;\n}');
}

// Map facultyRemark
content = content.replace(/status:\s*i\.status,\s*updatedAt/g, 'status: i.status, remark: (i as any).facultyRemark || null, updatedAt');

fs.writeFileSync('src/actions/inbox.ts', content);
