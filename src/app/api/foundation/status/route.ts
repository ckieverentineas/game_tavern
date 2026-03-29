import { getDashboardPageData } from "@/server/game";

export const runtime = "nodejs";

export async function GET() {
  const snapshot = await getDashboardPageData();

  if (!snapshot.ok) {
    return Response.json(
      {
        stage: "mvp",
        ready: false,
        error: snapshot.error,
      },
      { status: 503 },
    );
  }

  return Response.json({
    stage: "mvp",
    ready: true,
    guild: {
      name: snapshot.data.guild.name,
      tag: snapshot.data.guild.tag,
      level: snapshot.data.guild.level,
      gold: snapshot.data.guild.gold,
    },
    activeExpeditions: snapshot.data.activeExpeditions.length,
    pendingClaims: snapshot.data.guild.counts.pendingClaims,
    claimableExpeditions: snapshot.data.claimableExpeditions.length,
    recentLedger: snapshot.data.recentLedger.length,
  });
}
