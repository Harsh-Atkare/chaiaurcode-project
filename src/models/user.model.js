import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"; // ✅ Added for token generation

// Define User Schema
const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,  // ✅ Fixed typo (was "lowerCase")
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullname: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,
        required: true
    },
    coverImage: {
        type: String
    },
    watchHistory: {
        type: Schema.Types.ObjectId,
        ref: "Video"
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    refranceToken: { // Optional typo fix: should be "refreshToken" if intended
        type: String
    }
}, { timestamps: true });


// 🔐 Pre-save middleware: Hash password before saving
userSchema.pre("save", async function (next) {
    // If password is not modified, skip hashing
    if (!this.isModified("password")) return next();

    // Hash the password using bcrypt
    this.password = await bcrypt.hash(this.password, 10);
    next();
});


// ✅ Compare raw password with hashed one stored in DB
userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};


// 🔑 Generate Access Token for login/session
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};


// 🔁 Generate Refresh Token for long-term auth
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            
            _id: this._id
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};


// 📦 Export the User model
export const User = mongoose.model("User", userSchema);
