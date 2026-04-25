import { useState } from 'react';

export function usePagination({ initialPage = 1, initialLimit = 20 } = {}) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);

  const nextPage = () => setPage(p => p + 1);
  const prevPage = () => setPage(p => Math.max(1, p - 1));
  const goToPage = (p) => setPage(Math.max(1, p));

  const paginationProps = {
    page,
    limit,
    onPageChange: setPage,
    onLimitChange: setLimit
  };

  return {
    page,
    limit,
    setPage,
    setLimit,
    nextPage,
    prevPage,
    goToPage,
    setPage,
    paginationProps
  };
}