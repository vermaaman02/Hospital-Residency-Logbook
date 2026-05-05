const fs = require('fs');
const path = require('path');

const basePath = path.join(__dirname, 'src', 'actions');
const files = fs.readdirSync(basePath).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const filePath = path.join(basePath, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Check if the file has revalidate calls but is missing emitRealtimeEvent calls entirely
    // Or if there are still bare revalidate calls without an emit right after
    
    // Check if we need to add the import
    const needsImport = (content.includes('revalidateAll()') || content.includes('revalidatePath')) && !content.includes('emitRealtimeEvent');
    
    if (needsImport) {
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
        changed = true;
    }

    // Determine default event based on filename
    let defaultEvent = "entry:updated";
    if (file.includes('assessment')) defaultEvent = "assessment:updated";
    if (file.includes('user')) defaultEvent = "user:updated";
    if (file.includes('batch')) defaultEvent = "batch:updated";
    if (file.includes('department')) defaultEvent = "system:updated";
    if (file.includes('form')) defaultEvent = "system:updated";
    if (file.includes('attendance')) defaultEvent = "attendance:updated";
    if (file.includes('rotation')) defaultEvent = "rotation:updated";

    // Replace revalidateAll(); with revalidateAll(); \n emitRealtimeEvent(...);
    const revalAllMatches = content.match(/(\t+revalidateAll\(\);\n)(?!\s*emitRealtimeEvent)/g);
    if (revalAllMatches) {
        content = content.replace(/(\t+revalidateAll\(\);\n)(?!\s*emitRealtimeEvent)/g, `$1$2\temitRealtimeEvent("${defaultEvent}");\n`);
        changed = true;
    }

    // Replace revalidatePath(path); with revalidatePath(path); \n emitRealtimeEvent(...);
    // Ignore if it's already followed by emitRealtimeEvent
    const revalPathMatches = content.match(/(\t*revalidatePath\([^)]+\);\n)(?!\s*emitRealtimeEvent)/g);
    if (revalPathMatches) {
        // Exclude the case where we are inside a function defining revalidateAll
        content = content.replace(/(\t*revalidatePath\([^)]+\);\n)(?!\s*emitRealtimeEvent)/g, (match, p1) => {
            // Don't inject if it's part of the revalidateAll function definition itself
            if (p1.includes('revalidatePath(STUDENT_PATH)') || 
                p1.includes('revalidatePath(FACULTY_PATH)') || 
                p1.includes('revalidatePath(HOD_PATH)') ||
                p1.includes('revalidatePath("/dashboard') // hardcoded paths inside revalidateAll
            ) {
                // We shouldn't emit inside the definition of revalidateAll unless it's a standalone revalidatePath mutation
                // Let's just inject it and if there's multiple we can clean it up later, but safer to only inject for dynamic paths or single mutations
                return match; 
            }
            return `${p1}\t${p1.match(/^\t*/)[0]}emitRealtimeEvent("${defaultEvent}");\n`;
        });
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
}
