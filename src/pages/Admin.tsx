
import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getClickAnalytics, getTopPerformingDeals, deleteProduct, updateMessageText } from '../services/api';
import { Loader2, ArrowUp, BarChart3, TrendingUp, Calendar, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
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
  totalMonth?: number;
  totalYear?: number;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
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
    if (!data || !Array.isArray(data) || data.length === 0) {
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

  // Open edit dialog
  const handleOpenEditDialog = () => {
    if (selectedDeal) {
      setEditedText(selectedDeal.text);
      setIsEditDialogOpen(true);
    }
  };

  // Save edited deal
  const handleSaveEdit = async () => {
    if (!selectedDeal || !selectedDeal._id) return;
    
    setIsSubmittingEdit(true);
    
    try {
      const success = await updateMessageText(selectedDeal._id, editedText);
      if (success) {
        toast({
          title: "Success",
          description: "Deal was updated successfully",
        });
        // Update the deal in the list
        const updatedDeals = topDeals.map(deal => 
          deal._id === selectedDeal._id ? { ...deal, text: editedText } : deal
        );
        setTopDeals(updatedDeals);
        setSelectedDeal({ ...selectedDeal, text: editedText });
        setIsEditDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to update deal",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while updating the deal",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Delete a deal
  const handleDeleteDeal = async (id: string) => {
    try {
      const success = await deleteProduct(id);
      if (success) {
        toast({
          title: "Success",
          description: "Deal was deleted successfully",
        });
        // Remove the deal from the list
        const updatedDeals = topDeals.filter(deal => deal._id !== id);
        setTopDeals(updatedDeals);
        setIsDialogOpen(false);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete deal",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while deleting the deal",
        variant: "destructive"
      });
    }
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
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.open(part, '_blank');
            }}
            className="text-blue-600 hover:underline break-all inline-flex items-center gap-1"
          >
            {part}
            <ExternalLink size={12} />
          </a>
        );
      }
      return <span key={`text-${index}-${part.substring(0, 10)}`}>{part}</span>;
    });
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
              <CardTitle className="text-xl">This Month</CardTitle>
              <CardDescription>Clicks this month</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{analyticsData?.totalMonth || 0}</span>
                  <div className="flex items-center text-sm text-green-500 mb-1">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>{new Date().toLocaleString('default', { month: 'long' })}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Deal Count</CardTitle>
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
                {makeLinksClickable(selectedDeal.text)}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleOpenEditDialog}
                  variant="outline"
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDeleteDeal(selectedDeal._id)}
                  variant="destructive"
                  className="flex-1"
                >
                  Delete
                </Button>
              </div>
            
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
                <div>Created: {formatDate(selectedDeal.date || selectedDeal.createdAt || '')}</div>
                <div>Clicks: {selectedDeal.clicks || 0}</div>
                {selectedDeal.category && <div>Category: {selectedDeal.category}</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto max-w-[95vw] w-[95vw] sm:w-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>Edit Deal</DialogTitle>
          </DialogHeader>
          
          <div className="mt-4">
            <Textarea 
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Deal description"
              className="min-h-[200px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={isSubmittingEdit || !editedText.trim()}
            >
              {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
