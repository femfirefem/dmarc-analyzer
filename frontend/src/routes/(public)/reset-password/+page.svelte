<script lang="ts">
  let email = '';
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    // TODO: Implement password reset request logic
  }
</script>

<article class="grid">
  <div>
    <hgroup>
      <h1>Reset Password</h1>
      <h2>We'll send you instructions to reset your password</h2>
    </hgroup>
    
    <form on:submit={handleSubmit}>
      <label for="email">
        Email
        <input type="email" id="email" name="email" bind:value={email} required />
      </label>
      
      <button type="submit">Send Reset Instructions</button>
    </form>
    
    <p>
      <small>Remember your password? <a href="/login">Login</a></small>
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
</style> 