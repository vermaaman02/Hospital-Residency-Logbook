const fs = require('fs');
const path = require('path');

function processFile(filePath) {
	let code = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	// find all occurrences of "export async function reject"
	let parts = code.split(/(?=export async function reject)/);
	
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].startsWith('export async function reject')) {
			let newBody = parts[i];
			
			if (newBody.includes('[`${user.firstName} ${user.lastName}`]')) {
				continue;
			}

			// Simply match facultyRemark: remark
			let oldBody = newBody;
			newBody = newBody.replace(/facultyRemark:\s*remark/g, 'facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}`');

			// also, some use _remark
			newBody = newBody.replace(/facultyRemark:\s*_remark/g, 'facultyRemark: `[${user.firstName} ${user.lastName}] ${_remark}`');

			if (oldBody !== newBody) {
				parts[i] = newBody;
				changed = true;
			}
		}
	}

	if (changed) {
		const newCode = parts.join('');
		fs.writeFileSync(filePath, newCode);
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
