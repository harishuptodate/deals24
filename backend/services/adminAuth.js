const crypto = require('crypto');

function getAdminUsername() {
	return process.env.ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME;
}

function getAdminPassword() {
	return process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;
}

function getAdminSecret() {
	return process.env.ADMIN_AUTH_SECRET || process.env.JWT_SECRET || 'deals24-admin-secret';
}

function base64UrlEncode(input) {
	return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
	return Buffer.from(input, 'base64url').toString('utf8');
}

function signToken(unsignedToken) {
	return crypto
		.createHmac('sha256', getAdminSecret())
		.update(unsignedToken)
		.digest('base64url');
}

function issueAdminToken(username) {
	const payload = {
		sub: 'admin',
		username,
		iat: Date.now(),
	};

	const encodedPayload = base64UrlEncode(JSON.stringify(payload));
	const signature = signToken(encodedPayload);
	return `${encodedPayload}.${signature}`;
}

function verifyAdminCredentials(username, password) {
	const validUsername = getAdminUsername();
	const validPassword = getAdminPassword();

	if (!validUsername || !validPassword) {
		return {
			ok: false,
			reason: 'Admin credentials are not configured on the server.',
		};
	}

	if (username !== validUsername || password !== validPassword) {
		return {
			ok: false,
			reason: 'Invalid credentials.',
		};
	}

	return {
		ok: true,
	};
}

function verifyAdminToken(token) {
	if (!token || typeof token !== 'string') {
		return {
			ok: false,
			reason: 'Token is missing.',
		};
	}

	const [encodedPayload, signature] = token.split('.');
	if (!encodedPayload || !signature) {
		return {
			ok: false,
			reason: 'Token format is invalid.',
		};
	}

	const expectedSignature = signToken(encodedPayload);
	if (signature !== expectedSignature) {
		return {
			ok: false,
			reason: 'Token signature is invalid.',
		};
	}

	try {
		const payload = JSON.parse(base64UrlDecode(encodedPayload));
		if (payload.exp && payload.exp < Date.now()) {
			return {
				ok: false,
				reason: 'Token has expired.',
			};
		}

		return {
			ok: true,
			payload,
		};
	} catch (_error) {
		return {
			ok: false,
			reason: 'Token payload is invalid.',
		};
	}
}

module.exports = {
	issueAdminToken,
	verifyAdminCredentials,
	verifyAdminToken,
};
