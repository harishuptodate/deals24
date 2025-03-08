
import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { MessageSquare, Twitter, Trash2, Check, AlertTriangle, ChevronLeft, ChevronRight, Calendar, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}

interface ClickData {
  title: string;
  link: string;
  timestamp: string;
}

const StatCard = ({ title, value, change, icon, positive, negative }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-xl p-4 md:p-6 flex flex-col">
    <div className="flex justify-between items-start mb-4 md:mb-6">
      <div>
        <p className="text-apple-gray text-xs md:text-sm mb-1">{title}</p>
        <h3 className="text-xl md:text-3xl font-bold text-apple-darkGray">{value}</h3>
      </div>
      <div className="p-2 md:p-3 bg-gray-100 rounded-full">
        {icon}
      </div>
    </div>
    <p className={`text-xs md:text-sm font-medium ${positive ? 'text-green-500' : negative ? 'text-red-500' : 'text-apple-gray'}`}>
      {change}
    </p>
  </div>
);

const Admin = () => {
  const [clickData, setClickData] = useState<ClickData[]>([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    const storedClickData = JSON.parse(localStorage.getItem('clickData') || '[]');
    setClickData(storedClickData);
  }, []);

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  };

  // Filter clicks by date range
  const getFilteredClicks = () => {
    const now = new Date();
    const filtered = clickData.filter(click => {
      const clickDate = new Date(click.timestamp);
      
      if (dateFilter === 'day') {
        return clickDate.setHours(0, 0, 0, 0) === now.setHours(0, 0, 0, 0);
      } else if (dateFilter === 'week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return clickDate >= oneWeekAgo;
      } else if (dateFilter === 'month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(now.getMonth() - 1);
        return clickDate >= oneMonthAgo;
      }
      return true;
    });
    
    return filtered;
  };

  // Calculate total clicks
  const getTotalClicks = () => {
    return getFilteredClicks().length;
  };

  // Get most popular deals
  const getPopularDeals = () => {
    const filtered = getFilteredClicks();
    
    // Count clicks by deal title
    const clicksByDeal = filtered.reduce((acc: Record<string, number>, click) => {
      acc[click.title] = (acc[click.title] || 0) + 1;
      return acc;
    }, {});
    
    // Convert to array and sort by clicks
    return Object.entries(clicksByDeal)
      .map(([title, count]) => ({ title, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
  };

  // Calculate clicks by day for chart
  const getClicksByDay = () => {
    const now = new Date();
    const daysToShow = dateFilter === 'day' ? 1 : dateFilter === 'week' ? 7 : 30;
    
    // Initialize days array
    const days: Record<string, number> = {};
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      days[dateStr] = 0;
    }
    
    // Count clicks by day
    getFilteredClicks().forEach(click => {
      const clickDate = new Date(click.timestamp);
      const dateStr = clickDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (days[dateStr] !== undefined) {
        days[dateStr] += 1;
      }
    });
    
    return Object.entries(days)
      .map(([date, count]) => ({ date, count }))
      .reverse();
  };

  const clicksByDay = getClicksByDay();
  const maxClickCount = Math.max(...clicksByDay.map(d => d.count), 1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gradient">Telegram → Twitter Bot</h1>
            <p className="text-apple-gray mt-1 text-sm md:text-base">Monitor your automated deal posting service</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs md:text-sm font-medium mr-2 md:mr-3">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-1 md:mr-2"></span>
              Online
            </span>
            <span className="text-apple-gray text-xs md:text-sm">Last checked: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <StatCard 
            title="Total Messages" 
            value="1,234" 
            change="+12%" 
            icon={<MessageSquare className="text-apple-gray" size={16} />}
            positive
          />
          <StatCard 
            title="Tweets Posted" 
            value="987" 
            change="+8%" 
            icon={<Twitter className="text-apple-gray" size={16} />}
            positive
          />
          <StatCard 
            title="Failed Posts" 
            value="23" 
            change="-5%" 
            icon={<AlertTriangle className="text-apple-gray" size={16} />}
            positive
          />
          <StatCard 
            title="Deal Clicks" 
            value={getTotalClicks()} 
            change={`Last ${dateFilter}`} 
            icon={<BarChart2 className="text-apple-gray" size={16} />}
            positive
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="col-span-1 lg:col-span-2">
            <CardHeader className="space-y-1 md:space-y-2">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <CardTitle className="text-lg md:text-xl">Click Analytics</CardTitle>
                <div className="flex space-x-1 md:space-x-2">
                  <Button 
                    variant={dateFilter === 'day' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setDateFilter('day')}
                    className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                  >
                    Day
                  </Button>
                  <Button 
                    variant={dateFilter === 'week' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setDateFilter('week')}
                    className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                  >
                    Week
                  </Button>
                  <Button 
                    variant={dateFilter === 'month' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setDateFilter('month')}
                    className="text-xs md:text-sm h-7 md:h-8 px-2 md:px-3"
                  >
                    Month
                  </Button>
                </div>
              </div>
              <CardDescription className="text-xs md:text-sm">
                Total clicks: {getTotalClicks()} in selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getTotalClicks() === 0 ? (
                <div className="h-40 md:h-60 flex items-center justify-center">
                  <p className="text-apple-gray text-sm">No click data available for the selected period</p>
                </div>
              ) : (
                <ScrollArea className="h-40 md:h-60 w-full">
                  <div className="min-w-full flex items-end justify-between gap-1 px-2 h-full pt-8">
                    {clicksByDay.map((day, i) => (
                      <div key={i} className="flex flex-col items-center flex-1 min-w-8 max-w-12">
                        <div 
                          className="bg-blue-500 rounded-t-sm w-full max-w-8" 
                          style={{ 
                            height: day.count > 0 ? `${Math.max(15, (day.count / maxClickCount) * 120)}px` : '2px'
                          }}
                        />
                        <span className="text-xs mt-2 text-apple-gray whitespace-nowrap overflow-hidden text-ellipsis max-w-12">
                          {day.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg md:text-xl">Top Performing Deals</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Most clicked deals in selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {getPopularDeals().length === 0 ? (
                <div className="py-6 md:py-8 text-center">
                  <p className="text-apple-gray text-sm">No click data available</p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  {getPopularDeals().map((deal, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 md:p-3 rounded-md">
                      <div className="flex items-center">
                        <span className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 bg-apple-darkGray text-white rounded-full text-xs mr-2 md:mr-3">
                          {index + 1}
                        </span>
                        <p className="text-xs md:text-sm font-medium line-clamp-1">{deal.title}</p>
                      </div>
                      <span className="text-xs md:text-sm font-bold">{deal.count} clicks</span>
                    </div>
                  ))}
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4 text-xs md:text-sm"
                onClick={() => setIsStatsOpen(true)}
              >
                View All Analytics
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-4 md:p-6 mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold text-apple-darkGray">Recent Messages</h2>
            <div className="flex items-center text-xs md:text-sm text-apple-gray">
              <span>Page 1 of 1</span>
              <div className="flex ml-2 md:ml-4">
                <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="mb-4" />
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-apple-gray text-xs md:text-sm">
                  <th className="pb-3 md:pb-4 font-medium">Message</th>
                  <th className="pb-3 md:pb-4 font-medium">Time</th>
                  <th className="pb-3 md:pb-4 font-medium">Status</th>
                  <th className="pb-3 md:pb-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-3 md:py-4 pr-4">
                    <div className="flex items-start">
                      <span className="mr-2 mt-1">🔥</span>
                      <p className="text-apple-darkGray line-clamp-2 text-xs md:text-sm">
                        Amazing Deal! Samsung 65" 4K Smart TV now at lowest price ever! Limited time offer at Amazon. Don't miss out on this incredible discount. #Deals24
                      </p>
                    </div>
                  </td>
                  <td className="py-3 md:py-4 text-xs md:text-sm text-apple-gray whitespace-nowrap">2/27/2025, 8:51 PM</td>
                  <td className="py-3 md:py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      posted
                    </span>
                  </td>
                  <td className="py-3 md:py-4">
                    <div className="flex space-x-1 md:space-x-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                        <MessageSquare size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                        <Twitter size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-3 md:py-4 pr-4">
                    <div className="flex items-start">
                      <span className="mr-2 mt-1">⚡</span>
                      <p className="text-apple-darkGray line-clamp-2 text-xs md:text-sm">
                        Flash Sale! HP Pavilion Gaming Laptop with RTX 3060, 16GB RAM, 512GB SSD. Incredible performance at an unbeatable price! #Deals24
                      </p>
                    </div>
                  </td>
                  <td className="py-3 md:py-4 text-xs md:text-sm text-apple-gray whitespace-nowrap">2/27/2025, 8:51 PM</td>
                  <td className="py-3 md:py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      pending
                    </span>
                  </td>
                  <td className="py-3 md:py-4">
                    <div className="flex space-x-1 md:space-x-2">
                      <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                        <MessageSquare size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 md:h-8 md:w-8 rounded-full">
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Analytics Dialog */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Click Analytics</DialogTitle>
            <DialogDescription>
              Detailed analytics for all deal clicks
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-wrap justify-between items-center gap-2">
            <div className="flex space-x-1 md:space-x-2">
              <Button 
                variant={dateFilter === 'day' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDateFilter('day')}
                className="text-xs"
              >
                Today
              </Button>
              <Button 
                variant={dateFilter === 'week' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDateFilter('week')}
                className="text-xs"
              >
                Last 7 days
              </Button>
              <Button 
                variant={dateFilter === 'month' ? 'default' : 'outline'} 
                size="sm"
                onClick={() => setDateFilter('month')}
                className="text-xs"
              >
                Last 30 days
              </Button>
            </div>
            <div className="text-sm font-medium">
              {getTotalClicks()} total clicks
            </div>
          </div>

          {getFilteredClicks().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-apple-gray">No click data available for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-apple-gray text-xs md:text-sm">
                    <th className="pb-4 font-medium">Deal</th>
                    <th className="pb-4 font-medium">Link</th>
                    <th className="pb-4 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="text-xs md:text-sm">
                  {getFilteredClicks().map((click, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="py-3 pr-4">
                        <p className="text-apple-darkGray line-clamp-1">{click.title}</p>
                      </td>
                      <td className="py-3 text-blue-500 whitespace-nowrap truncate max-w-[150px] md:max-w-[200px]">
                        <a href={click.link} target="_blank" rel="noopener noreferrer">
                          {click.link}
                        </a>
                      </td>
                      <td className="py-3 text-apple-gray whitespace-nowrap">
                        {formatDate(click.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
