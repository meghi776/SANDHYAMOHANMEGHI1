import React from 'react';
import { Outlet } from 'react-router-dom';
import DesignerPageHeader from './DesignerPageHeader';
import CustomizerBottomControls from './CustomizerBottomControls';
import { useCustomizerState } from '@/hooks/useCustomizerState';

const CustomizerLayout = () => {
  const customizerState = useCustomizerState();
  const { product, loading, error, selectedElementId, designElements, deleteElement } = customizerState;

  return (
    <div className="flex flex-col h-screen">
      <DesignerPageHeader
        title={product?.name || "Customize Cover"}
        selectedElement={selectedElementId ? designElements.find(el => el.id === selectedElementId) : null}
        onDeleteElement={deleteElement}
      />
      <main className="flex-grow pt-14 pb-14 overflow-y-auto"> {/* Added pt-14 for header, pb-14 for bottom controls */}
        <Outlet context={customizerState} /> {/* Pass the entire state object via context */}
      </main>
      <CustomizerBottomControls {...customizerState} /> {/* Pass all state and handlers to bottom controls */}
    </div>
  );
};

export default CustomizerLayout;