import { db } from "@/shared/libs/db";
import { apps } from "@/shared/libs/db/schema";
import Link from "next/link";
import { CreateAppForm } from "@/features/apps/components/create-app-form";
import { CardList } from "@/shared/ui/card";

export default function AppsPage() {
  const appList = db.select().from(apps).all();

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Apps</h1>
      </div>

      <CreateAppForm />

      <div className="mt-8">
        {appList.length === 0 ? (
          <p className="text-foreground/50 text-sm">
            No apps yet. Create one above.
          </p>
        ) : (
          <CardList>
            {appList.map((app) => (
              <Link
                key={app.id}
                href={`/dashboard/apps/${app.appKey}`}
                className="flex items-center justify-between p-4 hover:bg-foreground/[0.03] transition-colors"
              >
                <div>
                  <p className="font-medium">{app.name}</p>
                  <p className="text-sm text-foreground/50">{app.appKey}</p>
                </div>
                <span className="text-xs text-foreground/40">
                  {new Date(app.createdAt).toLocaleDateString()}
                </span>
              </Link>
            ))}
          </CardList>
        )}
      </div>
    </div>
  );
}
