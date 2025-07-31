// not yet executed
// to execute this script, run the following command in your terminal:
// npm install dotenv node-appwrite
// npx tsx scripts/importSchema.ts
// Note: You may need to npm install -D tsx if you're not using it already.

// scripts/importSchema.ts
import fs from "fs";
import { config } from "dotenv";
import { Client, Databases } from "node-appwrite";

config({ path: "../.env.local" });

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || "")
  .setProject(process.env.APPWRITE_PROJECT_ID || "")
  .setKey(process.env.APPWRITE_API_KEY || "");

const databases = new Databases(client);
const databaseId = process.env.APPWRITE_DATABASE_ID || "";
const schemaFile = "clinic_appwrite_schema_extended.json";

type Attribute = {
  key: string;
  type: string;
  required?: boolean;
  elements?: string[];
};

type CollectionSchema = {
  name: string;
  attributes: Attribute[];
};

async function importSchema() {
  const schema: CollectionSchema[] = JSON.parse(fs.readFileSync(schemaFile, "utf-8"));

  for (const collection of schema) {
    try {
      const collectionId = collection.name.toLowerCase().replace(/\s+/g, "_");

      const created = await databases.createCollection(
        databaseId,
        collectionId,
        collection.name,
        "document"
      );

      console.log(`✅ Created collection: ${collection.name}`);

      for (const attr of collection.attributes) {
        const { key, type, required = false, elements } = attr;

        switch (type) {
          case "string":
            await databases.createStringAttribute(databaseId, created.$id, key, 255, required);
            break;
          case "text":
            await databases.createStringAttribute(databaseId, created.$id, key, 1024, required);
            break;
          case "integer":
            await databases.createIntegerAttribute(databaseId, created.$id, key, required);
            break;
          case "float":
            await databases.createFloatAttribute(databaseId, created.$id, key, required);
            break;
          case "boolean":
            await databases.createBooleanAttribute(databaseId, created.$id, key, required);
            break;
          case "datetime":
          case "date":
            await databases.createDatetimeAttribute(databaseId, created.$id, key, required);
            break;
          case "enum":
            if (elements) {
              await databases.createEnumAttribute(databaseId, created.$id, key, elements, required);
            }
            break;
          case "string[]":
            await databases.createStringAttribute(databaseId, created.$id, key, 255, required, true);
            break;
          default:
            console.warn(`⚠️ Unsupported attribute type: ${type}`);
        }
      }
    } catch (error: any) {
      console.error(`❌ Failed for ${collection.name}:`, error.message);
    }
  }
}

importSchema();
