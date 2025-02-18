<script lang="ts">
  // TODO: Load domains from API
  let domains: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }[] = [];
  let isLoading = true;

  function addDomain() {
    // TODO: Implement domain addition
  }
</script>

<article class="container">
  <header class="domain-header">
    <h1>Domains</h1>
    <button on:click={addDomain}>Add Domain</button>
  </header>

  {#if isLoading}
    <article aria-busy="true"></article>
  {:else if domains.length === 0}
    <article>
      <div class="empty-state">
        <h2>No Domains Added</h2>
        <p>Start by adding your first domain to monitor.</p>
        <button on:click={addDomain}>Add Domain</button>
      </div>
    </article>
  {:else}
    <div class="domain-grid">
      {#each domains as domain}
        <article>
          <header>
            <h3>{domain.name}</h3>
            <span class="status {domain.status}">{domain.status}</span>
          </header>
          <p>
            Added: {new Date(domain.createdAt).toLocaleDateString()}
          </p>
          <footer>
            <a href="/domains/{domain.id}" role="button">View Details</a>
          </footer>
        </article>
      {/each}
    </div>
  {/if}
</article>

<style>
  .domain-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .domain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius);
    font-size: 0.875rem;
  }

  .status.verified {
    background: var(--form-element-valid-border-color);
    color: var(--form-element-valid-active-border-color);
  }

  .status.pending {
    background: var(--form-element-invalid-border-color);
    color: var(--form-element-invalid-active-border-color);
  }
</style> 