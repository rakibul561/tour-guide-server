const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();


const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { default: axios } = require("axios");
const port = process.env.PORT || 5000;

// midle ware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded());
const STORE_ID =process.env.STORE_ID;
const STORE_PASS =process.env.STORE_PASS;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fmdvppd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const menuCollection = client.db("tourUser").collection("menu");
    const userCollection = client.db("tourUser").collection("users");
    const bookingCollection = client.db("tourUser").collection("booking");
    const storysCollection = client.db("tourUser").collection("storys");
    const wishlistCollection = client.db("tourUser").collection("wishlist");
    const paymentCollection = client.db("tourUser").collection("payments");

    // jwt relative api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // verified token
    const verifyToken = (req, res, next) => {
      console.log("Authorization Header:", req.headers.authorization); // টোকেন চেক করুন
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden-access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "forbidden access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    //  use verifyAdmin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbiden access" });
      }
      next();
    };

    // verifyToken, verifyAdmin,

    // users relative api
    app.get("/users", async (req, res) => {
      console.log(req.headers);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // guide detyails pagse

    app.get("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: { name: 1, email: 1, role: 1, photo: 1 },
      };
      const result = await userCollection.findOne(query, options);
      res.send(result);
    });

    app.get(
      "/users/admin/:email",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const email = req.params.email;
        if (email !== req.decoded.email) {
          return res.status(403).send({ message: "unauthorized access" });
        }

        const query = { email: email };
        const user = await userCollection.findOne(query);
        let admin = false;
        if (user) {
          admin = user?.role === "admin";
        }
        res.send({ admin });
      }
    );

    app.get("/single-user/:email", async (req, res) => {
      const { email } = req.params;
      const user = await userCollection.findOne({ email });
      if (!user) {
        return res
          .status(404)
          .send({ error: "User not found with this email" });
      }
      res.status(200).send(user);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // story reletive api
    app.post("/storys", async (req, res) => {
      const story = req.body;
      console.log(story);
      const result = await storysCollection.insertOne(story);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const { role } = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: role,
        },
      };
      try {
        const result = await userCollection.updateOne(filter, updatedDoc);
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Failed to update role", error });
      }
    });

    app.delete("/users/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    // menu relative api

    app.get("/menu", async (req, res) => {
      const result = await menuCollection.find().toArray();
      res.send(result);
    });

    app.post("/menu", async (req, res) => {
      const item = req.body;
      const result = await menuCollection.insertOne(item);
      res.send(result);
    });

    // cart details pagse
    app.get("/menu/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: {
          description: 1,
          trip_title: 1,
          relative_information: 1,
          price: 1,
          images: 3,
        },
      };

      const result = await menuCollection.findOne(query, options);
      res.send(result);
    });

    //    this is

    // booking retetive api

    app.get("/booking/:email", async (req, res) => {
      const email = req.params.email;
      if (email) {
        query = { email: email };
      }
      console.log(email);
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
      console.log(result);
    });


    app.get("/booking", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    //    payment gatway

  //   app.post("/create-ssl-payment", async (req, res) => {
  //     const payment = req.body;

  //     const trxid = new ObjectId().toString();
  //     payment.transactionId = trxid;
  //     const inistite = {
  //       store_id: STORE_ID,
  //       store_passwd: STORE_PASS,
  //       total_amount: payment.price,
  //       currency: "BDT",
  //       tran_id: trxid, // use unique tran_id for each api call
  //       success_url: "http://localhost:5000/success",
  //       fail_url: "http://localhost:5173/fail",
  //       cancel_url: "http://localhost:5173/cancel",
  //       ipn_url: "http://localhost:5000/ipn-success-payment",
  //       shipping_method: "Courier",
  //       product_name: "Computer.",
  //       product_category: "Electronic",
  //       product_profile: "general",
  //       cus_name: "Customer Name",
  //       cus_email: `${payment.email}`,
  //       cus_add1: "Dhaka",
  //       cus_add2: "Dhaka",
  //       cus_city: "Dhaka",
  //       cus_state: "Dhaka",
  //       cus_postcode: "1000",
  //       cus_country: "Bangladesh",
  //       cus_phone: "01711111111",
  //       cus_fax: "01711111111",
  //       ship_name: "Customer Name",
  //       ship_add1: "Dhaka",
  //       ship_add2: "Dhaka",
  //       ship_city: "Dhaka",
  //       ship_state: "Dhaka",
  //       ship_postcode: 1000,
  //       ship_country: "Bangladesh",
  //     };

  //     const iniResponse = await axios({
  //       url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
  //       method: "POST",
  //       data: inistite,
  //       headers: {
  //         "Content-Type": "application/x-www-form-urlencoded",
  //       },
  //     });

  //     const saveData = await paymentCollection.insertOne(payment);
  //     if (saveData) {
  //       const gatewayUrl = iniResponse?.data?.GatewayPageURL;
  //       res.send({ gatewayUrl });
  //     }
  //   }); 

 
  //   app.post('/success-payment', async (req, res) => {
  //     try {
  //         const paymentSuccess = req.body;
  
  //         const response = await axios.get(
  //             `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${paymentSuccess.val_id}&store_id=touri67c9a943d0cac&store_passwd=touri67c9a943d0cac@ssl&format=json`
  //         );
  
  //         const data = response?.data;
  
  //         if (data?.status !== "VALID") {
  //             return res.status(400).send({ message: "Invalid Payment" });
  //         }
  
  //         // Payment Update করুন
  //         const updatePayment = await paymentCollection.updateOne(
  //             { transactionId: paymentSuccess.tran_id },
  //             { $set: { status: "SUCCESS" } }
  //         ); 
          
  //         const payment = await paymentCollection.findOne({ transactionId: paymentSuccess.tran_id });
  
  //         if (!payment || !payment.cardId) {
  //             return res.status(400).send({ error: "No cardId found in payment" });
  //         }
  
  //         const cardId = payment.cardId; // Extract cardId
          
          
  
  //         const query = { cardId: new ObjectId(cardId) };
  //         console.log("the id is a ", query);
          
  
  //         const deleteResult = await bookingCollection.deleteMany(query);
  //         console.log("deleteResult", deleteResult);
  
  //         // Redirect OR Send Response (choose one)
  //         return res.redirect('http://localhost:5173/success'); 
  //         // return res.send({ message: "Payment updated successfully", updatePayment });
  
  //     } catch (error) {
  //         console.error("Error in success-payment:", error);
  //         res.status(500).send({ error: "Internal Server Error" });
  //     }
  // }); 



  app.post("/create-ssl-payment", async (req, res) => {
    const payment = req.body;

    const trxid = new ObjectId().toString();
    payment.transactionId = trxid;
    const inistite = {
        store_id: STORE_ID,
        store_passwd: STORE_PASS,
        total_amount: payment.price,
        currency: "BDT",
        tran_id: trxid, // use unique tran_id for each api call
        success_url: "http://localhost:5173/success-payment",
        fail_url: "http://localhost:5173/fail",
        cancel_url: "http://localhost:5173/cancel",
        ipn_url: "http://localhost:5000/ipn-success-payment",
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: `${payment.email}`,
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: 1000,
        ship_country: "Bangladesh",
    };

    const iniResponse = await axios({
        url: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        method: "POST",
        data: inistite,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const saveData = await paymentCollection.insertOne(payment);
    console.log("this payment us", payment);
    
    if (saveData) {
        const gatewayUrl = iniResponse?.data?.GatewayPageURL;
        res.send({ gatewayUrl });
    }
});

app.post('/success-payment', async (req, res) => {
    try {
        const paymentSuccess = req.body;

        // SSLCommerz থেকে পেমেন্ট ভেরিফাই করুন
        const response = await axios.get(
            `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${paymentSuccess.val_id}&store_id=touri67c9a943d0cac&store_passwd=touri67c9a943d0cac@ssl&format=json`
        );

        const data = response?.data;

        if (data?.status !== "VALID") {
            return res.status(400).send({ message: "Invalid Payment" });
        }


        // Payment Update করুন
        const updatePayment = await paymentCollection.updateOne(
            { transactionId: paymentSuccess.tran_id },
            { $set: { status: "SUCCESS" } }
        ); 

        console.log("this status is on fire ",data.status);
        
        

  
        console.log("updated payment", updatePayment);
        
        return res.send({ message: "Payment updated successfully", updatePayment });
        

    } catch (error) {
        console.error("Error in success-payment:", error);
        res.status(500).send({ error: "Internal Server Error" });
    }
});




    // get email based  payment 

    
    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;
      if (email) {
        query = { email: email };
      }
      console.log(email);
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
      console.log(result);
    });
      


    // get all payment 

    app.get('/payment', async (req, res) =>{
      const result = await paymentCollection.find().toArray();
      res.send (result)
    })
 

    //  get all story 

    app.get('/storys', async (req, res)=>{
      const result = await storysCollection.find().toArray();
      res.send(result)
    })
  
   

    app.get("/wishlist", async (req, res) => {
      const result = await wishlistCollection.find().toArray();
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const wishlist = req.body;
      delete wishlist._id;
      const result = await wishlistCollection.insertOne(wishlist);
      res.send(result);
    });
    //
    app.get("/wishlist/:email", async (req, res) => {
      const email = req.params.email;
      if (email) {
        query = { email: email };
      }
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });


    //   wishlist details api
    app.get("/heart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.findOne(query);
      res.send(result);
    });

    // wishlist relative delelate api
    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

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

//    payment gatway

app.get("/", (req, res) => {
  res.send("code is running");
});

app.listen(port, () => {
  console.log(`tour guide is on port ${port}`);
});
