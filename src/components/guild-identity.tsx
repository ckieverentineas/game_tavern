import type { CSSProperties } from "react";

import type { GuildIdentitySnapshot } from "@/lib/guild-identity";

export function getGuildIdentitySurfaceStyle(identity: GuildIdentitySnapshot): CSSProperties {
  return {
    borderColor: identity.accentStrong,
    background: `linear-gradient(135deg, ${identity.accentSoft}, rgba(8, 17, 31, 0.95) 60%)`,
  };
}

export function getGuildIdentityMarkStyle(identity: GuildIdentitySnapshot): CSSProperties {
  return {
    borderColor: identity.accentStrong,
    color: identity.accentHex,
    background: `radial-gradient(circle at top left, ${identity.accentSoft}, rgba(255, 255, 255, 0.05))`,
  };
}

export function GuildIdentityMark({
  identity,
  compact = false,
}: {
  identity: GuildIdentitySnapshot;
  compact?: boolean;
}) {
  return (
    <span
      className={`identity-showcase__mark${compact ? " identity-showcase__mark--small" : ""}`}
      style={getGuildIdentityMarkStyle(identity)}
    >
      {identity.crestMark}
    </span>
  );
}
