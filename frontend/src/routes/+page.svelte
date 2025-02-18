<script>
  import { page } from '$app/state';
</script>

{#if !page.data.session}
  <section class="hero">
    <h1>Secure DMARC Analysis & Monitoring</h1>
    <p class="subtitle">
      Comprehensive email authentication monitoring with SPF, DKIM, and DMARC analysis
    </p>
    <div class="cta-buttons">
      <a href="/register" role="button">Start Free Trial</a>
      <a href="/demo" role="button" class="outline">View Demo</a>
    </div>
  </section>

  <section class="features grid">
    <article>
      <header>
        <h3>DMARC Analysis</h3>
      </header>
      <p>Analyze DMARC records and aggregate reports with detailed insights</p>
    </article>
    
    <article>
      <header>
        <h3>SPF & DKIM</h3>
      </header>
      <p>Comprehensive authentication checks and policy validation</p>
    </article>
    
    <article>
      <header>
        <h3>Real-time Monitoring</h3>
      </header>
      <p>Instant alerts and notifications for authentication failures</p>
    </article>
    
    <article>
      <header>
        <h3>Trend Analysis</h3>
      </header>
      <p>Track compliance trends and identify potential security issues</p>
    </article>
  </section>

  <section class="security-features">
    <h2>Enterprise-Grade Security</h2>
    <div class="grid">
      <div>
        <h4>✓ Secure Authentication</h4>
        <p>Multi-factor authentication and role-based access control</p>
      </div>
      <div>
        <h4>✓ Domain Verification</h4>
        <p>Robust domain ownership verification process</p>
      </div>
      <div>
        <h4>✓ Data Protection</h4>
        <p>End-to-end encryption and secure data storage</p>
      </div>
    </div>
  </section>
{:else}
  <section class="dashboard-preview">
    <div class="grid">
      <div class="quick-stats">
        <h2>Domain Overview</h2>
        <div class="stats-grid">
          <article>
            <header>Verified Domains</header>
            <p class="stat">0</p>
          </article>
          <article>
            <header>Pending Verification</header>
            <p class="stat">0</p>
          </article>
          <article>
            <header>Recent Reports</header>
            <p class="stat">0</p>
          </article>
        </div>
      </div>
      
      <div class="action-items">
        <h3>Quick Actions</h3>
        <a href="/domains/add" role="button">Add New Domain</a>
        <a href="/reports" role="button" class="outline">View Reports</a>
      </div>
    </div>
  </section>
{/if}

<style>
  .hero {
    text-align: center;
    padding: 4rem 1rem;
  }
  
  .hero h1 {
    font-size: 2.5rem;
    margin-bottom: 1rem;
  }
  
  .subtitle {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    color: var(--muted);
  }
  
  .cta-buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin: 2rem 0;
  }
  
  .features {
    margin: 4rem 0;
  }
  
  .security-features {
    margin: 4rem 0;
    text-align: center;
  }
  
  .security-features h2 {
    margin-bottom: 2rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .stat {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
  }
  
  .action-items {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
