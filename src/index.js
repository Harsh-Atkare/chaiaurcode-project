
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import app from "./app.js";

import connectDB from "./db/index.js";

connectDB()
.then(()=>{
    app.listen(process.env.PORT ||8000,()=>{
        console.log(`server is running at port ${process.env.PORT}`);
        
    })
})
.catch((error)=>{
    console.log("Database connesction failed", error);
})



/*
import express from "express";
const app=express()



( async ()=>{
try {
    await mongoose.connect(`${mongoose.env.MONGO_URL}/${DB_NAME}`)
    console.log("db connected")
    app.on("error",(error)=>{
        console.log("error:-",error);
        throw error
    })
    app.listen(process.env.PORT,()=>{
        console.log("server started at port",process.env.PORT)
    })
    
} catch (e) {
    console.error("error",e)
    throw e
}
})()

*/