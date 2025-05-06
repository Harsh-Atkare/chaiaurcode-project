import { asyncHandler } from "../utils/asyncHeadler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary-upload.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
// 🔐 Generate access and refresh tokens and update user in DB
const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId); // Fetch user from DB
        const accessToken = user.generateAccessToken(); // Generate access token
        const refreshToken = user.generateRefreshToken(); // Generate refresh token

        user.refreshToken = refreshToken; // Save refresh token in DB
        await user.save({ validateBeforeSave: false }); // Save without validation

        return { accessToken, refreshToken }; // Return both tokens
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
};

// 🧾 Register new user
const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body; // Destructure request body

    // Check if any required field is empty
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Basic email format validation
    if (!email.includes("@")) {
        throw new ApiError(400, "Email is not valid");
    }

    // Check if user already exists in DB
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // Check for avatar image (required)
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Check for optional cover image
    let coverImageLocalPath;
    if (req.files?.coverImage?.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Upload cover image if available
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    // Create new user entry in DB
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Retrieve user without sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user");
    }

    // Return successful response
    return res.status(201).json(
        new ApiResponce(200, createdUser, "User registered successfully")
    );
});

// 🔐 Login existing user
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username && !email) {
        throw new ApiError(400, "Username or email is required");
    }
    if (!password) {
        throw new ApiError(400, "Password is required");
    }

    // Find user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Check if password is correct
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (isPasswordValid) {
        throw new ApiError(401, "Password is incorrect");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // Fetch user without sensitive data
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Set cookie options (secure, HTTP only)
    const options = {
        httpOnly: true,
        secure: false
    };
    console.log("user logged in successfully");

    // Return cookies and response
    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponce(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

// 🚪 Logout user
const logoutUser = asyncHandler(async (req, res) => {
    // Clear refresh token in DB
    await User.findByIdAndUpdate(req.user._id, {
        $set: {
            refreshToken: undefined
        }
    }, {
        new: true
    });

    // Cookie options
    const options = {
        httpOnly: true,
        secure: false
    };
  
    

    // Clear cookies and respond
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponce(200, {}, "User logged out successfully"));
});


const refreshAccessToken=asyncHandler(async(req,res)=>{
    try {
        const incomingRefreshToken=req.cookie.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized: Token request");
        }
        const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "invalid refresh token");
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, " refresh token is expired or used");
        }
        options={
            httpOnly: true,
            secure: true
        }
        const {accessToken,refreshToken}=await generateAccessAndRefreshToken(user._id)
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options).json(new ApiResponce(200,{accessToken,refreshToken:newRefreshToken},"token refreshed successfully"))
    } catch (error) {
        throw new ApiError(401,error?.message ||"invalid refresh token")
        
    }
})

// Export all controllers
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
};
