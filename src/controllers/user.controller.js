import { asyncHandler } from "../utils/asyncHeadler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary-upload.js";
import { ApiResponce } from "../utils/ApiResponce.js";
import jwt from "jsonwebtoken";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";
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
    if (!isPasswordValid) {
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
            refreshToken: 1
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


const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken
        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized: Token request");
        }
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "invalid refresh token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, " refresh token is expired or used");
        }
        options = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
        return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponce(200, { accessToken, refreshToken: newRefreshToken }, "token refreshed successfully"))
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")

    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Find the current user from the database
    const user = await User.findById(req.user._id);

    // Check if the old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    // Set and save new password
    user.password = newPassword;
    await user.save();

    return res.status(200).json(new ApiResponce(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // Return current user info
    return res.status(200).json(new ApiResponce(200, req.user, "User fetched successfully"));
});

const updateAccountDetail = asyncHandler(async (req, res) => {
    const { fullname, email, username } = req.body;

    // Validate required fields
    if (!fullname || !email || !username) {
        throw new ApiError(400, "All fields are required");
    }

    // Update user data
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email,
                username: username.toLowerCase()
            }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponce(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    // Validate avatar path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is missing");
    }

    // Upload to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Avatar image URL is missing");
    }

    // Update avatar in DB
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponce(200, user, "Avatar updated successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    // Validate image
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image is missing");
    }

    // Upload to Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Cover image URL is missing");
    }

    // Update cover image in DB
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        { new: true }
    ).select("-password");

    return res.status(200).json(new ApiResponce(200, user, "Cover image updated successfully"));
});

const getUserChannalProfile = asyncHandler(async (req, res) => {
    const username = req.params.username; // Get username from URL params

    if (!username) {
        throw new ApiError(400, "Username is missing in request parameters");
    }
    const channal = await User.aggregate([
        {
            $match: {
                username: username.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions", // Ensure this matches your actual MongoDB collection name
                localField: "_id",
                foreignField: "channal",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions", // Same collection for subscriber data
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribeTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
                channalSubscriberToCount: { $size: "$subscribeTo" },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                subscribersCount: 1,
                channalSubscriberToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ]);

    if (!channal?.length) {
        throw new ApiError(404, "Channel does not exist");
    }

    return res.status(200).json(
        new ApiResponce(200, channal[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(req.user?._id) }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [{

                    $lookup: {
                        from: "videos",
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline: [{
                            $project: {
                                fullname: 1,
                                username: 1,
                                avatar: 1
                            }
                        }]
                    }
                },{
                    $addFields: {
                        owner: { $arrayElemAt: ["$owner", 0] }
                    }
                }

                ]
            }
        },{
            $project: {
                watchHistory: 1
            }
        }
    ])
    if (!user?.length) {
        throw new ApiError(404, "User not found or watch history unavailable");
    }
    return res.status(200).json(
        new ApiResponce(200, user[0], "User watch history fetched successfully")
    );

})

// Export all controllers
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateCoverImage,
    getUserChannalProfile,
    getWatchHistory

};
