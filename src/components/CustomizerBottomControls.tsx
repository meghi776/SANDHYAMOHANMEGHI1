import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  PlusCircle,
  Trash2,
  Text,
  Palette,
  Image,
  ShoppingCart,
  XCircle,
  RotateCw,
  Download,
  Save,
  FolderOpen,
  Wand2,
  SquareDashedBottomCode, // For Add Sticker
  LayoutGrid, // For Readymade
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DesignElement } from '@/hooks/useCustomizerState';
import CustomizerModals from '@/components/customizer/CustomizerModals';

interface CustomizerBottomControlsProps {
  product: any; // Use 'any' for now, as full Product type is in hook
  designElements: DesignElement[];
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  currentFontSize: number[];
  setCurrentFontSize: (size: number[]) => void;
  currentTextColor: string;
  setCurrentTextColor: (color: string) => void;
  currentFontFamily: string;
  setCurrentFontFamily: (font: string) => void;
  currentTextShadowEnabled: boolean;
  setCurrentTextShadowEnabled: (enabled: boolean) => void;
  blurredBackgroundImageUrl: string | null;
  setBlurredBackgroundImageUrl: (url: string | null) => void;
  isBackColorPaletteOpen: boolean;
  setIsBackColorPaletteOpen: (isOpen: boolean) => void;
  selectedCanvasColor: string | null;
  setSelectedCanvasColor: (color: string | null) => void;
  isMobile: boolean;
  user: any; // Use 'any' for now, as full User type is in hook
  session: any; // Use 'any' for now, as full Session type is in hook
  demoCustomerName: string;
  demoOrderPrice: string;
  setDemoOrderDetails: (name: string, price: string, address: string) => void;
  demoOrderAddress: string;
  isCheckoutModalOpen: boolean;
  setIsCheckoutModalOpen: (isOpen: boolean) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  customerPhone: string;
  setCustomerPhone: (phone: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  isPlacingOrder: boolean;
  handlePlaceOrder: (isDemo: boolean, customerDetails: { name: string, address: string, phone: string, alternativePhone: string | null }, paymentId?: string) => void;
  isDemoOrderModalOpen: boolean;
  setIsDemoOrderModalOpen: (isOpen: boolean) => void;
  isSavedDesignsModalOpen: boolean;
  setIsSavedDesignsModalOpen: (isOpen: boolean) => void;
  onLoadDesign: (design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => void;
  canvasContentRef: React.RefObject<HTMLDivElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleImageFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleCapacitorImageSelect: () => Promise<void>;
  handleAddTextElement: () => void;
  handleBlurBackground: (sourceImageUrl?: string) => void;
  handleClearBlur: () => void;
  handleSelectCanvasColor: (color: string) => void;
  handleClearBackground: () => void;
  isBuyNowDisabled: boolean;
  predefinedColors: string[];
  fontFamilies: string[];
  selectedTextElement: DesignElement | null;
  selectedImageElement: DesignElement | null;
  textElementRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  handleTextContentInput: (e: React.FormEvent<HTMLDivElement>, id: string) => void;
  deleteElement: (id: string) => void;
  handleRotateElement: (id: string, direction: 'left' | 'right') => void;
  updateElement: (id: string, updates: Partial<DesignElement>) => void; // Add updateElement prop
}

const CustomizerBottomControls: React.FC<CustomizerBottomControlsProps> = ({
  product,
  designElements,
  selectedElementId,
  setSelectedElementId,
  currentFontSize,
  setCurrentFontSize,
  currentTextColor,
  setCurrentTextColor,
  currentFontFamily,
  setCurrentFontFamily,
  currentTextShadowEnabled,
  setCurrentTextShadowEnabled,
  blurredBackgroundImageUrl,
  setBlurredBackgroundImageUrl,
  isBackColorPaletteOpen,
  setIsBackColorPaletteOpen,
  selectedCanvasColor,
  setSelectedCanvasColor,
  isMobile,
  user,
  session,
  demoCustomerName,
  demoOrderPrice,
  setDemoOrderDetails,
  demoOrderAddress,
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
  isSavedDesignsModalOpen,
  setIsSavedDesignsModalOpen,
  onLoadDesign,
  canvasContentRef,
  fileInputRef,
  handleImageFileSelect,
  handleCapacitorImageSelect,
  handleAddTextElement,
  handleBlurBackground,
  handleClearBlur,
  handleSelectCanvasColor,
  handleClearBackground,
  isBuyNowDisabled,
  predefinedColors,
  fontFamilies,
  selectedTextElement,
  selectedImageElement,
  textElementRefs,
  handleTextContentInput,
  deleteElement,
  handleRotateElement,
  handleBuyNowClick,
  updateElement, // Destructure updateElement
}) => {
  console.log("CustomizerBottomControls: handleBuyNowClick prop value:", handleBuyNowClick);

  const showDeleteButton = selectedElementId && designElements.find(el => el.id === selectedElementId)?.type === 'image';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-1 flex flex-wrap justify-center items-center gap-1 border-t border-gray-200 dark:border-gray-700 z-10">
        {selectedElementId && selectedTextElement ? (
          <div className="flex flex-col w-full items-center">
            <div className="flex items-center justify-center w-full overflow-x-auto py-1 px-4 scrollbar-hide">
              {fontFamilies.map((font) => (
                <Button
                  key={font}
                  variant={currentFontFamily === font ? 'default' : 'ghost'}
                  size="sm"
                  className={`flex-shrink-0 mx-1 h-8 text-xs ${currentFontFamily === font ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                  style={{ fontFamily: font }}
                  onClick={() => {
                    setCurrentFontFamily(font);
                    if (selectedElementId) {
                      updateElement(selectedElementId, { fontFamily: font }); // Use updateElement
                    }
                  }}
                >
                  {font}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-1 p-1 w-full overflow-x-auto scrollbar-hide">
                {predefinedColors.map((color) => (
                    <div
                        key={color}
                        className={`w-6 h-6 rounded-full cursor-pointer border-2 flex-shrink-0 ${currentTextColor === color ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => {
                            setCurrentTextColor(color);
                            if (selectedElementId) {
                              updateElement(selectedElementId, { color: color }); // Use updateElement
                            }
                        }}
                        title={color}
                    />
                ))}
                <Button variant="destructive" size="icon" onClick={() => selectedElementId && deleteElement(selectedElementId)}>
                    <XCircle className="h-4 w-4" />
                </Button>
            </div>
          </div>
        ) : isBackColorPaletteOpen ? (
          <div className="flex flex-col w-full items-center">
            <div className="flex items-center justify-center gap-1 px-4 py-1 w-full overflow-x-auto scrollbar-hide">
              {predefinedColors.map((color) => (
                <div
                  key={color}
                  className={`w-8 h-8 rounded-full cursor-pointer border-2 flex-shrink-0 ${selectedCanvasColor === color ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleSelectCanvasColor(color)}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center justify-center w-full py-1 px-4 space-x-1">
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => handleBlurBackground()}>
                <Wand2 className="h-5 w-5" />
                <span className="text-xs">Blur Background</span>
              </Button>
              {blurredBackgroundImageUrl && (
                <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleClearBlur}>
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Delete Blur</span>
                </Button>
              )}
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleClearBackground}>
                <XCircle className="h-5 w-5" />
                  <span className="text-xs">Clear All</span>
              </Button>
              <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => setIsBackColorPaletteOpen(false)}>
                <XCircle className="h-5 w-5" />
                <span className="text-xs">Close</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={isMobile ? handleCapacitorImageSelect : () => fileInputRef.current?.click()}>
              <Image className="h-5 w-5" />
              <span className="text-xs">Your Photo</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={handleAddTextElement}>
              <Text className="h-5 w-5" />
              <span className="text-xs">Add Text</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => { /* Placeholder for Add Sticker */ }}>
              <SquareDashedBottomCode className="h-5 w-5" />
              <span className="text-xs">Add Sticker</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => { setSelectedElementId(null); setIsBackColorPaletteOpen(true); }}>
              <Palette className="h-5 w-5" />
              <span className="text-xs">Back Color</span>
            </Button>
            <Button variant="ghost" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105" onClick={() => { /* Placeholder for Readymade */ }}>
              <LayoutGrid className="h-5 w-5" />
              <span className="text-xs">Readymade</span>
            </Button>
            <Button variant="default" className="flex flex-col h-auto p-1 transition-transform duration-200 hover:scale-105 animate-pulse-highlight" onClick={handleBuyNowClick} disabled={isBuyNowDisabled}>
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs">Buy Now</span>
            </Button>
          </>
        )}
      </div>

      <CustomizerModals
        product={product}
        isCheckoutModalOpen={isCheckoutModalOpen}
        setIsCheckoutModalOpen={setIsCheckoutModalOpen}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        isPlacingOrder={isPlacingOrder}
        handlePlaceOrder={handlePlaceOrder}
        isDemoOrderModalOpen={isDemoOrderModalOpen}
        setIsDemoOrderModalOpen={setIsDemoOrderModalOpen}
        demoCustomerName={demoCustomerName}
        demoOrderPrice={demoOrderPrice}
        demoOrderAddress={demoOrderAddress}
        setDemoOrderDetails={setDemoOrderDetails}
        isSavedDesignsModalOpen={isSavedDesignsModalOpen}
        setIsSavedDesignsModalOpen={setIsSavedDesignsModalOpen}
        currentDesignElements={designElements}
        currentSelectedCanvasColor={selectedCanvasColor}
        currentBlurredBackgroundImageUrl={blurredBackgroundImageUrl}
        onLoadDesign={onLoadDesign}
        canvasContentRef={canvasContentRef}
        user={user}
      />
    </>
  );
};

export default CustomizerBottomControls;