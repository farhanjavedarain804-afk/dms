import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Scale, Clock, Wallet, Landmark, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Building2 } from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";
import { localCrud } from "@/lib/local-store";
import { PK_BANKS, PK_PAYMENT_METHODS, fmtPKR } from "@/lib/pk";

// ----- Types -----
type AccountKind = "cash" | "bank" | "wallet";
type Account = {
  id: number;
  name: string;
  kind: AccountKind;
  bank?: string;
  account_number?: string;
  branch?: string;
  opening_balance: number;
  currency: string;
  notes?: string;
};

type TxnType = "income" | "expense" | "transfer";
type Txn = {
  id: number;
  voucher_no: string;
  date: string;
  description: string;
  type: TxnType;
  category: string;
  party?: string;
  party_ntn?: string;
  account_id?: number;          // for income/expense (and source for transfer)
  to_account_id?: number;       // for transfer only
  amount: number;
  gst_amount: number;
  wht_amount: number;
  net_amount: number;
  payment_method?: string;
  reference?: string;
  cost_center?: string;
  status: "pending" | "cleared" | "reconciled" | "bounced";
  notes?: string;
};

// ----- Seeds -----
const accountsApi = localCrud<Account>("finance_accounts_v1", [
  { name: "Cash in Hand", kind: "cash", opening_balance: 150000, currency: "PKR", notes: "Office petty cash" },
  { name: "HBL Current — Main", kind: "bank", bank: "HBL", account_number: "0123-79001234-01", branch: "Layyah", opening_balance: 2500000, currency: "PKR" },
  { name: "Meezan Business", kind: "bank", bank: "Meezan Bank", account_number: "01950101234567", branch: "Multan", opening_balance: 1800000, currency: "PKR" },
  { name: "Easypaisa Wallet", kind: "wallet", bank: "Easypaisa", account_number: "03177121841", opening_balance: 25000, currency: "PKR" },
]);

const txnApi = localCrud<Txn>("finance_v2", [
  { voucher_no: "JV-2601", date: "2026-07-01", description: "Retainer - Zeta Retail", type: "income", category: "revenue", party: "Zeta Retail", party_ntn: "9876543-2", account_id: 3, amount: 1200000, gst_amount: 216000, wht_amount: 36000, net_amount: 1380000, payment_method: "bank_transfer", reference: "TXN-8823", cost_center: "Sales - Lahore", status: "cleared" },
  { voucher_no: "PV-1108", date: "2026-07-05", description: "July salaries", type: "expense", category: "salaries", account_id: 2, amount: 850000, gst_amount: 0, wht_amount: 0, net_amount: 850000, payment_method: "bank_transfer", cost_center: "HR - Payroll", status: "cleared" },
  { voucher_no: "PV-1109", date: "2026-07-10", description: "Google Workspace annual", type: "expense", category: "operations", party: "Google", account_id: 2, amount: 42000, gst_amount: 0, wht_amount: 0, net_amount: 42000, payment_method: "card", cost_center: "IT", status: "pending" },
  { voucher_no: "PV-1110", date: "2026-07-12", description: "K-Electric bill", type: "expense", category: "utilities", party: "K-Electric", account_id: 4, amount: 68500, gst_amount: 0, wht_amount: 0, net_amount: 68500, payment_method: "easypaisa", cost_center: "Admin - Karachi", status: "cleared" },
  { voucher_no: "TR-0001", date: "2026-07-06", description: "Cash → HBL deposit", type: "transfer", category: "transfer", account_id: 1, to_account_id: 2, amount: 100000, gst_amount: 0, wht_amount: 0, net_amount: 100000, payment_method: "cash_deposit", status: "cleared" },
]);

const CATEGORY_OPTS = [
  { value: "revenue", label: "Revenue / Sales" },
  { value: "salaries", label: "Salaries & Wages" },
  { value: "operations", label: "Operations" },
  { value: "marketing", label: "Marketing & Advertising" },
  { value: "utilities", label: "Utilities" },
  { value: "rent", label: "Office Rent" },
  { value: "travel", label: "Travel & Conveyance" },
  { value: "tax", label: "Tax Payment (FBR/PRA/SRB)" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "transfer", label: "Internal Transfer" },
  { value: "other", label: "Other" },
];

const KIND_LABEL: Record<AccountKind, string> = { cash: "Cash", bank: "Bank", wallet: "Wallet" };
const KIND_COLOR: Record<AccountKind, string> = {
  cash: "oklch(0.72 0.16 90)",
  bank: "oklch(0.62 0.18 250)",
  wallet: "oklch(0.68 0.18 155)",
};

function Pill({ text, color }: { text: string; color: string }) {
  return (
    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
      style={{ background: `color-mix(in oklab, ${color} 14%, transparent)`, color }}>
      {text}
    </span>
  );
}

// ----- Page -----
function FinancialsPage() {
  const txnQ = useQuery({ queryKey: ["finance_v2"], queryFn: txnApi.list });
  const accQ = useQuery({ queryKey: ["finance_accounts_v1"], queryFn: accountsApi.list });
  const rows = txnQ.data ?? [];
  const accounts = accQ.data ?? [];

  const [tab, setTab] = useState<"overview" | "transactions" | "accounts">("overview");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [accFilter, setAccFilter] = useState<string>("all");

  // Compute balances per account
  const balances = useMemo(() => {
    const map = new Map<number, number>();
    for (const a of accounts) map.set(a.id, Number(a.opening_balance ?? 0));
    for (const t of rows) {
      if (t.status === "bounced") continue;
      const amt = Number(t.net_amount ?? 0);
      if (t.type === "income" && t.account_id) map.set(t.account_id, (map.get(t.account_id) ?? 0) + amt);
      if (t.type === "expense" && t.account_id) map.set(t.account_id, (map.get(t.account_id) ?? 0) - amt);
      if (t.type === "transfer") {
        if (t.account_id) map.set(t.account_id, (map.get(t.account_id) ?? 0) - amt);
        if (t.to_account_id) map.set(t.to_account_id, (map.get(t.to_account_id) ?? 0) + amt);
      }
    }
    return map;
  }, [rows, accounts]);

  const cashTotal = accounts.filter((a) => a.kind === "cash").reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const bankTotal = accounts.filter((a) => a.kind === "bank").reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
  const walletTotal = accounts.filter((a) => a.kind === "wallet").reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);

  const income = rows.filter((r) => r.type === "income" && r.status !== "bounced").reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const expense = rows.filter((r) => r.type === "expense" && r.status !== "bounced").reduce((s, r) => s + Number(r.net_amount ?? 0), 0);
  const net = income - expense;
  const pending = rows.filter((r) => r.status === "pending").length;

  const accountOptions = useMemo(
    () => accounts.map((a) => ({ value: String(a.id), label: `${a.name} (${KIND_LABEL[a.kind]})` })),
    [accounts],
  );

  const txnFields: FieldDef<Txn>[] = [
    { name: "voucher_no", label: "Voucher #", required: true, section: "Voucher" },
    { name: "date", label: "Date", type: "date", required: true, section: "Voucher" },
    { name: "type", label: "Type", type: "select", required: true, section: "Voucher", options: [
      { value: "income", label: "Income (Credit / Receipt)" },
      { value: "expense", label: "Expense (Debit / Payment)" },
      { value: "transfer", label: "Transfer (Cash ⇄ Bank)" },
    ], render: (v) => {
      if (v === "income") return <Pill text="Credit · Income" color="oklch(0.68 0.18 155)" />;
      if (v === "expense") return <Pill text="Debit · Expense" color="oklch(0.65 0.2 25)" />;
      return <Pill text="Transfer" color="oklch(0.62 0.18 250)" />;
    } },
    { name: "category", label: "Category", type: "select", required: true, section: "Voucher", options: CATEGORY_OPTS },
    { name: "description", label: "Description", required: true, section: "Voucher", fullWidth: true },

    { name: "party", label: "Party / Vendor / Customer", section: "Party" },
    { name: "party_ntn", label: "Party NTN", section: "Party" },
    { name: "cost_center", label: "Cost center / Department", section: "Party" },

    { name: "account_id", label: "Account (From)", type: "select", options: accountOptions, section: "Accounts",
      render: (v) => {
        const a = accounts.find((x) => x.id === Number(v));
        return a ? <span>{a.name}</span> : <span className="text-muted-foreground">—</span>;
      } },
    { name: "to_account_id", label: "Transfer To (only for transfers)", type: "select", options: accountOptions, section: "Accounts", hideInTable: true },

    { name: "amount", label: "Amount (PKR)", type: "number", required: true, section: "Amounts",
      render: (v) => fmtPKR(v) },
    { name: "gst_amount", label: "GST amount", type: "number", section: "Amounts", hideInTable: true },
    { name: "wht_amount", label: "Withholding tax", type: "number", section: "Amounts", hideInTable: true },
    { name: "net_amount", label: "Net amount", type: "number", required: true, section: "Amounts",
      render: (v, r) => (
        <span className={r.type === "income" ? "text-emerald-600 font-semibold tabular-nums" : r.type === "expense" ? "text-red-600 font-semibold tabular-nums" : "font-semibold tabular-nums"}>
          {r.type === "expense" ? "− " : r.type === "income" ? "+ " : ""}{fmtPKR(v)}
        </span>
      ) },

    { name: "payment_method", label: "Payment method", type: "select", options: PK_PAYMENT_METHODS, section: "Payment", hideInTable: true },
    { name: "reference", label: "Cheque / Txn reference", section: "Payment", hideInTable: true },
    { name: "status", label: "Status", type: "select", required: true, section: "Payment", options: [
      { value: "pending", label: "Pending" },
      { value: "cleared", label: "Cleared" },
      { value: "reconciled", label: "Reconciled" },
      { value: "bounced", label: "Bounced / Failed" },
    ] },
    { name: "notes", label: "Notes", type: "textarea", section: "Payment", hideInTable: true, fullWidth: true },
  ];

  const accountFields: FieldDef<Account>[] = [
    { name: "name", label: "Account name", required: true },
    { name: "kind", label: "Type", type: "select", required: true, options: [
      { value: "cash", label: "Cash" },
      { value: "bank", label: "Bank" },
      { value: "wallet", label: "Mobile Wallet (Easypaisa/JazzCash/Sadapay/Nayapay)" },
    ], render: (v) => <Pill text={KIND_LABEL[v as AccountKind]} color={KIND_COLOR[v as AccountKind]} /> },
    { name: "bank", label: "Bank / Provider", type: "select", options: PK_BANKS },
    { name: "account_number", label: "Account / IBAN / Mobile #" },
    { name: "branch", label: "Branch" },
    { name: "opening_balance", label: "Opening balance (PKR)", type: "number", required: true,
      render: (v) => fmtPKR(v) },
    { name: "currency", label: "Currency", type: "select", options: [
      { value: "PKR", label: "PKR" }, { value: "USD", label: "USD" }, { value: "AED", label: "AED" }, { value: "SAR", label: "SAR" },
    ] },
    { name: "notes", label: "Notes", type: "textarea", hideInTable: true, fullWidth: true },
  ];

  const txnFilter = (r: Txn) => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (accFilter !== "all" && String(r.account_id) !== accFilter && String(r.to_account_id) !== accFilter) return false;
    return true;
  };

  const txnToolbar = (
    <div className="flex items-center gap-2 flex-wrap">
      <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All types</option>
        <option value="income">Income (Credit)</option>
        <option value="expense">Expense (Debit)</option>
        <option value="transfer">Transfer</option>
      </select>
      <select value={accFilter} onChange={(e) => setAccFilter(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
        <option value="all">All accounts</option>
        {accounts.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
      </select>
    </div>
  );

  // Category totals for overview
  const byCat = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of rows) {
      if (t.type === "transfer" || t.status === "bounced") continue;
      const key = t.category;
      const cur = map.get(key) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += Number(t.net_amount ?? 0);
      else cur.expense += Number(t.net_amount ?? 0);
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([k, v]) => ({ key: k, label: CATEGORY_OPTS.find((c) => c.value === k)?.label ?? k, ...v }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }, [rows]);

  return (
    <AppLayout>
      <PageHeader
        title="Financials"
        description="Cash & bank ledger — credit / debit, income / expense, transfers, GST & WHT."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "finance",
              moduleLabel: "Financials",
              title: "Financials Ledger Report",
              subtitle: `Income ${fmtPKR(income)} · Expense ${fmtPKR(expense)} · Net ${fmtPKR(net)}`,
              meta: [
                { label: "Cash", value: fmtPKR(cashTotal) },
                { label: "Bank", value: fmtPKR(bankTotal) },
                { label: "Wallets", value: fmtPKR(walletTotal) },
                { label: "Net P/L", value: fmtPKR(net) },
              ],
              sections: [
                {
                  title: "Accounts",
                  columns: [
                    { key: "name", label: "Account" },
                    { key: "kind", label: "Type" },
                    { key: "bank", label: "Bank" },
                    { key: "account_number", label: "Number" },
                    { key: "balance", label: "Balance", format: (v) => fmtPKR(v) },
                  ],
                  rows: accounts.map((a) => ({ ...a, balance: balances.get(a.id) ?? 0 })),
                },
                {
                  title: "Transactions",
                  columns: [
                    { key: "voucher_no", label: "Voucher" },
                    { key: "date", label: "Date" },
                    { key: "type", label: "Type" },
                    { key: "category", label: "Category" },
                    { key: "description", label: "Description" },
                    { key: "party", label: "Party" },
                    { key: "net_amount", label: "Amount", format: (v) => fmtPKR(v) },
                    { key: "status", label: "Status" },
                  ],
                  rows,
                },
                {
                  title: "Income vs Expense by Category",
                  columns: [
                    { key: "label", label: "Category" },
                    { key: "income", label: "Income", format: (v) => fmtPKR(v) },
                    { key: "expense", label: "Expense", format: (v) => fmtPKR(v) },
                  ],
                  rows: byCat,
                },
              ],
            })}
          />
        }
      />

      <StatsCards loading={txnQ.isLoading || accQ.isLoading} stats={[
        { label: "Cash in Hand", value: fmtPKR(cashTotal), hint: "All cash accounts", icon: Wallet, tint: "oklch(0.72 0.16 90)" },
        { label: "Bank Balance", value: fmtPKR(bankTotal), hint: `${accounts.filter((a) => a.kind === "bank").length} account(s)`, icon: Landmark, tint: "oklch(0.62 0.18 250)" },
        { label: "Mobile Wallets", value: fmtPKR(walletTotal), hint: "Easypaisa / JazzCash", icon: Building2, tint: "oklch(0.68 0.18 155)" },
        { label: "Total Income", value: fmtPKR(income), hint: "Credits (receipts)", icon: ArrowDownCircle, tint: "oklch(0.68 0.18 155)" },
        { label: "Total Expense", value: fmtPKR(expense), hint: "Debits (payments)", icon: ArrowUpCircle, tint: "oklch(0.65 0.2 25)" },
        { label: "Net Profit / Loss", value: fmtPKR(net), hint: net >= 0 ? "Profit" : "Loss", icon: Scale, tint: net >= 0 ? "oklch(0.68 0.18 155)" : "oklch(0.65 0.2 25)" },
        { label: "Pending Vouchers", value: pending, hint: "Awaiting clearance", icon: Clock, tint: "oklch(0.72 0.18 55)" },
        { label: "Transactions", value: rows.length, hint: "All entries", icon: ArrowRightLeft },
      ]} />

      <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
        {[
          { k: "overview", label: "Overview" },
          { k: "transactions", label: "Transactions" },
          { k: "accounts", label: "Accounts" },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-3 py-1.5 text-sm rounded-md ${tab === t.k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Account Balances</h3>
              <span className="text-xs text-muted-foreground">Live from ledger</span>
            </div>
            <div className="space-y-2">
              {accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts yet.</p>}
              {accounts.map((a) => {
                const bal = balances.get(a.id) ?? 0;
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-lg border p-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {KIND_LABEL[a.kind]}{a.bank ? ` · ${a.bank}` : ""}{a.account_number ? ` · ${a.account_number}` : ""}
                      </div>
                    </div>
                    <div className={`text-sm font-semibold tabular-nums ${bal >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {fmtPKR(bal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Income vs Expense by Category</h3>
              <span className="text-xs text-muted-foreground">Excl. transfers</span>
            </div>
            <div className="space-y-2">
              {byCat.length === 0 && <p className="text-sm text-muted-foreground">No transactions yet.</p>}
              {byCat.map((c) => {
                const total = c.income + c.expense;
                const incPct = total ? (c.income / total) * 100 : 0;
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">{c.label}</span>
                      <span className="text-muted-foreground">
                        <span className="text-emerald-600">{fmtPKR(c.income)}</span> · <span className="text-red-600">{fmtPKR(c.expense)}</span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${incPct}%` }} />
                      <div className="bg-red-500 h-full" style={{ width: `${100 - incPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "transactions" && (
        <CrudTable<Txn> title="Voucher" fields={txnFields} api={txnApi} queryKey="finance_v2"
          searchable={["voucher_no", "description", "party", "category", "type"]}
          filter={txnFilter}
          toolbar={txnToolbar}
          defaults={{ status: "pending", type: "expense", category: "operations", amount: 0, gst_amount: 0, wht_amount: 0, net_amount: 0 }} />
      )}

      {tab === "accounts" && (
        <CrudTable<Account> title="Account" fields={accountFields} api={accountsApi} queryKey="finance_accounts_v1"
          searchable={["name", "bank", "account_number"]}
          defaults={{ kind: "bank", currency: "PKR", opening_balance: 0 }} />
      )}
      <ModuleReportsCard module="finance" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/finance")({
  head: () => ({ meta: [{ title: "Financials — Devionic DMS" }] }),
  component: FinancialsPage,
});
