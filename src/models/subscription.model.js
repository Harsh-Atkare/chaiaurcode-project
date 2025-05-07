import mongoose, { Schema, SchemaType } from "mongoose";

const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Type.ObjectId, //one who subscribing
        ref:"User"
    },
    channel:{
        type:Schema.Type.ObjectId, // one to whom subscriber subscribing
        ref:"User"
    },
    
},{
    timestamps:true
})

export const Subscription=mongoose.model("Subscription",subscriptionSchema)