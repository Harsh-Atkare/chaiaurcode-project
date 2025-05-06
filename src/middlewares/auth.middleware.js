import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHeadler.js";
import jwt from "jsonwebtoken"; // Fix: corrected import from 'jew' to 'jwt'
import { User } from "../models/user.model.js";

// Middleware to verify JWT token for protected routes
export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // 🧪 Get token from cookies or Authorization header
        const token =
            req.cookies?.accessToken || 
            req.headers["authorization"]?.replace("Bearer ", "");

        // ❌ If token is not present
        if (!token) {
            throw new ApiError(401, "Unauthorized: Token missing");
        }

        // ✅ Verify token using secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // 🔍 Find user by ID from decoded token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // ❌ If user doesn't exist
        if (!user) {
            throw new ApiError(401, "Unauthorized: Invalid token");
        }

        // ✅ Attach user info to request object
        req.user = user;

        // ⏭️ Proceed to next middleware/controller
        next();

    } catch (error) {
        // ❌ If token is invalid or any error occurs
        throw new ApiError(401, "Unauthorized: Invalid token");
    }
});
