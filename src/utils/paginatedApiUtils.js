export const getResponseList = (result) => {
  if (Array.isArray(result?.data?.data)) return result.data.data;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result)) return result;
  return [];
};

export const fetchPaginatedApiList = async (url, { headers = {}, perPage = 200, maxPages = 50 } = {}) => {
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

    allItems.push(...getResponseList(result));

    const paginator = result.data && !Array.isArray(result.data) ? result.data : {};
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
