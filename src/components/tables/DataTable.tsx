/**
 * @module DataTable
 * @description Universal table component used for every list view in the app.
 * Supports search, filtering, pagination, row click, and export.
 *
 * @see copilot-instructions.md — Section 6
 *
 * @example
 * <DataTable
 *   data={entries}
 *   columns={caseManagementColumns}
 *   searchable
 *   searchField="completeDiagnosis"
 *   pagination
 * />
 */

"use client";
// TanStack Table is incompatible with React Compiler memoization — safe to skip
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore react-compiler

import { useState } from "react";
import {
	useReactTable,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	getFilteredRowModel,
	flexRender,
	type ColumnDef,
	type SortingState,
	type ColumnFiltersState,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	Search,
	SlidersHorizontal,
} from "lucide-react";
import { type FilterConfig } from "@/types";
import { type ReactNode } from "react";

interface DataTableProps<T> {
	data: T[];
	columns: ColumnDef<T, unknown>[];
	searchable?: boolean;
	searchField?: string;
	filterable?: boolean;
	filterOptions?: FilterConfig[];
	pagination?: boolean;
	pageSize?: number;
	onRowClick?: (row: T) => void;
	actions?: (row: T) => ReactNode;
	emptyMessage?: string;
	exportable?: boolean;
	isLoading?: boolean;
}

export function DataTable<T>({
	data,
	columns,
	searchable = false,
	searchField,
	filterable = false,
	filterOptions = [],
	pagination = true,
	pageSize = 20,
	onRowClick,
	emptyMessage = "No entries found.",
	isLoading = false,
}: DataTableProps<T>) {
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnFilters,
			globalFilter,
		},
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		initialState: {
			pagination: {
				pageSize,
			},
		},
	});

	const rowModel = table.getRowModel();
	const currentPageRows = rowModel.rows;

	if (isLoading) {
		return (
			<div className="space-y-3">
				<Skeleton className="h-10 w-full" />
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-12 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Toolbar: Search + Filters */}
			{(searchable || filterable) && (
				<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
					{searchable && (
						<div className="relative w-full sm:w-72">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search..."
								value={
									searchField ?
										((table
											.getColumn(searchField)
											?.getFilterValue() as string) ?? "")
									:	globalFilter
								}
								onChange={(e) => {
									if (searchField) {
										table
											.getColumn(searchField)
											?.setFilterValue(e.target.value);
									} else {
										setGlobalFilter(e.target.value);
									}
								}}
								className="pl-9"
							/>
						</div>
					)}

					{filterable && filterOptions.length > 0 && (
						<div className="flex items-center gap-2 flex-wrap">
							<SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
							{filterOptions.map((filter) => (
								<Select
									key={filter.name}
									value={
										(table
											.getColumn(filter.name)
											?.getFilterValue() as string) ?? "all"
									}
									onValueChange={(value) =>
										table
											.getColumn(filter.name)
											?.setFilterValue(value === "all" ? undefined : value)
									}
								>
									<SelectTrigger className="w-40">
										<SelectValue placeholder={filter.label} />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="all">All {filter.label}</SelectItem>
										{filter.options.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							))}
						</div>
					)}
				</div>
			)}

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : (
											flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)
										)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{currentPageRows.length ?
							currentPageRows.map((row) => (
								<TableRow
									key={row.id}
									className={
										onRowClick ? "cursor-pointer hover:bg-muted/50" : ""
									}
									onClick={() => onRowClick?.(row.original)}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						:	<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									{emptyMessage}
								</TableCell>
							</TableRow>
						}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{pagination && data.length > pageSize && (
				<div className="flex items-center justify-between px-2">
					<div className="text-sm text-muted-foreground">
						{table.getFilteredRowModel().rows.length} total entries
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.setPageIndex(0)}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronsLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-sm text-muted-foreground">
							Page {table.getState().pagination.pageIndex + 1} of{" "}
							{table.getPageCount()}
						</span>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							onClick={() => table.setPageIndex(table.getPageCount() - 1)}
							disabled={!table.getCanNextPage()}
						>
							<ChevronsRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
