import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || 'wishes';

function redact(uri: string): string {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
}

async function main() {
  if (!MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set');
    process.exit(1);
  }

  console.log(`Connecting to: ${redact(MONGODB_URI)}`);

  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);
    const col = db.collection('messages');

    // Insert test doc
    const testDoc = {
      _id: new ObjectId(),
      seq: -1,
      clientId: `test-${Date.now()}`,
      name: 'DB_CHECK',
      department: null,
      message: 'connectivity test',
      status: 'visible' as const,
      createdAt: new Date(),
      ipHash: 'test',
    };

    await col.insertOne(testDoc);
    const found = await col.findOne({ _id: testDoc._id });
    await col.deleteOne({ _id: testDoc._id });

    if (found) {
      console.log('OK');
    } else {
      console.error('FAIL: inserted but not found');
      process.exit(1);
    }
  } catch (err: any) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
