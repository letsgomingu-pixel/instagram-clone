import { Navigate } from 'react-router-dom';

/** Desktop redirects to first settings section; mobile shows the nav list only. */
export function SettingsIndexPage() {
  return (
    <div className="hidden md:block">
      <Navigate to="edit" replace />
    </div>
  );
}
