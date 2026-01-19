import React, { createContext, useContext, useState, useCallback } from 'react';

// Create the Sidebar Context
export const SidebarContext = createContext(null);

/**
 * Sidebar Provider Component
 * Manages sidebar state across the application
 */
export const SidebarProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [openMenu, setOpenMenu] = useState('');

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Open sidebar
  const openSidebar = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close sidebar
  const closeSidebar = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Set sidebar state directly
  const setSidebarOpen = useCallback((open) => {
    setIsOpen(open);
  }, []);

  // Toggle menu item (for nested menus)
  const toggleMenu = useCallback((menuId) => {
    setOpenMenu(prev => prev === menuId ? '' : menuId);
  }, []);

  // Close all menus
  const closeAllMenus = useCallback(() => {
    setOpenMenu('');
  }, []);

  // Context value
  const value = {
    // State
    isOpen,
    openMenu,

    // Actions
    toggleSidebar,
    openSidebar,
    closeSidebar,
    setSidebarOpen,
    toggleMenu,
    closeAllMenus,

    // For backward compatibility with setIsOpen pattern
    setIsOpen
  };

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

/**
 * Custom hook for accessing sidebar context
 * @returns {Object} - Sidebar context value
 */
export const useSidebar = () => {
  const context = useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }

  return context;
};

export default SidebarContext;
