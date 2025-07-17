import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { RotateCw, Trash2, Plus, Minus, Text, Image as ImageIcon, Palette, Layers } from 'lucide-react';
import DesignerPageHeader from '@/components/DesignerPageHeader';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HexColorPicker } from 'react-colorful';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DesignElement {
  id: string;
  type: 'text' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string; // For text
  src?: string; // For image
  color?: string; // For text
  fontSize?: number; // For text
  zIndex: number;
}

const ProductCustomizerPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [canvasColor, setCanvasColor] = useState<string>('#ffffff');
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [designName, setDesignName] = useState('');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isCanvasColorPickerOpen, setIsCanvasColorPickerOpen] = useState(false);
  const [isTextEditorOpen, setIsTextEditorOpen] = useState(false);
  const [currentTextContent, setCurrentTextContent] = useState('');
  const [currentFontSize, setCurrentFontSize] = useState(24);
  const [currentTextColor, setCurrentTextColor] = useState('#000000');

  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentElementRef = useRef<DesignElement | null>(null);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const isRotatingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const startWidthRef = useRef(0);
  const startHeightRef = useRef(0);
  const startRotationRef = useRef(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (selectedElementId) {
      const selectedElement = designElements.find(el => el.id === selectedElementId);
      if (selectedElement?.type === 'text') {
        setCurrentTextContent(selectedElement.content || '');
        setCurrentFontSize(selectedElement.fontSize || 24);
        setCurrentTextColor(selectedElement.color || '#000000');
        setIsTextEditorOpen(true);
      } else {
        setIsTextEditorOpen(false);
      }
    } else {
      setIsTextEditorOpen(false);
    }
  }, [selectedElementId, designElements]);

  const addTextElement = () => {
    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 50,
      y: 50,
      width: 150,
      height: 30,
      rotation: 0,
      content: 'New Text',
      color: '#000000',
      fontSize: 24,
      zIndex: designElements.length,
    };
    setDesignElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  };

  const addImageElement = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newElement: DesignElement = {
          id: `image-${Date.now()}`,
          type: 'image',
          x: 50,
          y: 50,
          width: 100,
          height: 100,
          rotation: 0,
          src: reader.result as string,
          zIndex: designElements.length,
        };
        setDesignElements(prev => [...prev, newElement]);
        setSelectedElementId(newElement.id);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setDesignElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

  const deleteSelectedElement = () => {
    if (selectedElementId) {
      setDesignElements(prev => prev.filter(el => el.id !== selectedElementId));
      setSelectedElementId(null);
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string, type: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation();
    setSelectedElementId(id);
    isDraggingRef.current = type === 'move';
    isResizingRef.current = type === 'resize';
    isRotatingRef.current = type === 'rotate';

    const element = designElements.find(el => el.id === id);
    if (!element || !canvasRef.current) return;

    currentElementRef.current = element;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    startWidthRef.current = element.width;
    startHeightRef.current = element.height;
    startRotationRef.current = element.rotation;

    // Bring selected element to front
    setDesignElements(prev => {
      const newElements = prev.filter(el => el.id !== id);
      return [...newElements, { ...element, zIndex: prev.length }];
    });
  }, [designElements]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!currentElementRef.current || !canvasRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (isDraggingRef.current) {
      updateElement(currentElementRef.current.id, {
        x: currentElementRef.current.x + dx,
        y: currentElementRef.current.y + dy,
      });
    } else if (isResizingRef.current) {
      const newWidth = startWidthRef.current + dx;
      const newHeight = startHeightRef.current + dy;
      updateElement(currentElementRef.current.id, {
        width: Math.max(20, newWidth),
        height: Math.max(20, newHeight),
      });
    } else if (isRotatingRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = rect.left + currentElementRef.current.x + currentElementRef.current.width / 2;
      const centerY = rect.top + currentElementRef.current.y + currentElementRef.current.height / 2;

      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
      updateElement(currentElementRef.current.id, {
        rotation: angle - startRotationRef.current,
      });
    }
  }, [updateElement]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    isResizingRef.current = false;
    isRotatingRef.current = false;
    currentElementRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleSaveDesign = async () => {
    if (!designName.trim()) {
      toast.error('Please enter a design name.');
      return;
    }

    if (!product) {
      toast.error('Product data not loaded.');
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      toast.error('You must be logged in to save designs.');
      return;
    }

    const { data, error } = await supabase
      .from('saved_designs')
      .insert({
        user_id: userData.user.id,
        product_id: product.id,
        name: designName,
        design_elements: designElements,
        selected_canvas_color: canvasColor,
      });

    if (error) {
      toast.error('Failed to save design: ' + error.message);
    } else {
      toast.success('Design saved successfully!');
      setIsSaveDialogOpen(false);
      setDesignName('');
    }
  };

  const handleShareDesign = async () => {
    if (!product) {
      toast.error('Product data not loaded.');
      return;
    }

    // Generate a unique shareable link (e.g., by saving the design temporarily or using a unique ID)
    // For now, we'll just use a placeholder or a direct link to the customizer page
    const currentUrl = window.location.href;
    setShareLink(currentUrl); // In a real app, this would be a link to a view-only version of the design
    setIsShareDialogOpen(true);
  };

  const handleDownloadImage = () => {
    if (!canvasRef.current) {
      toast.error('Canvas not found.');
      return;
    }

    // This is a simplified approach. For a true image download,
    // you'd typically use a library like html2canvas to render the div to an image.
    toast.info('Downloading image functionality is not fully implemented in this demo.');
    // Example of how you might use html2canvas (requires installation):
    // html2canvas(canvasRef.current).then(canvas => {
    //   const image = canvas.toDataURL('image/png');
    //   const link = document.createElement('a');
    //   link.href = image;
    //   link.download = 'my-design.png';
    //   document.body.appendChild(link);
    //   link.click();
    //   document.body.removeChild(link);
    // });
  };

  const handleTextContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentTextContent(e.target.value);
    if (selectedElementId) {
      updateElement(selectedElementId, { content: e.target.value });
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    setCurrentFontSize(value[0]);
    if (selectedElementId) {
      updateElement(selectedElementId, { fontSize: value[0] });
    }
  };

  const handleTextColorChange = (color: string) => {
    setCurrentTextColor(color);
    if (selectedElementId) {
      updateElement(selectedElementId, { color: color });
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading product...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Error: {error.message}</div>;
  }

  if (!product) {
    return <div className="flex justify-center items-center h-screen">Product not found.</div>;
  }

  const selectedElement = selectedElementId ? designElements.find(el => el.id === selectedElementId) : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
      <DesignerPageHeader
        onSave={() => setIsSaveDialogOpen(true)}
        onShare={handleShareDesign}
        onDownload={handleDownloadImage}
      />

      <div className="flex flex-1 overflow-hidden pt-0"> {/* Adjusted pt-4 to pt-0 */}
        {/* Left Sidebar: Tools */}
        <div className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-4 space-y-4">
          <Button variant="ghost" size="icon" onClick={addTextElement} title="Add Text">
            <Text className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Add Image">
            <ImageIcon className="h-6 w-6" />
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={addImageElement}
            />
          </Button>
          <Popover open={isCanvasColorPickerOpen} onOpenChange={setIsCanvasColorPickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Change Canvas Color">
                <Palette className="h-6 w-6" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <HexColorPicker color={canvasColor} onChange={setCanvasColor} />
            </PopoverContent>
          </Popover>
          {selectedElementId && (
            <>
              <Button variant="ghost" size="icon" onClick={deleteSelectedElement} title="Delete Element">
                <Trash2 className="h-6 w-6 text-red-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => updateElement(selectedElementId, { rotation: (selectedElement?.rotation || 0) + 90 })} title="Rotate 90°">
                <RotateCw className="h-6 w-6" />
              </Button>
            </>
          )}
        </div>

        {/* Main Content: Canvas and Product Image */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto relative">
          <div
            ref={canvasRef}
            className="relative border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 shadow-lg overflow-hidden"
            style={{
              width: product.canvas_width || 300,
              height: product.canvas_height || 600,
              backgroundColor: canvasColor,
              backgroundImage: product.image_url ? `url(${product.image_url})` : 'none',
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
            }}
            onClick={() => setSelectedElementId(null)} // Deselect when clicking canvas
          >
            {!designElements.length && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-lg font-medium">Click or drag to add design elements</p>
                <p className="text-sm">e.g., text, images</p>
              </div>
            )}

            {designElements.map(element => (
              <div
                key={element.id}
                className={`absolute group ${selectedElementId === element.id ? 'border-2 border-blue-500' : ''}`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                  transform: `rotate(${element.rotation}deg)`,
                  zIndex: element.zIndex,
                  cursor: selectedElementId === element.id ? 'grab' : 'pointer',
                }}
                onMouseDown={(e) => handleMouseDown(e, element.id, 'move')}
              >
                {element.type === 'text' && (
                  <div
                    className="w-full h-full flex items-center justify-center overflow-hidden"
                    style={{
                      color: element.color,
                      fontSize: element.fontSize,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      textAlign: 'center',
                    }}
                  >
                    {element.content}
                  </div>
                )}
                {element.type === 'image' && (
                  <img src={element.src} alt="Design" className="w-full h-full object-contain" />
                )}

                {selectedElementId === element.id && (
                  <>
                    {/* Resize handle */}
                    <div
                      className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nwse-resize"
                      onMouseDown={(e) => handleMouseDown(e, element.id, 'resize')}
                    />
                    {/* Rotate handle */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full cursor-grab"
                      onMouseDown={(e) => handleMouseDown(e, element.id, 'rotate')}
                    >
                      <RotateCw className="h-3 w-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Element Properties */}
        <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col p-4 space-y-4 overflow-y-auto">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Element Properties</h2>
          {selectedElement ? (
            <ScrollArea className="flex-1 pr-4">
              {selectedElement.type === 'text' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="textContent">Text Content</Label>
                    <Textarea
                      id="textContent"
                      value={currentTextContent}
                      onChange={handleTextContentChange}
                      placeholder="Enter text"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fontSize">Font Size</Label>
                    <Slider
                      id="fontSize"
                      min={10}
                      max={100}
                      step={1}
                      value={[currentFontSize]}
                      onValueChange={handleFontSizeChange}
                      className="mt-2"
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">{currentFontSize}px</span>
                  </div>
                  <div>
                    <Label htmlFor="textColor">Text Color</Label>
                    <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start mt-1"
                          style={{ backgroundColor: currentTextColor }}
                        >
                          <div className="w-4 h-4 rounded-full border mr-2" style={{ backgroundColor: currentTextColor }} />
                          {currentTextColor}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <HexColorPicker color={currentTextColor} onChange={handleTextColorChange} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
              {selectedElement.type === 'image' && (
                <p className="text-gray-500 dark:text-gray-400">Image properties will go here.</p>
              )}
              <div className="mt-4 space-y-2">
                <Label>Position & Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="posX" className="text-xs">X</Label>
                    <Input
                      id="posX"
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) => updateElement(selectedElement.id, { x: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="posY" className="text-xs">Y</Label>
                    <Input
                      id="posY"
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) => updateElement(selectedElement.id, { y: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="width" className="text-xs">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) => updateElement(selectedElement.id, { width: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) => updateElement(selectedElement.id, { height: parseFloat(e.target.value) })}
                      className="mt-1"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <Label htmlFor="rotation" className="text-xs">Rotation</Label>
                  <Input
                    id="rotation"
                    type="number"
                    value={Math.round(selectedElement.rotation)}
                    onChange={(e) => updateElement(selectedElement.id, { rotation: parseFloat(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Select an element to edit its properties.</p>
          )}
        </div>
      </div>

      {/* Save Design Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Design</DialogTitle>
            <DialogDescription>
              Enter a name for your design to save it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="designName" className="text-right">
                Name
              </Label>
              <Input
                id="designName"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDesign}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Design Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Design</DialogTitle>
            <DialogDescription>
              Copy the link below to share your design.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input value={shareLink} readOnly />
          </div>
          <DialogFooter>
            <Button onClick={() => { navigator.clipboard.writeText(shareLink); toast.success('Link copied!'); }}>Copy Link</Button>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductCustomizerPage;