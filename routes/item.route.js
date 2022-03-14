const express = require("express");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary");

// Load models and auth middleware
const Item = require("../models/item.model");
const Buyer = require("../models/buyer.model");
const Order = require("../models/order.model");
const auth = require("../middleware/auth");

const router = express.Router();

// cloudinary.config({
//     cloud_name: process.env.CLOUD_NAME,
//     api_key: process.env.CLOUD_API_KEY,
//     api_secret: process.env.CLOUD_API_SECRET
//   })

// // Set up multer
// const multer = require("multer");
// const {v4:uuidv4} = require("uuid");
// const DIR = './public/images';
// // const upload = multer({ dest: "./public/images/" }).single("image");

// const Storage = multer.diskStorage({
//     destination:(req,file,cb)=>{
//         cb(null,DIR);
//     },
//     filename:(req,file,cb)=>{
//         const filename = file.originalname.toLowerCase().split(" ").join('-');
//         cb(null, uuidv4() + '-' + filename)
//     },
// })

// const upload = multer({
//     storage:Storage,
//     fileFilter:(req,file,cb)=>{
//         if(file.mimetype == 'image/png' || file.mimetype == 'image/jpg' || file.mimetype == 'image/jpeg'){
//             cb(null,true);
//         }else{
//             cb(null,false);
//             return cb(new Error('only .png,.jpg and .jpeg format allowed!'));
//         }
//     }
// });


// Get all items
router.get("/", auth, async (req, res) => {
    try {
        const items = await Item.find({});
        return res.status(200).json(items);
    } catch (err) {
        return res.status(500).json({
            error: err
        });
    }
});

// Get all the items for a specific vendor
router.get("/vendor", auth, async (req, res) => {
    try {
        const items = await Item.find({
            vendor_id: req.user
        });
        return res.status(200).json(items);
    } catch (err) {
        return res.status(500).json({
            error: err
        });
    }
});

// router.post("/upload", (req,res)=>{
//     try{
//         const file = req.files.file;
//         if (file.size > 1024*1024){
//             removeTmp(file.tempFilePath)
//             return res.status(400).json({msg: "Size too large."})
//           }
//           if (file.mimetype !== "image/jpeg" && file.mimetype !== "image/png") {
//             removeTmp(file.tempFilePath)
//             return res.status(400).json({msg: "File format is incorrect."})
//           }

//           cloudinary.v2.uploader.upload(file.tempFilePath, {folder: "MERN-Ecommerce"}, async (err, result) => {
//             if (err) throw err;
      
//             removeTmp(file.tempFilePath)
//             res.json({public_id: result.public_id, url: result.secure_url})
//           })

//     }catch(err){
//         return res.status(500).js
//     }
// })

// Add an item to the database
router.post("/add", auth, async (req, res) => {
    
    try {
        // Verify that the vendor hasn't already added an item with the same name
        const item = await Item.findOne({
            vendor_id: req.user,
            name: req.body.name
        });

        if (item) {
            return res.status(409).json({
                error: "Item has already been added by this vendor",
            });
        }

        // If an image file was uploaded, save it to the server
        // let image = "";
        // if (req.file) {
        //     image = url + '/public/images/' + req.file.filename;
        // } else {
        //     image = "default.jpg";
        // }

        // If any addons were provided
        let addons = [];
        if (req.body.addons !== "") {
            addons = req.body.addons.split(",").map(addon => {
                return {
                    addon_name: addon.split("-")[0],
                    addon_price: Number(addon.split("-")[1])
                }
            })
        }

        // Create a new item
        const new_item = new Item({
            name: req.body.name,
            image: req.image,
            vendor_id: req.user,
            price: req.body.price,
            category: req.body.category,
            addons: addons,
            tags: req.body.tags.split(","),
        });

        // Save the item
        const saved_item = await new_item.save();
        return res.status(201).json(saved_item);
    } catch (err) {
        return res.status(500).json({
            error: err
        });
    }
});

router.patch("/edit", async (req, res) => {
    try {
        const item = await Item.findOne({
            vendor_id: req.user,
            name: req.body.original_name
        });

        if (!item) {
            return res.status(404).json({
                error: "Item not found",
            });
        }

        const duplicate_item = await Item.findOne({
            vendor_id: req.user,
            name: req.body.name
        });

        if (duplicate_item && req.body.original_name !== req.body.name) {
            return res.status(409).json({
                error: "Item with same name has already been added by this vendor",
            });
        }

        item.name = req.body.name;
        item.price = req.body.price;
        item.category = req.body.category;
        item.tags = req.body.tags.split(",");

        // If an image file was uploaded, save it to the server
            item.image = req.body.image;
        

        // If any addons were provided
        if (req.body.addons !== "") {
            item.addons = req.body.addons.split(",").map(addon => {
                return {
                    addon_name: addon.split("-")[0],
                    addon_price: Number(addon.split("-")[1])
                }
            })
        }

        const saved_item = await Item.findByIdAndUpdate(item._id, item, {
            new: true
        });

        return res.status(200).json(saved_item);
    } catch (err) {
        return res.status(500).json({
            error: err
        });
    }
});

// Remove an item from the database
router.delete("/delete", auth, async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.body.item_id);
        const order = await Order.deleteMany({
            item_id: req.body.item_id
        });
        const buyer = await Buyer.updateMany({
            favourite_items: {
                $in: [req.body.item_id]
            }
        }, {
            $pull: {
                favourite_items: req.body.item_id
            }
        });

        return res.status(200).json(item);
    } catch (err) {
        return res.status(500).json({
            error: err
        });
    }
});

// Updating the rating of the item
router.patch("/update_rating", auth, async (req, res) => {
    try {
        const item = await Item.findById(req.body.item_id);

        item.rating.ratings.push(req.body.rating);
        item.rating.count++;

        const updated_item = await Item.findByIdAndUpdate(req.body.item_id, {
            $set: {
                rating: item.rating
            }
        }, {
            new: true
        });

        const updated_order = await Order.findByIdAndUpdate(req.body.order_id, {
            $set: {
                rating: req.body.rating
            }
        }, {
            new: true
        });

        return res.status(200).json({
            item: updated_item,
            order: updated_order
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({
            error: err
        });
    }
});

module.exports = router;