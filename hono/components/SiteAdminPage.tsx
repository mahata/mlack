import type { User } from "../types.js";
import { Layout } from "./Layout.js";

type UserWithFlags = {
  email: string;
  name: string;
  flags: Array<{ flagKey: string; flagValue: string; grantedBy: string; createdAt: string | null }>;
};

export async function SiteAdminPage(admin: User, usersWithFlags: UserWithFlags[]) {
  return (
    <Layout title="Site Admin" css="/components/SiteAdminPage.css" scripts={["/static/siteAdmin.js"]}>
      <div className="site-admin-container">
        <div className="site-admin-header">
          <h1>Site Admin</h1>
          <div className="admin-info">
            <span className="admin-email">{admin.email}</span>
            <a href="/" className="back-link">
              Back to Mlack
            </a>
          </div>
        </div>

        <section className="users-section">
          <h2>Users</h2>
          {usersWithFlags.length === 0 ? (
            <p className="empty-state">No registered users.</p>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Feature Flags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersWithFlags.map((u) => (
                  <tr className="user-row" data-email={u.email}>
                    <td className="user-email-cell">{u.email}</td>
                    <td>{u.name}</td>
                    <td>
                      {u.flags.length === 0 ? (
                        <span className="no-flags">None</span>
                      ) : (
                        <ul className="flag-list">
                          {u.flags.map((f) => (
                            <li className="flag-item">
                              <span className="flag-key">{f.flagKey}</span>
                              <span className="flag-value">{f.flagValue}</span>
                              <button
                                type="button"
                                className="remove-flag-button"
                                data-email={u.email}
                                data-flag-key={f.flagKey}
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <div className="flag-form">
                        <select className="flag-key-select">
                          <option value="maxTotalUploadBytes">Max Upload (bytes)</option>
                        </select>
                        <input
                          type="number"
                          className="flag-value-input"
                          placeholder="e.g. 21474836480"
                          min="1"
                          step="1"
                        />
                        <button type="button" className="set-flag-button" data-email={u.email}>
                          Set Flag
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  );
}
