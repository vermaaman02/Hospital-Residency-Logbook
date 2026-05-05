const fs = require('fs');
const path = require('path');

function processFile(filePath) {
	let code = fs.readFileSync(filePath, 'utf8');
	let changed = false;

	// 1. Remove truncate and hover title from Status TableCell
	// Look for: className="... truncate ..." title={...facultyRemark...}
	const truncateTitleRegex = /(<p className="[^"]*)truncate([^"]*"[^>]*title=\{[^\}]*\})>/g;
	if (code.match(truncateTitleRegex)) {
		code = code.replace(truncateTitleRegex, '$1break-words$2>');
		changed = true;
	}

	// 2. We want to replace the existing "Status" or "Status Info" DetailSection and any "Faculty Remark" DetailSection
	// with our new Status & Timeline DetailSection.
	const statusSectionRegex = /\{\/\*[\s\S]*?(?:Status|Status Info)[\s\S]*?\*\/\}\s*<DetailSection title="Status.*?" icon=\{.*?\}>[\s\S]*?<\/DetailSection>/g;
	const remarkSectionRegex = /\{\/\*[\s\S]*?(?:Faculty Remark|Remark if exists)[\s\S]*?\*\/\}\s*\{detailEntry\.facultyRemark && \([\s\S]*?<\/DetailSection>\s*\)\}/g;

	const timelineJSX = `{/* Status & Timeline */}
								<DetailSection title="Status & Timeline" icon={Clock}>
									<div className="flex flex-col gap-3 border-l-2 border-muted pl-4 ml-2 py-1">
										<div className="relative">
											<div className="absolute -left-[23px] top-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-background" />
											<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Submitted</div>
											<div className="text-sm">
												by <span className="font-medium text-foreground">{detailEntry.user.firstName} {detailEntry.user.lastName}</span>
											</div>
											<div className="text-xs text-muted-foreground mt-0.5">
												{format(new Date(detailEntry.createdAt), "dd MMM yyyy, hh:mm a")}
											</div>
										</div>

										{detailEntry.status !== "SUBMITTED" && detailEntry.status !== "DRAFT" && (
											<div className="relative mt-1">
												<div className={\`absolute -left-[23px] top-1 h-3 w-3 rounded-full border-2 border-background \${detailEntry.status === "SIGNED" ? "bg-green-500" : "bg-amber-500"}\`} />
												<div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
													{detailEntry.status === "SIGNED" ? "Signed" : "Sent back for Revision"}
												</div>
												<div className="text-sm">
													by <span className="font-medium text-foreground">{detailEntry.signedByName || "Faculty"}</span>
												</div>
												<div className="text-xs text-muted-foreground mt-0.5">
													{format(new Date(detailEntry.updatedAt), "dd MMM yyyy, hh:mm a")}
												</div>
												{detailEntry.facultyRemark && (
													<div className="mt-3 text-sm bg-muted/40 border border-muted-foreground/20 rounded-md p-3 text-foreground whitespace-pre-wrap">
														<span className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">Faculty Remark</span>
														{detailEntry.facultyRemark}
													</div>
												)}
											</div>
										)}
									</div>
								</DetailSection>`;

	let hasStatusSection = !!code.match(statusSectionRegex);
	if (hasStatusSection) {
		// remove existing remark section if it exists
		code = code.replace(remarkSectionRegex, '');
		// replace status section with timeline
		code = code.replace(statusSectionRegex, timelineJSX);
		
		// If "Clock" icon is not imported, import it from lucide-react
		if (!code.includes('Clock,')) {
			code = code.replace(/import \{(.*?)\} from "lucide-react"/, 'import { Clock, $1 } from "lucide-react"');
		}

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
