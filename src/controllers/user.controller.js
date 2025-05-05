import { asyncHandler } from "../utils/asyncHeadler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary-upload.js";
import { ApiResponce } from "../utils/ApiResponce.js";

const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body;

    // get user details from frontend
    // validation like is email in correct format or not. or is password strong or not and so on
    // check if user already exists : email,username
    // chec k for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object -- creater entry in db
    // remove the password and refresh token field from response
    // check for user creation
    // return response




    // Basic field empty check
    if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Email format check
    if (!email.includes("@")) {
        throw new ApiError(400, "Email is not valid");
    }

    // Check if user already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "Username or email already exists");
    }

    // Avatar image is required
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar image is required");
    }

    // Optional: Cover image
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Upload avatar (required)
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Upload cover image (optional)
    let coverImage = null;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    // Create user in database
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Select user without sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user");
    }

    return res.status(201).json(
        new ApiResponce(200, createdUser, "User registered successfully")
    );
});

export { registerUser };
