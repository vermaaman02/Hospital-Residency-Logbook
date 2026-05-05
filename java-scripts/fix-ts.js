const fs = require('fs');
const path = require('path');

function processFile(filePath) {
	let code = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	// find: facultyRemark: `[${user.firstName} ${user.lastName}] ${remark}` ?? null
	// replace: facultyRemark: remark ? `[${user.firstName} ${user.lastName}] ${remark}` : null
	
	const badRegex1 = /facultyRemark:\s*`\[\$\{user\.firstName\} \$\{user\.lastName\}\] \$\{remark\}`\s*\?\?\s*null/g;
	const newJSX1 = 'facultyRemark: remark ? `[${user.firstName} ${user.lastName}] ${remark}` : null';

	const badRegex2 = /facultyRemark:\s*`\[\$\{user\.firstName\} \$\{user\.lastName\}\] \$\{_remark\}`\s*\?\?\s*null/g;
	const newJSX2 = 'facultyRemark: _remark ? `[${user.firstName} ${user.lastName}] ${_remark}` : null';

	if (code.match(badRegex1)) {
		code = code.replace(badRegex1, newJSX1);
		changed = true;
	}

	if (code.match(badRegex2)) {
		code = code.replace(badRegex2, newJSX2);
		changed = true;
	}

	if (changed) {
		fs.writeFileSync(filePath, code);
		console.log('Fixed:', filePath);
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
