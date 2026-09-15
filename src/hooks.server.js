// App-wide HTTP Basic Auth gate. Runs before every request — page loads and
// API routes alike — which matters here specifically because /api/assistant
// is an unauthenticated POST endpoint that would otherwise let anyone who
// finds it use it as a free, unrestricted proxy to the OpenAI API under this
// project's own billing. One shared password, set via SITE_PASSWORD (see
// .env.example) — proportionate for a small demo deployment; not meant to
// stand in for real per-user auth.
import { env } from '$env/dynamic/private';

const REALM = 'FI Builder';

function unauthorized() {
	return new Response('Authentication required.', {
		status: 401,
		headers: { 'WWW-Authenticate': `Basic realm="${REALM}"` }
	});
}

export async function handle({ event, resolve }) {
	const password = env.SITE_PASSWORD;
	if (!password) {
		// Fails OPEN, loudly, rather than locking everyone out (including the
		// owner) the first time this is deployed before the env var is set.
		// Watch the deploy logs for this the first time you ship — an unset
		// SITE_PASSWORD means the site (and the API key behind it) is
		// completely open to the public.
		console.warn('[auth] SITE_PASSWORD is not set — this deployment has NO password protection.');
		return resolve(event);
	}

	const header = event.request.headers.get('authorization');
	if (header?.startsWith('Basic ')) {
		try {
			const decoded = atob(header.slice(6));
			const providedPassword = decoded.slice(decoded.indexOf(':') + 1);
			if (providedPassword === password) return resolve(event);
		} catch {
			// malformed header — fall through to 401
		}
	}

	return unauthorized();
}
