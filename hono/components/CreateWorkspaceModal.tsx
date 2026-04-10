export async function CreateWorkspaceModal() {
  return (
    <div
      id="createWorkspaceModal"
      className="modal hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="createWorkspaceTitle"
    >
      <div className="modal-content">
        <h3 id="createWorkspaceTitle">Create Workspace</h3>
        <label className="modal-label" htmlFor="workspaceName">
          Name
        </label>
        <input type="text" id="workspaceName" placeholder="My Workspace" />
        <label className="modal-label" htmlFor="workspaceSlug">
          Slug
        </label>
        <input type="text" id="workspaceSlug" placeholder="my-workspace" />
        <p className="slug-preview">
          URL: /w/<span id="slugPreviewValue">...</span>
        </p>
        <p id="createWorkspaceError" className="modal-error hidden"></p>
        <div className="modal-actions">
          <button type="button" id="cancelCreateWorkspace">
            Cancel
          </button>
          <button type="button" id="confirmCreateWorkspace">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
