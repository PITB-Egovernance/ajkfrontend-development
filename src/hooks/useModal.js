import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal state
 * @param {boolean} initialState - Initial open state
 * @returns {Object} - Modal state and handlers
 */
const useModal = (initialState = false) => {
  const [isOpen, setIsOpen] = useState(initialState);
  const [modalData, setModalData] = useState(null);

  const openModal = useCallback((data = null) => {
    setModalData(data);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setModalData(null);
  }, []);

  const toggleModal = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    modalData,
    openModal,
    closeModal,
    toggleModal,
    setModalData
  };
};

export default useModal;
