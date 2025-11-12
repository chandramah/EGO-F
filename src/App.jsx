// src/App.jsx
import './App.css';
import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import ProductList from "./pages/products/ProductList";
import ProductForm from "./pages/products/ProductForm";
import SalePOS from "./pages/sales/SalePOS";
import StockByProduct from "./pages/inventory/StockByProduct";
import AddBatch from "./pages/inventory/addBatch";
import CashierDashboard from "./pages/cashier/CashierDashboard";
import PointOfSale from "./pages/cashier/PointOfSale";
import SalesReports from "./pages/cashier/SalesReports";

import UserForm from "./pages/auth/UserForm";
import UsersList from "./pages/user/UsersList";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import Suppliers from "./pages/suppliers/Suppliers";
import PurchaseOrders from "./pages/purchaseOrders/PurchaseOrders";
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import Reports from './pages/reports/Reports';
import SalesList from './pages/sales/SalesList';


/**
 * App routes
 * - All protected pages wrapped by imported ProtectedRoute component.
 * - Single canonical route entries (no duplicates).
 */

export default function App() {
  return (
    <div className="app-root">
      <Navbar />
      <main className="main">
        <Routes>
          {/* Public */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <Login/>
            </PublicOnlyRoute>
          } />

          {/* Authenticated (protected) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/products" element={
            <ProtectedRoute>
              <ProductList />
            </ProtectedRoute>
          } />

          <Route path="/products/new" element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          } />

          <Route path="/products/:id/edit" element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          } />

          <Route path="/pos" element={
            <ProtectedRoute>
              <SalePOS />
            </ProtectedRoute>
          } />

          <Route path="/inventory/add-batch" element={
            <ProtectedRoute>
              <AddBatch />
            </ProtectedRoute>
          } />
           <Route path="/manager" element={
            <ProtectedRoute>
              <ManagerDashboard />
            </ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute>
              <Suppliers />
            </ProtectedRoute>
          } />
           <Route path="/purchaseorders" element={
            <ProtectedRoute>
              <PurchaseOrders />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          

          <Route path="/inventory/stock-by-product" element={
            <ProtectedRoute>
              <StockByProduct />
            </ProtectedRoute>
          } />

          {/* Cashier-specific pages (protected) */}
          <Route path="/cashier" element={
            <ProtectedRoute allowedRoles={["CASHIER","MANAGER","ADMIN"]}>
              <CashierDashboard />
            </ProtectedRoute>
          } />

          <Route path="/cashier/pos" element={
            <ProtectedRoute allowedRoles={["CASHIER","MANAGER","ADMIN"]}>
              <PointOfSale />
            </ProtectedRoute>
          } />

          <Route path="/cashier/sales" element={
            <ProtectedRoute allowedRoles={["CASHIER","MANAGER","ADMIN"]}>
              <SalesReports />
            </ProtectedRoute>
          } />

          {/* User management */}
          <Route path="/user/users" element={
            <ProtectedRoute>
              <UsersList />
            </ProtectedRoute>
          } />

          <Route path="/auth/user/new" element={
            <ProtectedRoute>
              <UserForm />
            </ProtectedRoute>
          } />

          <Route path="/auth/user/:id/edit" element={
            <ProtectedRoute>
              <UserForm />
            </ProtectedRoute>
          } />
         
          <Route path= "/sales-report" element={
            <ProtectedRoute>
              <SalesReports />
            </ProtectedRoute>
          } />
           <Route path= "/sales" element={
            <ProtectedRoute>
              <SalesList />
            </ProtectedRoute>
          } />

          {/* Fallback: send unknown routes to home/dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
