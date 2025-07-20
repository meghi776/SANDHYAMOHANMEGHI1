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
import { User } from '@supabase/supabase-js'; // Import User type

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
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  isPlacingOrder: boolean;
  handlePlaceOrder: (isDemo: boolean, customerDetails: { name: string, address: string, phone: string, alternativePhone: string | null }, paymentId?: string) => void; // Updated signature
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  demoCustomerName: string;
  demoOrderPrice: string;
  demoOrderAddress: string; // Kept for demo form
  setDemoOrderDetails: (name: string, price: string, address: string) => void; // Kept for demo form
  isSavedDesignsModalOpen: boolean;
  setIsSavedDesignsModalOpen: (isOpen: boolean) => void;
  currentDesignElements: DesignElement[];
  currentSelectedCanvasColor: string | null;
  currentBlurredBackgroundImageUrl: string | null;
  onLoadDesign: (design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => void;
  canvasContentRef: React.RefObject<HTMLDivElement>;
  user: User | null; // Added user prop
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
  user, // Destructure user prop
}) => {
  const [isRazorpayLoading, setIsRazorpayLoading] = useState(false);
  // New states for individual address components
  const [customerHouseNo, setCustomerHouseNo] = useState('');
  const [customerVillage, setCustomerVillage] = useState('');
  const [customerPincode, setCustomerPincode] = useState('');
  const [customerMandal, setCustomerMandal] = useState('');
  const [customerDistrict, setCustomerDistrict] = useState('');
  const [customerAlternativePhone, setCustomerAlternativePhone] = useState(''); // New state
  const [isPincodeLoading, setIsPincodeLoading] = useState(false);
  const [isPincodeValid, setIsPincodeValid] = useState(false); // New state for pincode validity
  const pincodeTimeoutRef = React.useRef<number | null>(null);


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

  // Effect for Pincode autofill and validation
  useEffect(() => {
    if (pincodeTimeoutRef.current) {
      clearTimeout(pincodeTimeoutRef.current);
    }

    if (customerPincode.length === 6) {
      setIsPincodeLoading(true);
      setIsPincodeValid(false); // Assume invalid until validated
      pincodeTimeoutRef.current = setTimeout(async () => {
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${customerPincode}`);
          const data = await response.json();

          if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            let selectedPostOffice = data[0].PostOffice[0]; // Default to first one

            // Prioritize "Sub Post Office" (S.O.)
            const subPostOffice = data[0].PostOffice.find((po: any) => po.BranchType === 'Sub Post Office');
            if (subPostOffice) {
              selectedPostOffice = subPostOffice;
            }
            
            setCustomerMandal(selectedPostOffice.Name || '');
            setCustomerDistrict(selectedPostOffice.District || '');
            setIsPincodeValid(true); // Pincode is valid
          } else {
            showError("Invalid Pincode or no data found.");
            setCustomerMandal('');
            setCustomerDistrict('');
            setIsPincodeValid(false); // Pincode is invalid
          }
        } catch (error) {
          console.error("Error fetching pincode data:", error);
          showError("Failed to fetch pincode data. Please try again.");
          setCustomerMandal('');
          setCustomerDistrict('');
          setIsPincodeValid(false); // Pincode is invalid due to fetch error
        } finally {
          setIsPincodeLoading(false);
        }
      }, 500) as unknown as number; // Debounce for 500ms
    } else {
      setCustomerMandal('');
      setCustomerDistrict('');
      setIsPincodeLoading(false);
      setIsPincodeValid(false); // Pincode is not 6 digits, so it's not valid yet
    }

    return () => {
      if (pincodeTimeoutRef.current) {
        clearTimeout(pincodeTimeoutRef.current);
      }
    };
  }, [customerPincode]);

  const handleRazorpayPayment = async () => {
    console.log("CustomizerModals: handleRazorpayPayment called.");
    if (!product || product.price === null || typeof product.price !== 'number' || product.price <= 0 || !customerName.trim() || !customerPhone.trim()) {
      showError("Product price must be a positive number, and customer name/phone are required for payment.");
      setIsRazorpayLoading(false);
      return;
    }

    if (!user) { // Check if user is logged in for Razorpay
      showError("Please log in to use prepaid payment (Razorpay).");
      setIsRazorpayLoading(false);
      return;
    }

    // Construct the full address string from individual fields
    const fullAddress = `${customerHouseNo.trim()}, ${customerVillage.trim()}, ${customerPincode.trim()}, ${customerMandal.trim()}, ${customerDistrict.trim()}`;
    if (!customerHouseNo.trim() || !customerVillage.trim() || !customerPincode.trim() || !customerMandal.trim() || !customerDistrict.trim()) {
      showError("All address fields are required.");
      setIsRazorpayLoading(false);
      return;
    }
    if (!isPincodeValid) { // Check pincode validity before proceeding
      showError("Please enter a valid pincode.");
      setIsRazorpayLoading(false);
      return;
    }

    setIsRazorpayLoading(true);

    try {
      const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
      if (getSessionError || !currentSession || !currentSession.access_token) {
        showError("Authentication required to process payment. Please try logging in again.");
        setIsRazorpayLoading(false);
        return;
      }

      const payloadToSend = {
        amount: product.price,
        currency: 'INR', // Assuming INR, adjust if needed
        receipt: `receipt_${Date.now()}`,
      };

      // Explicit check for payloadToSend content before stringifying
      if (typeof payloadToSend.amount !== 'number' || payloadToSend.amount <= 0 || !payloadToSend.currency || !payloadToSend.receipt) {
        showError("Internal error: Payment payload is incomplete.");
        setIsRazorpayLoading(false);
        console.error("CustomizerModals: Attempted to send invalid payload:", payloadToSend);
        return;
      }

      console.log("CustomizerModals: Payload to send to Razorpay Edge Function:", payloadToSend);
      const stringifiedBody = JSON.stringify(payloadToSend);
      console.log("CustomizerModals: Stringified payload body:", stringifiedBody);

      const { data, error: invokeError } = await supabase.functions.invoke('create-razorpay-order', {
        body: stringifiedBody, // Use the explicitly stringified body
        headers: {
          'Content-Type': 'application/json', // Explicitly set Content-Type
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
          const customerDetails = {
            name: customerName,
            address: fullAddress,
            phone: customerPhone,
            alternativePhone: customerAlternativePhone.trim() === '' ? null : customerAlternativePhone.trim(),
          };
          await handlePlaceOrder(false, customerDetails, response.razorpay_payment_id);
        },
        prefill: {
          name: customerName,
          email: currentSession.user?.email || '',
          contact: customerPhone,
        },
        notes: {
          address: fullAddress, // Use the combined address string
          product_id: product.id,
          user_id: currentSession.user?.id,
          alternative_phone: customerAlternativePhone || null, // Pass alternative phone
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

  // Function to handle placing order for COD, using combined address
  const handleCODPlaceOrder = () => {
    console.log("CustomizerModals: handleCODPlaceOrder called.");
    if (!customerName.trim() || !customerPhone.trim()) {
      showError("Customer name and phone are required.");
      return;
    }
    const fullAddress = `${customerHouseNo.trim()}, ${customerVillage.trim()}, ${customerPincode.trim()}, ${customerMandal.trim()}, ${customerDistrict.trim()}`;
    if (!customerHouseNo.trim() || !customerVillage.trim() || !customerPincode.trim() || !customerMandal.trim() || !customerDistrict.trim()) {
      showError("All address fields are required.");
      return;
    }
    if (!isPincodeValid) { // Check pincode validity before proceeding
      showError("Please enter a valid pincode.");
      return;
    }
    const customerDetails = {
      name: customerName,
      address: fullAddress,
      phone: customerPhone,
      alternativePhone: customerAlternativePhone.trim() === '' ? null : customerAlternativePhone.trim(),
    };
    handlePlaceOrder(false, customerDetails); // Pass false for isDemo
  };

  const handleConfirmDemoOrder = () => {
    const customerDetails = {
      name: demoCustomerName,
      address: demoOrderAddress,
      phone: '0000000000', // Dummy phone for demo
      alternativePhone: null,
    };
    handlePlaceOrder(true, customerDetails);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">
                Full Name
              </Label>
              <Input
                id="customer-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">
                Phone
              </Label>
              <Input
                id="customer-phone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-alternative-phone"> {/* New field */}
                Alternative Phone (Optional)
              </Label>
              <Input
                id="customer-alternative-phone"
                type="tel"
                value={customerAlternativePhone}
                onChange={(e) => setCustomerAlternativePhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-house-no">
                House No
              </Label>
              <Input
                id="customer-house-no"
                value={customerHouseNo}
                onChange={(e) => setCustomerHouseNo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-village">
                Village
              </Label>
              <Input
                id="customer-village"
                value={customerVillage}
                onChange={(e) => setCustomerVillage(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-pincode">
                Pincode
              </Label>
              <Input
                id="customer-pincode"
                value={customerPincode}
                onChange={(e) => setCustomerPincode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-mandal">
                Mandal
              </Label>
              <Input
                id="customer-mandal"
                value={customerMandal}
                onChange={(e) => setCustomerMandal(e.target.value)}
                required
                readOnly={isPincodeLoading || customerPincode.length === 6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-district">
                District
              </Label>
              <Input
                id="customer-district"
                value={customerDistrict}
                onChange={(e) => setCustomerDistrict(e.target.value)}
                required
                readOnly={isPincodeLoading || customerPincode.length === 6}
              />
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2"> {/* Span two columns for payment */}
              <Label>
                Payment
              </Label>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={paymentMethod === 'Razorpay' ? 'default' : 'outline'}
                  onClick={() => {
                    if (!user) {
                      showError("Please log in to use prepaid payment (Razorpay).");
                      return;
                    }
                    setPaymentMethod('Razorpay');
                    console.log("CustomizerModals: Payment method set to Razorpay.");
                  }}
                  className="flex-1"
                  disabled={isRazorpayLoading || !user} // Disable if not logged in
                >
                  Prepaid (Razorpay)
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === 'COD' ? 'default' : 'outline'}
                  onClick={() => {
                    setPaymentMethod('COD');
                    console.log("CustomizerModals: Payment method set to COD.");
                  }}
                  className="flex-1"
                  disabled={isRazorpayLoading}
                >
                  Cash on Delivery
                </Button>
              </div>
            </div>
            {product && (
              <div className="space-y-2 col-span-1 md:col-span-2"> {/* Span two columns for total price */}
                <Label className="font-bold">Total Price</Label>
                <span className="text-lg font-bold block">₹{(product.price ?? 0).toFixed(2)}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                console.log("CustomizerModals: Final checkout button clicked. Current paymentMethod state:", paymentMethod);
                if (paymentMethod === 'COD') {
                  handleCODPlaceOrder();
                } else if (paymentMethod === 'Razorpay') {
                  handleRazorpayPayment();
                } else {
                  showError("Please select a payment method.");
                }
              }}
              disabled={isPlacingOrder || isRazorpayLoading || isPincodeLoading || !isPincodeValid || (paymentMethod === 'Razorpay' && !user)}
            >
              {isPlacingOrder || isRazorpayLoading || isPincodeLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
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
            <div className="space-y-2">
              <Label htmlFor="demo-name">
                Full Name
              </Label>
              <Input
                id="demo-name"
                type="text"
                value={demoCustomerName}
                onChange={(e) => setDemoOrderDetails(e.target.value, demoOrderPrice, demoOrderAddress)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-price">
                Price
              </Label>
              <Input
                id="demo-price"
                type="number"
                value={demoOrderPrice}
                onChange={(e) => setDemoOrderDetails(demoCustomerName, e.target.value, demoOrderAddress)}
                placeholder="e.g., 19.99"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-address">
                House No, Village, Pincode, Mandal, District
              </Label>
              <Textarea
                id="demo-address"
                value={demoOrderAddress}
                onChange={(e) => setDemoOrderDetails(demoCustomerName, demoOrderPrice, e.target.value)}
                placeholder="e.g., 123 Demo St, Demo City"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDemoOrderModalOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDemoOrder} disabled={isPlacingOrder}>
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