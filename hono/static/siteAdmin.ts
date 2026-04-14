(() => {
  document.addEventListener("click", async (e: Event) => {
    const target = e.target as HTMLElement;

    if (target.classList.contains("set-flag-button")) {
      const email = target.dataset.email;
      if (!email) return;

      const row = target.closest("tr");
      if (!row) return;

      const select = row.querySelector(".flag-key-select") as HTMLSelectElement | null;
      const input = row.querySelector(".flag-value-input") as HTMLInputElement | null;
      if (!select || !input) return;

      const flagKey = select.value;
      const flagValue = input.value.trim();
      if (!flagValue) {
        alert("Please enter a value.");
        return;
      }

      const response = await fetch(
        `/site-admin/api/users/${encodeURIComponent(email)}/flags/${encodeURIComponent(flagKey)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: flagValue }),
        },
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const body = (await response.json()) as { error?: string };
        alert(body.error || "Failed to set flag");
      }
    }

    if (target.classList.contains("remove-flag-button")) {
      const email = target.dataset.email;
      const flagKey = target.dataset.flagKey;
      if (!email || !flagKey) return;

      if (!confirm(`Remove flag "${flagKey}" from ${email}?`)) return;

      const response = await fetch(
        `/site-admin/api/users/${encodeURIComponent(email)}/flags/${encodeURIComponent(flagKey)}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        window.location.reload();
      } else {
        const body = (await response.json()) as { error?: string };
        alert(body.error || "Failed to remove flag");
      }
    }
  });
})();
