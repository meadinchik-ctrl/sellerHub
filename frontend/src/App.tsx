import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardLayout } from './pages/DashboardLayout';
import { DashboardOverview } from './pages/DashboardOverview';
import { ProductsPage } from './pages/ProductsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { StoreSettingsPage } from './pages/StoreSettingsPage';
import { CRMPage } from './pages/CRMPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TeamPage } from './pages/TeamPage';
import { PlansPage } from './pages/PlansPage';
import { SettingsPage } from './pages/SettingsPage';
import { AdminPage } from './pages/AdminPage';
import { PublicStorePage } from './pages/PublicStorePage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { BookingPage } from './pages/BookingPage';
import { PortfolioPage } from './pages/PortfolioPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public marketing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback/google" element={<GoogleCallbackPage />} />

          {/* Public Customer Storefront */}
          <Route path="/shop/:slug" element={<PublicStorePage />} />

          {/* Seller Dashboard */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardOverview />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="booking" element={<BookingPage />} />
            <Route path="portfolio" element={<PortfolioPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="import" element={<ImportExportPage />} />
            <Route path="store" element={<StoreSettingsPage />} />
            <Route path="crm" element={<CRMPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="team" element={<TeamPage />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="admin" element={<AdminPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
