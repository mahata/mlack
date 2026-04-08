INSERT OR IGNORE INTO workspaces (name, slug, created_by_email) VALUES ('Default', 'default', 'system');
INSERT OR IGNORE INTO channels (name, workspace_id, created_by_email)
SELECT 'general', id, 'system'
FROM workspaces
WHERE slug = 'default';
