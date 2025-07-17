import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Privacy Policy</h1>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.</p>

        <h2>1. Information We Collect</h2>
        <p>We may collect personal identification information from Users in a variety of ways, including, but not limited to, when Users visit our site, register on the site, place an order, fill out a form, and in connection with other activities, services, features or resources we make available on our Site.</p>
        <ul>
          <li><strong>Personal Data:</strong> Name, email address, phone number, shipping address, payment information (though we do not store full payment card details).</li>
          <li><strong>Usage Data:</strong> Information about how you access and use the Service, such as your IP address, browser type, pages visited, and time spent on pages.</li>
        </ul>

        <h2>2. How We Use Collected Information</h2>
        <p>We may collect and use Users personal information for the following purposes:</p>
        <ul>
          <li>To process transactions and deliver products.</li>
          <li>To improve customer service and support needs.</li>
          <li>To personalize user experience.</li>
          <li>To send periodic emails regarding your order or other products and services.</li>
        </ul>

        <h2>3. How We Protect Your Information</h2>
        <p>We adopt appropriate data collection, storage and processing practices and security measures to protect against unauthorized access, alteration, disclosure or destruction of your personal information, username, password, transaction information and data stored on our Site.</p>

        <h2>4. Sharing Your Personal Information</h2>
        <p>We do not sell, trade, or rent Users personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners, trusted affiliates and advertisers for the purposes outlined above.</p>

        <h2>5. Changes to This Privacy Policy</h2>
        <p>We have the discretion to update this privacy policy at any time. When we do, we will revise the updated date at the bottom of this page. We encourage Users to frequently check this page for any changes to stay informed about how we are helping to protect the personal information we collect.</p>

        <p>This document was last updated on <strong>July 26, 2024</strong>.</p>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;