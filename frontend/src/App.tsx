import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { AdminGuestRoute, AdminRoute } from '@/components/auth/AdminRoute';
import { ProtectedRoute, GuestRoute } from '@/components/auth/ProtectedRoute';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { AdminLoginPage } from '@/pages/admin/AdminLoginPage';
import { AdminPostsPage } from '@/pages/admin/AdminPostsPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { HomePage } from '@/pages/HomePage';
import { ExplorePage } from '@/pages/ExplorePage';
import { SearchPage } from '@/pages/SearchPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { PostDetailPage } from '@/pages/PostDetailPage';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { MessagesPage } from '@/pages/MessagesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsEditProfilePage } from '@/pages/settings/SettingsEditProfilePage';
import { SettingsNotificationsPage } from '@/pages/settings/SettingsNotificationsPage';
import { SettingsPrivacyPage } from '@/pages/settings/SettingsPrivacyPage';
import { SettingsSecurityPage } from '@/pages/settings/SettingsSecurityPage';
import { SettingsAccountPage } from '@/pages/settings/SettingsAccountPage';
import { SettingsIndexPage } from '@/pages/settings/SettingsIndexPage';
import { ReelsPage } from '@/pages/ReelsPage';
import { SuggestedUsersPage } from '@/pages/SuggestedUsersPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              <Route element={<AdminGuestRoute />}>
                <Route path="/admin/login" element={<AdminLoginPage />} />
              </Route>

              <Route element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboardPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/posts" element={<AdminPostsPage />} />
                </Route>
              </Route>

              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/reels" element={<ReelsPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/suggested" element={<SuggestedUsersPage />} />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/p/:postId" element={<PostDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout showSuggestions={false} />}>
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/messages/:username" element={<MessagesPage />} />
                  <Route path="/profile/edit" element={<EditProfilePage />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route index element={<SettingsIndexPage />} />
                    <Route path="edit" element={<SettingsEditProfilePage />} />
                    <Route path="notifications" element={<SettingsNotificationsPage />} />
                    <Route path="privacy" element={<SettingsPrivacyPage />} />
                    <Route path="security" element={<SettingsSecurityPage />} />
                    <Route path="account" element={<SettingsAccountPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: '#262626',
                color: '#fff',
                fontSize: '14px',
              },
            }}
          />
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
