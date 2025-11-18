# CORS FIX for Your Existing api.php

## The Problem
Your api.php at `https://v2.hireboothub.com/spin-win-api/api.php` is setting CORS headers multiple times, causing:
```
The 'Access-Control-Allow-Origin' header contains multiple values '*, *'
```

## The Fix

### Step 1: Update Your api.php File

**Replace the CORS headers section at the TOP of your api.php** with this code:

```php
<?php
// ==========================================
// CORS CONFIGURATION - ADD THIS AT THE TOP
// ==========================================

// Get the origin of the request
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Allowed origins
$allowed_origins = [
    'https://sunkeysales.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];

// Set CORS headers ONLY ONCE
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Default to your main domain
    header("Access-Control-Allow-Origin: https://sunkeysales.vercel.app");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==========================================
// REST OF YOUR API CODE BELOW
// ==========================================

// Your existing API code goes here...
```

**IMPORTANT:**
- Remove ANY other `header("Access-Control-Allow-Origin: *")` lines from your code
- Make sure this is at the VERY TOP of your api.php (right after `<?php`)
- Don't set CORS headers anywhere else in the file

### Step 2: Update Your .htaccess File

**Replace your existing .htaccess** in `/spin-win-api/.htaccess` with this:

```apache
# Prevent Apache from adding duplicate CORS headers
<IfModule mod_headers.c>
    # Remove any CORS headers Apache might add
    Header unset Access-Control-Allow-Origin
    Header unset Access-Control-Allow-Methods
    Header unset Access-Control-Allow-Headers
    Header unset Access-Control-Allow-Credentials
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Prevent directory browsing
Options -Indexes
```

## Step 3: Test

1. **Clear your browser cache**: Press `Ctrl + Shift + R`

2. **Test the API directly**:
   ```
   https://v2.hireboothub.com/spin-win-api/api.php?action=campaign
   ```

3. **Test from your frontend**:
   ```
   https://sunkeysales.vercel.app
   ```

4. **Check browser console** - The CORS error should be gone!

## How to Verify It's Fixed

Open your browser's **Developer Tools** (F12):
- Go to **Network** tab
- Load your frontend
- Click on the API request
- Check **Response Headers**
- You should see **ONLY ONE** `Access-Control-Allow-Origin` header

## Common Mistakes to Avoid

❌ **DON'T** have multiple `header("Access-Control-Allow-Origin: *")` in your code
❌ **DON'T** set CORS headers in multiple places
❌ **DON'T** forget to upload the .htaccess file
✅ **DO** set CORS headers only once at the top of api.php
✅ **DO** use .htaccess to prevent Apache duplicates
✅ **DO** clear browser cache after changes

## Still Getting Errors?

### Check 1: CORS headers are set multiple times
- Search your api.php for ALL occurrences of `Access-Control-Allow-Origin`
- Remove all except the one at the top

### Check 2: .htaccess not working
- Make sure the file is named `.htaccess` (with the dot)
- Check file permissions: `chmod 644 .htaccess`
- Verify Apache `mod_headers` is enabled

### Check 3: Server cache
- Restart Apache/PHP-FPM if you have access
- Or wait a few minutes for server cache to clear

## Test Command (Optional)

Test CORS headers from command line:

```bash
curl -H "Origin: https://sunkeysales.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     -v https://v2.hireboothub.com/spin-win-api/api.php?action=campaign
```

Look for **only ONE** `Access-Control-Allow-Origin` in the response headers.

---

That's it! This should fix your CORS issue completely.
