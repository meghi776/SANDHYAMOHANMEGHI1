import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CancellationRefundPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Cancellation and Refund Policy</h1>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>Thank you for shopping with us. We want to ensure you have a clear understanding of our cancellation and refund policies.</p>

        <h2>1. Order Cancellation</h2>
        <p><strong>Customized Products:</strong> Due to the personalized nature of our products, orders for customized items cannot be cancelled once the design process has begun or the order has moved to "Processing" status. Please review your design carefully before confirming your order.</p>
        <p><strong>Non-Customized Products:</strong> For non-customized products, you may cancel your order within 24 hours of purchase, provided the item has not yet been shipped. To cancel, please contact our customer service immediately.</p>

        <h2>2. Refund Policy</h2>
        <p><strong>No Refunds for Customized Products:</strong> All sales of customized products are final. We do not offer refunds or exchanges for customized items unless there is a manufacturing defect or an error on our part.</p>
        <p><strong>Defective or Incorrect Items:</strong> If you receive a defective product or an item that is significantly different from what you ordered (e.g., wrong product, wrong design printed due to our error), please contact us within 7 days of delivery with photographic evidence. We will review your claim and, if approved, offer a replacement or a full refund.</p>
        <p><strong>Refund Process:</strong> Approved refunds will be processed to your original method of payment within 7-10 business days. You will receive a notification once the refund has been initiated.</p>

        <h2>3. Return Shipping</h2>
        <p>If a return is required due to a defect or error on our part, we will provide instructions for return shipping and cover the shipping costs. Items must be returned in their original condition and packaging.</p>

        <h2>4. Contact Us</h2>
        <p>If you have any questions about our Cancellation and Refund Policy, please contact us at [Your Contact Email/Phone Number].</p>

        <p>This document was last updated on <strong>July 26, 2024</strong>.</p>
      </div>
    </div>
  );
};

export default CancellationRefundPage;