
const ClickStat = require('../models/clickStat.model');

const getStats = async (req, res) => {
  try {
    const { period = 'day' } = req.query;

    // Get the current date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Daily stats - last 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Include today
    const dailyStats = await ClickStat.find({
      date: { $gte: new Date(sevenDaysAgo.toDateString()) }
    }).sort({ date: 1 });

    // Weekly stats - last 7 weeks
    const sevenWeeksAgo = new Date(today);
    sevenWeeksAgo.setDate(today.getDate() - 7 * 7); // 7 weeks ago
    
    const weeklyStats = await ClickStat.aggregate([
      {
        $match: { date: { $gte: sevenWeeksAgo } }
      },
      {
        $addFields: {
          week: { $week: "$date" },
          year: { $year: "$date" }
        }
      },
      {
        $group: {
          _id: { week: "$week", year: "$year" },
          totalClicks: { $sum: "$clicks" },
          firstDate: { $min: "$date" }
        }
      },
      { $sort: { "firstDate": 1 } },
      { $limit: 7 }
    ]);

    // Monthly stats - last 7 months
    const sevenMonthsAgo = new Date(today);
    sevenMonthsAgo.setMonth(today.getMonth() - 6); // 7 months including current
    
    const monthlyStats = await ClickStat.aggregate([
      {
        $match: { date: { $gte: sevenMonthsAgo } }
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalClicks: { $sum: "$clicks" },
          firstDate: { $min: "$date" }
        }
      },
      { $sort: { "firstDate": 1 } }
    ]);

    // Yearly stats - last 3 years
    const threeYearsAgo = new Date(today);
    threeYearsAgo.setFullYear(today.getFullYear() - 2); // 3 years including current
    
    const yearlyStats = await ClickStat.aggregate([
      {
        $match: { date: { $gte: threeYearsAgo } }
      },
      {
        $group: {
          _id: { year: { $year: "$date" } },
          totalClicks: { $sum: "$clicks" },
          firstDate: { $min: "$date" }
        }
      },
      { $sort: { "firstDate": 1 } }
    ]);

    // Format the data for the frontend
    const formattedDailyStats = dailyStats.map(item => ({
      date: item.date.toISOString(),
      clicks: item.clicks,
      name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }));

    const formattedWeeklyStats = weeklyStats.map(item => ({
      date: item.firstDate.toISOString(),
      clicks: item.totalClicks,
      name: `Week ${item._id.week}, ${item._id.year}`,
      week: item._id.week,
      year: item._id.year
    }));

    const formattedMonthlyStats = monthlyStats.map(item => {
      const date = new Date(item.firstDate);
      return {
        date: item.firstDate.toISOString(),
        clicks: item.totalClicks,
        name: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        month: item._id.month,
        year: item._id.year
      };
    });

    const formattedYearlyStats = yearlyStats.map(item => ({
      date: item.firstDate.toISOString(),
      clicks: item.totalClicks,
      name: `${item._id.year}`,
      year: item._id.year
    }));

    // Calculate totals
    const totalClicks = dailyStats.reduce((sum, item) => sum + item.clicks, 0);
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    const currentMonthData = monthlyStats.find(item => 
      item._id.month === currentMonth && item._id.year === currentYear
    );
    
    const currentYearData = yearlyStats.find(item => 
      item._id.year === currentYear
    );

    const totalMonthClicks = currentMonthData ? currentMonthData.totalClicks : 0;
    const totalYearClicks = currentYearData ? currentYearData.totalClicks : 0;

    // Return appropriate data based on the requested period
    let responseData = {
      daily: formattedDailyStats,
      weekly: formattedWeeklyStats,
      monthly: formattedMonthlyStats,
      yearly: formattedYearlyStats,
      totalClicks,
      totalMonthClicks,
      totalYearClicks
    };

    // For backward compatibility with the old API
    responseData.last7Days = formattedDailyStats;

    res.json(responseData);
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({ error: 'Failed to fetch click statistics' });
  }
};

module.exports = { getStats };
