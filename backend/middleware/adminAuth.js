const { verifyAdminToken } = require('../services/adminAuth');

function requireAdminAuth(req, res, next) {
	const authHeader = req.headers.authorization || '';
	const [, bearerToken] = authHeader.split(' ');
	const token = bearerToken || req.query.token;

	const verification = verifyAdminToken(token);
	if (!verification.ok) {
		return res.status(401).json({
			success: false,
			error: verification.reason,
		});
	}

	req.admin = verification.payload;
	return next();
}

module.exports = {
	requireAdminAuth,
};
