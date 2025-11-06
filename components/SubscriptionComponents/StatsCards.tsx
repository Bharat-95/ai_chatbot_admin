import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const StatsCards = ({ stats, loading }: { stats: any, loading: boolean }) => {
  const cards = [
    {
      title: "Active Subscriptions",
      value: stats?.currentMonthCount || 0,
      change: "+12% from last month",
      badge: "good",
    },
    {
      title: "Monthly Revenue",
      value: stats?.mrr ? `$${Math.round(stats.mrr).toLocaleString()}` : "$0",
      change: "+8% from last month",
      badge: "good",
    },
    {
      title: "New Subscriptions",
      value: stats?.newSubscriptions || 0,
      change: "+5% from last month",
      badge: "neutral",
    },
    {
      title: "Churn Rate",
      value: stats?.currentMonthCount && stats?.churnedSubscriptions 
        ? `${Math.round((stats.churnedSubscriptions / stats.currentMonthCount) * 100)}%` 
        : "0%",
      change: "-2% from last month",
      badge: "warning",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            {card.badge === "good" && <Badge variant="default">Good</Badge>}
            {card.badge === "neutral" && <Badge variant="secondary">Neutral</Badge>}
            {card.badge === "warning" && <Badge variant="destructive">Warning</Badge>}
          </CardHeader>
          <CardContent>
            {loading ? (
              <>
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.change}</p>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsCards;