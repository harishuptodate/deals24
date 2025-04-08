
const ClickStat = require('../models/clickStat.model');

const getStats = async (req, res) => {
  try {
    const { messageId } = req.params;

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Include today

    const stats = await ClickStat.aggregate([
      { $match: { messageId } },
      {
        $facet: {
          last7Days: [
            { $match: { date: { $gte: new Date(sevenDaysAgo.toDateString()) } } },
            {
              $project: {
                date: 1,
                clicks: 1,
              },
            },
            { $sort: { date: 1 } },
          ],
          monthly: [
            {
              $group: {
                _id: {
                  year: { $year: "$date" },
                  month: { $month: "$date" },
                },
                totalClicks: { $sum: "$clicks" },
              },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
          ],
          yearly: [
            {
              $group: {
                _id: { year: { $year: "$date" } },
                totalClicks: { $sum: "$clicks" },
              },
            },
            { $sort: { "_id.year": 1 } },
          ],
        },
      },
    ]);

    res.json(stats[0]);
  } catch (error) {
    console.error('Error fetching click stats:', error);
    res.status(500).json({ error: 'Failed to fetch click statistics' });
  }
};

module.exports = { getStats };
