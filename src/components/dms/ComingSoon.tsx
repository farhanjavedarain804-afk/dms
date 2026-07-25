import { AppLayout, PageHeader } from "./Layout";
import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <AppLayout>
      <PageHeader title={title} description={description} />
      <div className="rounded-2xl bg-card border shadow-sm p-12 grid place-items-center text-center">
        <Construction className="h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="font-semibold">Module coming soon</h3>
        <p className="text-sm text-muted-foreground max-w-md mt-1">
          This module is scaffolded and ready to be wired up. Extend the REST API
          in <code>API_SPEC.md</code> and add a CRUD table like Employees/Projects.
        </p>
      </div>
    </AppLayout>
  );
}
