(() => {
  async function updateFlag(email: string, flagKey: string, init: RequestInit, failureMessage: string) {
    const response = await fetch(
      `/site-admin/api/users/${encodeURIComponent(email)}/flags/${encodeURIComponent(flagKey)}`,
      init,
    );
    if (response.ok) {
      window.location.reload();
      return;
    }
    const body = (await response.json()) as { error?: string };
    alert(body.error || failureMessage);
  }

  document.addEventListener("click", (event: Event) => {
    const target = event.target as HTMLElement;
    const email = target.dataset.email;
    if (!email) return;

    if (target.classList.contains("set-flag-button")) {
      const row = target.closest("tr");
      const flagKey = (row?.querySelector(".flag-key-select") as HTMLSelectElement | null)?.value;
      const flagValue = (row?.querySelector(".flag-value-input") as HTMLInputElement | null)?.value.trim();
      if (!flagKey) return;
      if (!flagValue) {
        alert("Please enter a value.");
        return;
      }
      updateFlag(
        email,
        flagKey,
        { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value: flagValue }) },
        "Failed to set flag",
      );
    }

    if (target.classList.contains("remove-flag-button")) {
      const flagKey = target.dataset.flagKey;
      if (!flagKey || !confirm(`Remove flag "${flagKey}" from ${email}?`)) return;
      updateFlag(email, flagKey, { method: "DELETE" }, "Failed to remove flag");
    }
  });
})();
