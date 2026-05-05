const fs = require('fs');
const path = require('path');

function processFile(filePath) {
	let code = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	const oldTimelineRegex = /\{detailEntry\.status !== "SUBMITTED" && detailEntry\.status !== "DRAFT" && \([\s\S]*?\{detailEntry\.facultyRemark && \([\s\S]*?<\/div>[\s\S]*?\)\}[\s\S]*?<\/div>[\s\S]*?\)\}/;

	if (code.match(oldTimelineRegex)) {
		const newTimelineJSX = `{(() => {
											let displayRemark = detailEntry.facultyRemark;
											let reviewerName = detailEntry.signedByName || "Faculty";
											
											if (detailEntry.status === "NEEDS_REVISION" && displayRemark && displayRemark.startsWith("[")) {
												const match = displayRemark.match(/^\\[(.*?)\\]\\s*(.*)/);
												if (match) {
													reviewerName = match[1];
													displayRemark = match[2];
												}
											}

											return detailEntry.status !== "SUBMITTED" && detailEntry.status !== "DRAFT" ? (
												<div className="relative mt-1">
													<div className={\`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background \${detailEntry.status === "SIGNED" ? "bg-green-500" : "bg-amber-500"}\`} />
													<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
														{detailEntry.status === "SIGNED" ? "Signed" : "Sent back for Revision"}
													</div>
													<div className="text-sm">
														by <span className="font-medium text-foreground">{reviewerName}</span>
													</div>
													<div className="text-xs text-muted-foreground mt-0.5">
														{format(new Date(detailEntry.updatedAt), "dd MMM yyyy, hh:mm a")}
													</div>
													{displayRemark && (
														<div className="mt-3 text-sm bg-muted/40 border border-muted-foreground/20 rounded-md p-3 text-foreground whitespace-pre-wrap">
															<span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Faculty Remark</span>
															{displayRemark}
														</div>
													)}
												</div>
											) : null;
										})()}`;

		code = code.replace(oldTimelineRegex, newTimelineJSX);
		changed = true;
	}

	if (changed) {
		fs.writeFileSync(filePath, code);
		console.log('Updated:', filePath);
	}
}

function walk(dir) {
	fs.readdirSync(dir).forEach(f => {
		const p = path.join(dir, f);
		if(fs.statSync(p).isDirectory()) walk(p);
		else if (f.endsWith('Client.tsx') && !f.includes('ReviewTabs')) {
			try {
				processFile(p);
			} catch(e) {
				console.error("Error processing", p, e.message);
			}
		}
	});
}

walk('src/app/dashboard');
console.log('Done!');
