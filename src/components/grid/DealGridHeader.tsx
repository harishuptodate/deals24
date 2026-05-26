
import DateRangeFilter from '@/components/filters/DateRangeFilter';
import PriceFilter from '@/components/filters/PriceFilter';

const DealGridHeader = () => {
  return (
    <div className="flex sm:flex-row sm:items-center justify-between mb-4 gap-2">
      <h2 className="text-xl md:text-2xl font-semibold text-gradient dark:text-gradient">
        Latest Deals
      </h2>
      
      <div className="flex items-center justify-end gap-2">
        <PriceFilter />
        <DateRangeFilter />

      </div>
    </div>
  );
};

export default DealGridHeader;
