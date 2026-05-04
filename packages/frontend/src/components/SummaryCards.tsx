type SummaryCardsProps = {
  profileLabel: string;
  groupsLabel: string;
  tierLabel: string;
};

export function SummaryCards({ profileLabel, groupsLabel, tierLabel }: SummaryCardsProps) {
  return (
    <section className="cards-grid">
      <article className="card card-highlight">
        <h3 className="card-title">Profile</h3>
        <p className="card-copy">{profileLabel}</p>
      </article>
      <article className="card">
        <h3 className="card-title">Groups</h3>
        <p className="card-copy">{groupsLabel}</p>
      </article>
      <article className="card">
        <h3 className="card-title">Tier</h3>
        <p className="card-copy">{tierLabel}</p>
      </article>
      <article className="card">
        <h3 className="card-title">Session</h3>
        <p className="card-copy">OIDC Authorization Code + PKCE</p>
      </article>
    </section>
  );
}
