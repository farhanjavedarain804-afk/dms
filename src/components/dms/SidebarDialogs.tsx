import type { Dispatch, SetStateAction } from "react";
import {
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  Clock,
  ExternalLink,
  HelpCircle,
  Keyboard,
  LifeBuoy,
  Mail,
  Receipt,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

type DialogNavItem = { icon: any; label: string; to: string };

export function SidebarDialogs({
  quickOpen,
  setQuickOpen,
  helpOpen,
  setHelpOpen,
  allItems,
  onNavigate,
}: {
  quickOpen: boolean;
  setQuickOpen: Dispatch<SetStateAction<boolean>>;
  helpOpen: boolean;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
  allItems: DialogNavItem[];
  onNavigate: (to: string) => void;
}) {
  const go = (to: string) => {
    setQuickOpen(false);
    setHelpOpen(false);
    onNavigate(to);
  };

  return (
    <>
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-xl">
          <Command>
            <CommandInput placeholder="Search modules, actions, shortcuts..." />
            <CommandList className="max-h-[420px]">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Quick Actions">
                <CommandItem onSelect={() => go("/ai")}>
                  <Sparkles className="mr-2 h-4 w-4" /> Ask AI Assistant
                </CommandItem>
                <CommandItem onSelect={() => go("/employees")}>
                  <Users className="mr-2 h-4 w-4" /> Add Employee
                </CommandItem>
                <CommandItem onSelect={() => go("/invoices")}>
                  <Receipt className="mr-2 h-4 w-4" /> Create Invoice
                </CommandItem>
                <CommandItem onSelect={() => go("/tasks")}>
                  <CheckSquare className="mr-2 h-4 w-4" /> New Task
                </CommandItem>
                <CommandItem onSelect={() => go("/attendance")}>
                  <Clock className="mr-2 h-4 w-4" /> Mark Attendance
                </CommandItem>
                <CommandItem onSelect={() => go("/audit")}>
                  <ClipboardCheck className="mr-2 h-4 w-4" /> Run Audit
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Navigate to Module">
                {allItems.map((it) => {
                  const Icon = it.icon;
                  return (
                    <CommandItem
                      key={it.to}
                      value={`${it.label} ${it.to}`}
                      onSelect={() => go(it.to)}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <span>{it.label}</span>
                      <span className="ml-auto text-[10px] font-mono text-muted-foreground">{it.to}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Help Center
            </DialogTitle>
            <DialogDescription>
              Guides, keyboard shortcuts, and support for Devionic ERP.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <Button variant="outline" className="justify-start" onClick={() => go("/ai")}>
              <Sparkles className="h-4 w-4 mr-2" /> Ask AI Assistant
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => go("/support")}>
              <LifeBuoy className="h-4 w-4 mr-2" /> Open Support Ticket
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="mailto:info@devionic.com"><Mail className="h-4 w-4 mr-2" /> Email Support</a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="https://www.devionic.com" target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" /> devionic.com
              </a>
            </Button>
          </div>

          <div className="mt-4 rounded-lg border p-3 bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium mb-2">
              <Keyboard className="h-4 w-4" /> Keyboard Shortcuts
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-muted-foreground">Quick Access</span><kbd className="font-mono">⌘ / Ctrl + K</kbd>
              <span className="text-muted-foreground">Help Center</span><kbd className="font-mono">⌘ / Ctrl + /</kbd>
              <span className="text-muted-foreground">Close dialog</span><kbd className="font-mono">Esc</kbd>
            </div>
          </div>

          <Accordion type="single" collapsible className="mt-4">
            <AccordionItem value="start">
              <AccordionTrigger><span className="flex items-center gap-2"><Rocket className="h-4 w-4" /> Getting Started</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>1. Add your employees in <b>Employees</b>.</p>
                <p>2. Create clients & deals in <b>Clients & CRM</b>.</p>
                <p>3. Won deals become <b>Projects</b> automatically.</p>
                <p>4. Track tasks, attendance, payroll and invoices from their modules.</p>
                <p>5. Generate <b>AI Audits</b> and reports in Docs & Records.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="ai">
              <AccordionTrigger><span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Assistant</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Configure providers (OpenAI, Gemini, Claude, DeepSeek, OpenRouter) in <b>AI Assistant → Providers</b>.</p>
                <p>The default provider is used by AI Assistant and Audit module both.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="email">
              <AccordionTrigger><span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email (SMTP) Setup</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Go to <b>Settings → Email</b>, choose a preset (Gmail, Zoho, Outlook, cPanel), enter SMTP credentials, and test the connection.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="security">
              <AccordionTrigger><span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Roles & Security</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Manage users, roles, activity and login logs in <b>Users & Access</b>. Enable 2FA in <b>Settings → Security</b>.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="backup">
              <AccordionTrigger><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Backup & Restore</span></AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Export a JSON backup of local settings from <b>Settings → Backup</b> and restore from the same page anytime.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-4 text-[11px] text-muted-foreground text-center border-t pt-3">
            Devionic ERP • Head Office Chowk Azam, Layyah, Pakistan • +92-317-7121841
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}