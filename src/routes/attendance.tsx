import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Clock, UserCheck, UserX, Plane, LogIn, LogOut } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { resources, type Attendance } from "@/lib/api";
import { activeInterns } from "@/lib/interns-source";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/attendance")({
  head: () => ({ meta: [{ title: "Attendance — Devionic DMS" }] }),
  component: AttendancePage,
});

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowHM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function AttendancePage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["attendance"], queryFn: resources.attendance.list });
  const empQ = useQuery({ queryKey: ["employees"], queryFn: resources.employees.list });
  const employees = empQ.data ?? [];
  const rows = q.data ?? [];
  const today = todayISO();
  const todayRows = rows.filter((r) => r.date === today);
  const present = todayRows.filter((r) => r.status === "present" || r.status === "late").length;
  const absent = todayRows.filter((r) => r.status === "absent").length;
  const leave = todayRows.filter((r) => r.status === "leave").length;

  // Wrap the API so employee_id (select stores string) is coerced to number
  // and employee_name is auto-filled from the selected employee.
  const empById = useMemo(
    () => new Map(employees.map((e) => [String(e.id), e])),
    [employees],
  );
  const interns = useMemo(() => activeInterns(), []);
  const internById = useMemo(
    () => new Map(interns.map((i) => [i.id, i])),
    [interns],
  );
  const normalize = (b: any) => {
    const out = { ...b };
    const raw = out.employee_id;
    if (typeof raw === "string" && raw.startsWith("intern:")) {
      const iid = raw.slice(7);
      const it = internById.get(iid);
      out.employee_id = null;
      out.employee_name = it ? `${it.name} (Intern)` : "Intern";
    } else if (raw != null && raw !== "") {
      out.employee_id = Number(raw);
      const emp = empById.get(String(out.employee_id));
      if (emp && !out.employee_name) out.employee_name = emp.name;
    }
    return out;
  };
  const api = {
    list: resources.attendance.list,
    get: resources.attendance.get,
    create: (b: any) => resources.attendance.create(normalize(b)),
    update: (id: number, b: any) => resources.attendance.update(id, normalize(b)),
    remove: resources.attendance.remove,
  };

  const fields = useMemo<FieldDef<Attendance>[]>(() => {
    return [
      {
        name: "employee_id",
        label: "Employee",
        required: true,
        type: "select",
        options: [
          ...employees.map((e) => ({ value: String(e.id), label: `${e.name}${e.employee_code ? ` (${e.employee_code})` : ""}` })),
          ...interns.map((i) => ({ value: `intern:${i.id}`, label: `${i.name}${i.intern_code ? ` (${i.intern_code})` : ""} — Intern` })),
        ],
      },
      {
        name: "employee_name",
        label: "Name",
        type: "computed",
        compute: (v) => {
          const raw = v.employee_id as any;
          if (typeof raw === "string" && raw.startsWith("intern:")) {
            const it = internById.get(raw.slice(7));
            return it ? `${it.name} (Intern)` : "";
          }
          const e = empById.get(String(raw));
          return e?.name ?? "";
        },
      },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "check_in", label: "Check-in", type: "time" },
      { name: "check_out", label: "Check-out", type: "time" },
      {
        name: "status", label: "Status", type: "select", required: true,
        options: [
          { value: "present", label: "Present" },
          { value: "absent", label: "Absent" },
          { value: "late", label: "Late" },
          { value: "leave", label: "Leave" },
        ],
      },
    ];
  }, [employees, empById, interns, internById]);

  // Quick check-in / check-out dialog
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickMode, setQuickMode] = useState<"in" | "out">("in");
  const [quickEmp, setQuickEmp] = useState<string>("");

  const createMut = useMutation({
    mutationFn: (body: any) => resources.attendance.create(normalize(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance recorded");
      setQuickOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => resources.attendance.update(id, normalize(body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance updated");
      setQuickOpen(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const submitQuick = () => {
    if (!quickEmp) { toast.error("Select a person"); return; }
    const isIntern = quickEmp.startsWith("intern:");
    const internId = isIntern ? quickEmp.slice(7) : null;
    const emp = isIntern ? null : empById.get(quickEmp);
    const intern = isIntern ? internById.get(internId!) : null;
    const displayName = isIntern
      ? (intern ? `${intern.name} (Intern)` : "Intern")
      : (emp?.name ?? "");
    const matches = (r: Attendance) => {
      if (r.date !== today) return false;
      if (isIntern) return r.employee_id == null && r.employee_name === displayName;
      return String(r.employee_id) === quickEmp;
    };
    const existing = rows.find(matches);
    const time = nowHM();
    if (quickMode === "in") {
      if (existing) {
        toast.info("Already checked-in today");
        return;
      }
      const status: Attendance["status"] = time > "09:15" ? "late" : "present";
      createMut.mutate({
        employee_id: isIntern ? null : Number(quickEmp),
        employee_name: displayName,
        date: today,
        check_in: time,
        status,
      } as any);
    } else {
      if (!existing) {
        toast.error("No check-in recorded for today");
        return;
      }
      updateMut.mutate({ id: existing.id, body: { check_out: time } });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Attendance"
        description="Daily attendance records with quick check-in and check-out."
        actions={
          <div className="flex items-center gap-2">
            <ModuleReportButton
              build={() => ({
                module: "attendance",
                moduleLabel: "Attendance",
                title: "Attendance Register",
                subtitle: `Today (${today}): ${present} present · ${absent} absent · ${leave} on leave`,
                meta: [
                  { label: "Total logs", value: String(rows.length) },
                  { label: "Today", value: String(todayRows.length) },
                  { label: "Present", value: String(present) },
                  { label: "Absent", value: String(absent) },
                ],
                sections: [
                  {
                    title: `Today — ${today}`,
                    columns: [
                      { key: "employee_name", label: "Name" },
                      { key: "check_in", label: "Check-in" },
                      { key: "check_out", label: "Check-out" },
                      { key: "status", label: "Status" },
                    ],
                    rows: todayRows,
                  },
                  {
                    title: "Full Register",
                    columns: [
                      { key: "date", label: "Date" },
                      { key: "employee_name", label: "Name" },
                      { key: "check_in", label: "In" },
                      { key: "check_out", label: "Out" },
                      { key: "status", label: "Status" },
                    ],
                    rows,
                  },
                ],
              })}
            />
            <Button variant="outline" onClick={() => { setQuickMode("in"); setQuickEmp(""); setQuickOpen(true); }}>
              <LogIn className="h-4 w-4 mr-1" /> Check-in
            </Button>
            <Button variant="outline" onClick={() => { setQuickMode("out"); setQuickEmp(""); setQuickOpen(true); }}>
              <LogOut className="h-4 w-4 mr-1" /> Check-out
            </Button>
          </div>
        }
      />
      <StatsCards loading={q.isLoading} stats={[
        { label: "Today Logs", value: todayRows.length, hint: today, icon: Clock },
        { label: "Present", value: present, hint: `${todayRows.length ? Math.round((present / todayRows.length) * 100) : 0}% attendance`, icon: UserCheck },
        { label: "Absent", value: absent, hint: "Unaccounted today", icon: UserX },
        { label: "On Leave", value: leave, hint: "Approved leave", icon: Plane },
      ]} />
      <CrudTable<Attendance>
        title="Attendance"
        fields={fields}
        api={api as any}
        queryKey="attendance"
        searchable={["employee_name", "date", "status"]}
        defaults={{ status: "present", date: today, check_in: nowHM() } as any}
      />
      <ModuleReportsCard module="attendance" />

      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {quickMode === "in" ? "Quick Check-in" : "Quick Check-out"} — {today} · {nowHM()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Employee</Label>
            <select
              value={quickEmp}
              onChange={(e) => setQuickEmp(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Select person…</option>
              {employees.map((e) => (
                <option key={`e-${e.id}`} value={String(e.id)}>
                  {e.name}{e.employee_code ? ` (${e.employee_code})` : ""}
                </option>
              ))}
              {interns.map((i) => (
                <option key={`i-${i.id}`} value={`intern:${i.id}`}>
                  {i.name}{i.intern_code ? ` (${i.intern_code})` : ""} — Intern
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {quickMode === "in"
                ? "Marks Present, or Late if after 09:15."
                : "Sets check-out time on today's record."}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={submitQuick}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {createMut.isPending || updateMut.isPending ? "Saving…" : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
