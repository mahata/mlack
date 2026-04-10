(() => {
  const workspaceModal = (
    window as unknown as {
      initWorkspaceModal: (elements: {
        createWorkspaceModal: HTMLDivElement;
        workspaceNameInput: HTMLInputElement;
        workspaceSlugInput: HTMLInputElement;
        slugPreviewValue: HTMLSpanElement;
        createWorkspaceError: HTMLParagraphElement;
        cancelCreateWorkspace: HTMLButtonElement;
        confirmCreateWorkspace: HTMLButtonElement;
        createWorkspaceButton: HTMLButtonElement;
      }) => { closeModal: () => void; isModalVisible: () => boolean };
    }
  ).initWorkspaceModal({
    createWorkspaceModal: document.getElementById("createWorkspaceModal") as HTMLDivElement,
    workspaceNameInput: document.getElementById("workspaceName") as HTMLInputElement,
    workspaceSlugInput: document.getElementById("workspaceSlug") as HTMLInputElement,
    slugPreviewValue: document.getElementById("slugPreviewValue") as HTMLSpanElement,
    createWorkspaceError: document.getElementById("createWorkspaceError") as HTMLParagraphElement,
    cancelCreateWorkspace: document.getElementById("cancelCreateWorkspace") as HTMLButtonElement,
    confirmCreateWorkspace: document.getElementById("confirmCreateWorkspace") as HTMLButtonElement,
    createWorkspaceButton: document.getElementById("createWorkspaceButton") as HTMLButtonElement,
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape" && workspaceModal.isModalVisible()) {
      workspaceModal.closeModal();
    }
  });
})();
