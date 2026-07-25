// Pakistan market constants shared across forms.

export const PK_PROVINCES = [
  { value: "punjab", label: "Punjab" },
  { value: "sindh", label: "Sindh" },
  { value: "kpk", label: "Khyber Pakhtunkhwa" },
  { value: "balochistan", label: "Balochistan" },
  { value: "islamabad", label: "Islamabad Capital Territory" },
  { value: "gb", label: "Gilgit-Baltistan" },
  { value: "ajk", label: "Azad Jammu & Kashmir" },
];

export const PK_CITIES = [
  "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
  "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Bahawalpur",
  "Sargodha", "Sukkur", "Mardan", "Abbottabad", "Mirpur (AJK)", "Gilgit",
  "Sahiwal", "Sheikhupura", "Rahim Yar Khan", "Jhelum", "Gujrat", "Larkana",
].map((c) => ({ value: c, label: c }));

export const PK_BANKS = [
  "HBL", "UBL", "MCB", "Allied Bank (ABL)", "National Bank (NBP)",
  "Meezan Bank", "Bank Alfalah", "Askari Bank", "Bank Al Habib",
  "Standard Chartered", "Faysal Bank", "JS Bank", "Soneri Bank",
  "Dubai Islamic Bank", "BankIslami", "Silkbank", "Summit Bank",
  "Easypaisa (TMB)", "JazzCash (MMBL)", "SadaPay", "NayaPay",
].map((b) => ({ value: b, label: b }));

export const PK_DEPARTMENTS = [
  "Engineering", "Sales & BD", "Marketing", "HR & Admin", "Finance & Accounts",
  "Operations", "Customer Support", "IT & Infrastructure", "Legal & Compliance",
  "Executive / C-Suite",
].map((d) => ({ value: d, label: d }));

export const PK_TAX_STATUS = [
  { value: "filer", label: "Filer" },
  { value: "non_filer", label: "Non-Filer" },
  { value: "exempt", label: "Exempt" },
];

export const PK_PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer (IBAN)" },
  { value: "cheque", label: "Cheque" },
  { value: "jazzcash", label: "JazzCash" },
  { value: "easypaisa", label: "Easypaisa" },
  { value: "raast", label: "Raast (SBP)" },
  { value: "card", label: "Debit/Credit Card" },
];

export const PK_CURRENCY = "PKR";

export const fmtPKR = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(Number(n));
