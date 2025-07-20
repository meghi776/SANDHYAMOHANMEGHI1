import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import ProductListingPage from "./pages/ProductListingPage";
import BrandsPage from "./pages/BrandsPage";
import SessionContextWrapper from "./components/SessionContextWrapper";
import { Toaster } from "react-hot-toast";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLayout from "./components/AdminLayout";
import CategoryManagementPage from "./pages/admin/CategoryManagementPage";
import BrandManagementPage from "./pages/admin/BrandManagementPage";
import ProductManagementByBrandPage from "./pages/admin/ProductManagementByBrandPage";
import UserManagementPage from "./pages/admin/UserManagementPage";
import UserOrderListingPage from "./pages/admin/UserOrderListingPage";
import UserOrdersPage from "./pages/admin/UserOrdersPage";
import DemoOrderListingPage from "./pages/admin/DemoOrderListingPage";
import ProductCustomizerPage from "./pages/ProductCustomizerPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import PublicLayout from "./components/PublicLayout";
import CustomizerLayout from "./components/CustomizerLayout"; // Import the new CustomizerLayout
import NotFound from "./pages/NotFound";
import { DemoOrderModalProvider } from "./contexts/DemoOrderModalContext";
import DemoUsersWithOrdersPage from "./pages/admin/DemoUsersWithOrdersPage";
import ProductEditPage from "./pages/admin/ProductEditPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import AllProductsManagementPage from "./pages/admin/AllProductsManagementPage";
import ProcessedOrdersByUserPage from "./pages/admin/ProcessedOrdersByUserPage";
import AllProcessingOrdersPage from "./pages/admin/AllProcessingOrdersPage";
import ShippedOrdersPage from "./pages/admin/ShippedOrdersPage";
import DeliveredOrdersPage from "./pages/admin/DeliveredOrdersPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/TermsAndConditionsPage";
import CancellationRefundPage from "./pages/CancellationRefundPage";
import ShippingDeliveryPage from "./pages/ShippingDeliveryPage";
import ContactUsPage from "./pages/ContactUsPage";
import MobileSignUp from "./pages/MobileSignUp";

function App() {
  return (
    <>
      <Toaster />
      <Router>
        {/* Move useNavigate and useLocation inside Router context */}
        <AppContent />
      </Router>
    </>
  );
}

// New component to wrap routes and use hooks
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <SessionContextWrapper navigate={navigate} location={location}>
      <DemoOrderModalProvider>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<MobileSignUp />} />
            <Route path="/categories/:categoryId/brands" element={<BrandsPage />} />
            {/* ProductCustomizerPage now uses CustomizerLayout */}
            <Route path="/orders" element={<OrderHistoryPage />} />
            <Route path="/order-success" element={<OrderSuccessPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
            <Route path="/cancellation-refund" element={<CancellationRefundPage />} />
            <Route path="/shipping-delivery" element={<ShippingDeliveryPage />} />
            <Route path="/contact-us" element={<ContactUsPage />} />
          </Route>

          {/* Route for ProductCustomizerPage using CustomizerLayout */}
          <Route path="/customize-cover/:productId" element={<CustomizerLayout />}>
            <Route index element={<ProductCustomizerPage />} />
          </Route>

          {/* ProductListingPage remains under PublicLayout as it's a general public page */}
          <Route path="/categories/:categoryId/brands/:brandId/products" element={<PublicLayout />}>
            <Route index element={<ProductListingPage />} />
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route path="products" element={<CategoryManagementPage />} />
            <Route path="all-products" element={<AllProductsManagementPage />} />
            <Route path="categories/:categoryId/brands" element={<BrandManagementPage />} />
            <Route path="categories/:categoryId/brands/:brandId/products" element={<ProductManagementByBrandPage />} />
            <Route path="categories/:categoryId/brands/:brandId/products/new" element={<ProductEditPage />} />
            <Route path="categories/:categoryId/brands/:brandId/products/:productId" element={<ProductEditPage />} />
            <Route path="orders" element={<UserOrderListingPage />} />
            <Route path="orders/:userId" element={<UserOrdersPage />} />
            <Route path="demo-orders" element={<DemoOrderListingPage />} />
            <Route path="demo-users" element={<DemoUsersWithOrdersPage />} />
            <Route path="processed-orders-by-user" element={<ProcessedOrdersByUserPage />} />
            <Route path="all-processing-orders" element={<AllProcessingOrdersPage />} />
            <Route path="shipped-orders" element={<ShippedOrdersPage />} />
            <Route path="delivered-orders" element={<DeliveredOrdersPage />} />
          </Route>

          {/* Catch-all route for 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </DemoOrderModalProvider>
    </SessionContextWrapper>
  );
}

export default App;