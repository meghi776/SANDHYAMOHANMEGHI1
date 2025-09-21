import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Copy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Product {
  id: string;
  category_id: string;
  brand_id: string;
  name: string;
  sku: string | null;
  price: number | null;
  inventory: number | null;
  is_disabled: boolean;
  mockup_image_url: string | null;
  category_name?: string;
  brand_name?: string;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  onSelectProduct: (productId: string, isChecked: boolean) => void;
  onToggleDisable: (productId: string, currentStatus: boolean) => void;
  onDeleteProduct: (product: Product) => void; // This now triggers permanent deletion
  onDuplicateProduct: (product: Product) => void;
  showCategoryBrand?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  onSelectProduct,
  onToggleDisable,
  onDeleteProduct,
  onDuplicateProduct,
  showCategoryBrand = false,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelectProduct(product.id, checked as boolean)}
          aria-label={`Select product ${product.name}`}
          className="mt-1"
        />
        {product.mockup_image_url ? (
          <img src={product.mockup_image_url} alt={product.name} className="w-20 h-20 object-cover rounded-md" />
        ) : (
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">No Mockup</div>
        )}
        <div className="flex-1">
          <CardTitle className="text-base">{product.name}</CardTitle>
          {showCategoryBrand && (
            <p className="text-xs text-muted-foreground">
              {product.category_name} / {product.brand_name}
            </p>
          )}
          <p className="text-xs text-muted-foreground">SKU: {product.sku || 'N/A'}</p>
          <p className="text-sm font-semibold">₹{product.price?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-muted-foreground">Stock: {product.inventory ?? 'N/A'}</p>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id={`product-status-mobile-${product.id}`}
              checked={!product.is_disabled}
              onCheckedChange={() => onToggleDisable(product.id, product.is_disabled)}
            />
            <Label htmlFor={`product-status-mobile-${product.id}`}>
              {product.is_disabled ? 'Disabled' : 'Enabled'}
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 p-4 pt-0">
        <Link to={`/admin/categories/${product.category_id}/brands/${product.brand_id}/products/${product.id}`}>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDuplicateProduct(product)}
        >
          <Copy className="h-4 w-4 mr-1" /> Duplicate
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeleteProduct(product)} // This now triggers permanent deletion
        >
          <Trash2 className="h-4 w-4 mr-1" /> Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;