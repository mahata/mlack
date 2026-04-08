(() => {
  const createWorkspaceButton = document.getElementById("createWorkspaceButton") as HTMLButtonElement;
  const createWorkspaceModal = document.getElementById("createWorkspaceModal") as HTMLDivElement;
  const workspaceNameInput = document.getElementById("workspaceName") as HTMLInputElement;
  const workspaceSlugInput = document.getElementById("workspaceSlug") as HTMLInputElement;
  const slugPreviewValue = document.getElementById("slugPreviewValue") as HTMLSpanElement;
  const createWorkspaceError = document.getElementById("createWorkspaceError") as HTMLParagraphElement;
  const cancelCreateWorkspace = document.getElementById("cancelCreateWorkspace") as HTMLButtonElement;
  const confirmCreateWorkspace = document.getElementById("confirmCreateWorkspace") as HTMLButtonElement;

  let slugManuallyEdited = false;

  function generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/^-+|-+$/g, "");
  }

  function updateSlugPreview(): void {
    const slug = workspaceSlugInput.value.trim();
    slugPreviewValue.textContent = slug || "...";
  }

  function showError(message: string): void {
    createWorkspaceError.textContent = message;
    createWorkspaceError.classList.remove("hidden");
  }

  function hideError(): void {
    createWorkspaceError.textContent = "";
    createWorkspaceError.classList.add("hidden");
  }

  function resetConfirmButton(): void {
    confirmCreateWorkspace.disabled = false;
    confirmCreateWorkspace.textContent = "Create";
  }

  function openModal(): void {
    createWorkspaceModal.classList.remove("hidden");
    workspaceNameInput.value = "";
    workspaceSlugInput.value = "";
    slugManuallyEdited = false;
    hideError();
    resetConfirmButton();
    updateSlugPreview();
    workspaceNameInput.focus();
  }

  function closeModal(): void {
    createWorkspaceModal.classList.add("hidden");
    resetConfirmButton();
  }

  async function createWorkspace(): Promise<void> {
    const name = workspaceNameInput.value.trim();
    const slug = workspaceSlugInput.value.trim();

    if (!name) {
      showError("Workspace name is required.");
      workspaceNameInput.focus();
      return;
    }

    if (!slug) {
      showError("Workspace slug is required.");
      workspaceSlugInput.focus();
      return;
    }

    hideError();
    confirmCreateWorkspace.disabled = true;
    confirmCreateWorkspace.textContent = "Creating...";

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });

      if (response.ok) {
        const data = (await response.json()) as { workspace: { slug: string } };
        window.location.href = `/w/${data.workspace.slug}`;
      } else {
        const data = (await response.json()) as { error?: string };
        showError(data.error || "Failed to create workspace.");
        resetConfirmButton();
      }
    } catch {
      showError("Network error. Please try again.");
      resetConfirmButton();
    }
  }

  workspaceNameInput.addEventListener("input", () => {
    if (!slugManuallyEdited) {
      workspaceSlugInput.value = generateSlug(workspaceNameInput.value);
      updateSlugPreview();
    }
  });

  workspaceSlugInput.addEventListener("input", () => {
    slugManuallyEdited = workspaceSlugInput.value !== "";
    updateSlugPreview();
  });

  createWorkspaceButton.addEventListener("click", openModal);

  cancelCreateWorkspace.addEventListener("click", closeModal);

  createWorkspaceModal.addEventListener("click", (e: MouseEvent) => {
    if (e.target === createWorkspaceModal) {
      closeModal();
    }
  });

  confirmCreateWorkspace.addEventListener("click", () => {
    createWorkspace();
  });

  workspaceNameInput.addEventListener("keypress", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      createWorkspace();
    }
  });

  workspaceSlugInput.addEventListener("keypress", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      createWorkspace();
    }
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && !createWorkspaceModal.classList.contains("hidden")) {
      closeModal();
    }
  });
})();
