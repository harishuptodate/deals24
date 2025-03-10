
import React from 'react';
import Navbar from '../components/Navbar';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Line, ResponsiveContainer, LineChart, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

// Dummy data for demonstration
const clicksData = [
  { name: 'Monday', clicks: 120 },
  { name: 'Tuesday', clicks: 200 },
  { name: 'Wednesday', clicks: 150 },
  { name: 'Thursday', clicks: 80 },
  { name: 'Friday', clicks: 110 },
  { name: 'Saturday', clicks: 90 },
  { name: 'Sunday', clicks: 130 },
];

const categoryData = [
  { name: 'Electronics', value: 40 },
  { name: 'Laptops', value: 30 },
  { name: 'Phones', value: 20 },
  { name: 'Accessories', value: 15 },
  { name: 'Fashion', value: 10 },
];

const Admin = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gradient">Analytics</h1>
          <p className="text-gray-600 mt-2">Track engagement metrics for your deals.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Link Clicks</CardTitle>
              <CardDescription>Total clicks on deal links over time</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ChartContainer
                className="h-[300px]"
                config={{
                  data: clicksData,
                  categories: {
                    clicks: {
                      label: "Daily Clicks",
                      theme: {
                        light: "#8884d8",
                        dark: "#9b87f5"
                      }
                    }
                  }
                }}
              >
                <ChartTooltip />
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clicksData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#8884d8"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Deal distribution by category</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ChartContainer
                className="h-[300px]"
                config={{
                  data: categoryData,
                  categories: {
                    value: {
                      label: "Distribution",
                      theme: {
                        light: "#7E69AB",
                        dark: "#6E59A5"
                      }
                    }
                  }
                }}
              >
                <ChartTooltip />
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7E69AB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24,781</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Deal Clicks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">12,234</div>
              <p className="text-xs text-muted-foreground">
                +7.4% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Click-Through Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">49.3%</div>
              <p className="text-xs text-muted-foreground">
                +4.1% from last month
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Admin;
