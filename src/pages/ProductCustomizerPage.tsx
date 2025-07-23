import React from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import {
  Loader2,
  PlusCircle,
  XCircle,
  RotateCw,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { DesignElement, useCustomizerState } from '@/hooks/useCustomizerState';
import { proxyImageUrl } from '@/utils/imageProxy';

// Define the type for the context received from Outlet
interface CustomizerContextType extends ReturnType<typeof useCustomizerState> {}

const ProductCustomizerPage = () => {
  const { productId } = useParams<{ productId: string }>();
  // Use useOutletContext to get the state from CustomizerLayout
  const {
    product,
    loading,
    error,
    designElements,
    selectedElementId,
    setSelectedElementId,
    blurredBackgroundImageUrl,
    selectedCanvasColor,
    designAreaRef,
    canvasContentRef,
    mockupOverlayData,
    scaleFactor,
    handleCanvasClick,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleResizeMouseDown,
    handleResizeTouchStart,
    handleTextContentInput,
    deleteElement,
    handleRotateElement,
    fileInputRef,
    handleImageFileSelect,
    handleCapacitorImageSelect,
    isMobile,
  } = useOutletContext<CustomizerContextType>();

  const selectedTextElement = selectedElementId ? designElements.find(el => el.id === selectedElementId && el.type === 'text') : null;
  const textElementRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500">
        <p>Product not found.</p>
      </div>
    );
  }

  return (
    <div
      ref={designAreaRef}
      className="flex-1 flex items-center justify-center relative overflow-hidden px-4"
      style={{
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        touchAction: 'none',
      }}
      onClick={handleCanvasClick}
    >
      <div
        ref={canvasContentRef}
        className="relative shadow-lg overflow-hidden w-full h-full"
        style={{
          aspectRatio: `${product.canvas_width} / ${product.canvas_height}`,
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          touchAction: 'none',
          backgroundColor: selectedCanvasColor || '#FFFFFF',
          backgroundImage: blurredBackgroundImageUrl ? `url(${blurredBackgroundImageUrl})` : 'none',
        }}
        onClick={handleCanvasClick}
      >
        {designElements.map(el => (
          <div
            key={el.id}
            data-element-id={el.id}
            className={`absolute cursor-grab ${selectedElementId === el.id ? 'border-2 border-blue-500' : ''}`}
            style={{
              left: el.x * scaleFactor,
              top: el.y * scaleFactor,
              transform: `rotate(${el.rotation || 0}deg)`,
              transformOrigin: 'center center',
              width: `${el.width * scaleFactor}px`,
              height: el.type === 'text' ? 'auto' : `${el.height * scaleFactor}px`,
              zIndex: 5,
              touchAction: 'none',
            }}
            onMouseDown={(e) => handleMouseDown(e, el.id)}
            onTouchStart={(e) => handleTouchStart(e, el.id)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {el.type === 'text' ? (
              <>
                <div
                  ref={node => {
                    if (node) textElementRefs.current.set(el.id, node);
                    else textElementRefs.current.delete(el.id);
                  }}
                  contentEditable={selectedElementId === el.id}
                  onInput={(e) => handleTextContentInput(e, el.id)}
                  onBlur={() => {}}
                  suppressContentEditableWarning={true}
                  className="outline-none w-full h-full flex items-center justify-center"
                  style={{
                    fontSize: `${(el.fontSize || 35) * scaleFactor}px`,
                    color: el.color,
                    fontFamily: el.fontFamily,
                    textShadow: el.textShadow ? '2px 2px 4px rgba(0,0,0,0.5)' : 'none',
                    wordBreak: 'break-word',
                    minHeight: `${(el.fontSize || 35) * scaleFactor * 1.2}px`,
                  }}
                >
                  {el.value}
                </div>
                {selectedElementId === el.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(el.id);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>

                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                      onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'br')}
                      onTouchStart={(e) => handleResizeTouchStart(e, el.id, 'br')}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-gray-700 text-white hover:bg-gray-800 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateElement(el.id, 'left');
                      }}
                    >
                      <RotateCw className="h-4 w-4 transform rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-gray-700 text-white hover:bg-gray-800 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateElement(el.id, 'right');
                      }}
                    >
                      <RotateCw className="h-4 w-4 transform -rotate-90" />
                    </Button>
                  </>
                )}
              </>
            ) : (
              <>
                <img
                  src={proxyImageUrl(el.value)}
                  alt="design element"
                  className="w-full h-full object-contain"
                  crossOrigin="anonymous"
                />
                {selectedElementId === el.id && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white hover:bg-red-600 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteElement(el.id);
                      }}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize z-20"
                      onMouseDown={(e) => handleResizeMouseDown(e, el.id, 'br')}
                      onTouchStart={(e) => handleResizeTouchStart(e, el.id, 'br')}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -left-2 h-6 w-6 rounded-full bg-gray-700 text-white hover:bg-gray-800 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateElement(el.id, 'left');
                      }}
                    >
                      <RotateCw className="h-4 w-4 transform rotate-90" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -bottom-2 -left-2 h-6 w-6 rounded-full bg-gray-700 text-white hover:bg-gray-800 z-20"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRotateElement(el.id, 'right');
                      }}
                    >
                      <RotateCw className="h-4 w-4 transform -rotate-90" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {mockupOverlayData?.image_url && (
          <img
            key={mockupOverlayData.image_url}
            src={mockupOverlayData.image_url}
            alt="Phone Mockup Overlay"
            className="absolute object-contain pointer-events-none"
            style={{
              left: (mockupOverlayData.mockup_x ?? 0) * scaleFactor,
              top: (mockupOverlayData.mockup_y ?? 0) * scaleFactor,
              width: `${(mockupOverlayData.mockup_width ?? product.canvas_width) * scaleFactor}px`,
              height: `${(mockupOverlayData.mockup_height ?? product.canvas_height) * scaleFactor}px`,
              transform: `rotate(${mockupOverlayData.mockup_rotation || 0}deg)`,
              transformOrigin: 'center center',
              zIndex: 10,
            }}
            crossOrigin="anonymous"
          />
        )}

        {!designElements.length && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <PlusCircle className="h-12 w-12 mb-2" />
            <p className="text-lg font-medium">Add Your Photo</p>
          </div>
        )}
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileSelect}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};

export default ProductCustomizerPage;