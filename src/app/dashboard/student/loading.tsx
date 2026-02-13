/**
 * @module StudentLoading
 * @description Loading skeleton for student dashboard pages.
 */

import { Skeleton } from "@/components/ui/skeleton";

export default function StudentLoading() {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Skeleton className="h-4 w-32" />
				<Skeleton className="h-8 w-56" />
				<Skeleton className="h-4 w-72" />
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-28 rounded-lg" />
				))}
			</div>
			<Skeleton className="h-10 w-full rounded-lg" />
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-14 w-full mt-2 rounded-lg" />
			))}
		</div>
	);
}
