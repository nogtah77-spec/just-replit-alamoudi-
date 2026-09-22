import { File } from "@google-cloud/storage";

const ACL_POLICY_METADATA_KEY = "custom:aclPolicy";

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export async function setObjectAclPolicy(file: File, policy: ObjectAclPolicy): Promise<void> {
  await file.setMetadata({ metadata: { [ACL_POLICY_METADATA_KEY]: JSON.stringify(policy) } });
}

export async function getObjectAclPolicy(file: File): Promise<ObjectAclPolicy | null> {
  const [metadata] = await file.getMetadata();
  const value = metadata?.metadata?.[ACL_POLICY_METADATA_KEY];
  return value ? JSON.parse(String(value)) as ObjectAclPolicy : null;
}