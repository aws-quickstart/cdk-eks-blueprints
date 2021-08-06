# AWS Managed Elasticsearch

```bash
export ES_ADMIN_USERNAME = ''
export ES_ADMIN_PASSWORD = ''
export ES_DOMAIN_URL = ''
export FLUENT_BIT_ROLE_ARN = ''

curl -sS -u "$ES_ADMIN_USERNAME:$ES_ADMIN_PASSWORD" \
    -X PATCH \
    https://$ES_DOMAIN_URL/_opendistro/_security/api/rolesmapping/all_access\?pretty \
    -H 'Content-Type: application/json' \
    -d'
[
  {
    "op": "add", "path": "/backend_roles", "value": ["'$FLUENT_BIT_ROLE_ARN'"]
  }
]
'
```
