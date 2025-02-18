<script lang="ts">
  // TODO: Load reports from API
  let reports: {
    id: string;
    domain: string;
    date: string;
    source: string;
    status: string;
  }[] = [];
  let isLoading = true;
  let filter = 'all'; // all, failed, passed
</script>

<article class="container">
  <header class="reports-header">
    <h1>DMARC Reports</h1>
    <select bind:value={filter}>
      <option value="all">All Reports</option>
      <option value="failed">Failed Only</option>
      <option value="passed">Passed Only</option>
    </select>
  </header>

  {#if isLoading}
    <article aria-busy="true"></article>
  {:else if reports.length === 0}
    <article>
      <div class="empty-state">
        <h2>No Reports Yet</h2>
        <p>Reports will appear here once received from email providers.</p>
      </div>
    </article>
  {:else}
    <div class="reports-table">
      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Date</th>
            <th>Source</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each reports as report}
            <tr>
              <td>{report.domain}</td>
              <td>{new Date(report.date).toLocaleDateString()}</td>
              <td>{report.source}</td>
              <td>
                <span class="status {report.status}">
                  {report.status}
                </span>
              </td>
              <td>
                <a href="/reports/{report.id}">View Details</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</article>

<style>
  .reports-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 1rem;
  }

  .reports-table {
    overflow-x: auto;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: var(--border-radius);
    font-size: 0.875rem;
  }

  .status.passed {
    background: var(--form-element-valid-border-color);
    color: var(--form-element-valid-active-border-color);
  }

  .status.failed {
    background: var(--form-element-invalid-border-color);
    color: var(--form-element-invalid-active-border-color);
  }
</style> 