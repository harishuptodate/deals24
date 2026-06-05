const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
	logId: {
		type: String,
		required: true,
		index: true,
	},
	timestamp: {
		type: Date,
		default: Date.now,
		index: true,
	},
	level: {
		type: String,
		enum: ['debug', 'info', 'warn', 'error'],
		required: true,
		index: true,
	},
	service: {
		type: String,
		default: 'app',
		index: true,
	},
	event: {
		type: String,
		default: null,
		index: true,
	},
	message: {
		type: String,
		required: true,
	},
	requestId: {
		type: String,
		default: null,
		index: true,
	},
	correlationId: {
		type: String,
		default: null,
		index: true,
	},
	context: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
	},
	expiresAt: {
		type: Date,
		required: true,
		index: {
			expires: 0,
		},
	},
});

adminLogSchema.index({ timestamp: -1, _id: -1 });
adminLogSchema.index({ logId: 1 }, { unique: true });

module.exports = mongoose.models.AdminLog || mongoose.model('AdminLog', adminLogSchema);
