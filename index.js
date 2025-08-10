require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      "https://peppy-mousse-674e6f.netlify.app",
      "http://localhost:5173",
      "https://home-services-dusky.vercel.app",
    ],
  })
);
app.use(express.json());

var admin = require("firebase-admin");

// ...existing code...
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID,
  }),
  clientId: process.env.FIREBASE_CLIENT_ID,
  authUri: process.env.FIREBASE_AUTH_URI,
  tokenUri: process.env.FIREBASE_TOKEN_URI,
  authProviderX509CertUrl: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
  clientC509CertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  universeDomain: process.env.FIREBASE_UNIVERSE_DOMAIN,
});

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
  // console.log("veryfytoken", authheader);
  if (!authheader || !authheader.startsWith("Bearer ")) {
    // console.log("notauthheader");
    return res.status(401).send({ message: "unauthorizwd token" });
  }
  const token = authheader.split(" ")[1];

  try {
    const decodedtoken = await admin.auth().verifyIdToken(token);
    req.decodedtoken = decodedtoken;
    // console.log("token in the middaleware", decodedtoken);

    next();
  } catch (error) {
    // console.log("error in catch");
    return res.status(401).send({ message: "unauthorized access" });
  }
};
async function run() {
  try {
    const database = client.db("homeservice");
    const servicecollection = database.collection("services");
    const bookingcollection = database.collection("bookings");

    app.get("/service", async (req, res) => {
      const result = await servicecollection
        .find()
        .sort({ _id: -1 })
        .limit(8)
        .toArray();
      res.send(result);
    });

    //sobar service dekhar
    app.get("/allservice", async (req, res) => {
      const result = await servicecollection.find().toArray();
      res.send(result);
    });

    //nijer service dekhar jonno//
    app.get("/userservice", verifyfirebasetoken, async (req, res) => {
      const queryemail = req.query.email;
      const { email, uid } = req.decodedtoken;

      if (queryemail !== email) {
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { providerEmail: queryemail };
      const result = await servicecollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bookingservice", async (req, res) => {
      try {
        const Email = req.query.email;

        if (!Email) {
          return res
            .status(400)
            .send({ message: "Email query parameter is required" });
        }

        const query = { userEmail: Email };
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

    app.get("/service/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const service = await servicecollection.findOne(query);

      res.send(service);
    });

    //bookingdata onno ekta route e dekhanor jonno
    app.get("/showbookingservice", verifyfirebasetoken, async (req, res) => {
      const queryemail = req.query.email;
      const { email, uid } = req.decodedtoken;

      if (queryemail !== email) {
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { userEmail: queryemail };
      const result = await bookingcollection.find(query).toArray();
      if (result.length === 0) {
        return res.send({ message: "No bookings found", bookings: [] });
      }
      res.send(result);
    });
    app.get("/servicetodo", verifyfirebasetoken, async (req, res) => {
      const queryemail = req.query.email;
      const { email } = req.decodedtoken;
      if (queryemail !== email) {
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }
      if (!queryemail) {
        return res.status(400).send({ message: "Provider email is required" });
      }

      try {
        const query = { providerEmail: queryemail };
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
        // console.log("not match email");
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
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }

      const filter = { _id: new ObjectId(id) };
      const updatedoc = { $set: updated };
      const result = await servicecollection.updateOne(filter, updatedoc);
      res.send(result);
    });
    app.patch("/bookingstatus/:id", verifyfirebasetoken, async (req, res) => {
      const id = req.params.id;
      const { serviceStatus } = req.body;

      const update = req.body;
      const emailFromToken = req.decodedtoken.email;

      update.providerEmail = emailFromToken;
      const { email, uid } = req.decodedtoken;
      if (update.providerEmail !== email) {
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }

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

    app.delete("/deleteservice/:id", verifyfirebasetoken, async (req, res) => {
      const id = req.params.id;
      const { email } = req.decodedtoken;
      const service = await servicecollection.findOne({
        _id: new ObjectId(id),
      });
      if (!service) {
        return res.status(404).send({ message: "Service not found" });
      }
      if (service.providerEmail !== email) {
        // console.log("not match email");
        return res.status(403).send({ message: "forbidden access" });
      }
      const result = await servicecollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`Server is Running on port ${port}`);
});
