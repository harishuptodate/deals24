
const ClickStat = require('../models/clickStat.model');

const getStats = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Include today

    // Get the last 7 days of data
    const stats = await ClickStat.find({
      date: { $gte: new Date(sevenDaysAgo.toDateString()) }
    }).sort({ date: 1 });

    // Get monthly data
    const monthlyStats = await ClickStat.aggregate([
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

    // Get yearly data
    const yearlyStats = await ClickStat.aggregate([
      {
        $group: {
          _id: { year: { $year: "$date" } },
          totalClicks: { $sum: "$clicks" },
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    // Format the data for the frontend
    const last7Days = stats.map(item => ({
      date: item.date.toISOString(),
      clicks: item.clicks
    }));

    res.json({
      last7Days,
      monthly: monthlyStats,
      yearly: yearlyStats,
      totalClicks: stats.reduce((sum, item) => sum + item.clicks, 0)
    });
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({ error: 'Failed to fetch click statistics' });
  }
};

module.exports = { getStats };
