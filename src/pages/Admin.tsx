
import React from 'react';
import Navbar from '../components/Navbar';
import { MessageSquare, Twitter, Trash2, Check, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface StatCardProps {
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  positive?: boolean;
  negative?: boolean;
}

const StatCard = ({ title, value, change, icon, positive, negative }: StatCardProps) => (
  <div className="bg-white border border-gray-100 rounded-xl p-6 flex flex-col">
    <div className="flex justify-between items-start mb-6">
      <div>
        <p className="text-apple-gray text-sm mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-apple-darkGray">{value}</h3>
      </div>
      <div className="p-3 bg-gray-100 rounded-full">
        {icon}
      </div>
    </div>
    <p className={`text-sm font-medium ${positive ? 'text-green-500' : negative ? 'text-red-500' : 'text-apple-gray'}`}>
      {change}
    </p>
  </div>
);

const Admin = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gradient">Telegram → Twitter Bot</h1>
            <p className="text-apple-gray mt-1">Monitor your automated deal posting service</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mr-3">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              Online
            </span>
            <span className="text-apple-gray text-sm">Last checked: 8:51:11 PM</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Total Messages" 
            value="1,234" 
            change="+12%" 
            icon={<MessageSquare className="text-apple-gray" size={20} />}
            positive
          />
          <StatCard 
            title="Tweets Posted" 
            value="987" 
            change="+8%" 
            icon={<Twitter className="text-apple-gray" size={20} />}
            positive
          />
          <StatCard 
            title="Failed Posts" 
            value="23" 
            change="-5%" 
            icon={<AlertTriangle className="text-apple-gray" size={20} />}
            positive
          />
          <StatCard 
            title="Success Rate" 
            value="97.8%" 
            change="+2%" 
            icon={<Check className="text-apple-gray" size={20} />}
            positive
          />
        </div>
        
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-apple-darkGray">Recent Messages</h2>
            <div className="flex items-center text-sm text-apple-gray">
              <span>Page 1 of 1</span>
              <div className="flex ml-4">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <ChevronLeft size={16} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="mb-4" />
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-apple-gray text-sm">
                  <th className="pb-4 font-medium">Message</th>
                  <th className="pb-4 font-medium">Time</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-4 pr-4">
                    <div className="flex items-start">
                      <span className="mr-2 mt-1">🔥</span>
                      <p className="text-apple-darkGray line-clamp-2">
                        Amazing Deal! Samsung 65" 4K Smart TV now at lowest price ever! Limited time offer at Amazon. Don't miss out on this incredible discount. #Deals24
                      </p>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-apple-gray whitespace-nowrap">2/27/2025, 8:51:11 PM</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      posted
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MessageSquare size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Twitter size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-4 pr-4">
                    <div className="flex items-start">
                      <span className="mr-2 mt-1">⚡</span>
                      <p className="text-apple-darkGray line-clamp-2">
                        Flash Sale! HP Pavilion Gaming Laptop with RTX 3060, 16GB RAM, 512GB SSD. Incredible performance at an unbeatable price! #Deals24
                      </p>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-apple-gray whitespace-nowrap">2/27/2025, 8:51:11 PM</td>
                  <td className="py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      pending
                    </span>
                  </td>
                  <td className="py-4">
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <MessageSquare size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
