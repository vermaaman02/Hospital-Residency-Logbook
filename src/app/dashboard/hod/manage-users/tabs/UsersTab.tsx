/**
 * @module UsersTab
 * @description Users list with search, sort, role change, ban/unban, batch assignment.
 * Shown in the "Users" tab of the Manage Users page.
 *
 * @see copilot-instructions.md — Section 6
 */

"use client";

import { useState, useTransition, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
Select,
SelectContent,
SelectItem,
SelectTrigger,
SelectValue,
} from "@/components/ui/select";
import {
Table,
TableBody,
TableCell,
TableHead,
TableHeader,
TableRow,
} from "@/components/ui/table";
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import {
Card,
CardContent,
CardDescription,
CardHeader,
CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
setUserRole,
banUser,
unbanUser,
deleteUserPermanently,
updateUserInfo,
pullUsersFromClerk,
syncClerkUsersToDB,
} from "@/actions/user-management";
import {
assignStudentToBatch,
removeStudentFromBatch,
} from "@/actions/batch-management";
import { toast } from "sonner";
import {
Search,
Shield,
UserCog,
GraduationCap,
Ban,
ShieldCheck,
ArrowUpDown,
Filter,
Clock,
Loader2,
FolderPlus,
X,
Pencil,
Trash2,
CloudDownload,
RefreshCw,
AlertCircle,
CheckSquare,
Square,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { UserData, BatchData } from "../ManageUsersClient";

interface UsersTabProps {
users: UserData[];
batches: BatchData[];
}

type SortField = "name" | "role" | "status" | "semester" | "createdAt";
type SortOrder = "asc" | "desc";
type RoleFilter = "all" | "hod" | "faculty" | "student";
type StatusFilter =
| "all"
| "ACTIVE"
| "BANNED"
| "TEMPORARILY_BANNED"
| "DELETED";

const roleBadgeClasses: Record<string, string> = {
hod: "bg-purple-100 text-purple-800 border-purple-200",
faculty: "bg-blue-100 text-blue-800 border-blue-200",
student: "bg-green-100 text-green-800 border-green-200",
};

const statusBadgeClasses: Record<string, string> = {
ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
BANNED: "bg-red-100 text-red-800 border-red-200",
TEMPORARILY_BANNED: "bg-amber-100 text-amber-800 border-amber-200",
DELETED: "bg-slate-100 text-slate-700 border-slate-200",
};

const roleIcons: Record<string, React.ReactNode> = {
hod: <Shield className="h-3 w-3" />,
faculty: <UserCog className="h-3 w-3" />,
student: <GraduationCap className="h-3 w-3" />,
};

export function UsersTab({ users, batches }: UsersTabProps) {
const router = useRouter();
const [isPending, startTransition] = useTransition();
const [searchQuery, setSearchQuery] = useState("");
const [sortField, setSortField] = useState<SortField>("name");
const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

// Ban dialog state
const [banDialogOpen, setBanDialogOpen] = useState(false);
const [banTarget, setBanTarget] = useState<UserData | null>(null);
const [banType, setBanType] = useState<"permanent" | "temporary">(
"permanent",
);
const [banDays, setBanDays] = useState("7");
const [banReason, setBanReason] = useState("");

// Batch assign dialog
const [batchDialogOpen, setBatchDialogOpen] = useState(false);
const [batchTarget, setBatchTarget] = useState<UserData | null>(null);
const [selectedBatchId, setSelectedBatchId] = useState("");

// Edit user dialog
const [editDialogOpen, setEditDialogOpen] = useState(false);
const [editTarget, setEditTarget] = useState<UserData | null>(null);
const [editFirstName, setEditFirstName] = useState("");
const [editLastName, setEditLastName] = useState("");
const [editEmail, setEditEmail] = useState("");
const [editPassword, setEditPassword] = useState("");

// Delete user dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
const [deleteTarget, setDeleteTarget] = useState<UserData | null>(null);
const [deleteConfirmText, setDeleteConfirmText] = useState("");
const [deleteReason, setDeleteReason] = useState("");

// Pull from Clerk dialog
const [pullDialogOpen, setPullDialogOpen] = useState(false);
const [pullLoading, setPullLoading] = useState(false);
const [pullUsers, setPullUsers] = useState<
{
clerkId: string;
firstName: string;
lastName: string;
email: string;
imageUrl: string;
role: string | null;
createdAt: string;
}[]
>([]);
const [selectedPullIds, setSelectedPullIds] = useState<Set<string>>(
new Set(),
);
const [pullRoleOverride, setPullRoleOverride] = useState<
"student" | "faculty" | "keep"
>("keep");
const [pullSyncing, setPullSyncing] = useState(false);

// Filter, search, sort
const filteredAndSorted = useMemo(() => {
let result = [...users];

// Search
if (searchQuery) {
const q = searchQuery.toLowerCase();
result = result.filter(
(u) =>
u.firstName.toLowerCase().includes(q) ||
u.lastName.toLowerCase().includes(q) ||
u.email.toLowerCase().includes(q) ||
u.role.includes(q) ||
(u.batch?.toLowerCase() ?? "").includes(q),
);
}

// Role filter
if (roleFilter !== "all") {
result = result.filter((u) => u.role === roleFilter);
}

// Status filter
if (statusFilter !== "all") {
result = result.filter((u) => u.status === statusFilter);
} else {
result = result.filter((u) => u.status !== "DELETED");
}

// Sort
result.sort((a, b) => {
let cmp = 0;
switch (sortField) {
case "name":
cmp = `${a.firstName} ${a.lastName}`.localeCompare(
`${b.firstName} ${b.lastName}`,
);
break;
case "role":
cmp = a.role.localeCompare(b.role);
break;
case "status":
cmp = a.status.localeCompare(b.status);
break;
case "semester":
cmp = (a.currentSemester ?? 0) - (b.currentSemester ?? 0);
break;
case "createdAt":
cmp =
new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
break;
}
return sortOrder === "asc" ? cmp : -cmp;
});

return result;
}, [users, searchQuery, roleFilter, statusFilter, sortField, sortOrder]);

function toggleSort(field: SortField) {
if (sortField === field) {
setSortOrder(sortOrder === "asc" ? "desc" : "asc");
} else {
setSortField(field);
setSortOrder("asc");
}
}

function handleRoleChange(clerkId: string, newRole: string) {
if (newRole === "none") return;
startTransition(async () => {
try {
await setUserRole(clerkId, newRole as "hod" | "faculty" | "student");
toast.success("Role updated successfully");
router.refresh();
} catch {
toast.error("Failed to update role");
}
});
}

function openBanDialog(user: UserData) {
setBanTarget(user);
setBanType("permanent");
setBanDays("7");
setBanReason("");
setBanDialogOpen(true);
}

function handleBan() {
if (!banTarget) return;
startTransition(async () => {
try {
const result = await banUser({
userId: banTarget.clerkId,
reason: banReason || undefined,
banType,
bannedUntilDays:
banType === "temporary" ? parseInt(banDays) : undefined,
});
if (result.success) {
toast.success(
`${banTarget.firstName} has been ${banType === "permanent" ? "permanently" : "temporarily"} banned`,
);
setBanDialogOpen(false);
router.refresh();
} else {
toast.error(result.message ?? "Failed to ban user");
}
} catch {
toast.error("Failed to ban user");
}
});
}

function handleUnban(user: UserData) {
startTransition(async () => {
try {
const result = await unbanUser(user.clerkId);
if (result.success) {
toast.success(`${user.firstName} has been unbanned`);
router.refresh();
} else {
toast.error(result.message ?? "Failed to unban user");
}
} catch {
toast.error("Failed to unban user");
}
});
}

function openBatchDialog(user: UserData) {
setBatchTarget(user);
setSelectedBatchId(user.batchId ?? "");
setBatchDialogOpen(true);
}

function handleBatchAssign() {
if (!batchTarget || !selectedBatchId) return;
startTransition(async () => {
try {
const result = await assignStudentToBatch(
batchTarget.id,
selectedBatchId,
);
if (result.success) {
toast.success("Student assigned to batch");
setBatchDialogOpen(false);
router.refresh();
} else {
toast.error(result.message ?? "Failed to assign batch");
}
} catch {
toast.error("Failed to assign batch");
}
});
}

function handleRemoveBatch(user: UserData) {
startTransition(async () => {
try {
const result = await removeStudentFromBatch(user.id);
if (result.success) {
toast.success("Removed from batch");
router.refresh();
} else {
toast.error(result.message ?? "Failed");
}
} catch {
toast.error("Failed to remove from batch");
}
});
}

function openEditDialog(user: UserData) {
setEditTarget(user);
setEditFirstName(user.firstName);
setEditLastName(user.lastName);
setEditEmail(user.email);
setEditPassword("");
setEditDialogOpen(true);
}

function handleEditUser() {
if (!editTarget) return;
startTransition(async () => {
try {
const result = await updateUserInfo({
userId: editTarget.clerkId,
firstName: editFirstName || undefined,
lastName: editLastName || undefined,
email: editEmail || undefined,
password: editPassword || undefined,
});
if (result.success) {
toast.success("User info updated successfully");
setEditDialogOpen(false);
router.refresh();
} else {
toast.error(result.message ?? "Failed to update user info");
}
} catch {
toast.error("Failed to update user info");
}
});
}

function openDeleteDialog(user: UserData) {
setDeleteTarget(user);
setDeleteConfirmText("");
setDeleteReason("");
setDeleteDialogOpen(true);
}

function handleDeleteUser() {
if (!deleteTarget) return;
const confirmation = deleteConfirmText.trim().toUpperCase();
if (confirmation !== "DELETE") {
toast.error("Type DELETE to confirm");
return;
}
startTransition(async () => {
try {
const result = await deleteUserPermanently({
userId: deleteTarget.clerkId,
reason: deleteReason || undefined,
});
if (result.success) {
toast.success("User deleted successfully");
setDeleteDialogOpen(false);
router.refresh();
} else {
toast.error(result.message ?? "Failed to delete user");
}
} catch {
toast.error("Failed to delete user");
}
});
}

async function openPullDialog() {
setPullUsers([]);
setSelectedPullIds(new Set());
setPullRoleOverride("keep");
setPullDialogOpen(true);
setPullLoading(true);
try {
const result = await pullUsersFromClerk();
if (result.success) {
setPullUsers(result.users);
setSelectedPullIds(new Set(result.users.map((u) => u.clerkId)));
} else {
toast.error("Failed to fetch users from Clerk");
}
} catch {
toast.error("Failed to fetch users from Clerk");
} finally {
setPullLoading(false);
}
}

function togglePullUser(clerkId: string) {
setSelectedPullIds((prev) => {
const next = new Set(prev);
if (next.has(clerkId)) next.delete(clerkId);
else next.add(clerkId);
return next;
});
}

function toggleSelectAllPull() {
if (selectedPullIds.size === pullUsers.length) {
setSelectedPullIds(new Set());
} else {
setSelectedPullIds(new Set(pullUsers.map((u) => u.clerkId)));
}
}

async function handleSyncClerkUsers() {
if (selectedPullIds.size === 0) {
toast.error("No users selected");
return;
}
setPullSyncing(true);
try {
const result = await syncClerkUsersToDB(
Array.from(selectedPullIds),
pullRoleOverride === "keep" ? undefined : pullRoleOverride,
);
if (result.success) {
toast.success(result.message);
setPullDialogOpen(false);
router.refresh();
} else {
toast.error(result.message ?? "Failed to sync users");
}
} catch {
toast.error("Failed to sync users");
} finally {
setPullSyncing(false);
}
}

const activeBatches = batches.filter((b) => b.isActive);

return (
<div className="space-y-4">
{/* Toolbar: Search + Filters */}
<div className="flex flex-col sm:flex-row gap-3">
<div className="relative flex-1">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
<Input
placeholder="Search by name, email, batch..."
value={searchQuery}
onChange={(e) => setSearchQuery(e.target.value)}
className="pl-9"
/>
</div>
<div className="flex gap-2">
<Select
value={roleFilter}
onValueChange={(v) => setRoleFilter(v as RoleFilter)}
>
<SelectTrigger className="w-32">
<Filter className="h-3.5 w-3.5 mr-1" />
<SelectValue placeholder="Role" />
</SelectTrigger>
<SelectContent>
<SelectItem value="all">All Roles</SelectItem>
<SelectItem value="hod">HOD</SelectItem>
<SelectItem value="faculty">Faculty</SelectItem>
<SelectItem value="student">Student</SelectItem>
</SelectContent>
</Select>
<Select
value={statusFilter}
onValueChange={(v) => setStatusFilter(v as StatusFilter)}
>
<SelectTrigger className="w-36">
<Filter className="h-3.5 w-3.5 mr-1" />
<SelectValue placeholder="Status" />
</SelectTrigger>
<SelectContent>
<SelectItem value="all">All Status</SelectItem>
<SelectItem value="ACTIVE">Active</SelectItem>
<SelectItem value="BANNED">Banned</SelectItem>
<SelectItem value="TEMPORARILY_BANNED">Temp Banned</SelectItem>
<SelectItem value="DELETED">Deleted</SelectItem>
</SelectContent>
</Select>
</div>
<Button
variant="outline"
size="sm"
className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 shrink-0"
onClick={openPullDialog}
>
<CloudDownload className="h-4 w-4" />
Pull from Clerk
</Button>
</div>

{/* Table */}
<Card>
<CardHeader className="pb-3">
<CardTitle className="text-base">
All Users ({filteredAndSorted.length})
</CardTitle>
<CardDescription>
Manage roles, ban/unban, and assign batches. Changes apply
immediately.
</CardDescription>
</CardHeader>
<CardContent className="p-0">
<div className="overflow-x-auto">
<Table>
<TableHeader>
<TableRow>
<TableHead>
<button
className="flex items-center gap-1 hover:text-foreground transition-colors"
onClick={() => toggleSort("name")}
>
User
<ArrowUpDown className="h-3 w-3" />
</button>
</TableHead>
<TableHead className="hidden md:table-cell">Email</TableHead>
<TableHead>
<button
className="flex items-center gap-1 hover:text-foreground transition-colors"
onClick={() => toggleSort("role")}
>
Role
<ArrowUpDown className="h-3 w-3" />
</button>
</TableHead>
<TableHead>
<button
className="flex items-center gap-1 hover:text-foreground transition-colors"
onClick={() => toggleSort("status")}
>
Status
<ArrowUpDown className="h-3 w-3" />
</button>
</TableHead>
<TableHead className="hidden lg:table-cell">
Batch / Semester
</TableHead>
<TableHead>Change Role</TableHead>
<TableHead className="text-right">Actions</TableHead>
</TableRow>
</TableHeader>
<TableBody>
{filteredAndSorted.length === 0 ?
<TableRow>
<TableCell
colSpan={7}
className="text-center text-muted-foreground py-12"
>
No users found matching your filters
</TableCell>
</TableRow>
:filteredAndSorted.map((user) => (
<TableRow
key={user.id}
className={
user.status !== "ACTIVE" ? "bg-red-50/50" : undefined
}
>
{/* User */}
<TableCell>
<div className="flex items-center gap-3">
<Avatar className="h-8 w-8">
<AvatarImage src={user.imageUrl} />
<AvatarFallback className="text-xs">
{(user.firstName?.[0] ?? "") +
(user.lastName?.[0] ?? "")}
</AvatarFallback>
</Avatar>
<div>
<p className="font-medium text-sm">
{user.firstName} {user.lastName}
</p>
<p className="text-xs text-muted-foreground md:hidden">
{user.email}
</p>
</div>
</div>
</TableCell>

{/* Email */}
<TableCell className="hidden md:table-cell text-muted-foreground text-sm">
{user.email}
</TableCell>

{/* Role */}
<TableCell>
<Badge
variant="outline"
className={`gap-1 ${roleBadgeClasses[user.role] ?? ""}`}
>
{roleIcons[user.role]}
{user.role.toUpperCase()}
</Badge>
</TableCell>

{/* Status */}
<TableCell>
<div className="space-y-1">
<Badge
variant="outline"
className={`text-xs ${statusBadgeClasses[user.status] ?? ""}`}
>
{user.status === "TEMPORARILY_BANNED" ?
"TEMP BAN"
:user.status}
</Badge>
{user.bannedUntil && (
<p className="text-[10px] text-muted-foreground flex items-center gap-1">
<Clock className="h-3 w-3" />
Until{" "}
{new Date(user.bannedUntil).toLocaleDateString()}
</p>
)}
{user.banReason && (
<p className="text-[10px] text-muted-foreground truncate max-w-32">
{user.banReason}
</p>
)}
</div>
</TableCell>

{/* Batch / Semester */}
<TableCell className="hidden lg:table-cell">
{user.role === "student" ?
<div className="space-y-1">
{user.batchName ?
<div className="flex items-center gap-1">
<Badge variant="secondary" className="text-xs">
{user.batchName}
</Badge>
<button
className="text-muted-foreground hover:text-destructive"
onClick={() => handleRemoveBatch(user)}
title="Remove from batch"
>
<X className="h-3 w-3" />
</button>
</div>
:<div className="flex flex-col items-start gap-1">
<Badge
variant="outline"
className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase font-bold tracking-wider"
>
Unassigned
</Badge>
<button
className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
onClick={() => openBatchDialog(user)}
>
<FolderPlus className="h-3 w-3" />
Assign Batch
</button>
</div>
}
{user.batchName && (
<p className="text-xs text-muted-foreground mt-1">
Semester {user.currentSemester ?? 1}
</p>
)}
</div>
: user.role === "faculty" ?
user.assignedBatches.length > 0 ?
<div className="flex flex-wrap gap-1">
{user.assignedBatches.map((ab) => (
<Badge
key={ab.id}
variant="outline"
className="text-xs"
>
{ab.name}
</Badge>
))}
</div>
:<Badge
variant="outline"
className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] uppercase font-bold tracking-wider"
>
Unassigned
</Badge>

:<span className="text-muted-foreground">—</span>}
</TableCell>

{/* Change Role */}
<TableCell>
<Select
value={user.role}
onValueChange={(v) =>
handleRoleChange(user.clerkId, v)
}
disabled={isPending}
>
<SelectTrigger className="w-32 h-8 text-xs">
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="hod">
<span className="flex items-center gap-1.5">
<Shield className="h-3 w-3" />
HOD
</span>
</SelectItem>
<SelectItem value="faculty">
<span className="flex items-center gap-1.5">
<UserCog className="h-3 w-3" />
Faculty
</span>
</SelectItem>
<SelectItem value="student">
<span className="flex items-center gap-1.5">
<GraduationCap className="h-3 w-3" />
Student
</span>
</SelectItem>
</SelectContent>
</Select>
</TableCell>

{/* Actions */}
<TableCell className="text-right">
<div className="flex items-center justify-end gap-1">
<Button
variant="outline"
size="sm"
className="h-7 text-xs"
onClick={() => openEditDialog(user)}
disabled={isPending}
>
<Pencil className="h-3 w-3 mr-1" />
Edit
</Button>
{user.status === "ACTIVE" ?
<Button
variant="outline"
size="sm"
className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
onClick={() => openBanDialog(user)}
disabled={isPending}
>
<Ban className="h-3 w-3 mr-1" />
Ban
</Button>
:<Button
variant="outline"
size="sm"
className="h-7 text-xs text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
onClick={() => handleUnban(user)}
disabled={isPending}
>
<ShieldCheck className="h-3 w-3 mr-1" />
Unban
</Button>
}
<Button
variant="outline"
size="sm"
className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50 hover:text-red-800"
onClick={() => openDeleteDialog(user)}
disabled={isPending || user.role === "hod"}
title={
user.role === "hod" ?
"Cannot delete HOD"
:"Delete user"
}
>
<Trash2 className="h-3 w-3 mr-1" />
Delete
</Button>
</div>
</TableCell>
</TableRow>
))
}
</TableBody>
</Table>
</div>
</CardContent>
</Card>

{/* Pull from Clerk Dialog */}
<Dialog open={pullDialogOpen} onOpenChange={setPullDialogOpen}>
<DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
<DialogHeader>
<DialogTitle className="flex items-center gap-2 text-indigo-700">
<CloudDownload className="h-5 w-5" />
Pull Users from Clerk
</DialogTitle>
<DialogDescription>
Users registered in Clerk but not yet synced to the local
database. Select the ones you want to import.
</DialogDescription>
</DialogHeader>

{pullLoading ? (
<div className="flex flex-col items-center justify-center py-12 gap-3">
<Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
<p className="text-sm text-muted-foreground">
Fetching users from Clerk...
</p>
</div>
) : pullUsers.length === 0 ? (
<div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
<RefreshCw className="h-8 w-8 text-muted-foreground" />
<p className="font-medium">All Clerk users are synced</p>
<p className="text-sm text-muted-foreground">
No new users found in Clerk that are missing from the database.
</p>
</div>
) : (
<div className="flex flex-col gap-4 overflow-hidden">
<div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
<AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
<p className="text-xs text-amber-800 flex-1">
Assign a role to all selected users, or keep their existing
Clerk role (defaults to Student if none set).
</p>
<Select
value={pullRoleOverride}
onValueChange={(v) =>
setPullRoleOverride(v as "student" | "faculty" | "keep")
}
>
<SelectTrigger className="w-40 h-8 text-xs bg-white">
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="keep">Keep Clerk Role</SelectItem>
<SelectItem value="student">Override to Student</SelectItem>
<SelectItem value="faculty">Override to Faculty</SelectItem>
</SelectContent>
</Select>
</div>
<div className="flex items-center justify-between">
<button
className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
onClick={toggleSelectAllPull}
>
{selectedPullIds.size === pullUsers.length ? (
<CheckSquare className="h-4 w-4 text-indigo-600" />
) : (
<Square className="h-4 w-4" />
)}
Select All ({pullUsers.length})
</button>
<span className="text-sm text-muted-foreground">
{selectedPullIds.size} selected
</span>
</div>
<div className="overflow-y-auto max-h-64 border rounded-lg divide-y">
{pullUsers.map((u) => (
<div
key={u.clerkId}
className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors ${
selectedPullIds.has(u.clerkId) ? "bg-indigo-50/60" : ""
}`}
onClick={() => togglePullUser(u.clerkId)}
>
{selectedPullIds.has(u.clerkId) ? (
<CheckSquare className="h-4 w-4 text-indigo-600 shrink-0" />
) : (
<Square className="h-4 w-4 text-muted-foreground shrink-0" />
)}
<Avatar className="h-8 w-8 shrink-0">
<AvatarImage src={u.imageUrl} />
<AvatarFallback className="text-xs">
{(u.firstName?.[0] ?? "") + (u.lastName?.[0] ?? "")}
</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<p className="text-sm font-medium truncate">
{u.firstName || u.lastName ?
`${u.firstName} ${u.lastName}`.trim()
:<span className="text-muted-foreground italic">
No name
</span>
}
</p>
<p className="text-xs text-muted-foreground truncate">
{u.email}
</p>
</div>
{u.role ? (
<Badge
variant="outline"
className={`text-[10px] shrink-0 ${roleBadgeClasses[u.role] ?? ""}`}
>
{u.role.toUpperCase()}
</Badge>
) : (
<Badge
variant="outline"
className="text-[10px] shrink-0 bg-slate-50 text-slate-500 border-slate-200"
>
No Role
</Badge>
)}
</div>
))}
</div>
</div>
)}

{!pullLoading && (
<DialogFooter>
<Button
variant="outline"
onClick={() => setPullDialogOpen(false)}
>
Cancel
</Button>
{pullUsers.length > 0 && (
<Button
className="bg-indigo-600 hover:bg-indigo-700 text-white"
onClick={handleSyncClerkUsers}
disabled={pullSyncing || selectedPullIds.size === 0}
>
{pullSyncing ? (
<>
<Loader2 className="h-4 w-4 mr-2 animate-spin" />
Syncing...
</>
) : (
<>
<CloudDownload className="h-4 w-4 mr-2" />
Sync {selectedPullIds.size} User
{selectedPullIds.size !== 1 ? "s" : ""}
</>
)}
</Button>
)}
</DialogFooter>
)}
</DialogContent>
</Dialog>

{/* Ban Dialog */}
<Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle className="flex items-center gap-2 text-red-600">
<Ban className="h-5 w-5" />
Ban User
</DialogTitle>
<DialogDescription>
Ban{" "}
<strong>
{banTarget?.firstName} {banTarget?.lastName}
</strong>{" "}
from accessing the platform. They will not be able to sign in.
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-2">
<div className="space-y-2">
<Label>Ban Type</Label>
<Select
value={banType}
onValueChange={(v) =>
setBanType(v as "permanent" | "temporary")
}
>
<SelectTrigger>
<SelectValue />
</SelectTrigger>
<SelectContent>
<SelectItem value="permanent">Permanent Ban</SelectItem>
<SelectItem value="temporary">Temporary Ban</SelectItem>
</SelectContent>
</Select>
</div>
{banType === "temporary" && (
<div className="space-y-2">
<Label>Duration (days)</Label>
<Input
type="number"
min={1}
max={365}
value={banDays}
onChange={(e) => setBanDays(e.target.value)}
placeholder="Number of days"
/>
<p className="text-xs text-muted-foreground">
User will be automatically unbanned after {banDays} day(s)
</p>
</div>
)}
<div className="space-y-2">
<Label>
Reason <span className="text-muted-foreground">(optional)</span>
</Label>
<Textarea
value={banReason}
onChange={(e) => setBanReason(e.target.value)}
placeholder="Reason for banning..."
rows={3}
/>
</div>
</div>
<DialogFooter>
<Button variant="outline" onClick={() => setBanDialogOpen(false)}>
Cancel
</Button>
<Button
variant="destructive"
onClick={handleBan}
disabled={isPending}
>
{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
Confirm Ban
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* Delete Dialog */}
<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle className="flex items-center gap-2 text-red-600">
<Trash2 className="h-5 w-5" />
Delete User
</DialogTitle>
<DialogDescription>
Permanently remove{" "}
<strong>
{deleteTarget?.firstName} {deleteTarget?.lastName}
</strong>
. This will delete the Clerk account and hide the user from the
dashboard.
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-2">
<div className="space-y-2">
<Label>Type DELETE to confirm</Label>
<Input
value={deleteConfirmText}
onChange={(e) => setDeleteConfirmText(e.target.value)}
placeholder="DELETE"
/>
</div>
<div className="space-y-2">
<Label>
Reason <span className="text-muted-foreground">(optional)</span>
</Label>
<Textarea
value={deleteReason}
onChange={(e) => setDeleteReason(e.target.value)}
placeholder="Reason for deleting..."
rows={3}
/>
</div>
</div>
<DialogFooter>
<Button
variant="outline"
onClick={() => setDeleteDialogOpen(false)}
>
Cancel
</Button>
<Button
variant="destructive"
onClick={handleDeleteUser}
disabled={
isPending || deleteConfirmText.trim().toUpperCase() !== "DELETE"
}
>
{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
Confirm Delete
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* Batch Assign Dialog */}
<Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle>Assign to Batch</DialogTitle>
<DialogDescription>
Assign{" "}
<strong>
{batchTarget?.firstName} {batchTarget?.lastName}
</strong>{" "}
to a batch. This will also update their semester.
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-2">
<div className="space-y-2">
<Label>Select Batch</Label>
<Select
value={selectedBatchId}
onValueChange={setSelectedBatchId}
>
<SelectTrigger>
<SelectValue placeholder="Choose a batch..." />
</SelectTrigger>
<SelectContent>
{activeBatches.map((b) => (
<SelectItem key={b.id} value={b.id}>
{b.name} (Sem {b.currentSemester})
</SelectItem>
))}
</SelectContent>
</Select>
</div>
</div>
<DialogFooter>
<Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
Cancel
</Button>
<Button
onClick={handleBatchAssign}
disabled={isPending || !selectedBatchId}
>
{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
Assign
</Button>
</DialogFooter>
</DialogContent>
</Dialog>

{/* Edit User Dialog */}
<Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
<DialogContent>
<DialogHeader>
<DialogTitle className="flex items-center gap-2">
<Pencil className="h-5 w-5" />
Edit User Info
</DialogTitle>
<DialogDescription>
Update details for{" "}
<strong>
{editTarget?.firstName} {editTarget?.lastName}
</strong>
. Leave password blank to keep it unchanged.
</DialogDescription>
</DialogHeader>
<div className="space-y-4 py-2">
<div className="grid grid-cols-2 gap-4">
<div className="space-y-2">
<Label>First Name</Label>
<Input
value={editFirstName}
onChange={(e) => setEditFirstName(e.target.value)}
placeholder="First name"
/>
</div>
<div className="space-y-2">
<Label>Last Name</Label>
<Input
value={editLastName}
onChange={(e) => setEditLastName(e.target.value)}
placeholder="Last name"
/>
</div>
</div>
<div className="space-y-2">
<Label>Email</Label>
<Input
type="email"
value={editEmail}
onChange={(e) => setEditEmail(e.target.value)}
placeholder="Email address"
/>
<p className="text-xs text-muted-foreground">
Email update applies to local DB only. Clerk primary email
remains unchanged.
</p>
</div>
<div className="space-y-2">
<Label>
New Password{" "}
<span className="text-muted-foreground">(optional)</span>
</Label>
<Input
type="password"
value={editPassword}
onChange={(e) => setEditPassword(e.target.value)}
placeholder="Leave blank to keep current password"
/>
{editPassword && editPassword.length < 8 && (
<p className="text-xs text-red-500">
Password must be at least 8 characters
</p>
)}
</div>
</div>
<DialogFooter>
<Button variant="outline" onClick={() => setEditDialogOpen(false)}>
Cancel
</Button>
<Button
onClick={handleEditUser}
disabled={
isPending || (!!editPassword && editPassword.length < 8)
}
>
{isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
Save Changes
</Button>
</DialogFooter>
</DialogContent>
</Dialog>
</div>
);
}