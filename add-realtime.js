const fs = require('fs');
const path = require('path');

const targetFiles = [
    { file: "procedure-logs.ts", event: "entry:updated" },
    { file: "case-management.ts", event: "entry:updated" },
    { file: "diagnostic-skills.ts", event: "entry:updated" },
    { file: "rotation-postings.ts", event: "rotation:updated" },
    { file: "attendance.ts", event: "attendance:updated" },
    { file: "batch-management.ts", event: "batch:updated" },
    { file: "department-management.ts", event: "system:updated" },
    { file: "form-definitions.ts", event: "system:updated" }
];

const basePath = path.join(__dirname, 'src', 'actions');

for (const target of targetFiles) {
    const filePath = path.join(basePath, target.file);
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${target.file} (not found)`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    
    // Add import if not exists
    if (!content.includes('emitRealtimeEvent')) {
        content = content.replace(
            /(import \{ revalidatePath \} from "next\/cache";)/,
            `$1\nimport { emitRealtimeEvent } from "@/lib/realtime-emit";`
        );
        // Fallback if revalidatePath isn't exactly that
        if (!content.includes('emitRealtimeEvent')) {
             content = content.replace(
                /(import .* from "next\/cache";)/,
                `$1\nimport { emitRealtimeEvent } from "@/lib/realtime-emit";`
            );
        }
    }

    // Add emit after revalidateAll();
    content = content.replace(/(\t+revalidateAll\(\);\n)(?!\s*emitRealtimeEvent)/g, `$1$2\temitRealtimeEvent("${target.event}");\n`);
    
    // Add emit after revalidatePath(PATH);
    // Be careful to use the correct indentation
    content = content.replace(/(\t+revalidatePath\([^)]+\);\n)(?!\s*emitRealtimeEvent)/g, `$1$2\temitRealtimeEvent("${target.event}");\n`);

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${target.file}`);
}
