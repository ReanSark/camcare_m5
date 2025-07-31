import { Client, Databases, Account, Storage, Functions } from 'appwrite';

const client = new Client();

client
  .setEndpoint(process.env.APPWRITE_ENDPOINT!) // e.g., 'https://cloud.appwrite.io/v1'
  .setProject(process.env.APPWRITE_PROJECT_ID!); // Your project ID

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
