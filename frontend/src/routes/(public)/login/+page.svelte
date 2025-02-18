<script lang="ts">
  import { signIn } from "@auth/sveltekit/client";
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  
  export let form: ActionData;
  
  let loading = false;
  let email = '';
  let password = '';
</script>

<article class="grid">
  <div>
    <hgroup>
      <h1>Login</h1>
      <h2>Welcome back to DmarcAnalyzer</h2>
    </hgroup>
    
    {#if form?.error}
      <p class="error">{form.error}</p>
    {/if}
    
    <form method="POST" use:enhance={() => {
      loading = true;
      return async ({ update }) => {
        loading = false;
        await update();
      };
    }}>
      <label for="email">
        Email
        <input type="email" id="email" name="email" bind:value={email} required />
      </label>
      
      <label for="password">
        Password
        <input type="password" id="password" name="password" bind:value={password} required />
      </label>
      
      <!-- <button type="submit" aria-busy={loading}>Login</button> -->
      <button type="button" on:click={() => signIn("credentials", { email, password })}>
        Login
      </button>
    </form>
    
    <p>
      <small>Don't have an account? <a href="/register">Register</a></small>
    </p>
    <p>
      <small><a href="/reset-password">Forgot password?</a></small>
    </p>
  </div>
</article>

<style>
  article {
    padding: 2rem;
    max-width: 400px;
    margin: 0 auto;
  }
  
  form {
    margin: 2rem 0;
  }

  .error {
    color: var(--form-element-invalid-active-border-color);
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
</style> 