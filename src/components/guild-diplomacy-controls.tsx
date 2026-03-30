import {
  clearGuildDiplomacy,
  endorseGuild,
  markGuildRival,
  unmarkGuildRival,
} from "@/server/actions/foundation";

type GuildDiplomacyControlsProps = {
  guildTag: string;
  relation: "endorsement" | "rivalry" | "neutral";
  redirectTo: string;
  disabled?: boolean;
  endorseLabel?: string;
  rivalLabel?: string;
  unrivalLabel?: string;
  clearLabel?: string;
};

export function GuildDiplomacyControls({
  guildTag,
  relation,
  redirectTo,
  disabled = false,
  endorseLabel = "Endorse",
  rivalLabel = "Tag rival",
  unrivalLabel = "Снять rival",
  clearLabel = "Neutral",
}: GuildDiplomacyControlsProps) {
  return (
    <div className="actions-inline">
      {relation !== "endorsement" ? (
        <form action={endorseGuild} className="inline-form">
          <input type="hidden" name="guildTag" value={guildTag} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button className="button button--primary" type="submit" disabled={disabled}>
            {endorseLabel}
          </button>
        </form>
      ) : null}

      <form action={relation === "rivalry" ? unmarkGuildRival : markGuildRival} className="inline-form">
        <input type="hidden" name="guildTag" value={guildTag} />
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button className="button button--ghost" type="submit" disabled={disabled}>
          {relation === "rivalry" ? unrivalLabel : rivalLabel}
        </button>
      </form>

      {relation !== "neutral" ? (
        <form action={clearGuildDiplomacy} className="inline-form">
          <input type="hidden" name="guildTag" value={guildTag} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <button className="button button--ghost" type="submit" disabled={disabled}>
            {clearLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
