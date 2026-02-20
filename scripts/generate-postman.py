#!/usr/bin/env python3
"""
Generate Postman Collections from OpenAPI/Swagger YAML specs
"""

import json
import yaml
import sys
from pathlib import Path

def create_collection(name, description, base_url):
    """Create base Postman collection structure"""
    return {
        "info": {
            "name": name,
            "description": description,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "version": "1.0.0"
        },
        "variable": [
            {"key": "base_url", "value": base_url, "type": "string"},
            {"key": "auth_token", "value": "", "type": "string"},
            {"key": "user_id", "value": "", "type": "string"}
        ],
        "auth": {
            "type": "bearer",
            "bearer": [{"key": "token", "value": "{{auth_token}}", "type": "string"}]
        },
        "item": []
    }

def generate_example_value(schema):
    """Generate example value from schema"""
    if not schema:
        return None
    
    if 'example' in schema:
        return schema['example']
    
    schema_type = schema.get('type', 'string')
    
    if schema_type == 'string':
        format_type = schema.get('format', '')
        if format_type == 'email':
            return 'user@example.com'
        elif format_type == 'uuid':
            return '550e8400-e29b-41d4-a716-446655440000'
        elif format_type == 'date':
            return '2026-01-01'
        elif format_type == 'date-time':
            return '2026-01-01T00:00:00.000Z'
        elif 'enum' in schema:
            return schema['enum'][0]
        return 'string_value'
    elif schema_type in ['number', 'integer']:
        return schema.get('minimum', 0)
    elif schema_type == 'boolean':
        return True
    elif schema_type == 'array':
        items = schema.get('items', {})
        return [generate_example_value(items)]
    elif schema_type == 'object':
        example = {}
        properties = schema.get('properties', {})
        for key, prop in properties.items():
            example[key] = generate_example_value(prop)
        return example
    
    return None

def generate_test_script(operation_id):
    """Generate Postman test script"""
    tests = [
        "pm.test('Status code is successful', function () {",
        "    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);",
        "});",
        "",
        "if (pm.response.code === 200 || pm.response.code === 201) {",
        "    pm.test('Response has success field', function () {",
        "        const jsonData = pm.response.json();",
        "        pm.expect(jsonData).to.have.property('success');",
        "    });",
        "}"
    ]
    
    # Add token storage for auth endpoints
    if operation_id in ['loginUser', 'registerUser']:
        tests.extend([
            "",
            "if (pm.response.code === 200 || pm.response.code === 201) {",
            "    const jsonData = pm.response.json();",
            "    if (jsonData.access_token) {",
            "        pm.collectionVariables.set('auth_token', jsonData.access_token);",
            "    }",
            "    if (jsonData.user && jsonData.user.id) {",
            "        pm.collectionVariables.set('user_id', jsonData.user.id);",
            "    }",
            "}"
        ])
    
    return tests

def convert_path_to_request(path, method, operation):
    """Convert OpenAPI path to Postman request"""
    request = {
        "name": operation.get('summary', f"{method.upper()} {path}"),
        "request": {
            "method": method.upper(),
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "url": {
                "raw": f"{{{{base_url}}}}{path}",
                "host": ["{{base_url}}"],
                "path": [p for p in path.split('/') if p]
            },
            "description": operation.get('description', operation.get('summary', ''))
        },
        "response": []
    }
    
    # Handle authentication
    if not operation.get('security'):
        request['request']['auth'] = {"type": "noauth"}
    
    # Add parameters
    parameters = operation.get('parameters', [])
    
    # Path parameters
    path_params = [p for p in parameters if p.get('in') == 'path']
    if path_params:
        request['request']['url']['variable'] = [
            {
                "key": p['name'],
                "value": p.get('example', f"{{{p['name']}}}"),
                "description": p.get('description', '')
            }
            for p in path_params
        ]
    
    # Query parameters
    query_params = [p for p in parameters if p.get('in') == 'query']
    if query_params:
        request['request']['url']['query'] = [
            {
                "key": p['name'],
                "value": str(p.get('schema', {}).get('default', '')),
                "description": p.get('description', ''),
                "disabled": not p.get('required', False)
            }
            for p in query_params
        ]
    
    # Request body
    request_body = operation.get('requestBody', {})
    if request_body:
        content = request_body.get('content', {}).get('application/json', {})
        if content:
            schema = content.get('schema', {})
            example = content.get('example') or generate_example_value(schema)
            request['request']['body'] = {
                "mode": "raw",
                "raw": json.dumps(example, indent=2)
            }
    
    # Add test script
    request['event'] = [{
        "listen": "test",
        "script": {
            "exec": generate_test_script(operation.get('operationId', '')),
            "type": "text/javascript"
        }
    }]
    
    # Add response examples
    responses = operation.get('responses', {})
    for status_code, response in responses.items():
        content = response.get('content', {}).get('application/json', {})
        if content:
            example = content.get('example')
            if not example:
                code = int(status_code)
                if 200 <= code < 300:
                    example = {
                        "success": True,
                        "data": {},
                        "metadata": {
                            "timestamp": "2026-02-19T10:00:00.000Z",
                            "request_id": "req_123456",
                            "version": "1.0.0"
                        }
                    }
                else:
                    example = {
                        "success": False,
                        "error": {
                            "code": "ERROR_CODE",
                            "message": response.get('description', 'Error occurred')
                        },
                        "metadata": {
                            "timestamp": "2026-02-19T10:00:00.000Z",
                            "request_id": "req_123456",
                            "version": "1.0.0"
                        }
                    }
            
            request['response'].append({
                "name": f"{status_code} - {response.get('description', '')}",
                "originalRequest": request['request'].copy(),
                "status": get_status_text(status_code),
                "code": int(status_code),
                "_postman_previewlanguage": "json",
                "header": [{"key": "Content-Type", "value": "application/json"}],
                "body": json.dumps(example, indent=2)
            })
    
    return request

def get_status_text(code):
    """Get HTTP status text"""
    status_texts = {
        '200': 'OK',
        '201': 'Created',
        '204': 'No Content',
        '400': 'Bad Request',
        '401': 'Unauthorized',
        '403': 'Forbidden',
        '404': 'Not Found',
        '409': 'Conflict',
        '429': 'Too Many Requests',
        '500': 'Internal Server Error'
    }
    return status_texts.get(str(code), 'Unknown')

def group_by_tags(paths):
    """Group paths by tags"""
    groups = {}
    
    for path, methods in paths.items():
        for method, operation in methods.items():
            if method == 'parameters':
                continue
            
            tags = operation.get('tags', ['Uncategorized'])
            for tag in tags:
                if tag not in groups:
                    groups[tag] = []
                groups[tag].append({
                    'path': path,
                    'method': method,
                    'operation': operation
                })
    
    return groups

def convert_openapi_to_postman(spec_path, output_path):
    """Convert OpenAPI spec to Postman collection"""
    print(f"📖 Reading: {spec_path}")
    
    with open(spec_path, 'r') as f:
        spec = yaml.safe_load(f)
    
    # Create collection
    collection = create_collection(
        spec['info']['title'],
        spec['info'].get('description', ''),
        spec.get('servers', [{}])[0].get('url', 'http://localhost:3000')
    )
    
    # Group paths by tags
    groups = group_by_tags(spec.get('paths', {}))
    
    # Create folders for each tag
    for tag, requests in groups.items():
        folder = {
            "name": tag,
            "item": [
                convert_path_to_request(req['path'], req['method'], req['operation'])
                for req in requests
            ]
        }
        collection['item'].append(folder)
    
    # Write collection
    with open(output_path, 'w') as f:
        json.dump(collection, f, indent=2)
    
    print(f"✅ Generated: {output_path}")
    print(f"   - {len(collection['item'])} folders")
    print(f"   - {sum(len(folder['item']) for folder in collection['item'])} requests")

def main():
    """Main function"""
    specs = [
        {
            'input': 'docs/api/openapi-spec.yaml',
            'output': 'postman/Complete-API-Collection.json'
        },
        {
            'input': 'docs/api/GIGA_DASHBOARD_SWAGGER.yaml',
            'output': 'postman/Dashboard-Complete-Collection.json'
        }
    ]
    
    print('🚀 Generating Postman collections from OpenAPI specs...\n')
    
    for spec in specs:
        input_path = Path(spec['input'])
        output_path = Path(spec['output'])
        
        if input_path.exists():
            try:
                convert_openapi_to_postman(str(input_path), str(output_path))
                print()
            except Exception as e:
                print(f"❌ Error processing {input_path}: {e}\n")
        else:
            print(f"⚠️  Spec not found: {input_path}\n")
    
    print('✨ Collection generation complete!')
    print('\n📖 Import the collections into Postman to start testing.')

if __name__ == '__main__':
    main()
