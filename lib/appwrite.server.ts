import { Client, Databases, Functions } from 'appwrite';

const serverClient = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!); // Only use in secure environments

export const serverDatabases = new Databases(serverClient);
export const serverFunctions = new Functions(serverClient);
