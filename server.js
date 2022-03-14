const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload')
const cookieParser = require('cookie-parser')
require('dotenv').config();

// Create express app
const app = express();

// Loading enviroment variables
const port = process.env.PORT || 5000;
const uri = process.env.MONGO_URI;

// Set up middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(fileUpload({
    useTempFiles: true
  }))
app.use(express.urlencoded({ extended: true }))

// Serve static assets

// Setup API endpoints
app.use("/buyers", require("./routes/buyer.route"));
app.use("/vendors", require("./routes/vendor.route"));
app.use("/items", require("./routes/item.route"));
app.use("/orders", require("./routes/order.route"));

// Connection to MongoDB
mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }, err => {
    if (err) {
        console.log(err);
    } else {
        console.log("MongoDB database connection established successfully!");
    }
});

// Start the server
app.listen(port, function () {
    console.log(`Server is running on port ${port}!`);
});
