import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ShippingDeliveryPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Shipping and Delivery</h1>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>We are committed to delivering your customized products to you in a timely and efficient manner. Please read our shipping and delivery policy carefully.</p>

        <h2>1. Processing Time</h2>
        <p>All customized orders require a processing time for design, printing, and quality checks. This typically takes <strong>3-5 business days</strong> from the date of order confirmation.</p>
        <p>Non-customized items usually ship within <strong>1-2 business days</strong>.</p>

        <h2>2. Shipping Methods and Times</h2>
        <p>We partner with reliable courier services to ensure your products reach you safely. Shipping times vary based on your location:</p>
        <ul>
          <li><strong>Standard Shipping:</strong> 5-7 business days after processing.</li>
          <li><strong>Express Shipping:</strong> 2-3 business days after processing (available for select locations and at an additional cost).</li>
        </ul>
        <p>Please note that these are estimated delivery times. Delays may occur due to unforeseen circumstances such as public holidays, extreme weather conditions, or logistical issues with the courier.</p>

        <h2>3. Shipping Costs</h2>
        <p>Shipping costs are calculated at checkout based on your delivery address and the weight/dimensions of your order. We may offer free shipping promotions from time to time, which will be clearly advertised on our website.</p>

        <h2>4. Tracking Your Order</h2>
        <p>Once your order has been shipped, you will receive a shipping confirmation email containing your tracking number and a link to track your package. You can also track your order directly from your account on our website.</p>

        <h2>5. Delivery Issues</h2>
        <ul>
          <li><strong>Incorrect Address:</strong> Please ensure your shipping address is correct and complete at the time of order. We are not responsible for orders shipped to incorrectly provided addresses. Additional charges may apply for re-delivery.</li>
          <li><strong>Lost or Damaged Packages:</strong> If your package is lost in transit or arrives damaged, please contact us immediately. We will work with the courier to resolve the issue and ensure you receive your order.</li>
          <li><strong>Undeliverable Packages:</strong> If a package is returned to us as undeliverable due to reasons such as incorrect address, recipient not available, or refusal to accept, we will contact you to arrange re-delivery. Re-delivery charges may apply.</li>
        </ul>

        <h2>6. International Shipping</h2>
        <p>Currently, we only ship within [Your Country/Region]. We do not offer international shipping at this time.</p>

        <p>This document was last updated on <strong>July 26, 2024</strong>.</p>
      </div>
    </div>
  );
};

export default ShippingDeliveryPage;