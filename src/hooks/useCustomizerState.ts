import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSession } from '@/contexts/SessionContext';
import { proxyImageUrl } from '@/utils/imageProxy';
import { useDemoOrderModal } from '@/contexts/DemoOrderModalContext';
import { uploadFileToSupabase, deleteFileFromSupabase } from '@/utils/supabaseStorage';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import imageCompression from 'browser-image-compression';
import { showError as showToastError } from '@/utils/toast';

// Define types for props to ensure type safety
interface Product {
  id: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  price: number;
  inventory: number | null;
  sku: string | null;
}

interface MockupData {
  image_url: string | null;
  mockup_x: number | null;
  mockup_y: number | null;
  mockup_width: number | null;
  mockup_height: number | null;
  mockup_rotation: number | null;
  design_data: any;
}

export interface DesignElement {
  id: string;
  type: 'text' | 'image';
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  textShadow?: boolean;
  rotation?: number;
}

interface TouchState {
  mode: 'none' | 'dragging' | 'pinching' | 'resizing' | 'rotating';
  startX: number;
  startY: number;
  initialElementX: number;
  initialElementY: number;
  initialDistance?: number;
  initialElementWidth?: number;
  initialElementHeight?: number;
  initialFontSize?: number;
  initialMidX?: number;
  initialMidY?: number;
  initialAngle?: number;
  initialRotation?: number;
  activeElementId: string | null;
}

interface ResizeState {
  mode: 'none' | 'resizing';
  handle: 'br';
  startX: number;
  startY: number;
  initialWidth: number;
  initialHeight: number;
  initialFontSize: number;
  initialElementX: number;
  initialElementY: number;
  initialDiagonalDistance: number;
  activeElementId: string | null;
}

export const useCustomizerState = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [designElements, setDesignElements] = useState<DesignElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const [currentFontSize, setCurrentFontSize] = useState<number[]>([35]);
  const [currentTextColor, setCurrentTextColor] = useState<string>('#000000');
  const [currentFontFamily, setCurrentFontFamily] = useState<string>('Arial');
  const [currentTextShadowEnabled, setCurrentTextShadowEnabled] = useState<boolean>(false);
  const [blurredBackgroundImageUrl, setBlurredBackgroundImageUrl] = useState<string | null>(null);
  const [isBackColorPaletteOpen, setIsBackColorPaletteOpen] = useState(false);
  const [selectedCanvasColor, setSelectedCanvasColor] = useState<string | null>('#FFFFFF');

  const designAreaRef = useRef<HTMLDivElement>(null);
  const canvasContentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const { user, session } = useSession();
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const { isDemoOrderModalOpen, setIsDemoOrderModalOpen, demoCustomerName, demoOrderPrice, setDemoOrderDetails, demoOrderAddress } = useDemoOrderModal();

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Razorpay');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const [mockupOverlayData, setMockupOverlayData] = useState<MockupData | null>(null);

  const [scaleFactor, setScaleFactor] = useState(1);

  const touchState = useRef<TouchState>({
    mode: 'none',
    startX: 0,
    startY: 0,
    initialElementX: 0,
    initialElementY: 0,
    activeElementId: null,
  });

  const resizeState = useRef<ResizeState>({
    mode: 'none',
    handle: 'br',
    startX: 0,
    startY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialFontSize: 0,
    initialElementX: 0,
    initialElementY: 0,
    initialDiagonalDistance: 0,
    activeElementId: null,
  });

  const predefinedColors = useMemo(() => [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#FFA500', '#800080', '#008000', '#800000', '#000080', '#808000', '#800080', '#008080'
  ], []);

  const fontFamilies = useMemo(() => [
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Playfair Display',
    'Merriweather', 'Dancing Script', 'Pacifico', 'Indie Flower', 'Bebas Neue',
    'Lobster', 'Permanent Marker', 'Shadows Into Light', 'Satisfy', 'Great Vibes',
    'Poppins', 'Raleway', 'Ubuntu', 'Lora'
  ], []);

  const selectedTextElement = useMemo(() => selectedElementId ? designElements.find(el => el.id === selectedElementId && el.type === 'text') : null, [selectedElementId, designElements]);
  const selectedImageElement = useMemo(() => selectedElementId ? designElements.find(el => el.id === selectedElementId && el.type === 'image') : null, [selectedElementId, designElements]);
  const textElementRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const lastCaretPosition = useRef<{ node: Node | null; offset: number } | null>(null);

  const [isSavedDesignsModalOpen, setIsSavedDesignsModalOpen] = useState(false);

  // Update canvas dimensions and scale factor
  const updateCanvasDimensions = useCallback(() => {
    if (canvasContentRef.current && product) {
      const renderedWidth = canvasContentRef.current.offsetWidth;
      const renderedHeight = canvasContentRef.current.offsetHeight;

      const scaleX = renderedWidth / product.canvas_width;
      const scaleY = renderedHeight / product.canvas_height;
      const newScaleFactor = Math.min(scaleX, scaleY);

      setScaleFactor(newScaleFactor);
    }
  }, [product]);

  useEffect(() => {
    updateCanvasDimensions();
    const observer = new ResizeObserver(updateCanvasDimensions);
    if (canvasContentRef.current) {
      observer.observe(canvasContentRef.current);
    }
    return () => {
      if (canvasContentRef.current) {
        observer.unobserve(canvasContentRef.current);
      }
    };
  }, [product, updateCanvasDimensions]);

  const loadDesign = useCallback((design: { elements: DesignElement[]; color: string | null; blurredBg: string | null }) => {
    setDesignElements(design.elements);
    setSelectedCanvasColor(design.color);
    setBlurredBackgroundImageUrl(design.blurredBg);
  }, []);

  // Fetch product and mockup data on component mount/productId change
  useEffect(() => {
    const fetchProductAndMockup = async () => {
      setLoading(true);
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          mockups(image_url, mockup_x, mockup_y, mockup_width, mockup_height, mockup_rotation, design_data)
        `)
        .eq('id', productId)
        .single();

      if (productError) {
        console.error("Error fetching product:", productError);
        setError(productError.message);
      } else if (productData) {
        const mockup = productData.mockups.length > 0 ? productData.mockups[0] : null;
        const proxiedMockupUrl = mockup?.image_url ? proxyImageUrl(mockup.image_url) : null;
        
        // Force mockup to always fit the entire canvas
        setMockupOverlayData({
          image_url: proxiedMockupUrl,
          mockup_x: 0, // Always set to 0
          mockup_y: 0, // Always set to 0
          mockup_width: productData.canvas_width, // Always set to canvas width
          mockup_height: productData.canvas_height, // Always set to canvas height
          mockup_rotation: mockup?.mockup_rotation ?? 0,
          design_data: mockup?.design_data || null,
        });

        setProduct({
          id: productData.id,
          name: productData.name,
          canvas_width: productData.canvas_width || 300,
          canvas_height: productData.canvas_height || 600,
          price: productData.price,
          inventory: productData.inventory,
          sku: productData.sku,
        });

        try {
          if (mockup?.design_data) {
            const loadedElements: DesignElement[] = JSON.parse(mockup.design_data as string).map((el: any) => ({
              ...el,
              width: el.width || (el.type === 'text' ? 200 : productData.canvas_width || 300),
              height: el.height || (el.type === 'text' ? 40 : productData.canvas_height || 600),
            }));
            setDesignElements(loadedElements);
          }
        } catch (parseError) {
          console.error("Error parsing database design data:", parseError);
        }
        setDemoOrderDetails('Demo User', productData.price?.toFixed(2) || '0.00', 'Demo Address, Demo City, Demo State, 00000');
      }
      setLoading(false);
    };

    if (productId) {
      fetchProductAndMockup();
    }
  }, [productId, setDemoOrderDetails]);

  // Fetch user role
  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
        } else if (data) {
          setUserRole(data.role);
        }
      } else {
        setUserRole(null);
      }
    };
    fetchUserRole();
  }, [user]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      designElements.forEach(el => {
        if (el.type === 'image' && el.value.startsWith('blob:')) {
          URL.revokeObjectURL(el.value);
        }
      });
    };
  }, [designElements]);

  // Restore caret position for text elements
  useEffect(() => {
    if (selectedElementId && lastCaretPosition.current) {
      const element = designElements.find(el => el.id === selectedElementId);
      if (element && element.type === 'text') {
        const divRef = textElementRefs.current.get(element.id);
        if (divRef) {
          const selection = window.getSelection();
          const range = document.createRange();

          const textNode = divRef.firstChild;

          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            const newOffset = Math.min(lastCaretPosition.current.offset, (textNode as Text).length);
            range.setStart(textNode, newOffset);
            range.collapse(true);

            selection?.removeAllRanges();
            selection?.addRange(range);
            divRef.focus();
          }
        }
      }
    }
  }, [designElements, selectedElementId]);

  const updateElement = useCallback((id: string, updates: Partial<DesignElement>) => {
    setDesignElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

  const deleteElement = useCallback(async (id: string) => {
    setDesignElements(prev => {
      const elementToDelete = prev.find(el => el.id === id);
      if (elementToDelete) {
        if (elementToDelete.type === 'image' && elementToDelete.value.startsWith('blob:')) {
          URL.revokeObjectURL(elementToDelete.value);
        }
        if (elementToDelete.type === 'image' && elementToDelete.value.startsWith('https://')) {
          const url = new URL(elementToDelete.value);
          const pathSegments = url.pathname.split('/');
          const bucketName = pathSegments[2];
          const filePath = pathSegments.slice(3).join('/');
          
          if (bucketName && filePath) {
            deleteFileFromSupabase(filePath, bucketName)
              .then(success => {
                if (!success) {
                  console.warn(`Failed to delete image from Supabase storage: ${filePath}`);
                }
              })
              .catch(err => {
                console.error(`Error deleting image from Supabase storage (${filePath}):`, err);
              });
          }
        }
      }
      return prev.filter(el => el.id !== id);
    });
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
  }, [selectedElementId]);

  const getUnscaledCoords = useCallback((clientX: number, clientY: number) => {
    if (!canvasContentRef.current) return { x: 0, y: 0 };
    const canvasRect = canvasContentRef.current.getBoundingClientRect();
    return {
      x: (clientX - canvasRect.left) / scaleFactor,
      y: (clientY - canvasRect.top) / scaleFactor,
    };
  }, [scaleFactor]);

  const handleMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.clientX, e.clientY);
    const offsetX = unscaledClientX - element.x;
    const offsetY = unscaledClientY - element.y;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.clientX, moveEvent.clientY);
      let newX = currentUnscaledX - offsetX;
      let newY = currentUnscaledY - offsetY;

      updateElement(id, { x: newX, y: newY });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [designElements, getUnscaledCoords, updateElement]);

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    if (!isMobile) return;
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    if (e.touches.length === 1) {
      touchState.current = {
        mode: 'dragging',
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialElementX: element.x,
        initialElementY: element.y,
        activeElementId: id,
      };
    } else if (e.touches.length === 2 && element.type === 'image') {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const { x: unscaledTouch1X, y: unscaledTouch1Y } = getUnscaledCoords(touch1.clientX, touch1.clientY);
      const { x: unscaledTouch2X, y: unscaledTouch2Y } = getUnscaledCoords(touch2.clientX, touch2.clientY);

      const initialDistance = Math.sqrt(
        Math.pow(unscaledTouch2X - unscaledTouch1X, 2) +
        Math.pow(unscaledTouch2Y - unscaledTouch1Y, 2)
      );
      const initialMidX = (unscaledTouch1X + unscaledTouch2X) / 2;
      const initialMidY = (unscaledTouch1Y + unscaledTouch2Y) / 2;

      touchState.current = {
        mode: 'pinching',
        startX: 0,
        startY: 0,
        initialElementX: element.x,
        initialElementY: element.y,
        initialDistance: initialDistance,
        initialElementWidth: element.width,
        initialElementHeight: element.height,
        initialFontSize: element.fontSize,
        initialMidX: initialMidX,
        initialMidY: initialMidY,
        initialAngle: Math.atan2(unscaledTouch2Y - unscaledTouch1Y, unscaledTouch2X - unscaledTouch1X) * 180 / Math.PI,
        initialRotation: element.rotation,
        activeElementId: id,
      };
    } else {
      touchState.current.mode = 'none';
    }
  }, [isMobile, designElements, getUnscaledCoords]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    e.preventDefault();
    const { mode, startX, startY, initialElementX, initialElementY, initialDistance, initialElementWidth, initialElementHeight, activeElementId, initialMidX, initialMidY, initialAngle, initialRotation } = touchState.current;
    if (!activeElementId || !canvasContentRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    if (mode === 'dragging' && e.touches.length === 1) {
      const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(e.touches[0].clientX, e.touches[0].clientY);
      const { x: initialUnscaledX, y: initialUnscaledY } = getUnscaledCoords(startX, startY);

      let newX = initialElementX + (currentUnscaledX - initialUnscaledX);
      let newY = initialElementY + (currentUnscaledY - initialUnscaledY);

      updateElement(activeElementId, {
        x: newX,
        y: newY,
      });
    } else if (mode === 'pinching' && e.touches.length === 2 && element.type === 'image' && initialDistance !== undefined && initialMidX !== undefined && initialMidY !== undefined && initialAngle !== undefined && initialRotation !== undefined) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const { x: unscaledTouch1X, y: unscaledTouch1Y } = getUnscaledCoords(touch1.clientX, touch1.clientY);
      const { x: unscaledTouch2X, y: unscaledTouch2Y } = getUnscaledCoords(touch2.clientX, touch2.clientY);

      const newDistance = Math.sqrt(
        Math.pow(unscaledTouch2X - unscaledTouch1X, 2) +
        Math.pow(unscaledTouch2Y - unscaledTouch1Y, 2)
      );
      const scaleFactorChange = newDistance / initialDistance;

      const currentMidX = (unscaledTouch1X + unscaledTouch2X) / 2;
      const currentMidY = (unscaledTouch1Y + unscaledTouch2Y) / 2;

      let newX = currentMidX - (initialMidX - initialElementX) * scaleFactorChange;
      let newY = currentMidY - (initialMidY - initialElementY) * scaleFactorChange;

      let newWidth = Math.max(20, (initialElementWidth || element.width) * scaleFactorChange);
      let newHeight = Math.max(20, (initialElementHeight || element.height) * scaleFactorChange);

      const newAngle = Math.atan2(unscaledTouch2Y - unscaledTouch1Y, unscaledTouch2X - unscaledTouch1X) * 180 / Math.PI;
      const rotationChange = newAngle - initialAngle;
      const newRotation = (initialRotation + rotationChange) % 360;
      
      updateElement(activeElementId, {
        width: newWidth,
        height: newHeight,
        x: newX,
        y: newY,
        rotation: newRotation,
      });
    }
  }, [designElements, getUnscaledCoords, updateElement]);

  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    touchState.current = {
      mode: 'none',
      startX: 0,
      startY: 0,
      initialElementX: 0,
      initialElementY: 0,
      activeElementId: null,
    };
  }, [isMobile]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent, id: string, handle: 'br') => {
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.clientX, e.clientY);

    const initialDiagonalDistance = Math.sqrt(
      Math.pow(unscaledClientX - element.x, 2) +
      Math.pow(unscaledClientY - element.y, 2)
    );

    resizeState.current = {
      mode: 'resizing',
      handle: handle,
      startX: unscaledClientX,
      startY: unscaledClientY,
      initialWidth: element.width,
      initialHeight: element.height,
      initialFontSize: element.type === 'text' ? (element.fontSize || 35) : 0,
      initialElementX: element.x,
      initialElementY: element.y,
      initialDiagonalDistance: initialDiagonalDistance,
      activeElementId: id,
    };

    document.addEventListener('mousemove', onResizeMouseMove);
    document.addEventListener('mouseup', onResizeMouseUp);
  }, [designElements, getUnscaledCoords, updateElement]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent, id: string, handle: 'br') => {
    if (!isMobile || e.touches.length !== 1) return;
    e.stopPropagation();
    setSelectedElementId(id);
    const element = designElements.find(el => el.id === id);
    if (!element || !canvasContentRef.current) return;

    const { x: unscaledClientX, y: unscaledClientY } = getUnscaledCoords(e.touches[0].clientX, e.touches[0].clientY);

    const initialDiagonalDistance = Math.sqrt(
      Math.pow(unscaledClientX - element.x, 2) +
      Math.pow(unscaledClientY - element.y, 2)
    );

    resizeState.current = {
      mode: 'resizing',
      handle: handle,
      startX: unscaledClientX,
      startY: unscaledClientY,
      initialWidth: element.width,
      initialHeight: element.height,
      initialFontSize: element.type === 'text' ? (element.fontSize || 35) : 0,
      activeElementId: id,
      initialElementX: element.x,
      initialElementY: element.y,
      initialDiagonalDistance: initialDiagonalDistance,
    };

    document.addEventListener('touchmove', onResizeTouchMove, { passive: false });
    document.addEventListener('touchend', onResizeTouchEnd);
  }, [isMobile, designElements, getUnscaledCoords, updateElement]);

  const onResizeMouseMove = useCallback((moveEvent: MouseEvent) => {
    const { mode, handle, initialWidth, initialHeight, initialFontSize, activeElementId, initialElementX, initialElementY, initialDiagonalDistance } = resizeState.current;
    if (mode !== 'resizing' || !activeElementId || !canvasContentRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.clientX, moveEvent.clientY);

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newFontSize = initialFontSize;

    if (handle === 'br') {
      if (element.type === 'text') {
        const currentDiagonalDistance = Math.sqrt(
          Math.pow(currentUnscaledX - initialElementX, 2) +
          Math.pow(currentUnscaledY - initialElementY, 2)
        );

        if (initialDiagonalDistance === 0) return;

        const scale = currentDiagonalDistance / initialDiagonalDistance;

        newWidth = Math.max(20, initialWidth * scale);
        newFontSize = Math.max(10, Math.min(100, initialFontSize * scale));

        updateElement(activeElementId, {
          width: newWidth,
          fontSize: newFontSize,
        });
      } else {
        const currentDiagonalDistance = Math.sqrt(
          Math.pow(currentUnscaledX - initialElementX, 2) +
          Math.pow(currentUnscaledY - initialElementY, 2)
        );

        if (initialDiagonalDistance === 0) return;

        const scale = currentDiagonalDistance / initialDiagonalDistance;

        newWidth = Math.max(20, initialWidth * scale);
        newHeight = Math.max(20, initialHeight * scale);

        updateElement(activeElementId, {
          width: newWidth,
          height: newHeight,
        });
      }
    }
  }, [designElements, getUnscaledCoords, updateElement]);

  const onResizeTouchMove = useCallback((moveEvent: TouchEvent) => {
    if (moveEvent.touches.length !== 1) return;
    moveEvent.preventDefault();
    const { mode, handle, initialWidth, initialHeight, initialFontSize, activeElementId, initialElementX, initialElementY, initialDiagonalDistance } = resizeState.current;
    if (mode !== 'resizing' || !activeElementId || !canvasContentRef.current) return;

    const element = designElements.find(el => el.id === activeElementId);
    if (!element) return;

    const { x: currentUnscaledX, y: currentUnscaledY } = getUnscaledCoords(moveEvent.touches[0].clientX, moveEvent.touches[0].clientY);

    let newWidth = initialWidth;
    let newHeight = initialHeight;
    let newFontSize = initialFontSize;

    if (handle === 'br') {
      if (element.type === 'text') {
        const currentDiagonalDistance = Math.sqrt(
          Math.pow(currentUnscaledX - initialElementX, 2) +
          Math.pow(currentUnscaledY - initialElementY, 2)
        );

        if (initialDiagonalDistance === 0) return;

        const scale = currentDiagonalDistance / initialDiagonalDistance;

        newWidth = Math.max(20, initialWidth * scale);
        newFontSize = Math.max(10, Math.min(100, initialFontSize * scale));
        
        updateElement(activeElementId, {
          width: newWidth,
          fontSize: newFontSize,
        });
      } else {
        const currentDiagonalDistance = Math.sqrt(
          Math.pow(currentUnscaledX - initialElementX, 2) +
          Math.pow(currentUnscaledY - initialElementY, 2)
        );

        if (initialDiagonalDistance === 0) return;

        const scale = currentDiagonalDistance / initialDiagonalDistance;

        newWidth = Math.max(20, initialWidth * scale);
        newHeight = Math.max(20, initialHeight * scale);

        updateElement(activeElementId, {
          width: newWidth,
          height: newHeight,
        });
      }
    }
  }, [designElements, getUnscaledCoords, updateElement]);

  const onResizeMouseUp = useCallback(() => {
    document.removeEventListener('mousemove', onResizeMouseMove);
    document.removeEventListener('mouseup', onResizeMouseUp);
    resizeState.current.mode = 'none';
    resizeState.current.activeElementId = null;
  }, [onResizeMouseMove]);

  const onResizeTouchEnd = useCallback(() => {
    document.removeEventListener('touchmove', onResizeTouchMove);
    document.removeEventListener('touchend', onResizeTouchEnd);
    resizeState.current.mode = 'none';
    resizeState.current.activeElementId = null;
  }, [onResizeTouchMove]);

  const handleRotateElement = useCallback((id: string, direction: 'left' | 'right') => {
    setDesignElements(prev =>
      prev.map(el => {
        if (el.id === id) {
          const currentRotation = el.rotation || 0;
          const newRotation = (direction === 'right' ? currentRotation + 5 : currentRotation - 5) % 360;
          return { ...el, rotation: newRotation };
        }
        return el;
      })
    );
  }, []);

  const captureDesignForOrder = useCallback(async () => {
    if (!canvasContentRef.current || !product) {
      console.error("captureDesignForOrder: Pre-check failed - Missing canvasContentRef or product.");
      return null;
    }

    let originalMockupDisplay = '';
    const mockupImageElement = canvasContentRef.current.querySelector('img[alt="Phone Mockup Overlay"]');
    const selectedElementDiv = document.querySelector(`[data-element-id="${selectedElementId}"]`);

    const textElementsToRestore: { element: HTMLElement; originalOverflow: string }[] = [];
    designElements.forEach(el => {
      if (el.type === 'text') {
        const textDiv = textElementRefs.current.get(el.id);
        if (textDiv) {
          textElementsToRestore.push({ element: textDiv, originalOverflow: textDiv.style.overflow });
          textDiv.style.overflow = 'visible'; // Ensure text is not clipped
        }
      }
    });

    // Temporarily hide selected element border and mockup overlay
    if (selectedElementDiv) {
      selectedElementDiv.classList.remove('border-2', 'border-blue-500');
    }
    if (mockupImageElement instanceof HTMLElement) {
      originalMockupDisplay = mockupImageElement.style.display;
      mockupImageElement.style.display = 'none';
    }

    try {
      // Pre-load all images to ensure they are in cache for html2canvas
      const allImagesToLoad = designElements.filter(el => el.type === 'image').map(el => el.value);
      if (mockupOverlayData?.image_url) {
        allImagesToLoad.push(mockupOverlayData.image_url);
      }

      console.log(`captureDesignForOrder: Attempting to pre-load ${allImagesToLoad.length} images.`);
      await Promise.all(allImagesToLoad.map(url => {
        return new Promise<void>((resolve) => {
          const img = new window.Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => {
            console.log(`Image loaded: ${url.substring(0, 50)}...`);
            resolve();
          };
          img.onerror = (e) => {
            console.warn(`Failed to pre-load image (might be CORS): ${url.substring(0, 50)}...`, e);
            resolve(); // Resolve to not block, but log the warning
          };
          img.src = proxyImageUrl(url);
        });
      }));
      console.log("captureDesignForOrder: All images pre-load attempts completed.");

      console.log("captureDesignForOrder: Initiating html2canvas capture for element:", canvasContentRef.current);
      const canvas = await html2canvas(canvasContentRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null, // Let CSS background handle it
        scale: 3, 
        width: product.canvas_width, 
        height: product.canvas_height,
        x: 0,
        y: 0,
        foreignObjectRendering: true, // Added this option
      });
      console.log("captureDesignForOrder: html2canvas capture finished.");

      const dataUrl = canvas.toDataURL('image/png');
      console.log("captureDesignForOrder: Generated Data URL length:", dataUrl.length);
      if (!dataUrl || dataUrl.length < 100) { // A very small data URL usually means a blank image (e.g., "data:,")
        console.error("captureDesignForOrder: canvas.toDataURL returned empty or very small data URL, indicating a blank capture.");
        return null;
      }
      console.log("captureDesignForOrder: Data URL successfully generated.");
      return dataUrl;

    } catch (err: any) {
      console.error("captureDesignForOrder: Detailed Error during capture process:", err);
      return null;
    } finally {
      // Restore elements
      if (mockupImageElement instanceof HTMLElement) {
        mockupImageElement.style.display = originalMockupDisplay;
      }
      if (selectedElementDiv) {
        selectedElementDiv.classList.add('border-2', 'border-blue-500');
      }
      textElementsToRestore.forEach(({ element, originalOverflow }) => {
        element.style.overflow = originalOverflow;
      });
      console.log("captureDesignForOrder: Cleanup complete.");
    }
  }, [product, selectedElementId, designElements, mockupOverlayData]);

  const handlePlaceOrder = useCallback(async (
    isDemo: boolean,
    customerDetails: { name: string, address: string, phone: string, alternativePhone: string | null },
    paymentId: string | undefined = undefined
  ) => {
    if (!product) {
      showToastError("Product data is missing. Cannot place order.");
      return;
    }

    const hasImageElement = designElements.some(el => el.type === 'image');
    if (!hasImageElement) {
      showToastError("Please add an image to your design before placing an order.");
      return;
    }

    const imagesStillUploading = designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
    if (imagesStillUploading) {
      showToastError("Please wait for all images to finish uploading before placing your order.");
      return;
    }

    const finalCustomerName = isDemo ? demoCustomerName : customerDetails.name;
    const finalCustomerAddress = isDemo ? demoOrderAddress : customerDetails.address;
    const finalCustomerPhone = isDemo ? '0000000000' : customerDetails.phone;
    const finalAlternativePhone = isDemo ? null : customerDetails.alternativePhone;
    const finalPaymentMethod = isDemo ? 'Demo' : paymentMethod;
    const finalStatus = isDemo ? 'Demo' : (paymentMethod === 'Prepaid' ? 'Processing' : 'Pending');
    const finalTotalPrice = isDemo ? parseFloat(demoOrderPrice) : product.price;
    const finalOrderType = isDemo ? 'demo' : 'normal';

    if (!finalCustomerName.trim() || !finalCustomerAddress.trim() || !finalCustomerPhone.trim()) {
      showToastError("Customer name, address, and phone are required.");
      return;
    }
    if (isNaN(finalTotalPrice) || finalTotalPrice <= 0) {
      showToastError("Invalid product price. Please ensure the product has a valid price.");
      return;
    }

    setIsPlacingOrder(true);
    let orderedDesignImageUrl: string | null = null;
    
    try {
      orderedDesignImageUrl = await captureDesignForOrder(); 
      if (!orderedDesignImageUrl) {
        throw new Error("Failed to capture design for order. Please try again.");
      }

      const blob = await (await fetch(orderedDesignImageUrl)).blob();

      const fileExt = 'png';
      const fileName = `${product.id}-${Date.now()}.${fileExt}`;
      const filePath = `orders/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-mockups')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload order image: ${uploadData.path || uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from('order-mockups')
        .getPublicUrl(filePath);

      orderedDesignImageUrl = publicUrlData.publicUrl;

      const orderPayload = {
        product_id: product.id,
        customer_name: finalCustomerName,
        customer_address: finalCustomerAddress,
        customer_phone: finalCustomerPhone,
        alternative_phone: finalAlternativePhone,
        payment_method: finalPaymentMethod,
        status: finalStatus,
        total_price: finalTotalPrice,
        ordered_design_image_url: orderedDesignImageUrl,
        ordered_design_data: designElements,
        type: finalOrderType,
        payment_id: paymentId || null,
      };

      let invokeResult;
      if (user) {
          invokeResult = await supabase.functions.invoke('place-order-and-decrement-inventory', {
              body: { ...orderPayload, user_id: user.id },
              headers: {
                  'Authorization': `Bearer ${session?.access_token}`,
              },
          });
      } else {
          invokeResult = await supabase.functions.invoke('guest-register-and-order', {
              body: orderPayload,
          });
      }

      const { data: invokeData, error: invokeError } = invokeResult;

      if (invokeError) {
        let errorMessage = invokeError.message;
        if (invokeError.context?.data) {
          try {
            const parsedErrorBody = typeof invokeError.context.data === 'string'
              ? JSON.parse(invokeError.context.data)
              : invokeError.context.data;

            if (parsedErrorBody && typeof parsedErrorBody === 'object' && 'error' in parsedErrorBody) {
              errorMessage = parsedErrorBody.error;
            } else {
              errorMessage = `Edge Function responded with status ${invokeError.context?.status || 'unknown'}. Raw response: ${JSON.stringify(parsedErrorBody)}`;
            }
          } catch (parseErr) {
            errorMessage = `Edge Function responded with status ${invokeError.context?.status || 'unknown'}. Raw response: ${invokeError.context.data}`;
          }
        } else if (invokeError.context?.status) {
          errorMessage = `Edge Function returned status code: ${invokeError.context.status}`;
        }
        throw new Error(errorMessage);
      } else if (invokeData && (invokeData as any).error) {
        throw new Error((invokeData as any).error);
      }

      if (finalOrderType === 'normal') {
        setProduct(prev => prev ? { ...prev, inventory: (prev.inventory || 0) - 1 } : null);
      }

      setIsCheckoutModalOpen(false);
      setIsDemoOrderModalOpen(false);

      navigate('/order-success');

    } catch (err: any) {
      let displayErrorMessage = err.message || "An unexpected error occurred while placing your order.";
      if (err.message && err.message.includes("Not enough stock available")) {
        displayErrorMessage = "Failed to place order: Not enough stock available.";
      }
      showToastError(displayErrorMessage);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [product, user, session, customerName, customerPhone, paymentMethod, demoCustomerName, demoOrderPrice, demoOrderAddress, designElements, navigate, setIsDemoOrderModalOpen, captureDesignForOrder]);

  const handleBlurBackground = useCallback((sourceImageUrl?: string) => {
    const imageToBlur = sourceImageUrl 
      ? { value: sourceImageUrl } 
      : designElements.find(el => el.type === 'image');

    if (!imageToBlur) {
      return;
    }
    if (!product) {
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.src = proxyImageUrl(imageToBlur.value);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      canvas.width = product.canvas_width;
      canvas.height = product.canvas_height;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      ctx.filter = 'blur(10px)';
      ctx.drawImage(canvas, 0, 0);

      const blurredDataUrl = canvas.toDataURL('image/png');
      setBlurredBackgroundImageUrl(blurredDataUrl);
      setSelectedCanvasColor(null);
    };

    img.onerror = (e) => {
      console.error("Error loading image for blur:", e);
    };
  }, [designElements, product]);

  const processAndUploadImage = useCallback(async (file: File | Blob) => {
    if (!product) {
      return;
    }
  
    const newElementId = `image-${Date.now()}`;
    const tempUrl = URL.createObjectURL(file);
  
    const img = new window.Image();
    img.src = tempUrl;
  
    img.onload = async () => {
      const originalWidth = img.naturalWidth;
      const originalHeight = img.naturalHeight;
      const canvasWidth = product.canvas_width;
      const canvasHeight = product.canvas_height;
  
      const imageAspectRatio = originalWidth / originalHeight;
      const canvasAspectRatio = canvasWidth / canvasHeight;
  
      let newWidth, newHeight;
      let shouldApplyBlur = false;
  
      if (imageAspectRatio > canvasAspectRatio) {
        newWidth = canvasWidth;
        newHeight = newWidth / imageAspectRatio;
        if (newHeight < canvasHeight) {
          shouldApplyBlur = true;
        }
      } else {
        newHeight = canvasHeight;
        newWidth = newHeight * imageAspectRatio;
        if (newWidth < canvasWidth) {
          shouldApplyBlur = true;
        }
      }
  
      const newX = (canvasWidth - newWidth) / 2;
      const newY = (canvasHeight - newHeight) / 2;
  
      const newElement: DesignElement = {
        id: newElementId,
        type: 'image',
        value: tempUrl,
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight,
        rotation: 0,
      };
  
      setDesignElements(prev => [
        ...prev.filter(el => el.type !== 'image'),
        newElement
      ]);
      setSelectedElementId(newElement.id);

      const compressionOptions = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
      };

      let compressedFile = file;
      try {
        if (file.size > compressionOptions.maxSizeMB * 1024 * 1024 || originalWidth > compressionOptions.maxWidthOrHeight || originalHeight > compressionOptions.maxWidthOrHeight) {
          compressedFile = await imageCompression(file, compressionOptions);
        }
      } catch (compressionError) {
        console.error("Image compression failed:", compressionError);
      }
  
      uploadFileToSupabase(compressedFile, 'order-mockups', 'user-uploads')
        .then(uploadedUrl => {
          if (uploadedUrl) {
            setDesignElements(prev =>
              prev.map(el =>
                el.id === newElementId ? { ...el, value: uploadedUrl } : el
              )
            );
            URL.revokeObjectURL(tempUrl);

            if (shouldApplyBlur) {
              handleBlurBackground(uploadedUrl);
            } else {
              setBlurredBackgroundImageUrl(null);
              setSelectedCanvasColor(null);
            }

          } else {
            setDesignElements(prev => prev.filter(el => el.id !== newElementId));
            URL.revokeObjectURL(tempUrl);
          }
        })
        .catch(err => {
          console.error("Error during background image upload:", err);
          setDesignElements(prev => prev.filter(el => el.id !== newElementId));
          URL.revokeObjectURL(tempUrl);
        })
        .finally(() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        });
    };
  
    img.onerror = () => {
      URL.revokeObjectURL(tempUrl);
    };
  }, [product, handleBlurBackground]);

  const handleImageFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndUploadImage(file);
    }
  }, [processAndUploadImage]);

  const handleCapacitorImageSelect = useCallback(async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });
  
      if (image.webPath) {
        const response = await fetch(image.webPath);
        const blob = await response.blob();
        await processAndUploadImage(blob);
      }
    } catch (error: any) {
      if (error.message !== "User cancelled photos app") {
        console.error('Error selecting image with Capacitor Camera:', error);
      }
    }
  }, [processAndUploadImage]);

  const handleBuyNowClick = useCallback(() => {
    if (!product) {
      showToastError("Product data is missing.");
      return;
    }
    if (product.inventory !== null && product.inventory <= 0) {
      showToastError("This product is out of stock.");
      return;
    }
    const hasImageElement = designElements.some(el => el.type === 'image');
    if (!hasImageElement) {
      showToastError("Please add an image to your design before placing an order.");
      return;
    }
    const imagesStillUploading = designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
    if (imagesStillUploading) {
      showToastError("Please wait for all images to finish uploading before placing your order.");
      return;
    }
    setIsCheckoutModalOpen(true);
  }, [product, designElements]);

  const handleAddTextElement = useCallback(() => {
    if (!product) return;

    const defaultText = "New Text";
    const defaultFontSize = 35;
    const defaultColor = '#000000';
    const defaultFontFamily = 'Arial';
    const defaultTextShadow = false;

    const centerX = (product.canvas_width / 2);
    const centerY = (product.canvas_height / 2);

    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      value: defaultText,
      x: centerX - 100,
      y: centerY - 20,
      width: 200,
      height: 40,
      fontSize: defaultFontSize,
      color: defaultColor,
      fontFamily: defaultFontFamily,
      textShadow: defaultTextShadow,
      rotation: 0,
    };
    setDesignElements(prev => [...prev, newElement]);
    setSelectedElementId(newElement.id);
  }, [product]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasContentRef.current || e.target === designAreaRef.current) {
      setSelectedElementId(null);
      setIsBackColorPaletteOpen(false);
    }
  }, []);

  const handleTextContentInput = useCallback((e: React.FormEvent<HTMLDivElement>, id: string) => {
    const target = e.currentTarget;
    const selection = window.getSelection();

    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (target.contains(range.commonAncestorContainer)) {
        lastCaretPosition.current = {
          node: range.commonAncestorContainer,
          offset: range.startOffset,
        };
      }
    }

    const newText = target.innerText;
    updateElement(id, { value: newText });
  }, [updateElement]);

  const handleClearBlur = useCallback(() => {
    setBlurredBackgroundImageUrl(null);
  }, []);

  const handleSelectCanvasColor = useCallback((color: string) => {
    setSelectedCanvasColor(color);
    setBlurredBackgroundImageUrl(null);
  }, []);

  const handleClearBackground = useCallback(() => {
    setSelectedCanvasColor(null);
    setBlurredBackgroundImageUrl(null);
  }, []);

  const isBuyNowDisabled = useMemo(() => {
    return loading || isPlacingOrder || (product && product.inventory !== null && product.inventory <= 0) || designElements.filter(el => el.type !== 'text').length === 0 || designElements.some(el => el.type === 'image' && el.value.startsWith('blob:'));
  }, [loading, isPlacingOrder, product, designElements]);

  const currentSelectedElement = useMemo(() => designElements.find(el => el.id === selectedElementId) || null, [designElements, selectedElementId]);

  return {
    product,
    loading,
    error,
    designElements,
    setDesignElements,
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
    designAreaRef,
    canvasContentRef,
    fileInputRef,
    isMobile,
    user,
    session,
    userRole,
    isDemoOrderModalOpen,
    setIsDemoOrderModalOpen,
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
    setIsPlacingOrder,
    mockupOverlayData,
    scaleFactor,
    touchState,
    resizeState,
    predefinedColors,
    fontFamilies,
    selectedTextElement,
    selectedImageElement,
    textElementRefs,
    lastCaretPosition,
    isSavedDesignsModalOpen,
    setIsSavedDesignsModalOpen,
    updateElement,
    deleteElement,
    getUnscaledCoords,
    handleMouseDown,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleResizeMouseDown,
    handleResizeTouchStart,
    onResizeMouseMove,
    onResizeTouchMove,
    onResizeMouseUp,
    onResizeTouchEnd,
    handleRotateElement,
    captureDesignForOrder,
    handlePlaceOrder,
    handleBlurBackground,
    processAndUploadImage,
    handleImageFileSelect,
    handleCapacitorImageSelect,
    handleBuyNowClick,
    handleAddTextElement,
    handleCanvasClick,
    handleTextContentInput,
    handleClearBlur,
    handleSelectCanvasColor,
    handleClearBackground,
    isBuyNowDisabled,
    loadDesign,
  };
};