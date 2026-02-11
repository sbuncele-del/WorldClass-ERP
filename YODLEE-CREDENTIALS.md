# Yodlee Sandbox Credentials

## Admin User
- **loginName**: fcf63a7-b141-4ebe-93e9-c0f69a824717_ADMIN

## API Credentials
- **Client ID**: kgwZqECqfcpsuYEldZAgjyjXJ2NXR6u7zu5crFw7nQJV8zQO
- **Client Secret**: lxTsBUFJPQIT6PsO3kXd83oUitaXmR0ICqLDvQyJciLQGvGe

## Endpoints
- **Yodlee API Endpoint**: https://sandbox.api.yodlee.com/ysl
- **FastLink URL**: https://fl4.sandbox.yodlee.com/authenticate/restserver/fastlink

## Notes
- These are SANDBOX credentials for testing bank feed integration
- FastLink is Yodlee's embeddable UI for connecting bank accounts
- API endpoint is for direct API calls to fetch transactions

## Integration Plan
1. Use FastLink to let users connect their bank accounts
2. Fetch transactions via API
3. Auto-import into bank_statement_lines
4. Reduce manual CSV imports
