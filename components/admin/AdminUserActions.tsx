"use client";

interface AdminUserActionsProps {
  userId: string;
  email: string;
  canDelete: boolean;
}

export function AdminUserActions({ userId, email, canDelete }: AdminUserActionsProps) {
  const endpoint = `/api/admin/users/${userId}`;

  return (
    <div className="admin-user-actions">
      <form action={endpoint} method="POST" className="admin-password-form">
        <input type="hidden" name="action" value="change-password" />
        <input
          type="password"
          name="newPassword"
          minLength={10}
          autoComplete="new-password"
          aria-label={`New password for ${email}`}
          placeholder="New password"
          required
        />
        <button type="submit">Change password</button>
      </form>
      <form
        action={endpoint}
        method="POST"
        onSubmit={(event) => {
          if (!window.confirm(`Permanently delete ${email} and all of their mailbox data?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="action" value="delete" />
        <button className="admin-delete-button" type="submit" disabled={!canDelete}>
          Delete
        </button>
      </form>
    </div>
  );
}
