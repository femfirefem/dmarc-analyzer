<script>
  import '@picocss/pico/css/pico.min.css';
  import { page } from '$app/state';
	import { signOut } from '@auth/sveltekit/client';
</script>

<nav class="container-fluid">
  <ul>
    <li><strong>DmarcAnalyzer</strong></li>
  </ul>
  <ul>
    {#if !page.data.session}
      <li><a href="/features">Features</a></li>
      <li><a href="/docs">Documentation</a></li>
      <li><a href="/login" role="button" class="outline">Login</a></li>
      <li><a href="/register" role="button">Get Started</a></li>
    {:else}
      <li><a href="/dashboard">Dashboard</a></li>
      <li><a href="/domains">Domains</a></li>
      <li><a href="/reports">Reports</a></li>
      <li><a href="/settings">Settings</a></li>
      <li>
        <!-- <a href="/logout" role="button" class="outline">Logout</a> -->
        <button on:click={() => signOut()}>Logout</button>
      </li>
    {/if}
  </ul>
</nav>

<main class="container">
  <slot />
</main>

<footer class="container">
  <small>
    <a href="/privacy">Privacy Policy</a> •
    <a href="/terms">Terms of Service</a> •
    <a href="https://github.com/yourusername/dmarcanalyzer">GitHub</a>
  </small>
</footer>

<style>
  nav {
    padding: 1rem;
    border-bottom: 1px solid var(--border);
  }
  
  footer {
    margin-top: 2rem;
    padding: 1rem;
    text-align: center;
    border-top: 1px solid var(--border);
  }
  
  main {
    min-height: calc(100vh - 180px);
    padding: 2rem 1rem;
  }
</style> 