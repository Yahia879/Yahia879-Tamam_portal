// اختبار رفع الشعار إلى S3
const FORGE_URL = process.env.BUILT_IN_FORGE_API_URL;
const FORGE_KEY = process.env.BUILT_IN_FORGE_API_KEY;

console.log('FORGE_URL:', FORGE_URL ? FORGE_URL.substring(0, 40) + '...' : 'NOT SET');
console.log('FORGE_KEY:', FORGE_KEY ? 'SET (length: ' + FORGE_KEY.length + ')' : 'NOT SET');

const testData = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#09707e"/></svg>');

const formData = new FormData();
const blob = new Blob([testData], { type: 'image/svg+xml' });
formData.append('file', blob, 'test-logo.svg');

const baseUrl = FORGE_URL.endsWith('/') ? FORGE_URL : FORGE_URL + '/';
const uploadUrl = new URL('v1/storage/upload', baseUrl);
uploadUrl.searchParams.set('path', 'organization/test-logo-' + Date.now() + '.svg');

console.log('Upload URL:', uploadUrl.toString().substring(0, 60) + '...');

const resp = await fetch(uploadUrl, {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + FORGE_KEY },
  body: formData
});

console.log('Response status:', resp.status, resp.statusText);
const text = await resp.text();
console.log('Response body:', text.substring(0, 200));
