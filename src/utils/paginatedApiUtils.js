export const getResponseList = (result) => {
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
};

// getPaginator: optional (result) => paginator override for endpoints whose
// Laravel paginator isn't directly under `data` (e.g. `data.jobs`). When
// omitted, behaves exactly as before (paginator = `data`, items = `data.data`).
export const fetchPaginatedApiList = async (url, { headers = {}, perPage = 200, maxPages = 50, getPaginator } = {}) => {
  const allItems = [];
  let page = 1;
  let nextUrl = url;

  while (nextUrl && page <= maxPages) {
    const requestUrl = new URL(nextUrl, window.location.origin);
    requestUrl.searchParams.set('per_page', String(perPage));
    if (!requestUrl.searchParams.has('page')) {
      requestUrl.searchParams.set('page', String(page));
    }

    const response = await fetch(requestUrl.toString(), { headers });
    const result = await response.json();

    if (!(result.success || result.status === 200 || response.ok)) {
      break;
    }

    const paginator = getPaginator
      ? (getPaginator(result) || {})
      : (result.data && !Array.isArray(result.data) ? result.data : {});

    allItems.push(...(getPaginator ? (Array.isArray(paginator.data) ? paginator.data : []) : getResponseList(result)));

    const currentPage = Number(paginator.current_page || page);
    const lastPage = Number(paginator.last_page || currentPage);
    const apiNextUrl = paginator.next_page_url || null;

    if (apiNextUrl) {
      nextUrl = apiNextUrl;
    } else if (currentPage < lastPage) {
      page = currentPage + 1;
      const nextRequestUrl = new URL(requestUrl.toString());
      nextRequestUrl.searchParams.set('page', String(page));
      nextUrl = nextRequestUrl.toString();
    } else {
      nextUrl = null;
    }
  }

  return allItems;
};
