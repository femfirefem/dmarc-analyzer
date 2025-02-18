<script>
  // TODO: Load user settings from API
  let settings = {
    email: '',
    notifications: {
      emailAlerts: true,
      weeklyDigest: true
    },
    twoFactorEnabled: false
  };
</script>

<article class="container">
  <hgroup>
    <h1>Settings</h1>
    <h2>Manage your account preferences</h2>
  </hgroup>

  <div class="grid">
    <section>
      <h3>Profile Settings</h3>
      <form>
        <label for="email">
          Email
          <input type="email" id="email" bind:value={settings.email} />
        </label>
        <button type="submit">Update Profile</button>
      </form>
    </section>

    <section>
      <h3>Notification Preferences</h3>
      <form>
        <label>
          <input
            type="checkbox"
            bind:checked={settings.notifications.emailAlerts}
          />
          Email Alerts for Authentication Failures
        </label>
        <label>
          <input
            type="checkbox"
            bind:checked={settings.notifications.weeklyDigest}
          />
          Weekly Report Digest
        </label>
        <button type="submit">Update Notifications</button>
      </form>
    </section>

    <section>
      <h3>Security</h3>
      <div>
        <h4>Two-Factor Authentication</h4>
        <p>Add an extra layer of security to your account.</p>
        {#if settings.twoFactorEnabled}
          <button class="outline" type="button">Disable 2FA</button>
        {:else}
          <button type="button">Enable 2FA</button>
        {/if}
      </div>
      <div>
        <h4>Password</h4>
        <a href="/settings/change-password" role="button" class="outline">Change Password</a>
      </div>
    </section>
  </div>
</article>

<style>
  section {
    padding: 1rem;
    margin-bottom: 2rem;
  }
  
  form {
    margin: 1rem 0;
  }
  
  h4 {
    margin-bottom: 0.5rem;
  }
</style> 