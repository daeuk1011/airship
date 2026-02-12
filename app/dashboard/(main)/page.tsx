import { db } from "@/shared/libs/db";
import { apps, updates, channels } from "@/shared/libs/db/schema";
import { count } from "drizzle-orm";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export default function DashboardOverview() {
  const [appCount] = db.select({ value: count() }).from(apps).all();
  const [updateCount] = db.select({ value: count() }).from(updates).all();
  const [channelCount] = db.select({ value: count() }).from(channels).all();

  const stats = [
    { label: "Apps", value: appCount.value },
    { label: "Updates", value: updateCount.value },
    { label: "Channels", value: channelCount.value },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <p className="text-sm text-foreground/50">{stat.label}</p>
            <p className="text-3xl font-bold mt-1">{stat.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
