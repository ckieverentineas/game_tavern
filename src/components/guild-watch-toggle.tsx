import { followGuild, unfollowGuild } from "@/server/actions/foundation";

type GuildWatchToggleProps = {
  guildTag: string;
  isWatched: boolean;
  redirectTo: string;
  disabled?: boolean;
  followLabel?: string;
  unfollowLabel?: string;
};

export function GuildWatchToggle({
  guildTag,
  isWatched,
  redirectTo,
  disabled = false,
  followLabel = "Следить за домом",
  unfollowLabel = "Убрать из watchlist",
}: GuildWatchToggleProps) {
  return (
    <form action={isWatched ? unfollowGuild : followGuild} className="inline-form">
      <input type="hidden" name="guildTag" value={guildTag} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button className={`button ${isWatched ? "button--ghost" : "button--primary"}`} type="submit" disabled={disabled}>
        {isWatched ? unfollowLabel : followLabel}
      </button>
    </form>
  );
}
