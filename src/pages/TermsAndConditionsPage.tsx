import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const TermsAndConditionsPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Terms and Conditions</h1>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>Welcome to our website! These terms and conditions outline the rules and regulations for the use of our Website.</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing this website, we assume you accept these terms and conditions. Do not continue to use our website if you do not agree to take all of the terms and conditions stated on this page.</p>

        <h2>2. Intellectual Property Rights</h2>
        <p>Unless otherwise stated, we and/or our licensors own the intellectual property rights for all material on our website. All intellectual property rights are reserved. You may access this from our website for your own personal use subjected to restrictions set in these terms and conditions.</p>

        <h2>3. User Responsibilities</h2>
        <p>You must not:</p>
        <ul>
          <li>Republish material from our website.</li>
          <li>Sell, rent or sub-license material from our website.</li>
          <li>Reproduce, duplicate or copy material from our website.</li>
          <li>Redistribute content from our website.</li>
        </ul>
        <p>You are responsible for ensuring that any content you upload or create on our platform complies with all applicable laws and does not infringe on any third-party rights.</p>

        <h2>4. Limitation of Liability</h2>
        <p>In no event shall we, nor any of our officers, directors and employees, be held liable for anything arising out of or in any way connected with your use of this website whether such liability is under contract. We shall not be held liable for any indirect, consequential or special liability arising out of or in any way related to your use of this website.</p>

        <h2>5. Governing Law & Jurisdiction</h2>
        <p>These Terms will be governed by and interpreted in accordance with the laws of the jurisdiction where our company is registered, and you submit to the non-exclusive jurisdiction of the state and federal courts located in that jurisdiction for the resolution of any disputes.</p>

        <h2>6. Changes to Terms</h2>
        <p>We reserve the right to revise these Terms at any time as it sees fit, and by using this Website you are expected to review these Terms on a regular basis.</p>

        <p>This document was last updated on <strong>July 26, 2024</strong>.</p>
      </div>
    </div>
  );
};

export default TermsAndConditionsPage;