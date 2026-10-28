import { useQuery } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getSearchPreview } from '@/services/api/searchApi';

export default function SearchRecovery({ query }: { query: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const broaderQuery = query.trim().split(/\s+/u)[0];
  const related = useQuery({
    queryKey: ['search-recovery', broaderQuery],
    queryFn: ({ signal }) => getSearchPreview(broaderQuery, '', signal),
    enabled: broaderQuery.length >= 2, staleTime: 30_000, retry: false,
  });
  const hasFilters = ['category', 'minPrice', 'maxPrice', 'from', 'to'].some(
    (key) => new URLSearchParams(location.search).has(key),
  );
  const choose = (search: string, category?: string) => {
    const next = new URLSearchParams({ search });
    if (category) next.set('category', category);
    navigate(`/deals?${next.toString()}`);
  };
  const products = related.data?.products.slice(0, 3) || [];
  return (
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      {hasFilters && <Button variant="outline" onClick={() => choose(query)}>Search “{query}” without filters</Button>}
      {broaderQuery !== query && <Button variant="outline" onClick={() => choose(broaderQuery)}>Try “{broaderQuery}”</Button>}
      {products.map((product) => <Button key={product.query} variant="outline" onClick={() => choose(product.query)}>{product.label}</Button>)}
      {related.data?.categories.map((category) => <Button key={category.category} variant="outline" onClick={() => choose('', category.category)}>Browse {category.label}</Button>)}
    </div>
  );
}
