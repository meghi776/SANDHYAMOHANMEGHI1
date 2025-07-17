import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PlusCircle, Edit, Trash2, ArrowLeft, XCircle } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { uploadFileToSupabase, deleteFileFromSupabase } from '@/utils/supabaseStorage';

interface Brand {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  image_url: string | null; // Added image_url
}

const BrandManagementPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState('');
  const [brandDescription, setBrandDescription] = useState('');
  const [brandSortOrder, setBrandSortOrder] = useState<string>('0');
  const [brandImageFile, setBrandImageFile] = useState<File | null>(null); // New state for image file
  const [currentBrandImageUrl, setCurrentBrandImageUrl] = useState<string | null>(null); // New state for current image URL

  const fetchCategoryAndBrands = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Fetch category name
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('name')
      .eq('id', categoryId)
      .single();

    if (categoryError) {
      console.error("Error fetching category:", categoryError);
      showError("Failed to load category details.");
      setError(categoryError.message);
      setLoading(false);
      return;
    }
    setCategoryName(categoryData?.name || 'Unknown Category');

    // Fetch brands for the category
    const { data: brandsData, error: brandsError } = await supabase
      .from('brands')
      .select('id, category_id, name, description, sort_order, image_url') // Select image_url
      .eq('category_id', categoryId)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (brandsError) {
      console.error("Error fetching brands:", brandsError);
      showError("Failed to load brands.");
      setError(brandsError.message);
    } else {
      setBrands(brandsData || []);
    }
    setLoading(false);
  }, [categoryId]); // Add categoryId to useCallback dependencies

  useEffect(() => {
    if (categoryId) {
      fetchCategoryAndBrands();
    }
  }, [categoryId, fetchCategoryAndBrands]); // Add fetchCategoryAndBrands to useEffect dependencies

  const handleAddBrand = () => {
    setCurrentBrand(null);
    setBrandName('');
    setBrandDescription('');
    setBrandSortOrder('0');
    setBrandImageFile(null); // Clear image file
    setCurrentBrandImageUrl(null); // Clear current image URL
    setIsDialogOpen(true);
  };

  const handleEditBrand = (brand: Brand) => {
    setCurrentBrand(brand);
    setBrandName(brand.name);
    setBrandDescription(brand.description || '');
    setBrandSortOrder(brand.sort_order?.toString() || '0');
    setBrandImageFile(null); // Clear any pending file selection
    setCurrentBrandImageUrl(brand.image_url); // Set current image URL
    setIsDialogOpen(true);
  };

  const handleDeleteBrand = async (id: string, imageUrl: string | null) => {
    if (!window.confirm("Are you sure you want to delete this brand? This will also delete associated products and mockups.")) {
      return;
    }
    const toastId = showLoading("Deleting brand...");
    
    try {
      // Delete associated products and their mockups first
      const { data: productsToDelete, error: productsError } = await supabase
        .from('products')
        .select('id, mockups(image_url)')
        .eq('brand_id', id);

      if (productsError) {
        throw new Error(`Failed to fetch products for deletion: ${productsError.message}`);
      }

      for (const product of productsToDelete || []) {
        // Delete product mockups from storage
        if (product.mockups && product.mockups.length > 0 && product.mockups[0].image_url) {
          const mockupFileName = product.mockups[0].image_url.split('/').pop();
          if (mockupFileName) {
            await deleteFileFromSupabase(`mockups/${mockupFileName}`, 'order-mockups');
          }
        }
        // Delete product entry
        const { error: deleteProductError } = await supabase
          .from('products')
          .delete()
          .eq('id', product.id);
        if (deleteProductError) {
          console.warn(`Failed to delete product ${product.id}: ${deleteProductError.message}`);
        }
      }

      // Delete brand image from storage if it exists
      if (imageUrl) {
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          await deleteFileFromSupabase(`brands/${fileName}`, 'order-mockups'); // Assuming 'order-mockups' bucket for brands too
        }
      }

      // Finally, delete the brand itself
      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`Failed to delete brand: ${error.message}`);
      }

      showSuccess("Brand deleted successfully!");
      fetchCategoryAndBrands(); // Re-fetch brands after deletion
    } catch (err: any) {
      console.error("Error deleting brand and associated data:", err);
      showError(`Failed to delete brand: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleSubmit = async () => {
    if (!brandName.trim()) {
      showError("Brand name cannot be empty.");
      return;
    }

    if (!categoryId) {
      showError("Category ID is missing.");
      return;
    }

    const parsedSortOrder = parseInt(brandSortOrder);
    if (isNaN(parsedSortOrder)) {
      showError("Sort order must be a valid number.");
      return;
    }

    const toastId = showLoading(currentBrand ? "Saving brand changes..." : "Adding new brand...");
    let finalImageUrl = currentBrandImageUrl;

    try {
      // Handle image upload
      if (brandImageFile) {
        const uploadedUrl = await uploadFileToSupabase(brandImageFile, 'order-mockups', 'brands');
        if (!uploadedUrl) {
          throw new Error("Failed to upload brand image.");
        }
        // If there was an old image and a new one is uploaded, delete the old one
        if (currentBrandImageUrl && currentBrandImageUrl !== uploadedUrl) {
          const oldFileName = currentBrandImageUrl.split('/').pop();
          if (oldFileName) {
            await deleteFileFromSupabase(`brands/${oldFileName}`, 'order-mockups');
          }
        }
        finalImageUrl = uploadedUrl;
      } else if (currentBrandImageUrl === null && currentBrand?.image_url) {
        // If editing and user explicitly removed the image, delete from storage
        const oldFileName = currentBrand.image_url.split('/').pop();
        if (oldFileName) {
          await deleteFileFromSupabase(`brands/${oldFileName}`, 'order-mockups');
        }
      }

      if (currentBrand) {
        // Update existing brand
        const { error } = await supabase
          .from('brands')
          .update({ name: brandName, description: brandDescription, sort_order: parsedSortOrder, image_url: finalImageUrl })
          .eq('id', currentBrand.id);

        if (error) {
          throw new Error(`Failed to update brand: ${error.message}`);
        }
        showSuccess("Brand updated successfully!");
      } else {
        // Add new brand
        const { error } = await supabase
          .from('brands')
          .insert({ category_id: categoryId, name: brandName, description: brandDescription, sort_order: parsedSortOrder, image_url: finalImageUrl });

        if (error) {
          throw new Error(`Failed to add brand: ${error.message}`);
        }
        showSuccess("Brand added successfully!");
      }
      setIsDialogOpen(false);
      fetchCategoryAndBrands(); // Re-fetch brands after addition/update
    } catch (err: any) {
      console.error("Error during brand save:", err);
      showError(`Failed to save brand: ${err.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center mb-6">
        <Link to="/admin/products" className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
          Brands for {categoryName || 'Category'}
        </h1>
      </div>

      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Brands List</CardTitle>
          <Button onClick={handleAddBrand}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Brand
          </Button>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-gray-600 dark:text-gray-300">Loading brands...</p>
          )}

          {error && (
            <p className="text-red-500">Error: {error}</p>
          )}

          {!loading && !error && (
            <>
              {brands.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-300">No brands found for this category. Add one to get started!</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Image</TableHead> {/* New TableHead for Image */}
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Sort Order</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((brand) => (
                        <TableRow key={brand.id}>
                          <TableCell>
                            {brand.image_url ? (
                              <img src={brand.image_url} alt={brand.name} className="w-16 h-16 object-cover rounded-md" />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">No Image</div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Link to={`/admin/categories/${categoryId}/brands/${brand.id}/products`} className="text-blue-600 hover:underline">
                              {brand.name}
                            </Link>
                          </TableCell>
                          <TableCell>{brand.description || 'N/A'}</TableCell>
                          <TableCell>{brand.sort_order ?? 'N/A'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditBrand(brand)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBrand(brand.id, brand.image_url)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={brandDescription}
                onChange={(e) => setBrandDescription(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sort-order" className="text-right">
                Sort Order
              </Label>
              <Input
                id="sort-order"
                type="number"
                value={brandSortOrder}
                onChange={(e) => setBrandSortOrder(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="brandImage" className="text-right">
                Brand Image
              </Label>
              <div className="col-span-3">
                <Input
                  id="brandImage"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setBrandImageFile(e.target.files ? e.target.files[0] : null)}
                />
                {currentBrandImageUrl && (
                  <div className="relative mt-2 w-32 h-32">
                    <img src={currentBrandImageUrl} alt="Current Brand" className="w-full h-full object-cover rounded-md border" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600"
                      onClick={() => {
                        setCurrentBrandImageUrl(null);
                        setBrandImageFile(null);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{currentBrand ? 'Save Changes' : 'Add Brand'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BrandManagementPage;