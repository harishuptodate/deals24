
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getClickAnalytics, getTopPerformingDeals } from '../services/api';
import { TelegramMessage } from '../types/telegram';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ClickData {
  name: string;
  clicks: number;
}

const Admin = () => {
  const [activeTab, setActiveTab] = useState('day');
  const [clicksData, setClicksData] = useState<ClickData[]>([]);
  const [totalClicks, setTotalClicks] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [topDeals, setTopDeals] = useState<TelegramMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDeal, setSelectedDeal] = useState<TelegramMessage | null>(null);
  const [isDealDialogOpen, setIsDealDialogOpen] = useState(false);

  useEffect(() => {
    const fetchClickAnalytics = async () => {
      setIsLoading(true);
      try {
        const data = await getClickAnalytics(activeTab);
        if (data && data.clicksData) {
          setClicksData(data.clicksData);
          setTotalClicks(data.totalClicks || 0);
          setTotalMessages(data.totalMessages || 0);
        }
        
        const topDealsData = await getTopPerformingDeals(5);
        if (Array.isArray(topDealsData) && topDealsData.length > 0) {
          // Sort by clicks in descending order
          const sortedDeals = [...topDealsData].sort((a, b) => 
            (b.clicks || 0) - (a.clicks || 0)
          );
          setTopDeals(sortedDeals.slice(0, 5));
        } else {
          setTopDeals([]);
        }
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        // Set fallback data if API fails
        setClicksData([
          { name: 'Monday', clicks: 0 },
          { name: 'Tuesday', clicks: 0 },
          { name: 'Wednesday', clicks: 0 },
          { name: 'Thursday', clicks: 0 },
          { name: 'Friday', clicks: 0 },
          { name: 'Saturday', clicks: 0 },
          { name: 'Sunday', clicks: 0 },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClickAnalytics();
  }, [activeTab]);

  const handleDealClick = (deal: TelegramMessage) => {
    setSelectedDeal(deal);
    setIsDealDialogOpen(true);
  };

  // Function to make links in text clickable
  const makeLinksClickable = (text: string) => {
    if (!text) return '';
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={`link-${index}-${part.substring(0, 10)}`}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline break-all"
          >
            {part}
          </a>
        );
      }
      return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
    });
  };

  const renderTopDeals = () => {
    if (isLoading) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </div>
      );
    }

    if (!topDeals || topDeals.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No click data available
        </div>
      );
    }

    return (
      <ScrollArea className="h-[250px] pr-2">
        <div className="space-y-3">
          {topDeals.map((deal, index) => (
            <div 
              key={deal.id || `deal-${index}`} 
              className="flex items-center justify-between p-2 border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => handleDealClick(deal)}
            >
              <div className="flex-1">
                <p className="font-medium truncate">
                  {deal.text?.substring(0, 50)}...
                </p>
                <p className="text-sm text-muted-foreground">
                  Clicks: {deal.clicks || 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Monitor your automated deal posting service
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Total Messages</span>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">{totalMessages}</span>
                  <span className="text-sm font-medium text-green-500">All time</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Click Analytics</CardTitle>
              <div className="flex space-x-2 mt-2">
                <Button
                  variant={activeTab === 'day' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('day')}
                  className="text-xs h-8 px-3">
                  Day
                </Button>
                <Button
                  variant={activeTab === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('week')}
                  className="text-xs h-8 px-3">
                  Week
                </Button>
                <Button
                  variant={activeTab === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('month')}
                  className="text-xs h-8 px-3">
                  Month
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={clicksData}
                    margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value} clicks`} />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#8884d8"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="px-6 py-4 text-center text-muted-foreground text-sm">
                {isLoading ? 'Loading data...' : `Total clicks: ${totalClicks} in selected period`}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Deals</CardTitle>
              <CardDescription>
                Most clicked deals in selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderTopDeals()}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Click-Through Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMessages > 0 ? ((totalClicks / totalMessages) * 100).toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on clicks vs. total messages
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Deal Details Dialog */}
      <Dialog open={isDealDialogOpen} onOpenChange={setIsDealDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[90vw] w-[90vw] sm:w-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDeal?.text?.split('\n')[0] || 'Deal Details'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-4 text-sm whitespace-pre-line">
            {selectedDeal && makeLinksClickable(selectedDeal.text)}
          </div>
          
          {selectedDeal?.date && (
            <div className="mt-4 text-xs text-gray-500">
              Posted: {format(new Date(selectedDeal.date), 'PPP p')}
            </div>
          )}
          
          <div className="mt-2 text-xs font-medium text-green-600">
            {selectedDeal?.clicks || 0} clicks
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
