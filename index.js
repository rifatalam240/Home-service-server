const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
require("dotenv").config();
var admin = require("firebase-admin");

var serviceAccount = require("./homeservice-38fc3-firebase-adminsdk-fbsvc-1ada473912.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

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

// verifyfirebasetoken//
const verifyfirebasetoken = async (req, res, next) => {
  const authheader = req.headers.authorization;
  console.log("veryfytoken", authheader);
  if (!authheader || !authheader.startsWith("Bearer ")) {
    console.log("notauthheader");
    return res.status(401).send({ message: "unauthorizwd token" });
  }
  const token = authheader.split(" ")[1];

  try {
    const decodedtoken = await admin.auth().verifyIdToken(token);
    req.decodedtoken = decodedtoken;
    console.log("token in the middaleware", decodedtoken);

    next();
  } catch (error) {
    console.log("error in catch");
    return res.status(401).send({ message: "unauthorized access" });
  }
};
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

    // Service booked গুলো fetch করার জন্য (userEmail দিয়ে filter)
    app.get("/bookingservice", async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res
            .status(400)
            .send({ message: "Email query parameter is required" });
        }

        const query = { userEmail: email };
        const bookings = await bookingcollection.find(query).toArray();

        if (bookings.length === 0) {
          return res.send({ message: "No bookings found", bookings: [] });
        }

        res.send({ bookings });
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // Client (React frontend) থেকে পাঠানো service id দিয়ে MongoDB-র serviceCollection থেকে একটি নির্দিষ্ট সার্ভিসের তথ্য বের করে দেয়।

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicecollection.findOne(query);

      res.send(service);
    });

    //bookingdata onno ekta route e dekhanor jonno
    app.get("/showbookingservice", async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email };
      const result = await bookingcollection.find(query).toArray();
      if (bookingcollection.length === 0) {
        return res.send({ message: "No bookings found", bookings: [] });
      }
      res.send(result);
    });
    // সার্ভিস প্রোভাইডার হিসেবে যেগুলো সার্ভিস করতে হবে, সেগুলো দেখাবে
    app.get("/servicetodo", async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Provider email is required" });
      }

      try {
        const query = { providerEmail: email };
        const result = await bookingcollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching todo services:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    //for searching//
    app.get("/search", async (req, res) => {
      const { searchparams } = req.query;
      let query = {};
      if (searchparams) {
        query = {
          serviceName: { $regex: searchparams, $options: "i" },
        };
      }
      const result = await servicecollection.find(query).toArray();
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

    app.post("/addservice", verifyfirebasetoken, async (req, res) => {
      const data = req.body;
      // console.log(req.headers);
      const { email, uid } = req.decodedtoken;

      if (data.providerEmail !== email) {
        console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await servicecollection.insertOne(data);
      res.send(result);
    });
    //update er jonno
    app.put("/updateservice/:id", verifyfirebasetoken, async (req, res) => {
      const id = req.params.id;
      const updated = req.body;
      const emailFromToken = req.decodedtoken.email;

      updated.providerEmail = emailFromToken;
      const { email, uid } = req.decodedtoken;
      if (updated.providerEmail !== email) {
        console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }

      const filter = { _id: new ObjectId(id) };
      const updatedoc = { $set: updated };
      const result = await servicecollection.updateOne(filter, updatedoc);
      res.send(result);
    });
    app.patch("/bookingstatus/:id", async (req, res) => {
      const id = req.params.id;
      const { serviceStatus } = req.body;

      try {
        const filter = { _id: new ObjectId(id) };
        const updateDoc = {
          $set: {
            serviceStatus: serviceStatus,
          },
        };

        const result = await bookingcollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error("Error updating service status:", error);
        res.status(500).send({ error: "Failed to update service status" });
      }
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
