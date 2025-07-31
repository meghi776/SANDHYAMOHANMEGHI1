import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Tag } from 'lucide-react';

interface Brand {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  sort_order: number | null;
  image_url: string | null;
}

const BrandsPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');

  useEffect(() => {
    const fetchCategoryAndBrands = async () => {
      setLoading(true);
      setError(null);

      if (!categoryId) {
        setError("Category ID is missing.");
        setLoading(false);
        return;
      }

      try {
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();

        if (categoryError) {
          console.error("BrandsPage.tsx: Error fetching category name:", categoryError);
          setError(categoryError.message);
        } else if (categoryData) {
          setCategoryName(categoryData.name);
        } else {
          setCategoryName('Unknown Category');
        }

        const { data: brandsData, error: brandsError } = await supabase
          .from('brands')
          .select('id, name, description, category_id, sort_order, image_url')
          .eq('category_id', categoryId)
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });

        if (brandsError) {
          console.error("BrandsPage.tsx: Error fetching brands:", brandsError);
          setError(brandsError.message);
          setBrands([]);
        } else {
          const fetchedBrands = brandsData || [];
          setBrands(fetchedBrands);
        }
      } catch (e: any) {
        console.error("BrandsPage.tsx: Unexpected error during fetchCategoryAndBrands:", e);
        setError(e.message || "An unexpected error occurred.");
        setBrands([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryAndBrands();
  }, [categoryId]);

  return (
    <div className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex items-center mb-6">
          <Link to="/" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
            Select a Brand for {categoryName || '...'}
          </h1>
        </div>

        {loading && (
          <p className="text-gray-600 dark:text-gray-300 text-center">Loading brands...</p>
        )}

        {error && (
          <p className="text-red-500 text-center">Error: {error}</p>
        )}

        {!loading && !error && (
          <>
            {brands.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300 text-center">No brands found for this category.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {brands.map((brand) => (
                  <Link key={brand.id} to={`/categories/${categoryId}/brands/${brand.id}/products`} className="block group">
                    <Card className="overflow-hidden transition-all duration-300 group-hover:shadow-xl group-hover:scale-105 border-border">
                      <CardContent className="p-0 aspect-square flex items-center justify-center bg-white dark:bg-gray-800">
                        {brand.image_url ? (
                          <img src={brand.image_url} alt={brand.name} className="w-full h-full object-contain p-2" />
                        ) : (
                          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Tag className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    <div className="p-2 text-center">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate group-hover:text-primary">{brand.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BrandsPage;