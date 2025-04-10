
const ClickStat = require('../models/clickStat.model');
const { startOfWeek, startOfMonth, startOfYear, subWeeks, subMonths, subYears, format } = require('date-fns');

const getStats = async (req, res) => {
  try {
    const { period = 'day' } = req.query;
    const today = new Date();
    
    // Calculate 7-day stats (default)
    if (period === 'day') {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6); // Include today
      
      // Get the last 7 days of data
      const stats = await ClickStat.find({
        date: { $gte: new Date(sevenDaysAgo.toDateString()) }
      }).sort({ date: 1 });

      // Format data for the frontend
      const last7Days = stats.map(item => ({
        name: format(new Date(item.date), 'MMM d'),
        clicks: item.clicks,
        date: item.date.toISOString()
      }));

      return res.json({
        last7Days,
        monthly: await getMonthlyStats(),
        yearly: await getYearlyStats(),
        totalClicks: stats.reduce((sum, item) => sum + item.clicks, 0)
      });
    }
    
    // Calculate weekly stats
    else if (period === 'week') {
      const weeksData = [];
      
      // Get data for the last 7 weeks
      for (let i = 0; i < 7; i++) {
        const weekStart = startOfWeek(subWeeks(today, i), { weekStartsOn: 1 }); // Monday as week start
        const nextWeekStart = startOfWeek(subWeeks(today, i - 1), { weekStartsOn: 1 });
        
        const weekData = await ClickStat.aggregate([
          {
            $match: {
              date: { 
                $gte: weekStart,
                $lt: i === 0 ? new Date(today.getTime() + 86400000) : nextWeekStart
              }
            }
          },
          {
            $group: {
              _id: null,
              totalClicks: { $sum: "$clicks" }
            }
          }
        ]);
        
        const weekNumber = format(weekStart, "'Week' w");
        const dateRange = `${format(weekStart, 'MMM d')} - ${
          i === 0 ? format(today, 'MMM d') : format(new Date(nextWeekStart.getTime() - 86400000), 'MMM d')
        }`;
        
        weeksData.unshift({
          name: weekNumber,
          clicks: weekData.length > 0 ? weekData[0].totalClicks : 0,
          dateRange
        });
      }
      
      return res.json({
        data: weeksData,
        totalClicks: weeksData.reduce((sum, item) => sum + item.clicks, 0)
      });
    }
    
    // Calculate monthly stats
    else if (period === 'month') {
      const monthsData = [];
      
      // Get data for the last 7 months
      for (let i = 0; i < 7; i++) {
        const monthStart = startOfMonth(subMonths(today, i));
        const nextMonthStart = startOfMonth(subMonths(today, i - 1));
        
        const monthData = await ClickStat.aggregate([
          {
            $match: {
              date: { 
                $gte: monthStart,
                $lt: i === 0 ? new Date(today.getTime() + 86400000) : nextMonthStart
              }
            }
          },
          {
            $group: {
              _id: null,
              totalClicks: { $sum: "$clicks" }
            }
          }
        ]);
        
        monthsData.unshift({
          name: format(monthStart, 'MMM yyyy'),
          clicks: monthData.length > 0 ? monthData[0].totalClicks : 0
        });
      }
      
      return res.json({
        data: monthsData,
        totalClicks: monthsData.reduce((sum, item) => sum + item.clicks, 0)
      });
    }
    
    // Calculate yearly stats
    else if (period === 'year') {
      const yearsData = [];
      
      // Get data for the last 3 years
      for (let i = 0; i < 3; i++) {
        const yearStart = startOfYear(subYears(today, i));
        const nextYearStart = startOfYear(subYears(today, i - 1));
        
        const yearData = await ClickStat.aggregate([
          {
            $match: {
              date: { 
                $gte: yearStart,
                $lt: i === 0 ? new Date(today.getTime() + 86400000) : nextYearStart
              }
            }
          },
          {
            $group: {
              _id: null,
              totalClicks: { $sum: "$clicks" }
            }
          }
        ]);
        
        yearsData.unshift({
          name: format(yearStart, 'yyyy'),
          clicks: yearData.length > 0 ? yearData[0].totalClicks : 0
        });
      }
      
      return res.json({
        data: yearsData,
        totalClicks: yearsData.reduce((sum, item) => sum + item.clicks, 0)
      });
    }
    
    // Invalid period parameter
    return res.status(400).json({ error: 'Invalid period parameter' });
    
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({ error: 'Failed to fetch click statistics' });
  }
};

// Helper function to get monthly stats for all data
const getMonthlyStats = async () => {
  try {
    return await ClickStat.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalClicks: { $sum: "$clicks" },
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
  } catch (error) {
    console.error('Error aggregating monthly stats:', error);
    return [];
  }
};

// Helper function to get yearly stats for all data
const getYearlyStats = async () => {
  try {
    return await ClickStat.aggregate([
      {
        $group: {
          _id: { year: { $year: "$date" } },
          totalClicks: { $sum: "$clicks" },
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);
  } catch (error) {
    console.error('Error aggregating yearly stats:', error);
    return [];
  }
};

module.exports = { getStats };
