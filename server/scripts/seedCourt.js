// Simple seeder script to insert a sample court document into the `courts` collection.
// Usage:
//   MONGODB_URI="mongodb://localhost:27017/aclDB" node server/scripts/seedCourt.js

import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/aclDB';
// If your URI contains a database name (mongodb://host:port/dbname), the client.db() without
// arguments will use that database. Otherwise we default to 'aclDB' which your server uses.
const DEFAULT_DB = 'aclDB';

async function run() {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    console.log('Connected to MongoDB');

    // Determine DB name: prefer db in URI if present, otherwise use DEFAULT_DB
    const parsedUrl = new URL(uri.replace('mongodb://', 'http://'));
    const path = parsedUrl.pathname.replace(/\//g, '');
    const dbName = path || DEFAULT_DB;

    const db = client.db(dbName);
    const courts = db.collection('courts');

    const sample = {
      type: 'tennis',
      venue: 'Main Campus Courts',
      timezone: 'UTC',
      surface: 'clay',
      isIndoor: false,
      lightsAvailable: true,
      pricePerHour: 20,
      currency: 'USD',
      capacity: 4,
      bookingSlotMinutes: 60,
      bufferMinutes: 10,
      status: 'active',
      openingHours: [
        { weekday: 1, startTime: '08:00', endTime: '20:00' },
        { weekday: 2, startTime: '08:00', endTime: '20:00' },
        { weekday: 3, startTime: '08:00', endTime: '20:00' },
        { weekday: 4, startTime: '08:00', endTime: '20:00' },
        { weekday: 5, startTime: '08:00', endTime: '20:00' }
      ],
      exceptions: [
        { startDate: new Date('2025-12-24'), endDate: new Date('2025-12-26'), reason: 'Holiday' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await courts.insertOne(sample);
    console.log('Inserted court with _id:', result.insertedId.toString());
    console.log('You should now see the document in MongoDB Compass in database:', dbName);
  } catch (err) {
    console.error('Seeder error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

run();
