const { MongoClient } = require('mongodb');

async function main() {
  const uri = "mongodb+srv://AhmedKhadrawy:pZ1war9xi3KkP5jG@database.r38ac.mongodb.net/ride-service";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("ride-service");
    
    // Clear existing data
    await database.collection('zones').deleteMany({});
    await database.collection('stops').deleteMany({});
    
    // Insert zones
    const zonesResult = await database.collection('zones').insertMany([
      {
        name: "GIU Campus",
        description: "German International University Campus",
        distanceFromGIU: 0,
        isActive: true
      },
      {
        name: "New Cairo - 1st Settlement",
        description: "New Cairo 1st Settlement area",
        distanceFromGIU: 10,
        isActive: true
      },
      {
        name: "New Cairo - 5th Settlement",
        description: "New Cairo 5th Settlement area",
        distanceFromGIU: 15,
        isActive: true
      },
      {
        name: "Maadi",
        description: "Maadi district",
        distanceFromGIU: 25,
        isActive: true
      },
      {
        name: "Heliopolis",
        description: "Heliopolis district",
        distanceFromGIU: 28,
        isActive: true
      },
      {
        name: "Nasr City",
        description: "Nasr City district",
        distanceFromGIU: 22,
        isActive: true
      }
    ]);

    const zones = await database.collection('zones').find().toArray();

    // Find zone IDs by name
    const giuZone = zones.find(z => z.name === "GIU Campus");
    const firstSettlementZone = zones.find(z => z.name === "New Cairo - 1st Settlement");
    const fifthSettlementZone = zones.find(z => z.name === "New Cairo - 5th Settlement");
    const maadiZone = zones.find(z => z.name === "Maadi");
    const heliopolisZone = zones.find(z => z.name === "Heliopolis");
    const nasrCityZone = zones.find(z => z.name === "Nasr City");

    // Create stops
    await database.collection('stops').insertMany([
      // GIU stops
      {
        name: "GIU Main Gate",
        address: "GIU Campus, New Cairo",
        latitude: 30.0259,
        longitude: 31.5072,
        zoneId: giuZone._id,
        isActive: true
      },
      {
        name: "GIU Student Hub",
        address: "GIU Campus, Student Hub Building",
        latitude: 30.0262,
        longitude: 31.5065,
        zoneId: giuZone._id,
        isActive: true
      },
      
      // New Cairo - 1st Settlement stops
      {
        name: "Cairo Festival City Mall",
        address: "Ring Road, New Cairo",
        latitude: 30.0289,
        longitude: 31.4082,
        zoneId: firstSettlementZone._id,
        isActive: true
      },
      {
        name: "AUC Gate 4",
        address: "AUC New Cairo Campus",
        latitude: 30.0185,
        longitude: 31.4990,
        zoneId: firstSettlementZone._id,
        isActive: true
      },
      
      // New Cairo - 5th Settlement stops
      {
        name: "Point 90 Mall",
        address: "90th Street, New Cairo",
        latitude: 30.0210,
        longitude: 31.4780,
        zoneId: fifthSettlementZone._id,
        isActive: true
      },
      {
        name: "Concord Plaza",
        address: "New Cairo - 5th Settlement",
        latitude: 30.0121,
        longitude: 31.4754,
        zoneId: fifthSettlementZone._id,
        isActive: true
      },
      
      // Maadi stops
      {
        name: "Maadi Grand Mall",
        address: "Street 9, Maadi",
        latitude: 29.9709,
        longitude: 31.2873,
        zoneId: maadiZone._id,
        isActive: true
      },
      {
        name: "Maadi Technology Park",
        address: "Maadi Technology Park, Maadi",
        latitude: 29.9641,
        longitude: 31.2878,
        zoneId: maadiZone._id,
        isActive: true
      },
      
      // Heliopolis stops
      {
        name: "Heliopolis Club",
        address: "Omar Ibn El-Khattab St, Heliopolis",
        latitude: 30.0909,
        longitude: 31.3262,
        zoneId: heliopolisZone._id,
        isActive: true
      },
      {
        name: "Citystars Mall",
        address: "Omar Ibn Al-Khattab St, Heliopolis",
        latitude: 30.0726,
        longitude: 31.3458,
        zoneId: heliopolisZone._id,
        isActive: true
      },
      
      // Nasr City stops
      {
        name: "City Center Almaza",
        address: "Makram Ebeid, Nasr City",
        latitude: 30.0830,
        longitude: 31.3440,
        zoneId: nasrCityZone._id,
        isActive: true
      },
      {
        name: "Abbas El-Akkad Street",
        address: "Abbas El-Akkad Street, Nasr City",
        latitude: 30.0555,
        longitude: 31.3456,
        zoneId: nasrCityZone._id,
        isActive: true
      }
    ]);

    console.log("Data inserted successfully!");
    console.log("Zones created:", zones.length);
    
    const stops = await database.collection('stops').find().toArray();
    console.log("Stops created:", stops.length);
    
    // Verify connections
    console.log("\nSample stops with their zones:");
    for (let i = 0; i < Math.min(5, stops.length); i++) {
      const stop = stops[i];
      const zone = zones.find(z => z._id.equals(stop.zoneId));
      console.log(`Stop: ${stop.name}, Zone: ${zone.name}`);
    }
  } finally {
    await client.close();
  }
}

main().catch(console.error);