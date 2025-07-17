import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin } from 'lucide-react';

const ContactUsPage = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link to="/" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Contact Us</h1>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>We'd love to hear from you! Whether you have a question about our products, need assistance with an order, or just want to give feedback, feel free to reach out.</p>

        <h2>Get in Touch</h2>
        <p>Our customer support team is available to assist you during business hours.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div className="flex items-start space-x-4">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold">Email Us</h3>
              <p className="text-gray-700 dark:text-gray-300">For general inquiries, support, or feedback.</p>
              <a href="mailto:support@example.com" className="text-blue-600 hover:underline dark:text-blue-400">support@example.com</a>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <Phone className="h-8 w-8 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold">Call Us</h3>
              <p className="text-gray-700 dark:text-gray-300">For immediate assistance during business hours.</p>
              <a href="tel:+1234567890" className="text-green-600 hover:underline dark:text-green-400">+1 (234) 567-890</a>
              <p className="text-sm text-muted-foreground">Monday - Friday, 9 AM - 5 PM (Your Time Zone)</p>
            </div>
          </div>

          <div className="flex items-start space-x-4 col-span-1 md:col-span-2">
            <MapPin className="h-8 w-8 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="text-xl font-semibold">Our Address</h3>
              <p className="text-gray-700 dark:text-gray-300">You can visit us by appointment or send mail to:</p>
              <address className="not-italic text-gray-700 dark:text-gray-300">
                123 Custom Street<br />
                Design City, DC 12345<br />
                Country
              </address>
            </div>
          </div>
        </div>

        <h2 className="mt-8">Send Us a Message</h2>
        <p>Alternatively, you can fill out the form below and we will get back to you as soon as possible.</p>
        {/* You can integrate a contact form here if needed */}
        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg shadow-sm">
          <p className="text-muted-foreground">Contact form integration coming soon!</p>
        </div>
      </div>
    </div>
  );
};

export default ContactUsPage;