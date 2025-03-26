  import React, { useState, useEffect } from 'react';
  import Navbar from '../components/Navbar';
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
  import { getClickAnalytics, getTopPerformingDeals } from '../services/api';
  import { Loader2, ArrowUp, BarChart3, TrendingUp } from 'lucide-react';
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
  import { useToast } from '@/components/ui/use-toast';
  import { format } from 'date-fns';
  import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
  import { useNavigate } from 'react-router-dom';
  import { AdminLoginDialog } from '../components/AdminLoginDialog';
  import { isAuthenticated, logout } from '../services/authService';
  import { Button } from '@/components/ui/button';

  interface ClickData {
    name: string;
    clicks: number;
  }

  interface AnalyticsData {
    clicksData: ClickData[];
    totalClicks: number;
    totalMessages: number;
    period: string;
  }

  const Admin = () => {
    const { toast } = useToast();
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activePeriod, setActivePeriod] = useState<string>('day');
    const [topDeals, setTopDeals] = useState<any[]>([]);
    const [isLoadingTop, setIsLoadingTop] = useState(true);
    const [selectedDeal, setSelectedDeal] = useState<any>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const navigate = useNavigate();
    const [showLoginDialog, setShowLoginDialog] = useState(false);
  
    useEffect(() => {
      if (!isAuthenticated()) {
        setShowLoginDialog(true);
      }
    }, []);

    const handleLoginSuccess = () => {
      setShowLoginDialog(false);
    };

    const handleLogout = () => {
      logout();
      navigate('/');
    };

    if (!isAuthenticated()) {
      return (
        <AdminLoginDialog 
          isOpen={showLoginDialog}
          onClose={() => navigate('/')}
          onSuccess={handleLoginSuccess}
        />
      );
    }

    // Fetch analytics data
    useEffect(() => {
      const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
          const data = await getClickAnalytics(activePeriod);
          setAnalyticsData(data);
        } catch (error) {
          console.error('Failed to fetch analytics:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch analytics data. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      };

      fetchAnalytics();
    }, [activePeriod, toast]);

    // Fetch top performing deals
    useEffect(() => {
      const fetchTopDeals = async () => {
        setIsLoadingTop(true);
        try {
          const deals = await getTopPerformingDeals(5);
          setTopDeals(deals);
        } catch (error) {
          console.error('Failed to fetch top deals:', error);
          toast({
            title: 'Error',
            description: 'Failed to fetch top performing deals. Please try again.',
            variant: 'destructive',
          });
        } finally {
          setIsLoadingTop(false);
        }
      };

      fetchTopDeals();
    }, [toast]);

    // Handle period change
    const handlePeriodChange = (period: string) => {
      setActivePeriod(period);
    };

    // Format the chart data
    const formatChartData = (data: ClickData[] | undefined) => {
      if (!data || data.length === 0) {
        return [{ name: 'No data', clicks: 0 }];
      }
      return data;
    };

    // Calculate growth rate
    const calculateGrowth = () => {
      // Mock calculation: In a real app, this would compare current vs. previous period
      return Math.floor(Math.random() * 30) + 5; // Random value between 5-35%
    };

    // Open dialog with deal details
    const handleOpenDealDetails = (deal: any) => {
      setSelectedDeal(deal);
      setIsDialogOpen(true);
    };

    // Extract the first link from the text
    const extractFirstLink = (text: string): string | null => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = text.match(urlRegex);
      return matches && matches.length > 0 ? matches[0] : null;
    };

    // Format date for display
    const formatDate = (dateString: string) => {
      try {
        return format(new Date(dateString), 'MMM d, yyyy h:mm a');
      } catch (e) {
        return dateString;
      }
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Total Clicks</CardTitle>
                <CardDescription>All time click-through rate</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{analyticsData?.totalClicks || 0}</span>
                    <div className="flex items-center text-sm text-green-500 mb-1">
                      <ArrowUp className="h-4 w-4 mr-1" />
                      <span>{calculateGrowth()}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Total Deals</CardTitle>
                <CardDescription>Number of deals on website</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">{analyticsData?.totalMessages || 0}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xl">Avg. Clicks Per Deal</CardTitle>
                <CardDescription>Engagement rate analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-bold">
                      {analyticsData?.totalMessages && analyticsData.totalMessages > 0
                        ? (analyticsData.totalClicks / analyticsData.totalMessages).toFixed(1)
                        : '0.0'}
                    </span>
                    <div className="flex items-center text-sm text-green-500 mb-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      <span>{Math.floor(Math.random() * 20) + 1}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Click Analytics</CardTitle>
                  <Tabs defaultValue="day" className="w-[260px]">
                    <TabsList>
                      <TabsTrigger
                        value="day"
                        onClick={() => handlePeriodChange('day')}
                      >
                        Day
                      </TabsTrigger>
                      <TabsTrigger
                        value="week"
                        onClick={() => handlePeriodChange('week')}
                      >
                        Week
                      </TabsTrigger>
                      <TabsTrigger
                        value="month"
                        onClick={() => handlePeriodChange('month')}
                      >
                        Month
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={formatChartData(analyticsData?.clicksData)}>
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="clicks" fill="#1D1D1F" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          
            <div>
              <Card className="h-full flex flex-col">
                <CardHeader>
                  <CardTitle>Top Performing Deals</CardTitle>
                  <CardDescription>Most clicked deals in selected period</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-hidden flex flex-col">
                  {isLoadingTop ? (
                    <div className="flex justify-center items-center h-full flex-1">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : topDeals.length === 0 ? (
                    <div className="text-center py-8 flex-1 flex items-center justify-center">
                      <div>
                        <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">No click data available</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1">
                      {topDeals.map((deal, index) => (
                        <div 
                          key={deal._id || deal.id || index}
                          className="p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleOpenDealDetails(deal)}
                        >
                          <h3 className="text-sm font-medium line-clamp-1 mb-1">{deal.text?.split('\n')[0] || 'Deal'}</h3>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>Clicks: {deal.clicks || 0}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </main>

        {/* Deal Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[95vw] w-[95vw] sm:w-auto rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl">{selectedDeal?.text?.split('\n')[0] || 'Deal Details'}</DialogTitle>
            </DialogHeader>
          
            {selectedDeal && (
              <div className="mt-4 space-y-4">
                <div className="text-sm whitespace-pre-line">
                  {selectedDeal.text}
                </div>
              
                {(selectedDeal.link || extractFirstLink(selectedDeal.text || '')) && (
                  <div>
                    <a 
                      href={selectedDeal.link || extractFirstLink(selectedDeal.text || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block w-full text-center px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-apple-darkGray to-black rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-apple-darkGray/20"
                    >
                      Visit Deal
                    </a>
                  </div>
                )}
              
                <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                  <div>Created: {formatDate(selectedDeal.date || selectedDeal.createdAt || '')}</div>
                  <div>Clicks: {selectedDeal.clicks || 0}</div>
                  {selectedDeal.category && <div>Category: {selectedDeal.category}</div>}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  export default Admin;
