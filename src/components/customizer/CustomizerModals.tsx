import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from 'lucide-react';
import SavedDesignsModal from '@/components/SavedDesignsModal';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

// Define types for props to ensure type safety
interface Product {
  id: string;
  name: string;
  price: number | null;
  canvas_width: number;
  canvas_height: number;
}

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textShadow?: boolean;
  rotation?: number;
}

interface CustomizerModalsProps {
  product: Product | null;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (isOpen: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerAddress: string;
  setCustomerAddress: (address: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  isPlacingOrder: boolean;
  handlePlaceOrder: (isDemo: boolean, paymentId?: string) => void; // Added paymentId parameter
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  demoCustomerName: string;
  demoOrderPrice: string;
  demoOrderAddress: string;
  setDemoOrderDetails: (name: string, price: string, address: string) => void;
  isSavedDesignsModalOpen: boolean;
  setIsSavedDesignsModalOpen: (isOpen: boolean) => void;
  currentDesignElements: DesignElement[];
  currentSelectedCanvasColor: string | null;
  currentBlurredBackgroundImageUrl: string | null;
  onLoadDesign: (design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => void;
  canvasContentRef: React.RefObject<HTMLDivElement>;
  userRole: 'user' | 'admin' | null;
}

// Declare Razorpay global object
declare global {
  interface Window {
    Razorpay: any;
  }
}

const CustomizerModals: React.FC<CustomizerModalsProps> = ({
  product,
  isCheckoutModalOpen,
  setIsCheckoutModalOpen,
  customerName,
  setCustomerName,
  customerAddress,
  setCustomerAddress,
  customerPhone,
  setCustomerPhone,
  paymentMethod,
  setPaymentMethod,
  isPlacingOrder,
  handlePlaceOrder,
  isDemoOrderModalOpen,
  setIsDemoOrderModalOpen,
  demoCustomerName,
  demoOrderPrice,
  demoOrderAddress,
  setDemoOrderDetails,
  isSavedDesignsModalOpen,
  setIsSavedDesignsModalOpen,
  currentDesignElements,
  currentSelectedCanvasColor,
  currentBlurredBackgroundImageUrl,
  onLoadDesign,
  canvasContentRef,
  userRole,
}) => {
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);

  // Load Razorpay script dynamically
  useEffect(() => {
    const loadRazorpayScript = () => {
      if (document.getElementById('razorpay-checkout-script')) {
        return;
      }
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    };

    loadRazorpayScript();
  }, []);

  const handleRazorpayPayment = async () => {
    if (!product || typeof product.price !== 'number' || product.price <= 0 || !customerName || !customerPhone) {
      showError("Product price must be a positive number, and customer name/phone are required for payment.");
      setIsRazorpayLoading(false);
      return;
    }

    setIsRazorpayLoading(true);

    try {
      const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError || !currentSession || !currentSession.access_token) {
        showError("Authentication required to process payment. Please log in again.");
        setIsRazorpayLoading(false);
        return;
      }

      const payloadToSend = {
        amount: product.price,
        currency: 'INR', // Assuming INR, adjust if needed
        receipt: `receipt_${Date.now()}`,
      };

      console.log("CustomizerModals: Payload object being sent to create-razorpay-order:", payloadToSend);
      // Removed manual JSON.stringify and Content-Type header
      const { data, error: invokeError } = await supabase.functions.invoke('create-razorpay-order', {
        body: payloadToSend, // Pass the object directly
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
        },
      });

      if (invokeError) {
        console.error("Error invoking create-razorpay-order:", invokeError);
        let errorMessage = invokeError.message;
        if (invokeError.context?.data) {
          try {
            const parsedError = typeof invokeError.context.data === 'string' ? JSON.parse(invokeError.context.data) : invokeError.context.data;
            if (parsedError.error) {
              errorMessage = parsedError.error;
            }
          } catch (e) { /* ignore */ }
        }
        showError(`Payment initiation failed: ${errorMessage}`);
        setIsRazorpayLoading(false);
        return;
      }

      const { order_id, amount: razorpayAmount, key_id } = data;

      // 2. Open Razorpay Checkout
      const options = {
        key: key_id,
        amount: razorpayAmount,
        currency: 'INR',
        name: 'Meghi',
        description: `Order for ${product.name}`,
        order_id: order_id,
        handler: async (response: any) => {
          // Payment successful, now place the order in your DB
          await handlePlaceOrder(false, response.razorpay_payment_id);
        },
        prefill: {
          name: customerName,
          email: currentSession.user?.email || '',
          contact: customerPhone,
        },
        notes: {
          address: customerAddress,
          product_id: product.id,
          user_id: currentSession.user?.id,
        },
        theme: {
          color: '#3399CC',
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', (response: any) => {
        console.error("Razorpay payment failed:", response);
        showError(`Payment failed: ${response.error.description || 'Please try again.'}`);
      });

      rzp1.open();

    } catch (err: any) {
      console.error("Error during Razorpay process:", err);
      showError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setIsRazorpayLoading(false);
    }
  };

  if (!product) return null;

  return (
    <>
      <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
            <DialogDescription>Please provide your details to complete the order.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-name" className="text-right">
                Name
              </Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-address" className="text-right">
                Address
              </Label>
              <Textarea
                id="customer-address"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-phone" className="text-right">
                Phone
              </Label>
              <Input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                Payment
              </Label>
              <div className="col-span-3 flex space-x-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'Razorpay' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('Razorpay')}
                  className="flex-1"
                  disabled={isRazorpayLoading}
                >
                  Prepaid (Razorpay)
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'COD' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('COD')}
                  className="flex-1"
                  disabled={isRazorpayLoading}
                >
                  Cash on Delivery
                </Button>
              </div>
            </div>
            {product && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-bold">Total Price</Label>
                <span className="col-span-3 text-lg font-bold">₹{(product.price ?? 0).toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => paymentMethod === 'COD' ? handlePlaceOrder(false) : handleRazorpayPayment()}
              disabled={isPlacingOrder || isRazorpayLoading}
            >
              {isPlacingOrder || isRazorpayLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {paymentMethod === 'COD' ? 'Place Order' : 'Proceed to Pay'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDemoOrderModalOpen} onOpenChange={setIsDemoOrderModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Place Demo Order</DialogTitle>
            <DialogDescription>Enter details for your demo order. This will not be a real purchase.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="demo-name" className="text-right">
                Name
              </Label>
              <Input
                id="demo-name"
                type="text"
                value={demoCustomerName}
                onChange={(e) => setDemoOrderDetails(e.target.value, demoOrderPrice, demoOrderAddress)}
                className="col-span-3"
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="demo-price" className="text-right">
                Price
              </Label>
              <Input
                id="demo-price"
                type="number"
                value={demoOrderPrice}
                onChange={(e) => setDemoOrderDetails(demoCustomerName, e.target.value, demoOrderAddress)}
                className="col-span-3"
                placeholder="e.g., 19.99"
                // Removed readOnly={userRole !== 'admin'} to allow all users to edit price
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="demo-address" className="text-right">
                Address
              </Label>
              <Textarea
                id="demo-address"
                value={demoOrderAddress}
                onChange={(e) => setDemoOrderDetails(demoCustomerName, demoOrderPrice, e.target.value)}
                className="col-span-3"
                placeholder="e.g., 123 Demo St, Demo City"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDemoOrderModalOpen(false)}>Cancel</Button>
            <Button onClick={() => handlePlaceOrder(true)} disabled={isPlacingOrder}>
              {isPlacingOrder ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Demo Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SavedDesignsModal
        productId={product.id}
        isOpen={isSavedDesignsModalOpen}
        onOpenChange={setIsSavedDesignsModalOpen}
        currentDesignElements={currentDesignElements}
        currentSelectedCanvasColor={currentSelectedCanvasColor}
        currentBlurredBackgroundImageUrl={currentBlurredBackgroundImageUrl}
        onLoadDesign={onLoadDesign}
        canvasContentRef={canvasContentRef}
        product={product}
      />
    </>
  );
};

export default CustomizerModals;