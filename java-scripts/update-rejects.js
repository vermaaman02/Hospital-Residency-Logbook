const fs = require('fs');
const path = require('path');

function processFile(filePath) {
	let code = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	const rejectFuncRegex = /(export async function reject\w+\(.*?\)\s*\{)([\s\S]*?)(\})/g;
	
	code = code.replace(rejectFuncRegex, (match, signature, body, ending) => {
		let newBody = body;
		
		if (newBody.includes('[`${user.firstName} ${user.lastName}`]')) {
			return match;
		}

		const hasUser = newBody.includes('const user = await prisma.user.findUnique');
		if (!hasUser) {
			const insertionPoint = newBody.indexOf('requireRole');
			if (insertionPoint !== -1) {
				const lineEnd = newBody.indexOf(';', insertionPoint) + 1;
				newBody = newBody.slice(0, lineEnd) + 
					`\n\tconst clerkId = await requireAuth();\n\tconst user = await prisma.user.findUnique({ where: { clerkId } });\n\tif (!user) throw new Error("User not found");\n` + 
					newBody.slice(lineEnd);
			} else {
				newBody = `\n\tconst clerkId = await requireAuth();\n\tconst user = await prisma.user.findUnique({ where: { clerkId } });\n\tif (!user) throw new Error("User not found");\n` + newBody;
			}
		}

		// Simply match facultyRemark: remark
		newBody = newBody.replace(/facultyRemark:\s*remark/g, 'facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`');

		return signature + newBody + ending;
	});

	if (code !== fs.readFileSync(filePath, 'utf8')) {
		fs.writeFileSync(filePath, code);
		console.log('Updated actions in:', filePath);
	}
}

function walk(dir) {
	fs.readdirSync(dir).forEach(f => {
		const p = path.join(dir, f);
		if(fs.statSync(p).isDirectory()) walk(p);
		else if (f.endsWith('.ts')) {
			try {
				processFile(p);
			} catch(e) {
				console.error("Error processing", p, e.message);
			}
		}
	});
}

walk('src/actions');
console.log('Done!');
