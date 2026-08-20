#!/usr/bin/env python3
"""
CloudFormation Resource Extraction and Import Mapping Tool

This script helps migrate EKS V1 constructs to V2 by:
1. Extracting physical resource IDs and construct paths from existing stacks
2. Generating import mappings by normalizing paths (removing suffixes)
3. Matching resources where normalized paths match

Usage:
  # Extract resources from V1 stack (run BEFORE orphaning)
  python get_cfn_resources.py extract --stack-name MyEksStack

  # Generate import mapping for V2 stack (run AFTER cdk synth of ADD_V2 phase)
  python get_cfn_resources.py import \\
    --stack-name MyEksStack \\
    --physical-resources MyEksStack_resources.json \\
    --suffix V2
"""
import boto3
import json
import sys
import argparse
from typing import Dict, Set, Optional

# Cache for resource type schemas
type_cache: Dict[str, str] = {}


def get_resource_key(resource_type: str, cfn_client) -> str:
    """
    Get the primary identifier from CloudFormation resource schema.
    """
    if resource_type in type_cache:
        return type_cache[resource_type]

    # Handle custom resources by pattern matching
    if not resource_type.startswith('AWS::'):
        if 'Cluster' in resource_type:
            key = 'Name'
        elif 'FargateProfile' in resource_type:
            key = 'FargateProfileName|ClusterName'
        elif 'OpenIdConnectProvider' in resource_type:
            key = 'Arn'
        else:
            key = 'PhysicalResourceId'
        type_cache[resource_type] = key
        return key

    try:
        response = cfn_client.describe_type(Type='RESOURCE', TypeName=resource_type)
        schema = json.loads(response['Schema'])
        primary_ids = schema.get('primaryIdentifier', ['/properties/PhysicalResourceId'])

        if len(primary_ids) > 1:
            keys = [pid.split('/')[-1] for pid in primary_ids if pid.startswith('/properties/')]
            key = '|'.join(keys) if keys else 'PhysicalResourceId'
        elif primary_ids:
            primary_id = primary_ids[0]
            key = primary_id.split('/')[-1] if primary_id.startswith('/properties/') else 'PhysicalResourceId'
        else:
            key = 'PhysicalResourceId'

        type_cache[resource_type] = key
        return key
    except Exception as e:
        print(f"Warning: Could not get schema for {resource_type}: {e}", file=sys.stderr)
        key = 'PhysicalResourceId'
        type_cache[resource_type] = key
        return key


def get_stack_resources(
    stack_name: str,
    template_path: Optional[str] = None,
    visited_stacks: Optional[Set[str]] = None
) -> Dict:
    """
    Recursively extract resources from CloudFormation stack and nested stacks.
    """
    if visited_stacks is None:
        visited_stacks = set()

    if stack_name in visited_stacks:
        return {}

    visited_stacks.add(stack_name)
    cfn = boto3.client('cloudformation')

    template = {}
    if template_path:
        try:
            template = load_template(template_path)
        except SystemExit:
            print(f"Warning: Could not load template at {template_path}, continuing without construct paths", file=sys.stderr)
            template = {}

    try:
        response = cfn.describe_stack_resources(StackName=stack_name)
        resources = {}

        for resource in response['StackResources']:
            logical_id = resource['LogicalResourceId']
            physical_id = resource.get('PhysicalResourceId', '')
            resource_type = resource.get('ResourceType', '')

            if physical_id:
                if resource_type == 'AWS::CloudFormation::Stack':
                    nested_resources = get_stack_resources(physical_id, None, visited_stacks)
                    resources.update(nested_resources)
                else:
                    key = get_resource_key(resource_type, cfn)

                    # Handle composite keys (e.g., FargateProfile needs both name and cluster)
                    if '|' in key and '|' in physical_id:
                        keys = key.split('|')
                        values = physical_id.split('|')
                        resource_obj = {}
                        for i, k in enumerate(keys):
                            if i < len(values):
                                resource_obj[k] = values[i]
                    else:
                        resource_obj = {key: physical_id}

                    # Store resource type for matching logic
                    resource_obj['_resourceType'] = resource_type

                    # Add construct path from template metadata if available
                    if logical_id in template.get('Resources', {}):
                        path = extract_construct_path(template['Resources'][logical_id])
                        if path:
                            resource_obj['_constructPath'] = path

                    resources[logical_id] = resource_obj

        return resources
    except Exception as e:
        print(f"Error processing stack {stack_name}: {e}", file=sys.stderr)
        return {}


def load_template(file_path: str) -> Dict:
    """Load a CloudFormation template from JSON file."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: Template file not found: {file_path}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in template file: {e}", file=sys.stderr)
        sys.exit(1)


def extract_construct_path(resource: Dict) -> str:
    """
    Extract construct path from resource metadata.

    Removes the stack name prefix and /Resource or /Default suffixes.

    Example:
        'EksStack/MyCluster/NodeGroup/Resource' -> 'MyCluster/NodeGroup'
    """
    metadata = resource.get('Metadata', {})
    path = metadata.get('aws:cdk:path', '')

    if '/' in path:
        # Remove stack name (first part)
        construct_path = '/'.join(path.split('/')[1:])
        # Remove /Resource and /Default suffixes
        construct_path = construct_path.replace('/Resource', '').replace('/Default', '')
        return construct_path
    return path


def normalize_path(path: str, suffix: str = 'V2') -> str:
    """
    Normalize path by removing suffix from any component that ends with it.

    Examples:
    - 'MyClusterV2' -> 'MyCluster'
    - 'MyClusterV2/NodeGroup' -> 'MyCluster/NodeGroup'
    - 'FargateProfileV2' -> 'FargateProfile'
    """
    parts = path.split('/')
    normalized_parts = []

    for part in parts:
        if part.endswith(suffix):
            normalized_parts.append(part[:-len(suffix)])
        elif part == 'OidcProviderNative':
            normalized_parts.append('OpenIdConnectProvider')
        else:
            normalized_parts.append(part)

    return '/'.join(normalized_parts)


def is_eks_resource(resource_type: str) -> bool:
    """Check if resource type is an EKS resource that needs importing."""
    eks_types = [
        'AWS::EKS::Cluster',
        'AWS::EKS::Nodegroup',
        'AWS::EKS::Addon',
        'AWS::EKS::AccessEntry',
        'AWS::EKS::FargateProfile',
        'Custom::AWSCDK-EKS-Cluster',
        'Custom::AWSCDK-EKS-FargateProfile',
    ]
    return any(eks_type in resource_type for eks_type in eks_types)


def match_resources(
    new_template: Dict,
    physical_resources: Dict,
    suffix: str = 'V2',
    rollback: bool = False
) -> Dict:
    """
    Match V2 constructs to V1 physical resources.

    Matching logic:
    1. Normalize both V1 and V2 paths (remove suffix)
    2. For EKS resources: Match if normalized paths equal (regardless of logical ID)
    3. For other resources: Match if normalized paths equal AND logical IDs differ
    """
    mapping = {}

    for new_logical_id, new_resource in new_template.get('Resources', {}).items():
        new_path = extract_construct_path(new_resource)
        new_type = new_resource.get('Type', '')

        # Skip KubectlReadyBarrier and SSM Parameters - safe to recreate
        if 'KubectlReadyBarrier' in new_path:
            continue

        # Normalize the V2 path
        new_normalized = normalize_path(new_path, suffix)

        # Check if this is an EKS resource
        is_eks = is_eks_resource(new_type)

        # Rollback mode: match V1 template paths to V2 physical resources
        if rollback:
            for old_logical_id, old_resource_data in physical_resources.items():
                old_path = old_resource_data.get('_constructPath', '')
                old_normalized = normalize_path(old_path, suffix)

                if old_normalized == new_path or old_path == new_path:
                    mapping[new_logical_id] = {k: v for k, v in old_resource_data.items() if not k.startswith('_')}
                    break
            continue

        # Normal mode: Find matching V1 resource
        for old_logical_id, old_resource_data in physical_resources.items():
            old_path = old_resource_data.get('_constructPath', '')

            # Normalize the V1 path (should be no-op unless it has suffix)
            old_normalized = normalize_path(old_path, suffix)

            # Match if normalized paths are equal and logical IDs differ.
            # Same logical ID = resource is still in the template (no import needed).
            # Different logical ID = V2 resource adopting an orphaned V1 physical resource.
            if old_normalized == new_normalized and old_logical_id != new_logical_id:
                mapping[new_logical_id] = {k: v for k, v in old_resource_data.items() if not k.startswith('_')}
                break

    return mapping


def extract_physical_ids(stack_name: str, cdk_out_folder: str) -> None:
    """Extract physical resource IDs and construct paths from a stack."""
    template_path = f"{cdk_out_folder}/{stack_name}.template.json"
    print(f"Extracting resources from stack: {stack_name}")
    print(f"Using template: {template_path}")

    resources = get_stack_resources(stack_name, template_path)
    output_file = f"{stack_name}_resources.json"

    with open(output_file, 'w') as f:
        json.dump(resources, f, indent=2)

    print(f"✅ Physical resource IDs written to {output_file}")
    print(f"   Found {len(resources)} resources")


def generate_import_file(
    new_template_path: str,
    physical_resources_path: str,
    suffix: str = 'V2',
    rollback: bool = False
) -> None:
    """Generate import mapping file for CloudFormation import."""
    print(f"Generating import mapping...")
    print(f"  Template: {new_template_path}")
    print(f"  Resources: {physical_resources_path}")
    print(f"  Suffix: {suffix}")
    print(f"  Rollback mode: {rollback}")

    new_template = load_template(new_template_path)
    physical_resources = load_template(physical_resources_path)

    mapping = match_resources(new_template, physical_resources, suffix, rollback)

    # Extract stack name from template path
    stack_name = new_template_path.split('/')[-1].replace('.template.json', '')
    output_file = f"{stack_name}_import_mapping.json"

    with open(output_file, 'w') as f:
        json.dump(mapping, f, indent=2)

    print(f"✅ Import mapping written to {output_file}")
    print(f"   Mapped {len(mapping)} resources")

    if not mapping:
        print("\n⚠️  No resources matched. Possible causes:", file=sys.stderr)
        print("   - Physical resources file is empty or from wrong phase", file=sys.stderr)
        print("   - Template was not synthesized with the correct phase (use ADD_V2 or FINALIZE)", file=sys.stderr)
        print("   - Suffix doesn't match what was used in the migration construct", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(
        description='CloudFormation resource management tool for EKS V1 to V2 migration',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Extract resources from a stack (run during ADD_RETAIN or ORPHAN_V1 phase)
  python get_cfn_resources.py extract --stack-name MyEksStack

  # Generate import mapping (run after cdk synth of ADD_V2 phase)
  python get_cfn_resources.py import \\
    --stack-name MyEksStack \\
    --physical-resources MyEksStack_resources.json \\
    --suffix V2

  # Generate rollback mapping
  python get_cfn_resources.py import \\
    --stack-name MyEksStack \\
    --physical-resources MyEksStack_resources.json \\
    --suffix V2 \\
    --rollback
        """
    )
    subparsers = parser.add_subparsers(dest='command', help='Available commands')

    # Extract command
    extract_parser = subparsers.add_parser(
        'extract',
        help='Extract physical resource IDs from stack'
    )
    extract_parser.add_argument(
        '--stack-name',
        required=True,
        help='CloudFormation stack name'
    )
    extract_parser.add_argument(
        '--cdk-out-folder',
        default='cdk.out',
        help='Path to CDK output folder (default: cdk.out)'
    )

    # Import command
    import_parser = subparsers.add_parser(
        'import',
        help='Generate import mapping file'
    )
    import_parser.add_argument(
        '--stack-name',
        required=True,
        help='CloudFormation stack name'
    )
    import_parser.add_argument(
        '--cdk-out-folder',
        default='cdk.out',
        help='Path to CDK output folder (default: cdk.out)'
    )
    import_parser.add_argument(
        '--physical-resources',
        required=True,
        help='Path to physical resources JSON file from extract command'
    )
    import_parser.add_argument(
        '--suffix',
        default='V2',
        help='Suffix used for V2 construct names (default: V2)'
    )
    import_parser.add_argument(
        '--rollback',
        action='store_true',
        help='Rollback mode: match V1 template paths to physical resources'
    )

    args = parser.parse_args()

    if args.command == 'extract':
        extract_physical_ids(args.stack_name, args.cdk_out_folder)
    elif args.command == 'import':
        new_template_path = f"{args.cdk_out_folder}/{args.stack_name}.template.json"
        generate_import_file(
            new_template_path,
            args.physical_resources,
            args.suffix,
            args.rollback
        )
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
