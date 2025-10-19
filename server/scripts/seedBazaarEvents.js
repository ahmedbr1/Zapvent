// Script to create sample bazaar events for testing
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  name: String,
  eventType: String,
  category: String,
  date: Date,
  location: String,
  description: String,
  capacity: Number,
  attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  registrationDeadline: Date,
  isOnline: Boolean,
  maxAttendees: Number,
});

const Event = mongoose.model("Event", eventSchema);

async function createBazaarEvents() {
  try {
    await mongoose.connect(
      "mongodb://localhost:27017/your-database-name" // UPDATE THIS
    );
    console.log("Connected to MongoDB");

    // Create sample bazaar events
    const bazaars = await Event.insertMany([
      {
        name: "Spring Bazaar 2024",
        eventType: "Bazaar",
        category: "GUC",
        date: new Date("2024-03-15"),
        location: "Main Campus",
        description: "Annual spring bazaar with local vendors",
        capacity: 50,
        attendees: [],
        registrationDeadline: new Date("2024-03-10"),
        isOnline: false,
        maxAttendees: 500,
      },
      {
        name: "Summer Marketplace",
        eventType: "Bazaar",
        category: "External",
        date: new Date("2024-06-20"),
        location: "City Center",
        description: "Summer marketplace for artisans and vendors",
        capacity: 30,
        attendees: [],
        registrationDeadline: new Date("2024-06-15"),
        isOnline: false,
        maxAttendees: 300,
      },
      {
        name: "Fall Festival Bazaar",
        eventType: "Bazaar",
        category: "GUC",
        date: new Date("2024-09-10"),
        location: "Sports Complex",
        description: "Fall festival with vendor booths",
        capacity: 40,
        attendees: [],
        registrationDeadline: new Date("2024-09-05"),
        isOnline: false,
        maxAttendees: 400,
      },
    ]);

    console.log(`✅ Created ${bazaars.length} bazaar events`);
    bazaars.forEach((b) => console.log(`  - ${b.name} (${b._id})`));

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error creating bazaar events:", error);
    process.exit(1);
  }
}

createBazaarEvents();
