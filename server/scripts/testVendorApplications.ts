import "dotenv/config";
import mongoose from "mongoose";
import vendorModel, { VendorStatus } from "../models/Vendor";
import EventModel, {
  EventType,
  Location,
  FundingSource,
  BazaarBoothSize,
} from "../models/Event";
import { connectDB } from "../db";
import * as vendorService from "../services/vendorService";

async function testVendorApplications() {
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/aclDB";
    await connectDB(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Find or create a vendor
    let vendor = await vendorModel.findOne({ email: "test-vendor@example.com" });
    if (!vendor) {
      console.log("Creating test vendor...");
      vendor = await vendorModel.create({
        email: "test-vendor@example.com",
        password: "TestPassword123!",
        companyName: "Test Vendor Company",
        verified: true,
        verificationStatus: VendorStatus.APPROVED,
      });
      console.log(`✅ Created vendor: ${vendor.companyName} (${vendor._id})`);
    } else {
      console.log(`✅ Found existing vendor: ${vendor.companyName} (${vendor._id})`);
    }

    // Find or create a bazaar event
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2);
    
    let event = await EventModel.findOne({
      eventType: EventType.BAZAAR,
      name: "Test Bazaar Event for Applications",
    });

    if (!event) {
      console.log("Creating test bazaar event...");
      event = await EventModel.create({
        name: "Test Bazaar Event for Applications",
        eventType: EventType.BAZAAR,
        description: "Test bazaar event for testing vendor applications",
        date: futureDate,
        location: Location.GUCCAIRO,
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000), // Next day
        registrationDeadline: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days before
        fundingSource: FundingSource.GUC,
        capacity: 100,
        revenue: 0,
        archived: false,
        registeredUsers: [],
        vendors: [],
      });
      console.log(`✅ Created event: ${event.name} (${event._id})`);
    } else {
      console.log(`✅ Found existing event: ${event.name} (${event._id})`);
    }

    // Create second event for second application
    let event2 = await EventModel.findOne({
      eventType: EventType.BAZAAR,
      name: "Test Bazaar Event 2 for Applications",
    });

    if (!event2) {
      console.log("Creating second test bazaar event...");
      event2 = await EventModel.create({
        name: "Test Bazaar Event 2 for Applications",
        eventType: EventType.BAZAAR,
        description: "Second test bazaar event for testing vendor applications",
        date: futureDate,
        location: Location.GUCCAIRO,
        startDate: futureDate,
        endDate: new Date(futureDate.getTime() + 24 * 60 * 60 * 1000),
        registrationDeadline: new Date(futureDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        fundingSource: FundingSource.GUC,
        capacity: 100,
        revenue: 0,
        archived: false,
        registeredUsers: [],
        vendors: [],
      });
      console.log(`✅ Created event 2: ${event2.name} (${event2._id})`);
    } else {
      console.log(`✅ Found existing event 2: ${event2.name} (${event2._id})`);
    }

    // Check if vendor already has applications for these events
    const vendorWithApps = await vendorModel.findById(vendor._id);
    const existingApps = vendorWithApps?.applications || [];
    
    const hasApp1 = existingApps.some(
      (app) => app.eventId.toString() === event!._id.toString()
    );
    const hasApp2 = existingApps.some(
      (app) => app.eventId.toString() === event2!._id.toString()
    );

    // Create first application if it doesn't exist
    if (!hasApp1) {
      console.log("\n📝 Creating first vendor application...");
      const result1 = await vendorService.applyToBazaar(vendor._id.toString(), {
        eventId: event._id.toString(),
        attendees: [
          {
            name: "John Doe",
            email: "john.doe@example.com",
            idDocumentPath: "test-id-doc-1.pdf",
          },
        ],
        boothSize: BazaarBoothSize.SMALL,
      });

      if (result1.success) {
        console.log(`✅ Created application 1: ${result1.message}`);
      } else {
        console.log(`❌ Failed to create application 1: ${result1.message}`);
      }
    } else {
      console.log("✅ Application 1 already exists for this vendor and event");
    }

    // Create second application if it doesn't exist
    if (!hasApp2) {
      console.log("\n📝 Creating second vendor application...");
      const result2 = await vendorService.applyToBazaar(vendor._id.toString(), {
        eventId: event2._id.toString(),
        attendees: [
          {
            name: "Jane Smith",
            email: "jane.smith@example.com",
            idDocumentPath: "test-id-doc-2.pdf",
          },
          {
            name: "Bob Johnson",
            email: "bob.johnson@example.com",
            idDocumentPath: "test-id-doc-3.pdf",
          },
        ],
        boothSize: BazaarBoothSize.LARGE,
      });

      if (result2.success) {
        console.log(`✅ Created application 2: ${result2.message}`);
      } else {
        console.log(`❌ Failed to create application 2: ${result2.message}`);
      }
    } else {
      console.log("✅ Application 2 already exists for this vendor and event");
    }

    // Refresh vendor to get latest applications
    const updatedVendor = await vendorModel.findById(vendor._id);
    const applications = updatedVendor?.applications || [];
    
    console.log("\n📊 Current Applications Status:");
    applications.forEach((app, index) => {
      console.log(
        `  Application ${index + 1}: Event ${app.eventId}, Status: ${app.status}`
      );
    });

    // Test accepting first application
    const pendingApp1 = applications.find(
      (app) =>
        app.eventId.toString() === event!._id.toString() &&
        app.status === VendorStatus.PENDING
    );

    if (pendingApp1) {
      console.log("\n🧪 Testing ACCEPT application 1...");
      const acceptResult = await vendorService.updateBazaarApplicationStatus({
        vendorId: vendor._id.toString(),
        eventId: event!._id.toString(),
        status: VendorStatus.APPROVED,
      });

      if (acceptResult.success) {
        console.log(`✅ Successfully accepted application 1: ${acceptResult.message}`);
      } else {
        console.log(`❌ Failed to accept application 1: ${acceptResult.message}`);
      }
    } else {
      console.log("⚠️  No pending application 1 found to accept");
    }

    // Test rejecting second application
    const pendingApp2 = applications.find(
      (app) =>
        app.eventId.toString() === event2!._id.toString() &&
        app.status === VendorStatus.PENDING
    );

    if (pendingApp2) {
      console.log("\n🧪 Testing REJECT application 2...");
      const rejectResult = await vendorService.updateBazaarApplicationStatus({
        vendorId: vendor._id.toString(),
        eventId: event2!._id.toString(),
        status: VendorStatus.REJECTED,
        reason: "Test rejection reason",
      });

      if (rejectResult.success) {
        console.log(`✅ Successfully rejected application 2: ${rejectResult.message}`);
      } else {
        console.log(`❌ Failed to reject application 2: ${rejectResult.message}`);
      }
    } else {
      console.log("⚠️  No pending application 2 found to reject");
    }

    // Final status check
    const finalVendor = await vendorModel.findById(vendor._id);
    const finalApplications = finalVendor?.applications || [];

    console.log("\n📊 Final Applications Status:");
    finalApplications.forEach((app, index) => {
      const appEvent = app.eventId.toString();
      const isEvent1 = appEvent === event!._id.toString();
      const isEvent2 = appEvent === event2!._id.toString();
      const eventName = isEvent1
        ? event!.name
        : isEvent2
          ? event2!.name
          : "Unknown Event";
      console.log(
        `  Application ${index + 1}: ${eventName}, Status: ${app.status}`
      );
    });

    console.log("\n✅ Test completed!");
    console.log(`\nVendor ID: ${vendor._id}`);
    console.log(`Event 1 ID: ${event._id}`);
    console.log(`Event 2 ID: ${event2._id}`);
    console.log("\nYou can now test the accept/reject functionality in the admin panel!");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error in test:", error);
    process.exit(1);
  }
}

testVendorApplications();

