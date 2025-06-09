const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
require("dotenv").config();
// // console.log("DB USER:", process.env.DB_USER);
// // console.log("DB PASS:", process.env.DB_PASS);

// const express = require("express");

// const cors = require("cors");

// const app = express();
// const port = process.env.PORT || 3000;

// app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.at4rpkk.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const database = client.db("homeservice");
    const servicecollection = database.collection("services");
    const bookingcollection = database.collection("bookings");

    app.get("/service", async (req, res) => {
      const result = await servicecollection.find().limit(6).toArray();
      res.send(result);
    });

    //sobar service dekhar
    app.get("/allservice", async (req, res) => {
      const result = await servicecollection.find().toArray();
      res.send(result);
    });

    //nijer service dekhar jonno//
    app.get("/userservice", async (req, res) => {
      const email = req.query.email;
      const query = { providerEmail: email };
      const result = await servicecollection.find(query).toArray();
      res.send(result);
    });

    //service booked korar jonno
    app.get("/bookingservice", async (req, res) => {});

    // Client (React frontend) থেকে পাঠানো service id দিয়ে MongoDB-র serviceCollection থেকে একটি নির্দিষ্ট সার্ভিসের তথ্য বের করে দেয়।

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicecollection.findOne(query);
      if (!service) {
        return res.status(404).send({ message: "Service not found" });
      }
      res.send(service);
    });

    //bookingdata onno ekta route e dekhanor jonno
    app.get("/showbookingservice", async (req, res) => {
      const email = req.params.emmail;
      const query = { userEmail: email };
      const result = await bookingcollection.find(query).toArray();
      if (bookings.length === 0) {
        return res.send({ message: "No bookings found", bookings: [] });
      }
      res.send(result);
    });

    //booking servicedata insert korarjonno

    app.post("/servicebooking", async (req, res) => {
      const bookingdata = req.body;
      bookingdata.serviceStatus = "pending";
      const result = await bookingcollection.insertOne(bookingdata);
      res.send(result);
    });
    //client side theke add korar jonno//

    app.post("/addservice", async (req, res) => {
      const data = req.body;
      const result = await servicecollection.insertOne(data);
      res.send(result);
    });
    //update er jonno
    app.put("/updateservice/:id", async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedoc = { $set: updated };
      const result = await servicecollection.updateOne(filter, updatedoc);
      res.send(result);
    });

    //delete er jonno

    app.delete("/deleteservice/:id", async (req, res) => {
      const id = req.params.id;
      const result = await servicecollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
