import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { Smartphone, Package, Coffee, Gift } from 'lucide-react'; // Import Gift icon

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from('categories')
          .select('id, name, description, sort_order')
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (fetchError) {
          console.error("Index.tsx: Error fetching categories:", fetchError);
          setError(fetchError.message);
          setCategories([]);
        } else {
          const fetchedCategories = data || [];
          setCategories(fetchedCategories);
        }
      } catch (e: any) {
        console.error("Index.tsx: Unexpected error during fetchCategories:", e);
        setError(e.message || "An unexpected error occurred.");
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const enabledCategories = ['mobile cover', 'customized mugs', 'customized chocolates'];
  const categoryIcons: { [key: string]: React.ElementType } = {
    'mobile cover': Smartphone,
    'customized mugs': Coffee,
    'customized chocolates': Gift,
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-950 min-h-screen">
      {loading && (
        <p className="text-gray-600 dark:text-gray-300">Loading categories...</p>
      )}

      {error && (
        <p className="text-red-500">Error: {error}</p>
      )}

      {!loading && !error && (
        <>
          {categories.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-300">No categories found. Please add some from the admin panel.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-4xl mx-auto animate-in fade-in-0 duration-500">
              {categories.map((category) => {
                const isEnabled = enabledCategories.includes(category.name.toLowerCase());
                const Icon = categoryIcons[category.name.toLowerCase()] || Package;

                return (
                  <React.Fragment key={category.id}>
                    {isEnabled ? (
                      <Link
                        to={`/categories/${category.id}/brands`}
                        className="block"
                      >
                        <Card className="h-full flex flex-col justify-between p-6 rounded-2xl border-transparent bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-lg shadow-md transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 cursor-pointer animate-pulse-highlight">
                          <CardHeader className="pb-4 flex flex-col items-center text-center">
                            <Icon className="h-12 w-12 text-indigo-600 dark:text-indigo-400 mb-3" />
                            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-50">{category.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{category.description || 'Design and personalize your items.'}</p>
                            <span className="inline-block bg-green-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-green-600">
                              Start Designing
                            </span>
                          </CardContent>
                        </Card>
                      </Link>
                    ) : (
                      <Card className="h-full flex flex-col justify-between p-6 rounded-2xl border-transparent bg-gray-100 dark:bg-gray-800 shadow-md cursor-not-allowed opacity-70">
                        <CardHeader className="pb-4 flex flex-col items-center text-center">
                          <Package className="h-12 w-12 text-gray-500 dark:text-gray-500 mb-3" />
                          <CardTitle className="text-2xl font-bold text-gray-700 dark:text-gray-200">{category.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{category.description || 'Exciting products coming soon!'}</p>
                          <span className="inline-block bg-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md">
                            Coming Soon!
                          </span>
                        </CardContent>
                      </Card>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </>
      )}
      <div className="p-4 text-center mt-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} All rights reserved by Puppala Mohan
        </p>
      </div>
    </div>
  );
};

export default Index;