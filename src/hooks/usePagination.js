import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing pagination state
 * Compatible with MUI DataGrid and other pagination components
 * @param {Object} options - Pagination options
 * @param {number} options.initialPage - Initial page (0-indexed)
 * @param {number} options.initialPageSize - Initial page size
 * @param {number} options.totalItems - Total number of items
 * @returns {Object} - Pagination state and handlers
 */
const usePagination = (options = {}) => {
  const {
    initialPage = 0,
    initialPageSize = 10,
    totalItems = 0
  } = options;

  const [paginationModel, setPaginationModel] = useState({
    page: initialPage,
    pageSize: initialPageSize
  });

  const [total, setTotal] = useState(totalItems);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(total / paginationModel.pageSize);
  }, [total, paginationModel.pageSize]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    setPaginationModel(prev => ({
      ...prev,
      page: newPage
    }));
  }, []);

  // Handle page size change
  const handlePageSizeChange = useCallback((newPageSize) => {
    setPaginationModel(prev => ({
      ...prev,
      pageSize: newPageSize,
      page: 0 // Reset to first page when page size changes
    }));
  }, []);

  // Handle MUI DataGrid pagination model change
  const handlePaginationModelChange = useCallback((model) => {
    setPaginationModel(model);
  }, []);

  // Reset pagination
  const resetPagination = useCallback(() => {
    setPaginationModel({
      page: initialPage,
      pageSize: initialPageSize
    });
  }, [initialPage, initialPageSize]);

  // Go to specific page
  const goToPage = useCallback((pageNumber) => {
    const maxPage = Math.max(0, totalPages - 1);
    const targetPage = Math.min(Math.max(0, pageNumber), maxPage);
    setPaginationModel(prev => ({
      ...prev,
      page: targetPage
    }));
  }, [totalPages]);

  // Go to next page
  const nextPage = useCallback(() => {
    if (paginationModel.page < totalPages - 1) {
      handlePageChange(paginationModel.page + 1);
    }
  }, [paginationModel.page, totalPages, handlePageChange]);

  // Go to previous page
  const prevPage = useCallback(() => {
    if (paginationModel.page > 0) {
      handlePageChange(paginationModel.page - 1);
    }
  }, [paginationModel.page, handlePageChange]);

  return {
    // State
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    paginationModel,
    total,
    totalPages,

    // Actions
    setTotal,
    handlePageChange,
    handlePageSizeChange,
    handlePaginationModelChange,
    resetPagination,
    goToPage,
    nextPage,
    prevPage,

    // Computed values
    hasNextPage: paginationModel.page < totalPages - 1,
    hasPrevPage: paginationModel.page > 0,
    startIndex: paginationModel.page * paginationModel.pageSize,
    endIndex: Math.min((paginationModel.page + 1) * paginationModel.pageSize, total)
  };
};

export default usePagination;
