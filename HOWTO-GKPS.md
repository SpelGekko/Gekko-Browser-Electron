# How to Use GKP and GKPS Protocols

The Gekko Protocol (GKP) and its secure variant (GKPS) are specialized protocols for accessing resources across different domains. This guide will help you understand how to use them effectively.

## Basic URL Structure

GKP URLs follow this format:
```
gkp://<domain>.<tld>/
```

For secure connections, use GKPS:
```
gkps://<domain>.<tld>/
```

## Supported Top-Level Domains (TLDs)

The protocol supports three specialized TLDs:

1. `.rust`
2. `.gekko`
3. `.kewl`

## Content Types

The protocol automatically detects content types based on file extensions:
- `.html` - HTML content (text/html)
- `.json` - JSON data (application/json)
- `.md` - Markdown content (text/markdown)
- `.txt` - Plain text (text/plain)
- Other extensions default to application/octet-stream

## Examples

### Basic GKP Requests
```
gkp://hello.gekko/search.html
gkp://docs.rust/guide.md
gkp://blog.kewl/posts/latest.md
```

### Secure GKPS Requests
```
gkps://vault.rust/user/profile.json
gkps://secure.gekko/api/data.json
gkps://private.kewl/dashboard.html
```

## Security Features

When using GKPS:
- Connections are encrypted
- Domain certificates are verified
- Responses include a security fingerprint
- Data is encoded with additional security measures

## Common Use Cases

1. **Public Content Access**
   ```
   gkp://news.kewl/latest.html
   ```

2. **Secure Data Transfer**
   ```
   gkps://vault.rust/sensitive/data.json
   ```

3. **API Endpoints**
   ```
   gkp://api.gekko/v1/status.json
   ```

4. **Documentation**
   ```
   gkp://docs.rust/tutorial/intro.md
   ```

## Error Cases to Watch For

1. Invalid URL format
2. Unsupported TLD
3. Missing or invalid certificates (for GKPS)
4. Security validation failures

## Best Practices

1. Use GKPS for any sensitive data
2. Include proper file extensions for correct content type handling
3. Keep URLs clean and descriptive
4. Use query parameters when needed for dynamic content
5. Verify certificate validity for secure domains

## Testing Your URLs

You can test GKP and GKPS URLs using the protocol tester at:
```
http://localhost:3000
```

The tester will show you the full response including:
- Content type
- Data payload
- Encryption status
- Any error messages
