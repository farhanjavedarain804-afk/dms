import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Package, PackageCheck, UserCog, Wallet, AlertTriangle, Wrench,
  ShieldAlert, Boxes, ArrowLeftRight, History as HistoryIcon, Tags,
} from "lucide-react";
import { AppLayout, PageHeader } from "@/components/dms/Layout";
import { ModuleReportButton, ModuleReportsCard } from "@/components/dms/ModuleReport";
import { CrudTable, type FieldDef } from "@/components/dms/CrudTable";
import { StatsCards } from "@/components/dms/StatsCards";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { localCrud } from "@/lib/local-store";
import { PK_CITIES, fmtPKR } from "@/lib/pk";

/* ================= Types ================= */

type AssetStatus = "available" | "assigned" | "maintenance" | "lost" | "retired";

type Asset = {
  id: number;
  tag: string;
  name: string;
  category: string;
  asset_kind?: "fixed" | "digital";

  brand?: string;
  model?: string;
  serial?: string;
  imei?: string;
  vendor?: string;
  purchase_date?: string;
  purchase_price?: number;
  warranty_until?: string;
  depreciation_years?: number;
  condition?: "new" | "good" | "fair" | "poor";
  assigned_to?: string;
  assigned_cnic?: string;
  assigned_date?: string;
  location?: string;
  quantity: number;
  status: AssetStatus;
  notes?: string;
};

type Consumable = {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: "pcs" | "box" | "ream" | "pack" | "ltr" | "kg";
  vendor?: string;
  unit_cost?: number;
  quantity: number;
  reorder_level: number;
  location?: string;
  last_restock?: string;
  notes?: string;
};

type Assignment = {
  id: number;
  asset_tag: string;
  asset_name?: string;
  employee: string;
  cnic?: string;
  action: "issued" | "returned" | "transferred";
  date: string;
  location?: string;
  condition_out?: "new" | "good" | "fair" | "poor";
  condition_in?: "new" | "good" | "fair" | "poor";
  notes?: string;
};

type Maintenance = {
  id: number;
  asset_tag: string;
  asset_name?: string;
  type: "repair" | "service" | "upgrade" | "inspection" | "replacement";
  vendor?: string;
  date: string;
  cost?: number;
  status: "scheduled" | "in_progress" | "done" | "cancelled";
  next_due?: string;
  notes?: string;
};

type CategoryKind = "fixed" | "consumable" | "digital";

type AssetCategory = {
  id: number;
  name: string;
  kind: CategoryKind;
  description?: string;
};

/* ================= Stores ================= */

const categoriesApi = localCrud<AssetCategory>("inventory_categories", [
  { name: "Laptop", kind: "fixed", description: "Portable computers issued to staff" },
  { name: "Desktop / PC", kind: "fixed" },
  { name: "Monitor", kind: "fixed" },
  { name: "Mobile Phone", kind: "fixed", description: "PTA-approved handsets" },
  { name: "Printer / Scanner", kind: "fixed" },
  { name: "Networking Gear", kind: "fixed" },
  { name: "Furniture", kind: "fixed" },
  { name: "Vehicle", kind: "fixed" },
  { name: "Stationery", kind: "consumable" },
  { name: "Printer Supplies", kind: "consumable", description: "Toners, ink, drums" },
  { name: "Cables & Adapters", kind: "consumable" },
  { name: "Peripherals", kind: "consumable" },
  { name: "Pantry", kind: "consumable" },
  { name: "Software License", kind: "digital", description: "Windows, Office, Adobe etc." },
  { name: "SaaS Subscription", kind: "digital", description: "Google Workspace, Slack, Figma" },
  { name: "Domain Name", kind: "digital" },
  { name: "Hosting / Cloud", kind: "digital" },
  { name: "Email Account", kind: "digital" },
  { name: "Social Media Handle", kind: "digital" },
]);

type CatalogItem = { id: number; category: string; name: string };

const itemsApi = localCrud<CatalogItem>("inventory_items", [
  // ---- Fixed: Laptop ----
  { category: "Laptop", name: 'MacBook Pro 16"' },
  { category: "Laptop", name: 'MacBook Pro 14"' },
  { category: "Laptop", name: 'MacBook Air 13"' },
  { category: "Laptop", name: "Dell XPS 15" },
  { category: "Laptop", name: "Dell Latitude 5540" },
  { category: "Laptop", name: "Dell Inspiron 15" },
  { category: "Laptop", name: "HP EliteBook 840" },
  { category: "Laptop", name: "HP ProBook 450" },
  { category: "Laptop", name: "Lenovo ThinkPad X1 Carbon" },
  { category: "Laptop", name: "Lenovo ThinkPad T14" },
  { category: "Laptop", name: "Acer Aspire 5" },
  { category: "Laptop", name: "Asus ZenBook 14" },
  // ---- Desktop / PC ----
  { category: "Desktop / PC", name: "Dell OptiPlex 7010" },
  { category: "Desktop / PC", name: "HP EliteDesk 800 G9" },
  { category: "Desktop / PC", name: "Lenovo ThinkCentre M75q" },
  { category: "Desktop / PC", name: "Custom Assembled i5 Workstation" },
  { category: "Desktop / PC", name: "Custom Assembled i7 Workstation" },
  { category: "Desktop / PC", name: "Apple iMac 24" },
  { category: "Desktop / PC", name: "Apple Mac Mini M2" },
  // ---- Monitor ----
  { category: "Monitor", name: 'Dell UltraSharp 27"' },
  { category: "Monitor", name: 'Dell P2422H 24"' },
  { category: "Monitor", name: 'LG UltraWide 34"' },
  { category: "Monitor", name: 'Samsung 27" Curved' },
  { category: "Monitor", name: 'HP E24 G5 24"' },
  { category: "Monitor", name: 'BenQ GW2480 24"' },
  { category: "Monitor", name: 'ViewSonic VA2432 24"' },
  // ---- Mobile Phone ----
  { category: "Mobile Phone", name: "iPhone 15" },
  { category: "Mobile Phone", name: "iPhone 15 Pro" },
  { category: "Mobile Phone", name: "iPhone 14" },
  { category: "Mobile Phone", name: "iPhone 13" },
  { category: "Mobile Phone", name: "Samsung Galaxy S24" },
  { category: "Mobile Phone", name: "Samsung Galaxy A55" },
  { category: "Mobile Phone", name: "Samsung Galaxy A15" },
  { category: "Mobile Phone", name: "Infinix Note 40" },
  { category: "Mobile Phone", name: "Vivo Y28" },
  { category: "Mobile Phone", name: "Oppo A78" },
  { category: "Mobile Phone", name: "Xiaomi Redmi Note 13" },
  // ---- Printer / Scanner ----
  { category: "Printer / Scanner", name: "HP LaserJet Pro M404dn" },
  { category: "Printer / Scanner", name: "HP LaserJet Pro MFP M428fdw" },
  { category: "Printer / Scanner", name: "Canon imageCLASS MF445dw" },
  { category: "Printer / Scanner", name: "Epson EcoTank L3250" },
  { category: "Printer / Scanner", name: "Brother HL-L2375DW" },
  { category: "Printer / Scanner", name: "Canon LiDE 300 Scanner" },
  { category: "Printer / Scanner", name: "Ricoh SP 210SU" },
  // ---- Networking Gear ----
  { category: "Networking Gear", name: "TP-Link Archer C6 Router" },
  { category: "Networking Gear", name: "TP-Link Deco X20 Mesh" },
  { category: "Networking Gear", name: "Cisco Catalyst 2960 Switch" },
  { category: "Networking Gear", name: "Ubiquiti UniFi AP AC Pro" },
  { category: "Networking Gear", name: "MikroTik hEX RB750Gr3" },
  { category: "Networking Gear", name: "D-Link 24-Port Gigabit Switch" },
  { category: "Networking Gear", name: "APC UPS 1500VA" },
  // ---- Furniture ----
  { category: "Furniture", name: "Executive Office Chair" },
  { category: "Furniture", name: "Staff Office Chair" },
  { category: "Furniture", name: "Ergonomic Mesh Chair" },
  { category: "Furniture", name: "L-Shape Executive Desk" },
  { category: "Furniture", name: "Standard Office Desk" },
  { category: "Furniture", name: "Conference Table (8-seater)" },
  { category: "Furniture", name: "Filing Cabinet 4-Drawer" },
  { category: "Furniture", name: "Whiteboard 4x6 ft" },
  { category: "Furniture", name: "Reception Sofa" },
  // ---- Vehicle ----
  { category: "Vehicle", name: "Suzuki Cultus" },
  { category: "Vehicle", name: "Suzuki Alto" },
  { category: "Vehicle", name: "Suzuki Wagon R" },
  { category: "Vehicle", name: "Honda City" },
  { category: "Vehicle", name: "Honda Civic" },
  { category: "Vehicle", name: "Toyota Corolla GLi" },
  { category: "Vehicle", name: "Toyota Yaris" },
  { category: "Vehicle", name: "Honda CD 70 Motorcycle" },
  { category: "Vehicle", name: "Suzuki GS 150 Motorcycle" },

  // ---- Consumable: Stationery ----
  { category: "Stationery", name: "A4 Paper 80gsm" },
  { category: "Stationery", name: "A3 Paper 80gsm" },
  { category: "Stationery", name: "Legal Size Paper" },
  { category: "Stationery", name: "Ball Pen Blue (Piano)" },
  { category: "Stationery", name: "Ball Pen Black (Dollar)" },
  { category: "Stationery", name: "Whiteboard Marker" },
  { category: "Stationery", name: "Permanent Marker" },
  { category: "Stationery", name: "Highlighter" },
  { category: "Stationery", name: "Stapler" },
  { category: "Stationery", name: "Stapler Pins" },
  { category: "Stationery", name: "Paper Clips" },
  { category: "Stationery", name: "Sticky Notes 3x3" },
  { category: "Stationery", name: "File Folder" },
  { category: "Stationery", name: "Box File" },
  { category: "Stationery", name: "Ring Binder" },
  { category: "Stationery", name: "Envelopes A4" },
  // ---- Printer Supplies ----
  { category: "Printer Supplies", name: "HP 05A Toner Cartridge" },
  { category: "Printer Supplies", name: "HP 12A Toner Cartridge" },
  { category: "Printer Supplies", name: "HP 78A Toner Cartridge" },
  { category: "Printer Supplies", name: "Canon 325 Toner" },
  { category: "Printer Supplies", name: "Epson 003 Ink Bottle" },
  { category: "Printer Supplies", name: "Brother TN-2260 Toner" },
  { category: "Printer Supplies", name: "Printer Drum Unit" },
  // ---- Cables & Adapters ----
  { category: "Cables & Adapters", name: "HDMI Cable 2m" },
  { category: "Cables & Adapters", name: "HDMI Cable 5m" },
  { category: "Cables & Adapters", name: "VGA Cable" },
  { category: "Cables & Adapters", name: "USB-C to HDMI Adapter" },
  { category: "Cables & Adapters", name: "USB-C Hub 7-in-1" },
  { category: "Cables & Adapters", name: "Cat6 LAN Cable (per m)" },
  { category: "Cables & Adapters", name: "Power Extension 4-way" },
  { category: "Cables & Adapters", name: "Laptop Charger 65W USB-C" },
  { category: "Cables & Adapters", name: "Mobile Charger 20W" },
  // ---- Peripherals ----
  { category: "Peripherals", name: "Wireless Mouse Logitech M170" },
  { category: "Peripherals", name: "Wired Mouse A4Tech OP-720" },
  { category: "Peripherals", name: "Wireless Keyboard Logitech K380" },
  { category: "Peripherals", name: "Wired Keyboard A4Tech KR-83" },
  { category: "Peripherals", name: "Headphones with Mic" },
  { category: "Peripherals", name: "Webcam Logitech C270" },
  { category: "Peripherals", name: "USB Flash Drive 32GB" },
  { category: "Peripherals", name: "External HDD 1TB" },
  { category: "Peripherals", name: "Mouse Pad" },
  // ---- Pantry ----
  { category: "Pantry", name: "Tapal Danedar Tea 475g" },
  { category: "Pantry", name: "Lipton Yellow Label Tea" },
  { category: "Pantry", name: "Nescafé Classic Coffee" },
  { category: "Pantry", name: "Sugar 1kg" },
  { category: "Pantry", name: "Milk Pack (Olpers 1L)" },
  { category: "Pantry", name: "Bottled Water 1.5L" },
  { category: "Pantry", name: "Biscuits (Sooper)" },
  { category: "Pantry", name: "Disposable Cups" },
  { category: "Pantry", name: "Tissue Paper Box" },
  { category: "Pantry", name: "Hand Wash 500ml" },

  // ---- Digital: Software License ----
  { category: "Software License", name: "Microsoft Windows 11 Pro" },
  { category: "Software License", name: "Microsoft Office 2021" },
  { category: "Software License", name: "Adobe Acrobat Pro DC" },
  { category: "Software License", name: "AutoCAD" },
  { category: "Software License", name: "CorelDRAW" },
  { category: "Software License", name: "Kaspersky Antivirus" },
  { category: "Software License", name: "ESET NOD32 Antivirus" },
  // ---- SaaS Subscription ----
  { category: "SaaS Subscription", name: "Google Workspace Business" },
  { category: "SaaS Subscription", name: "Microsoft 365 Business" },
  { category: "SaaS Subscription", name: "Adobe Creative Cloud" },
  { category: "SaaS Subscription", name: "Figma Professional" },
  { category: "SaaS Subscription", name: "Slack Standard" },
  { category: "SaaS Subscription", name: "Zoom Pro" },
  { category: "SaaS Subscription", name: "Notion Team" },
  { category: "SaaS Subscription", name: "Canva Pro" },
  { category: "SaaS Subscription", name: "GitHub Team" },
  { category: "SaaS Subscription", name: "ChatGPT Team" },
  // ---- Domain Name ----
  { category: "Domain Name", name: "devionic.com" },
  { category: "Domain Name", name: "devionic.pk" },
  { category: "Domain Name", name: "devionic.net" },
  // ---- Hosting / Cloud ----
  { category: "Hosting / Cloud", name: "AWS EC2 Instance" },
  { category: "Hosting / Cloud", name: "AWS S3 Storage" },
  { category: "Hosting / Cloud", name: "DigitalOcean Droplet" },
  { category: "Hosting / Cloud", name: "Cloudflare Pro Plan" },
  { category: "Hosting / Cloud", name: "Vercel Pro" },
  { category: "Hosting / Cloud", name: "Hostinger Business Hosting" },
  { category: "Hosting / Cloud", name: "Namecheap Shared Hosting" },
  // ---- Email Account ----
  { category: "Email Account", name: "info@devionic.com" },
  { category: "Email Account", name: "hr@devionic.com" },
  { category: "Email Account", name: "accounts@devionic.com" },
  { category: "Email Account", name: "support@devionic.com" },
  { category: "Email Account", name: "sales@devionic.com" },
  // ---- Social Media Handle ----
  { category: "Social Media Handle", name: "Facebook Page" },
  { category: "Social Media Handle", name: "Instagram Handle" },
  { category: "Social Media Handle", name: "LinkedIn Company Page" },
  { category: "Social Media Handle", name: "X (Twitter) Handle" },
  { category: "Social Media Handle", name: "YouTube Channel" },
  { category: "Social Media Handle", name: "TikTok Handle" },
]);

const ASSET_SEED: Omit<Asset, "id">[] = [
  // ---------- Laptop ----------
  { tag: "DEV-LT-014", name: 'MacBook Pro 16"', category: "Laptop", asset_kind: "fixed", brand: "Apple", model: "M3 Pro 16GB/512GB", serial: "MBP-2025-014", vendor: "iShop Karachi", purchase_date: "2025-11-10", purchase_price: 725000, warranty_until: "2026-11-10", depreciation_years: 4, condition: "new", assigned_to: "Farhan Javed", assigned_cnic: "35202-1234567-1", assigned_date: "2025-11-12", location: "Karachi HQ", quantity: 1, status: "assigned" },
  { tag: "DEV-LT-015", name: "Dell XPS 15", category: "Laptop", asset_kind: "fixed", brand: "Dell", model: "9530 i7/16GB/512GB", serial: "XPS-9530-015", vendor: "Czone Lahore", purchase_date: "2025-08-20", purchase_price: 465000, warranty_until: "2027-08-20", depreciation_years: 4, condition: "good", location: "Lahore Office", quantity: 1, status: "available" },
  { tag: "DEV-LT-016", name: "HP EliteBook 840", category: "Laptop", asset_kind: "fixed", brand: "HP", model: "G10 i5/16GB/512GB", serial: "HP-840-016", vendor: "Symmetry Traders", purchase_date: "2025-05-12", purchase_price: 320000, warranty_until: "2027-05-12", depreciation_years: 4, condition: "good", assigned_to: "Ayesha Khan", assigned_cnic: "35201-9876543-2", assigned_date: "2025-06-01", location: "Karachi HQ", quantity: 1, status: "assigned" },
  { tag: "DEV-LT-017", name: "Lenovo ThinkPad X1 Carbon", category: "Laptop", asset_kind: "fixed", brand: "Lenovo", model: "Gen 11 i7/16GB", serial: "TP-X1C-017", vendor: "Galaxy Computers", purchase_date: "2025-03-18", purchase_price: 410000, warranty_until: "2028-03-18", depreciation_years: 4, condition: "good", location: "Islamabad Office", quantity: 1, status: "available" },

  // ---------- Desktop / PC ----------
  { tag: "DEV-DT-101", name: "Dell OptiPlex 7010", category: "Desktop / PC", asset_kind: "fixed", brand: "Dell", model: "i5-13500/16GB/512GB", serial: "OPX-7010-101", vendor: "Czone Lahore", purchase_date: "2025-07-05", purchase_price: 195000, warranty_until: "2028-07-05", depreciation_years: 5, condition: "good", location: "Lahore Office", quantity: 2, status: "available" },
  { tag: "DEV-DT-102", name: "Apple iMac 24", category: "Desktop / PC", asset_kind: "fixed", brand: "Apple", model: "M3 8GB/256GB", serial: "IMAC-24-102", vendor: "iShop Karachi", purchase_date: "2026-02-10", purchase_price: 385000, warranty_until: "2027-02-10", depreciation_years: 5, condition: "new", assigned_to: "Bilal Ahmed", assigned_date: "2026-02-15", location: "Karachi HQ", quantity: 1, status: "assigned" },
  { tag: "DEV-DT-103", name: "Custom Assembled i7 Workstation", category: "Desktop / PC", asset_kind: "fixed", brand: "Custom", model: "i7-14700 / 32GB / RTX 4060", vendor: "Hafeez Center Lahore", purchase_date: "2025-12-01", purchase_price: 275000, depreciation_years: 5, condition: "good", location: "Design Studio", quantity: 1, status: "available" },

  // ---------- Monitor ----------
  { tag: "DEV-MN-201", name: 'Dell UltraSharp 27"', category: "Monitor", asset_kind: "fixed", brand: "Dell", model: "U2724D", serial: "DU-2701", vendor: "Czone Lahore", purchase_date: "2025-09-01", purchase_price: 110000, warranty_until: "2028-09-01", depreciation_years: 5, condition: "good", location: "Lahore Office", quantity: 3, status: "available" },
  { tag: "DEV-MN-202", name: 'LG UltraWide 34"', category: "Monitor", asset_kind: "fixed", brand: "LG", model: "34WP65C", serial: "LG-34-202", vendor: "Galaxy Computers", purchase_date: "2025-10-14", purchase_price: 145000, warranty_until: "2028-10-14", depreciation_years: 5, condition: "new", location: "Design Studio", quantity: 1, status: "available" },
  { tag: "DEV-MN-203", name: 'Samsung 27" Curved', category: "Monitor", asset_kind: "fixed", brand: "Samsung", model: "LC27F390", serial: "SM-CV-203", vendor: "Symmetry Traders", purchase_date: "2025-04-22", purchase_price: 62000, warranty_until: "2027-04-22", depreciation_years: 5, condition: "good", location: "Karachi HQ", quantity: 4, status: "available" },

  // ---------- Mobile Phone ----------
  { tag: "DEV-PH-042", name: "iPhone 15", category: "Mobile Phone", asset_kind: "fixed", brand: "Apple", model: "128GB PTA", imei: "356789104567890", vendor: "PTA Registered", purchase_date: "2025-06-15", purchase_price: 285000, warranty_until: "2026-06-15", condition: "good", location: "Islamabad Office", quantity: 1, status: "available" },
  { tag: "DEV-PH-043", name: "Samsung Galaxy S24", category: "Mobile Phone", asset_kind: "fixed", brand: "Samsung", model: "256GB PTA", imei: "356789104567891", vendor: "Mobile Zone Lahore", purchase_date: "2025-08-02", purchase_price: 240000, warranty_until: "2026-08-02", condition: "good", assigned_to: "Rabia Malik", assigned_date: "2025-08-05", location: "Sales Team", quantity: 1, status: "assigned" },
  { tag: "DEV-PH-044", name: "Infinix Note 40", category: "Mobile Phone", asset_kind: "fixed", brand: "Infinix", model: "8GB/256GB", imei: "356789104567892", vendor: "Mobile Mall Multan", purchase_date: "2025-11-20", purchase_price: 62000, warranty_until: "2026-11-20", condition: "new", location: "Karachi HQ", quantity: 2, status: "available" },

  // ---------- Printer / Scanner ----------
  { tag: "DEV-PR-301", name: "HP LaserJet Pro MFP M428fdw", category: "Printer / Scanner", asset_kind: "fixed", brand: "HP", model: "M428fdw", serial: "HP-M428-301", vendor: "Czone Lahore", purchase_date: "2025-02-11", purchase_price: 165000, warranty_until: "2027-02-11", depreciation_years: 5, condition: "good", location: "Karachi HQ", quantity: 1, status: "available" },
  { tag: "DEV-PR-302", name: "Epson EcoTank L3250", category: "Printer / Scanner", asset_kind: "fixed", brand: "Epson", model: "L3250", serial: "EP-L3250-302", vendor: "Symmetry Traders", purchase_date: "2025-05-30", purchase_price: 48000, warranty_until: "2027-05-30", condition: "good", location: "Lahore Office", quantity: 1, status: "available" },
  { tag: "DEV-PR-303", name: "Canon LiDE 300 Scanner", category: "Printer / Scanner", asset_kind: "fixed", brand: "Canon", model: "LiDE 300", serial: "CN-LIDE-303", vendor: "Galaxy Computers", purchase_date: "2025-09-10", purchase_price: 18500, condition: "good", location: "HR Dept", quantity: 1, status: "available" },

  // ---------- Networking Gear ----------
  { tag: "DEV-NW-401", name: "TP-Link Deco X20 Mesh", category: "Networking Gear", asset_kind: "fixed", brand: "TP-Link", model: "Deco X20 (3-pack)", serial: "TP-DX20-401", vendor: "Czone Lahore", purchase_date: "2025-06-05", purchase_price: 42000, warranty_until: "2027-06-05", condition: "good", location: "Karachi HQ", quantity: 1, status: "available" },
  { tag: "DEV-NW-402", name: "Cisco Catalyst 2960 Switch", category: "Networking Gear", asset_kind: "fixed", brand: "Cisco", model: "WS-C2960-24TT", serial: "CS-2960-402", vendor: "IT Connect", purchase_date: "2024-11-18", purchase_price: 85000, condition: "good", location: "Server Room", quantity: 1, status: "available" },
  { tag: "DEV-NW-403", name: "APC UPS 1500VA", category: "Networking Gear", asset_kind: "fixed", brand: "APC", model: "BX1500M", serial: "APC-403", vendor: "Symmetry Traders", purchase_date: "2025-01-25", purchase_price: 55000, warranty_until: "2027-01-25", condition: "good", location: "Server Room", quantity: 2, status: "available" },

  // ---------- Furniture ----------
  { tag: "DEV-FN-501", name: "Executive Office Chair", category: "Furniture", asset_kind: "fixed", brand: "Interwood", model: "Boss Series", vendor: "Interwood Karachi", purchase_date: "2025-01-12", purchase_price: 45000, condition: "good", location: "Karachi HQ", quantity: 4, status: "available" },
  { tag: "DEV-FN-502", name: "L-Shape Executive Desk", category: "Furniture", asset_kind: "fixed", brand: "Habitt", model: "Metro L-Desk", vendor: "Habitt Lahore", purchase_date: "2025-02-20", purchase_price: 68000, condition: "good", location: "Lahore Office", quantity: 2, status: "available" },
  { tag: "DEV-FN-503", name: "Conference Table (8-seater)", category: "Furniture", asset_kind: "fixed", brand: "Interwood", model: "Boardroom Oak", vendor: "Interwood Karachi", purchase_date: "2024-12-08", purchase_price: 125000, condition: "good", location: "Boardroom", quantity: 1, status: "available" },
  { tag: "DEV-FN-504", name: "Filing Cabinet 4-Drawer", category: "Furniture", asset_kind: "fixed", brand: "Master", model: "MS-FC4", vendor: "Al-Fatah Furniture", purchase_date: "2025-03-15", purchase_price: 22000, condition: "good", location: "Accounts Dept", quantity: 3, status: "available" },

  // ---------- Vehicle ----------
  { tag: "DEV-VH-601", name: "Honda City", category: "Vehicle", asset_kind: "fixed", brand: "Honda", model: "1.2L Aspire 2024", serial: "LEB-2024-601", vendor: "Honda South Lahore", purchase_date: "2024-08-14", purchase_price: 5850000, condition: "good", assigned_to: "Company Pool", location: "Karachi HQ", quantity: 1, status: "assigned" },
  { tag: "DEV-VH-602", name: "Suzuki Cultus", category: "Vehicle", asset_kind: "fixed", brand: "Suzuki", model: "VXL 2023", serial: "LEC-2023-602", vendor: "Suzuki Motors Multan", purchase_date: "2023-06-10", purchase_price: 3450000, condition: "good", location: "Multan Branch", quantity: 1, status: "available" },
  { tag: "DEV-VH-603", name: "Honda CD 70 Motorcycle", category: "Vehicle", asset_kind: "fixed", brand: "Honda", model: "CD 70 2025", serial: "KHI-2025-603", vendor: "Atlas Honda Karachi", purchase_date: "2025-04-01", purchase_price: 175000, condition: "new", assigned_to: "Office Boy", location: "Karachi HQ", quantity: 2, status: "assigned" },

  // ---------- Software License (Digital) ----------
  { tag: "DEV-SW-701", name: "Microsoft Windows 11 Pro", category: "Software License", asset_kind: "digital", brand: "Microsoft", model: "OEM Pro", vendor: "Microsoft Reseller PK", purchase_date: "2025-01-10", purchase_price: 45000, condition: "new", location: "IT Store", quantity: 10, status: "available" },
  { tag: "DEV-SW-702", name: "Microsoft Office 2021", category: "Software License", asset_kind: "digital", brand: "Microsoft", model: "Home & Business", vendor: "Microsoft Reseller PK", purchase_date: "2025-01-10", purchase_price: 55000, condition: "new", location: "IT Store", quantity: 8, status: "available" },
  { tag: "DEV-SW-703", name: "Adobe Acrobat Pro DC", category: "Software License", asset_kind: "digital", brand: "Adobe", model: "Annual", vendor: "Adobe PK Reseller", purchase_date: "2026-01-05", purchase_price: 42000, warranty_until: "2027-01-05", condition: "new", location: "Cloud", quantity: 3, status: "available" },
  { tag: "DEV-SW-704", name: "Kaspersky Antivirus", category: "Software License", asset_kind: "digital", brand: "Kaspersky", model: "Total Security 5-Device", vendor: "Kaspersky PK", purchase_date: "2026-03-01", purchase_price: 9500, warranty_until: "2027-03-01", condition: "new", location: "IT Store", quantity: 5, status: "available" },

  // ---------- SaaS Subscription ----------
  { tag: "DEV-SS-801", name: "Adobe Creative Cloud", category: "SaaS Subscription", asset_kind: "digital", brand: "Adobe", model: "All Apps Annual", vendor: "Adobe PK Reseller", purchase_date: "2026-01-05", purchase_price: 95000, warranty_until: "2027-01-05", condition: "new", location: "Cloud", quantity: 1, status: "available" },
  { tag: "DEV-SS-802", name: "Google Workspace Business", category: "SaaS Subscription", asset_kind: "digital", brand: "Google", model: "Business Standard", vendor: "Google", purchase_date: "2025-01-01", purchase_price: 180000, warranty_until: "2026-12-31", condition: "new", location: "Cloud", quantity: 15, status: "assigned" },
  { tag: "DEV-SS-803", name: "Figma Professional", category: "SaaS Subscription", asset_kind: "digital", brand: "Figma", model: "Professional Annual", vendor: "Figma", purchase_date: "2025-11-01", purchase_price: 48000, warranty_until: "2026-10-31", condition: "new", location: "Cloud", quantity: 4, status: "assigned" },
  { tag: "DEV-SS-804", name: "Slack Standard", category: "SaaS Subscription", asset_kind: "digital", brand: "Salesforce", model: "Standard Annual", vendor: "Slack", purchase_date: "2025-06-01", purchase_price: 65000, warranty_until: "2026-05-31", condition: "new", location: "Cloud", quantity: 20, status: "assigned" },
  { tag: "DEV-SS-805", name: "GitHub Team", category: "SaaS Subscription", asset_kind: "digital", brand: "GitHub", model: "Team Annual", vendor: "GitHub", purchase_date: "2025-09-01", purchase_price: 32000, warranty_until: "2026-08-31", condition: "new", location: "Cloud", quantity: 8, status: "assigned" },

  // ---------- Domain Name ----------
  { tag: "DEV-DN-901", name: "devionic.com", category: "Domain Name", asset_kind: "digital", brand: "Namecheap", vendor: "Namecheap", purchase_date: "2022-05-14", purchase_price: 3800, warranty_until: "2027-05-14", condition: "new", location: "DNS", quantity: 1, status: "available" },
  { tag: "DEV-DN-902", name: "devionic.pk", category: "Domain Name", asset_kind: "digital", brand: "PKNIC", vendor: "PKNIC", purchase_date: "2023-01-20", purchase_price: 4500, warranty_until: "2027-01-20", condition: "new", location: "DNS", quantity: 1, status: "available" },
  { tag: "DEV-DN-903", name: "devionic.net", category: "Domain Name", asset_kind: "digital", brand: "Namecheap", vendor: "Namecheap", purchase_date: "2024-02-11", purchase_price: 4200, warranty_until: "2027-02-11", condition: "new", location: "DNS", quantity: 1, status: "available" },

  // ---------- Hosting / Cloud ----------
  { tag: "DEV-HC-951", name: "AWS EC2 Instance", category: "Hosting / Cloud", asset_kind: "digital", brand: "AWS", model: "t3.medium us-east-1", vendor: "Amazon Web Services", purchase_date: "2025-04-01", purchase_price: 168000, warranty_until: "2026-03-31", condition: "new", location: "AWS Cloud", quantity: 1, status: "assigned" },
  { tag: "DEV-HC-952", name: "DigitalOcean Droplet", category: "Hosting / Cloud", asset_kind: "digital", brand: "DigitalOcean", model: "4GB / 2 vCPU", vendor: "DigitalOcean", purchase_date: "2025-07-10", purchase_price: 22000, warranty_until: "2026-07-09", condition: "new", location: "DO Cloud", quantity: 2, status: "assigned" },
  { tag: "DEV-HC-953", name: "Cloudflare Pro Plan", category: "Hosting / Cloud", asset_kind: "digital", brand: "Cloudflare", model: "Pro Annual", vendor: "Cloudflare", purchase_date: "2025-08-15", purchase_price: 7000, warranty_until: "2026-08-14", condition: "new", location: "Cloudflare", quantity: 1, status: "available" },
  { tag: "DEV-HC-954", name: "Hostinger Business Hosting", category: "Hosting / Cloud", asset_kind: "digital", brand: "Hostinger", model: "Business 4-Year", vendor: "Hostinger", purchase_date: "2024-03-22", purchase_price: 38000, warranty_until: "2028-03-21", condition: "new", location: "Hostinger", quantity: 1, status: "available" },

  // ---------- Email Account ----------
  { tag: "DEV-EM-971", name: "info@devionic.com", category: "Email Account", asset_kind: "digital", brand: "Google Workspace", vendor: "Google", purchase_date: "2025-01-01", condition: "new", location: "Google Workspace", quantity: 1, status: "assigned", assigned_to: "Reception" },
  { tag: "DEV-EM-972", name: "hr@devionic.com", category: "Email Account", asset_kind: "digital", brand: "Google Workspace", vendor: "Google", purchase_date: "2025-01-01", condition: "new", location: "Google Workspace", quantity: 1, status: "assigned", assigned_to: "HR Department" },
  { tag: "DEV-EM-973", name: "accounts@devionic.com", category: "Email Account", asset_kind: "digital", brand: "Google Workspace", vendor: "Google", purchase_date: "2025-01-01", condition: "new", location: "Google Workspace", quantity: 1, status: "assigned", assigned_to: "Accounts Department" },
  { tag: "DEV-EM-974", name: "support@devionic.com", category: "Email Account", asset_kind: "digital", brand: "Google Workspace", vendor: "Google", purchase_date: "2025-01-01", condition: "new", location: "Google Workspace", quantity: 1, status: "assigned", assigned_to: "Support Team" },

  // ---------- Social Media Handle ----------
  { tag: "DEV-SM-981", name: "Facebook Page", category: "Social Media Handle", asset_kind: "digital", brand: "Meta", model: "@devionic", vendor: "Meta", purchase_date: "2022-08-01", condition: "new", location: "facebook.com/devionic", quantity: 1, status: "assigned", assigned_to: "Marketing" },
  { tag: "DEV-SM-982", name: "Instagram Handle", category: "Social Media Handle", asset_kind: "digital", brand: "Meta", model: "@devionic", vendor: "Meta", purchase_date: "2022-08-01", condition: "new", location: "instagram.com/devionic", quantity: 1, status: "assigned", assigned_to: "Marketing" },
  { tag: "DEV-SM-983", name: "LinkedIn Company Page", category: "Social Media Handle", asset_kind: "digital", brand: "LinkedIn", model: "Devionic (Pvt) Ltd", vendor: "LinkedIn", purchase_date: "2022-08-01", condition: "new", location: "linkedin.com/company/devionic", quantity: 1, status: "assigned", assigned_to: "Marketing" },
  { tag: "DEV-SM-984", name: "YouTube Channel", category: "Social Media Handle", asset_kind: "digital", brand: "Google", model: "@devionic", vendor: "YouTube", purchase_date: "2023-02-14", condition: "new", location: "youtube.com/@devionic", quantity: 1, status: "assigned", assigned_to: "Marketing" },
  { tag: "DEV-SM-985", name: "X (Twitter) Handle", category: "Social Media Handle", asset_kind: "digital", brand: "X", model: "@devionic_pk", vendor: "X Corp", purchase_date: "2022-08-01", condition: "new", location: "x.com/devionic_pk", quantity: 1, status: "assigned", assigned_to: "Marketing" },
];

const CONSUMABLE_SEED: Omit<Consumable, "id">[] = [
  // ---------- Stationery ----------
  { sku: "PPR-A4-80", name: "A4 Paper 80gsm", category: "Stationery", unit: "ream", vendor: "Al-Fatah Stationers", unit_cost: 1450, quantity: 24, reorder_level: 10, location: "Store Room", last_restock: "2026-06-01" },
  { sku: "PPR-A3-80", name: "A3 Paper 80gsm", category: "Stationery", unit: "ream", vendor: "Al-Fatah Stationers", unit_cost: 2850, quantity: 6, reorder_level: 4, location: "Store Room", last_restock: "2026-05-10" },
  { sku: "PEN-BLUE-PIANO", name: "Ball Pen Blue (Piano)", category: "Stationery", unit: "box", vendor: "Piano Stationery", unit_cost: 320, quantity: 15, reorder_level: 5, location: "Store Room", last_restock: "2026-06-08" },
  { sku: "MRK-WB-BLACK", name: "Whiteboard Marker", category: "Stationery", unit: "pack", vendor: "Dollar Industries", unit_cost: 280, quantity: 8, reorder_level: 6, location: "Store Room" },
  { sku: "STK-3X3", name: "Sticky Notes 3x3", category: "Stationery", unit: "pcs", vendor: "Al-Fatah Stationers", unit_cost: 180, quantity: 40, reorder_level: 15, location: "Store Room" },
  { sku: "FLD-FILE", name: "File Folder", category: "Stationery", unit: "pcs", vendor: "Al-Fatah Stationers", unit_cost: 65, quantity: 120, reorder_level: 50, location: "Store Room" },
  { sku: "BOX-FILE", name: "Box File", category: "Stationery", unit: "pcs", vendor: "Al-Fatah Stationers", unit_cost: 320, quantity: 22, reorder_level: 10, location: "Store Room" },

  // ---------- Printer Supplies ----------
  { sku: "TNR-HP-05A", name: "HP 05A Toner Cartridge", category: "Printer Supplies", unit: "pcs", vendor: "Czone Lahore", unit_cost: 12500, quantity: 3, reorder_level: 5, location: "Store Room", last_restock: "2026-05-10" },
  { sku: "TNR-HP-12A", name: "HP 12A Toner Cartridge", category: "Printer Supplies", unit: "pcs", vendor: "Czone Lahore", unit_cost: 9800, quantity: 4, reorder_level: 4, location: "Store Room" },
  { sku: "TNR-CN-325", name: "Canon 325 Toner", category: "Printer Supplies", unit: "pcs", vendor: "Symmetry Traders", unit_cost: 8500, quantity: 2, reorder_level: 3, location: "Store Room" },
  { sku: "INK-EP-003", name: "Epson 003 Ink Bottle", category: "Printer Supplies", unit: "pcs", vendor: "Symmetry Traders", unit_cost: 1450, quantity: 12, reorder_level: 6, location: "Store Room", last_restock: "2026-06-01" },
  { sku: "DRM-UNIT", name: "Printer Drum Unit", category: "Printer Supplies", unit: "pcs", vendor: "Czone Lahore", unit_cost: 18500, quantity: 1, reorder_level: 2, location: "Store Room" },

  // ---------- Cables & Adapters ----------
  { sku: "CBL-HDMI-2M", name: "HDMI Cable 2m", category: "Cables & Adapters", unit: "pcs", vendor: "Symmetry Traders", unit_cost: 850, quantity: 18, reorder_level: 8, location: "IT Store" },
  { sku: "CBL-HDMI-5M", name: "HDMI Cable 5m", category: "Cables & Adapters", unit: "pcs", vendor: "Symmetry Traders", unit_cost: 1450, quantity: 6, reorder_level: 4, location: "IT Store" },
  { sku: "ADP-USBC-HDMI", name: "USB-C to HDMI Adapter", category: "Cables & Adapters", unit: "pcs", vendor: "Galaxy Computers", unit_cost: 2200, quantity: 8, reorder_level: 4, location: "IT Store" },
  { sku: "HUB-USBC-7", name: "USB-C Hub 7-in-1", category: "Cables & Adapters", unit: "pcs", vendor: "Czone Lahore", unit_cost: 4800, quantity: 5, reorder_level: 3, location: "IT Store" },
  { sku: "CBL-CAT6", name: "Cat6 LAN Cable (per m)", category: "Cables & Adapters", unit: "pcs", vendor: "IT Connect", unit_cost: 60, quantity: 300, reorder_level: 100, location: "Server Room" },
  { sku: "CHG-USBC-65W", name: "Laptop Charger 65W USB-C", category: "Cables & Adapters", unit: "pcs", vendor: "Galaxy Computers", unit_cost: 5800, quantity: 4, reorder_level: 3, location: "IT Store" },

  // ---------- Peripherals ----------
  { sku: "MSE-LOGI-M170", name: "Wireless Mouse Logitech M170", category: "Peripherals", unit: "pcs", vendor: "Czone Lahore", unit_cost: 2200, quantity: 12, reorder_level: 5, location: "IT Store" },
  { sku: "KB-LOGI-K380", name: "Wireless Keyboard Logitech K380", category: "Peripherals", unit: "pcs", vendor: "Czone Lahore", unit_cost: 8900, quantity: 4, reorder_level: 3, location: "IT Store" },
  { sku: "HP-MIC", name: "Headphones with Mic", category: "Peripherals", unit: "pcs", vendor: "Symmetry Traders", unit_cost: 3500, quantity: 10, reorder_level: 5, location: "IT Store" },
  { sku: "USB-32GB", name: "USB Flash Drive 32GB", category: "Peripherals", unit: "pcs", vendor: "Galaxy Computers", unit_cost: 1200, quantity: 15, reorder_level: 8, location: "IT Store" },
  { sku: "HDD-1TB", name: "External HDD 1TB", category: "Peripherals", unit: "pcs", vendor: "Czone Lahore", unit_cost: 14500, quantity: 3, reorder_level: 2, location: "IT Store" },

  // ---------- Pantry ----------
  { sku: "TEA-TAPAL", name: "Tapal Danedar Tea 475g", category: "Pantry", unit: "pack", vendor: "Metro Cash & Carry", unit_cost: 1150, quantity: 6, reorder_level: 4, location: "Pantry", last_restock: "2026-06-15" },
  { sku: "COF-NES", name: "Nescafé Classic Coffee", category: "Pantry", unit: "pack", vendor: "Metro Cash & Carry", unit_cost: 1850, quantity: 3, reorder_level: 2, location: "Pantry" },
  { sku: "SUG-1KG", name: "Sugar 1kg", category: "Pantry", unit: "kg", vendor: "Al-Fatah Karachi", unit_cost: 340, quantity: 10, reorder_level: 5, location: "Pantry" },
  { sku: "MLK-OLPERS", name: "Milk Pack (Olpers 1L)", category: "Pantry", unit: "ltr", vendor: "Local Distributor", unit_cost: 340, quantity: 20, reorder_level: 10, location: "Pantry", last_restock: "2026-06-18" },
  { sku: "WTR-1.5L", name: "Bottled Water 1.5L", category: "Pantry", unit: "pcs", vendor: "Nestle Distributor", unit_cost: 130, quantity: 60, reorder_level: 24, location: "Pantry" },
  { sku: "BIS-SOOPER", name: "Biscuits (Sooper)", category: "Pantry", unit: "pack", vendor: "Metro Cash & Carry", unit_cost: 80, quantity: 40, reorder_level: 20, location: "Pantry" },
  { sku: "TSU-BOX", name: "Tissue Paper Box", category: "Pantry", unit: "box", vendor: "Rose Petal Distributor", unit_cost: 240, quantity: 18, reorder_level: 8, location: "Pantry" },
];

const ASSIGNMENT_SEED: Omit<Assignment, "id">[] = [
  { asset_tag: "DEV-LT-014", asset_name: 'MacBook Pro 16"', employee: "Farhan Javed", cnic: "35202-1234567-1", action: "issued", date: "2025-11-12", location: "Karachi HQ", condition_out: "new", notes: "Issued with charger & sleeve." },
  { asset_tag: "DEV-LT-016", asset_name: "HP EliteBook 840", employee: "Ayesha Khan", cnic: "35201-9876543-2", action: "issued", date: "2025-06-01", location: "Karachi HQ", condition_out: "good" },
  { asset_tag: "DEV-DT-102", asset_name: "Apple iMac 24", employee: "Bilal Ahmed", action: "issued", date: "2026-02-15", location: "Karachi HQ", condition_out: "new" },
  { asset_tag: "DEV-PH-043", asset_name: "Samsung Galaxy S24", employee: "Rabia Malik", action: "issued", date: "2025-08-05", location: "Sales Team", condition_out: "good" },
];

const MAINTENANCE_SEED: Omit<Maintenance, "id">[] = [
  { asset_tag: "DEV-MN-201", asset_name: 'Dell UltraSharp 27"', type: "inspection", vendor: "Dell Care PK", date: "2026-04-15", cost: 0, status: "done", next_due: "2027-04-15", notes: "Annual warranty checkup." },
  { asset_tag: "DEV-PR-301", asset_name: "HP LaserJet Pro MFP M428fdw", type: "service", vendor: "HP Service Center", date: "2026-03-20", cost: 4500, status: "done", next_due: "2026-09-20", notes: "Cleaning + firmware update." },
  { asset_tag: "DEV-VH-601", asset_name: "Honda City", type: "service", vendor: "Honda South Lahore", date: "2026-05-10", cost: 18500, status: "done", next_due: "2026-11-10", notes: "10,000 KM service." },
  { asset_tag: "DEV-NW-403", asset_name: "APC UPS 1500VA", type: "inspection", vendor: "APC Care", date: "2026-07-15", cost: 0, status: "scheduled", notes: "Battery health check." },
];

// One-time top-up: merge new seed rows into existing localStorage without losing user data.
if (typeof window !== "undefined") {
  const SEED_VER = "v3";
  const flagKey = "dms:inventory_seed_ver";
  if (window.localStorage.getItem(flagKey) !== SEED_VER) {
    const topUp = <T extends { id: number }>(key: string, seed: any[], uniqField: string) => {
      try {
        const storageKey = `dms:${key}`;
        const raw = window.localStorage.getItem(storageKey);
        const existing: T[] = raw ? JSON.parse(raw) : [];
        const have = new Set(existing.map((r: any) => r[uniqField]));
        const additions = seed
          .filter((s) => !have.has(s[uniqField]))
          .map((s, i) => ({ ...s, id: (existing.length ? Math.max(...existing.map((r) => r.id)) : 0) + i + 1 }));
        if (additions.length) {
          window.localStorage.setItem(storageKey, JSON.stringify([...additions, ...existing]));
        }
      } catch { /* noop */ }
    };
    topUp("inventory", ASSET_SEED, "tag");
    topUp("inventory_consumables", CONSUMABLE_SEED, "sku");
    topUp("inventory_assignments", ASSIGNMENT_SEED, "asset_tag");
    topUp("inventory_maintenance", MAINTENANCE_SEED, "asset_tag");
    window.localStorage.setItem(flagKey, SEED_VER);
  }
}

const assetsApi = localCrud<Asset>("inventory", ASSET_SEED);
const consumablesApi = localCrud<Consumable>("inventory_consumables", CONSUMABLE_SEED);
const assignmentsApi = localCrud<Assignment>("inventory_assignments", ASSIGNMENT_SEED);
const maintenanceApi = localCrud<Maintenance>("inventory_maintenance", MAINTENANCE_SEED);


/* ================= Field defs ================= */

const buildAssetFields = (
  categories: AssetCategory[],
  items: CatalogItem[],
  addItem: (category: string, name: string) => void,
): FieldDef<Asset>[] => {
  const catOpts = categories
    .filter((c) => c.kind === "fixed" || c.kind === "digital")
    .map((c) => ({ value: c.name, label: `${c.name} (${c.kind === "digital" ? "Digital" : "Fixed"})` }));
  return [
    { name: "tag", label: "Asset tag", required: true, section: "Identification" },
    { name: "name", label: "Asset name", type: "combobox", required: true, section: "Identification",
      placeholder: "Search item catalog or type new…",
      optionsFrom: (v) => {
        const cat = v.category as string | undefined;
        const list = cat ? items.filter((i) => i.category === cat) : items;
        return list.map((i) => ({ value: i.name, label: i.name }));
      },
      onAddOption: (val, v) => { if (v.category) addItem(String(v.category), val); } },
    { name: "asset_kind", label: "Asset kind", type: "select", required: true, section: "Identification", options: [
      { value: "fixed", label: "Fixed Asset" },
      { value: "digital", label: "Digital Asset" },
    ] },
    { name: "category", label: "Category", type: "select", required: true, section: "Identification",
      options: catOpts.length ? catOpts : [{ value: "Other", label: "Other" }],
      placeholder: catOpts.length ? undefined : "Add categories in the Categories tab first" },
    { name: "brand", label: "Brand", section: "Identification" },
    { name: "model", label: "Model / Plan", section: "Identification" },
    { name: "serial", label: "Serial / License key", section: "Identification" },
    { name: "imei", label: "IMEI / PTA reg. / Domain", section: "Identification" },
    { name: "condition", label: "Condition", type: "select", section: "Identification", options: [
      { value: "new", label: "New" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" },
    ] },

    { name: "vendor", label: "Vendor / Supplier", section: "Purchase" },
    { name: "purchase_date", label: "Purchase date", type: "date", section: "Purchase" },
    { name: "purchase_price", label: "Purchase price (PKR)", type: "number", section: "Purchase", render: (v) => fmtPKR(v) },
    { name: "warranty_until", label: "Warranty / Renewal until", type: "date", section: "Purchase" },
    { name: "depreciation_years", label: "Depreciation (years)", type: "number", section: "Purchase", placeholder: "e.g. 4" },
    { name: "quantity", label: "Quantity / Seats", type: "number", required: true, section: "Purchase" },

    { name: "assigned_to", label: "Assigned to", section: "Assignment" },
    { name: "assigned_cnic", label: "Employee CNIC", section: "Assignment" },
    { name: "assigned_date", label: "Assignment date", type: "date", section: "Assignment" },
    { name: "location", label: "Location / City", type: "select", options: PK_CITIES, section: "Assignment" },
    { name: "status", label: "Status", type: "select", required: true, section: "Assignment", options: [
      { value: "available", label: "Available" },
      { value: "assigned", label: "Assigned" },
      { value: "maintenance", label: "Under Maintenance" },
      { value: "lost", label: "Lost / Stolen" },
      { value: "retired", label: "Retired" },
    ], render: (v) => <StatusBadge status={v as AssetStatus} /> },
    { name: "notes", label: "Notes", type: "textarea", section: "Assignment", hideInTable: true, fullWidth: true },
  ];
};

const buildConsumableFields = (
  categories: AssetCategory[],
  items: CatalogItem[],
  addItem: (category: string, name: string) => void,
): FieldDef<Consumable>[] => {
  const catOpts = categories
    .filter((c) => c.kind === "consumable")
    .map((c) => ({ value: c.name, label: c.name }));
  return [
    { name: "sku", label: "SKU", required: true, section: "Item" },
    { name: "name", label: "Item name", type: "combobox", required: true, section: "Item",
      placeholder: "Search stock catalog or type new…",
      optionsFrom: (v) => {
        const cat = v.category as string | undefined;
        const list = cat ? items.filter((i) => i.category === cat) : items;
        return list.map((i) => ({ value: i.name, label: i.name }));
      },
      onAddOption: (val, v) => { if (v.category) addItem(String(v.category), val); } },
    { name: "category", label: "Category", type: "select", required: true, section: "Item",
      options: catOpts.length ? catOpts : [{ value: "Other", label: "Other" }],
      placeholder: catOpts.length ? undefined : "Add consumable categories in the Categories tab first" },
    { name: "unit", label: "Unit", type: "select", required: true, section: "Item", options: [
      { value: "pcs", label: "Pieces" }, { value: "box", label: "Box" }, { value: "ream", label: "Ream" },
      { value: "pack", label: "Pack" }, { value: "ltr", label: "Litre" }, { value: "kg", label: "Kg" },
    ] },
    { name: "vendor", label: "Vendor", section: "Stock" },
    { name: "unit_cost", label: "Unit cost (PKR)", type: "number", section: "Stock", render: (v) => fmtPKR(v) },
    { name: "quantity", label: "Quantity on hand", type: "number", required: true, section: "Stock" },
    { name: "reorder_level", label: "Reorder level", type: "number", required: true, section: "Stock" },
    { name: "location", label: "Storage location", section: "Stock" },
    { name: "last_restock", label: "Last restocked", type: "date", section: "Stock" },
    { name: "notes", label: "Notes", type: "textarea", section: "Stock", hideInTable: true, fullWidth: true },
  ];
};

const categoryFields: FieldDef<AssetCategory>[] = [
  { name: "name", label: "Category name", required: true, section: "Category" },
  { name: "kind", label: "Type", type: "select", required: true, section: "Category", options: [
    { value: "fixed", label: "Fixed Asset" },
    { value: "consumable", label: "Consumable / Stock" },
    { value: "digital", label: "Digital Asset" },
  ], render: (v) => <CategoryKindBadge kind={v as CategoryKind} /> },
  { name: "description", label: "Description", type: "textarea", section: "Category", fullWidth: true },
];


const assignmentFields: FieldDef<Assignment>[] = [
  { name: "asset_tag", label: "Asset tag", required: true, section: "Asset" },
  { name: "asset_name", label: "Asset name", section: "Asset" },
  { name: "employee", label: "Employee name", required: true, section: "Person" },
  { name: "cnic", label: "CNIC", section: "Person" },
  { name: "action", label: "Action", type: "select", required: true, section: "Movement", options: [
    { value: "issued", label: "Issued" }, { value: "returned", label: "Returned" }, { value: "transferred", label: "Transferred" },
  ] },
  { name: "date", label: "Date", type: "date", required: true, section: "Movement" },
  { name: "location", label: "Location", type: "select", options: PK_CITIES, section: "Movement" },
  { name: "condition_out", label: "Condition (out)", type: "select", section: "Condition", options: [
    { value: "new", label: "New" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" },
  ] },
  { name: "condition_in", label: "Condition (in)", type: "select", section: "Condition", options: [
    { value: "new", label: "New" }, { value: "good", label: "Good" }, { value: "fair", label: "Fair" }, { value: "poor", label: "Poor" },
  ] },
  { name: "notes", label: "Notes", type: "textarea", section: "Condition", hideInTable: true, fullWidth: true },
];

const maintenanceFields: FieldDef<Maintenance>[] = [
  { name: "asset_tag", label: "Asset tag", required: true, section: "Asset" },
  { name: "asset_name", label: "Asset name", section: "Asset" },
  { name: "type", label: "Type", type: "select", required: true, section: "Work", options: [
    { value: "repair", label: "Repair" }, { value: "service", label: "Service" }, { value: "upgrade", label: "Upgrade" },
    { value: "inspection", label: "Inspection" }, { value: "replacement", label: "Replacement" },
  ] },
  { name: "vendor", label: "Vendor / Technician", section: "Work" },
  { name: "date", label: "Date", type: "date", required: true, section: "Work" },
  { name: "cost", label: "Cost (PKR)", type: "number", section: "Work", render: (v) => fmtPKR(v) },
  { name: "status", label: "Status", type: "select", required: true, section: "Work", options: [
    { value: "scheduled", label: "Scheduled" }, { value: "in_progress", label: "In progress" },
    { value: "done", label: "Done" }, { value: "cancelled", label: "Cancelled" },
  ] },
  { name: "next_due", label: "Next due", type: "date", section: "Work" },
  { name: "notes", label: "Notes", type: "textarea", section: "Work", hideInTable: true, fullWidth: true },
];

/* ================= Small UI ================= */

function StatusBadge({ status }: { status: AssetStatus }) {
  const map: Record<AssetStatus, string> = {
    available: "bg-emerald-100 text-emerald-800 border-emerald-200",
    assigned: "bg-sky-100 text-sky-800 border-sky-200",
    maintenance: "bg-amber-100 text-amber-800 border-amber-200",
    lost: "bg-rose-100 text-rose-800 border-rose-200",
    retired: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const label: Record<AssetStatus, string> = {
    available: "Available", assigned: "Assigned", maintenance: "Maintenance", lost: "Lost", retired: "Retired",
  };
  return <Badge variant="outline" className={map[status]}>{label[status]}</Badge>;
}

function CategoryKindBadge({ kind }: { kind: CategoryKind }) {
  const map: Record<CategoryKind, string> = {
    fixed: "bg-sky-100 text-sky-800 border-sky-200",
    consumable: "bg-amber-100 text-amber-800 border-amber-200",
    digital: "bg-violet-100 text-violet-800 border-violet-200",
  };
  const label: Record<CategoryKind, string> = { fixed: "Fixed", consumable: "Consumable", digital: "Digital" };
  return <Badge variant="outline" className={map[kind]}>{label[kind]}</Badge>;
}




/* ================= Quick Assign / Return dialog ================= */

function QuickAssignDialog({
  assets, onDone,
}: { assets: Asset[]; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    asset_tag: "", employee: "", cnic: "", action: "issued" as Assignment["action"],
    date: new Date().toISOString().slice(0, 10), location: "", condition: "good", notes: "",
  });

  const submit = async () => {
    if (!form.asset_tag || !form.employee) {
      toast.error("Asset & employee are required");
      return;
    }
    const asset = assets.find((a) => a.tag === form.asset_tag);
    // 1. log the movement
    await assignmentsApi.create({
      asset_tag: form.asset_tag,
      asset_name: asset?.name,
      employee: form.employee,
      cnic: form.cnic,
      action: form.action,
      date: form.date,
      location: form.location,
      condition_out: form.action === "issued" ? (form.condition as any) : undefined,
      condition_in: form.action === "returned" ? (form.condition as any) : undefined,
      notes: form.notes,
    } as Omit<Assignment, "id">);

    // 2. sync asset status
    if (asset) {
      const patch: Partial<Asset> =
        form.action === "issued"
          ? { status: "assigned", assigned_to: form.employee, assigned_cnic: form.cnic, assigned_date: form.date, location: form.location || asset.location }
          : form.action === "returned"
            ? { status: "available", assigned_to: "", assigned_cnic: "", assigned_date: "" }
            : { assigned_to: form.employee, assigned_cnic: form.cnic, assigned_date: form.date, location: form.location || asset.location };
      await assetsApi.update(asset.id, patch);
    }

    toast.success("Movement recorded");
    setOpen(false);
    setForm({ ...form, asset_tag: "", employee: "", cnic: "", notes: "" });
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="h-4 w-4 mr-2" /> Issue / Return
      </Button>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Asset Movement</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Asset</Label>
            <Select value={form.asset_tag} onValueChange={(v) => setForm({ ...form, asset_tag: v })}>
              <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
              <SelectContent>
                {assets.map((a) => (
                  <SelectItem key={a.id} value={a.tag}>
                    {a.tag} — {a.name} <span className="text-muted-foreground">({a.status})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Action</Label>
              <Select value={form.action} onValueChange={(v: any) => setForm({ ...form, action: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="issued">Issue</SelectItem>
                  <SelectItem value="returned">Return</SelectItem>
                  <SelectItem value="transferred">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Employee name</Label>
              <Input value={form.employee} onChange={(e) => setForm({ ...form, employee: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>CNIC</Label>
              <Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="35202-1234567-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
                <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {PK_CITIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Save movement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ================= Page ================= */

function InventoryPage() {
  const assetsQ = useQuery({ queryKey: ["inventory"], queryFn: assetsApi.list });
  const consQ = useQuery({ queryKey: ["inventory_consumables"], queryFn: consumablesApi.list });
  const asgnQ = useQuery({ queryKey: ["inventory_assignments"], queryFn: assignmentsApi.list });
  const mntQ = useQuery({ queryKey: ["inventory_maintenance"], queryFn: maintenanceApi.list });
  const catsQ = useQuery({ queryKey: ["inventory_categories"], queryFn: categoriesApi.list });
  const itemsQ = useQuery({ queryKey: ["inventory_items"], queryFn: itemsApi.list });
  const qc = useQueryClient();

  const assets = assetsQ.data ?? [];
  const consumables = consQ.data ?? [];
  const maintenance = mntQ.data ?? [];
  const categories = catsQ.data ?? [];
  const items = itemsQ.data ?? [];

  const addItem = async (category: string, name: string) => {
    if (items.some((i) => i.category === category && i.name.toLowerCase() === name.toLowerCase())) return;
    await itemsApi.create({ category, name });
    qc.invalidateQueries({ queryKey: ["inventory_items"] });
  };

  const assetFields = useMemo(() => buildAssetFields(categories, items, addItem), [categories, items]);
  const consumableFields = useMemo(() => buildConsumableFields(categories, items, addItem), [categories, items]);

  const firstFixedCat = categories.find((c) => c.kind === "fixed")?.name ?? "Other";
  const firstConsCat = categories.find((c) => c.kind === "consumable")?.name ?? "Other";


  const [statusFilter, setStatusFilter] = useState<"all" | AssetStatus>("all");

  const stats = useMemo(() => {
    const available = assets.filter((r) => r.status === "available").length;
    const assigned = assets.filter((r) => r.status === "assigned").length;
    const inMaint = assets.filter((r) => r.status === "maintenance").length;
    const totalValue = assets.reduce((s, r) => s + Number(r.purchase_price ?? 0) * Number(r.quantity ?? 1), 0);

    const today = new Date();
    const in30 = new Date(today.getTime() + 30 * 86400000);
    const warrantySoon = assets.filter((r) => r.warranty_until && new Date(r.warranty_until) <= in30 && new Date(r.warranty_until) >= today).length;

    const lowStock = consumables.filter((c) => c.quantity <= c.reorder_level).length;
    const stockValue = consumables.reduce((s, c) => s + Number(c.unit_cost ?? 0) * Number(c.quantity ?? 0), 0);
    const openMaint = maintenance.filter((m) => m.status === "scheduled" || m.status === "in_progress").length;

    return { available, assigned, inMaint, totalValue, warrantySoon, lowStock, stockValue, openMaint };
  }, [assets, consumables, maintenance]);

  const refetchAll = () => {
    assetsQ.refetch(); asgnQ.refetch();
  };

  return (
    <AppLayout>
      <PageHeader
        title="Assets & Inventory"
        description="Hardware, PTA-approved mobiles, software licenses, consumables, movements & maintenance."
        actions={
          <ModuleReportButton
            build={() => ({
              module: "inventory",
              moduleLabel: "Assets & Inventory",
              title: "Assets & Inventory Report",
              subtitle: `${assets.length} asset(s) · ${consumables.length} consumable(s)`,
              sections: [
                {
                  title: "Fixed Assets",
                  columns: [
                    { key: "asset_tag", label: "Tag" },
                    { key: "name", label: "Name" },
                    { key: "category", label: "Category" },
                    { key: "status", label: "Status" },
                    { key: "assigned_to", label: "Assigned To" },
                    { key: "location", label: "Location" },
                  ],
                  rows: assets,
                },
                {
                  title: "Consumables",
                  columns: [
                    { key: "name", label: "Name" },
                    { key: "sku", label: "SKU" },
                    { key: "quantity", label: "Qty" },
                    { key: "reorder_level", label: "Reorder" },
                    { key: "unit", label: "Unit" },
                  ],
                  rows: consumables,
                },
                {
                  title: "Maintenance",
                  columns: [
                    { key: "asset_tag", label: "Asset" },
                    { key: "type", label: "Type" },
                    { key: "status", label: "Status" },
                    { key: "scheduled_at", label: "Scheduled" },
                    { key: "cost", label: "Cost" },
                  ],
                  rows: maintenance,
                },
              ],
            })}
          />
        }
      />

      <StatsCards loading={assetsQ.isLoading} stats={[
        { label: "Total Assets", value: assets.length, hint: "Registered items", icon: Package },
        { label: "Available", value: stats.available, hint: "Ready to assign", icon: PackageCheck, tint: "oklch(0.68 0.18 155)" },
        { label: "Assigned", value: stats.assigned, hint: "In use", icon: UserCog },
        { label: "Maintenance", value: stats.inMaint, hint: "Under service", icon: Wrench, tint: "oklch(0.75 0.15 75)" },
        { label: "Warranty ≤ 30d", value: stats.warrantySoon, hint: "Expiring soon", icon: ShieldAlert, tint: "oklch(0.65 0.2 25)" },
        { label: "Low Stock", value: stats.lowStock, hint: "At/under reorder", icon: AlertTriangle, tint: "oklch(0.65 0.2 25)" },
        { label: "Stock Value", value: fmtPKR(stats.stockValue), hint: "Consumables", icon: Boxes },
        { label: "Assets Value", value: fmtPKR(stats.totalValue), hint: "Purchase value", icon: Wallet },
      ]} />

      <Tabs defaultValue="assets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assets"><Package className="h-4 w-4 mr-2" />Fixed & Digital Assets</TabsTrigger>
          <TabsTrigger value="stock"><Boxes className="h-4 w-4 mr-2" />Consumables / Stock</TabsTrigger>
          <TabsTrigger value="categories"><Tags className="h-4 w-4 mr-2" />Categories</TabsTrigger>
          <TabsTrigger value="movements"><ArrowLeftRight className="h-4 w-4 mr-2" />Assignments Log</TabsTrigger>
          <TabsTrigger value="maintenance"><Wrench className="h-4 w-4 mr-2" />Maintenance</TabsTrigger>
        </TabsList>


        <TabsContent value="assets">
          <CrudTable<Asset>
            title="Asset"
            fields={assetFields}
            api={assetsApi}
            queryKey="inventory"
            searchable={["tag", "name", "serial", "assigned_to", "category", "brand"]}
            defaults={{ status: "available", asset_kind: "fixed", category: firstFixedCat, quantity: 1, condition: "new" }}
            filter={(r) => statusFilter === "all" || r.status === statusFilter}
            toolbar={
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
                <QuickAssignDialog assets={assets} onDone={refetchAll} />
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="stock">
          <CrudTable<Consumable>
            title="Consumable"
            fields={consumableFields}
            api={consumablesApi}
            queryKey="inventory_consumables"
            searchable={["sku", "name", "category", "vendor", "location"]}
            defaults={{ category: firstConsCat, unit: "pcs", quantity: 0, reorder_level: 5 }}
          />
        </TabsContent>

        <TabsContent value="categories">
          <CrudTable<AssetCategory>
            title="Category"
            fields={categoryFields}
            api={categoriesApi}
            queryKey="inventory_categories"
            searchable={["name", "kind", "description"]}
            defaults={{ kind: "fixed" }}
            toolbar={
              <div className="text-xs text-muted-foreground">
                Fixed: {categories.filter((c) => c.kind === "fixed").length} · Consumable: {categories.filter((c) => c.kind === "consumable").length} · Digital: {categories.filter((c) => c.kind === "digital").length}
              </div>
            }
          />
        </TabsContent>



        <TabsContent value="movements">
          <CrudTable<Assignment>
            title="Movement"
            fields={assignmentFields}
            api={assignmentsApi}
            queryKey="inventory_assignments"
            searchable={["asset_tag", "asset_name", "employee", "cnic", "action"]}
            defaults={{ action: "issued", date: new Date().toISOString().slice(0, 10) }}
            toolbar={<div className="text-xs text-muted-foreground flex items-center gap-1"><HistoryIcon className="h-3.5 w-3.5" /> Full issue / return / transfer history</div>}
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <CrudTable<Maintenance>
            title="Maintenance record"
            fields={maintenanceFields}
            api={maintenanceApi}
            queryKey="inventory_maintenance"
            searchable={["asset_tag", "asset_name", "vendor", "type", "status"]}
            defaults={{ type: "service", status: "scheduled", date: new Date().toISOString().slice(0, 10) }}
            toolbar={<div className="text-xs text-muted-foreground">{stats.openMaint} open work orders</div>}
          />
        </TabsContent>
      </Tabs>
      <ModuleReportsCard module="inventory" />
    </AppLayout>
  );
}

export const Route = createFileRoute("/inventory")({
  head: () => ({ meta: [{ title: "Assets & Inventory — Devionic DMS" }] }),
  component: InventoryPage,
});
