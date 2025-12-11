/**
 * Simple CORS Proxy Server for Jira API
 *
 * This is a minimal proxy server that forwards requests to Jira's API
 * to bypass CORS restrictions in the browser.
 *
 * NO DATA IS COLLECTED OR STORED. All requests are forwarded directly
 * to Jira and responses are returned immediately to the client.
 *
 * Runs on localhost:6904 by default
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Environment Variables:
 *   PORT - Server port (default: 6904)
 */

import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 6904;

// Enable CORS for all origins (you can restrict this to your domain)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
	res.json({
		status: 'ok',
		message: 'Jira CORS Proxy Server is running',
		version: '1.0.0',
		privacy: 'No data is collected or stored. All requests are forwarded directly to Jira.'
	});
});

// Proxy endpoint
app.post('/proxy', async (req, res) => {
	try {
		const { url, method, headers, body } = req.body;

		if (!url) {
			return res.status(400).json({
				error: 'Missing URL parameter'
			});
		}

		console.log(`[Proxy] ${method || 'GET'} ${url}`);

		// Forward the request to Jira
		const response = await fetch(url, {
			method: method || 'GET',
			headers: headers || {},
			body: body ? JSON.stringify(body) : undefined
		});

		// Get response data
		const contentType = response.headers.get('content-type');
		let data;

		if (contentType?.includes('application/json')) {
			data = await response.json();
		} else {
			data = await response.text();
		}

		console.log(`[Proxy] Response: ${response.status}`);

		// Return the response
		res.status(response.status).json({
			ok: response.ok,
			status: response.status,
			statusText: response.statusText,
			data
		});
	} catch (error) {
		console.error('[Proxy] Error:', error);
		res.status(500).json({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
			data: {
				error: error.message
			}
		});
	}
});

app.listen(PORT, '127.0.0.1', () => {
	console.log(`🚀 Jira CORS Proxy Server running on http://127.0.0.1:${PORT}`);
	console.log(`📝 Privacy: No data is collected or stored`);
	console.log(`🔒 All requests are forwarded directly to Jira`);
});
