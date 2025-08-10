import { databases } from "@/lib/appwrite.config";
import { DATABASE_ID } from "@/config/env";
import { COLLECTIONS } from "@/lib/collections";
import { Query, Models } from "appwrite";
import type { Service, PharmacyProduct } from "@/types";

export async function listServices(q: string): Promise<Service[]> {
  const filters = [Query.equal("isActive", [true]), Query.limit(20)];
  if (q) filters.push(Query.search("name", q));
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SERVICE_LIST, filters);
  return res.documents as unknown as Service[];
}

export async function listProducts(q: string): Promise<PharmacyProduct[]> {
  const filters = [Query.equal("isActive", [true]), Query.limit(20)];
  if (q) filters.push(Query.search("name", q));
  const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.PHARMACY_PRODUCTS, filters);
  return res.documents as unknown as PharmacyProduct[];
}
