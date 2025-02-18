<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';
  
  export let form: ActionData;
  
  let loading = false;
</script>

<article class="grid">
  <div>
    <hgroup>
      <h1>Create Account</h1>
      <h2>Start securing your email domains</h2>
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
        <input type="email" id="email" name="email" required />
      </label>
      
      <label for="password">
        Password
        <input type="password" id="password" name="password" required 
               minlength="8" maxlength="32" />
      </label>
      
      <label for="confirmPassword">
        Confirm Password
        <input type="password" id="confirmPassword" name="confirmPassword" 
               required minlength="8" maxlength="32" />
      </label>
      
      <button type="submit" aria-busy={loading}>Create Account</button>
    </form>
    
    <p>
      <small>Already have an account? <a href="/login">Login</a></small>
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