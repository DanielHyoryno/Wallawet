import { createBrowserRouter, RouterProvider } from "react-router-dom";
import AuthPage from "@/pages/AuthPage";
import DashboardPage from "@/pages/DashboardPage";
import AppShell from "@/layouts/AppShell";
import Protected from "@/components/auth/Protected";
import PublicOnly from "@/components/auth/PublicOnly";
import CategoriesPage from "@/pages/CategoriesPage";
import TransactionsPage from "@/pages/TransactionPage";
import SettingsPage from "@/pages/SettingsPage";

const router = createBrowserRouter([
  { path: "/", element: <PublicOnly><AuthPage /></PublicOnly> },
  {
    element: <Protected><AppShell /></Protected>,
    children: [
      { path: "dashboard", element: <DashboardPage /> },
      { path: "transactions", element: <TransactionsPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);


export default function App() {
  return <RouterProvider router={router} />;
}
