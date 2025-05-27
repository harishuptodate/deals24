
// MongoDB initialization script
db = db.getSiblingDB('deals24');

// Create collections
db.createCollection('telegrammessages');
db.createCollection('clickstats');

// Create indexes for better performance
db.telegrammessages.createIndex({ "date": -1 });
db.telegrammessages.createIndex({ "category": 1 });
db.telegrammessages.createIndex({ "text": "text" });
db.clickstats.createIndex({ "dealId": 1 });
db.clickstats.createIndex({ "timestamp": -1 });

print('Database initialized successfully');
