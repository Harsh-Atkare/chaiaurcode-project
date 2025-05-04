import { asyncHandler } from "../utils/asyncHeadler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary-upload.js"
import { ApiResponce } from "../utils/ApiResponce.js"; 

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validation like is email in correct format or not. or is password strong or not and so on
    // check if user already exists : email,username
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object -- creater entry in db
    // remove the password and refresh token field from response
    // check for user creation
    // return response

    const { fullName, email, username, password } = req.body
    console.log("email :- ", email);

    /*
        // normal zindagi
        if(fullName === ""){
            throw new ApiError(400,"Full name is required")
        }
            */
    // field empty check
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required")
    }else{
        console.log("data is not empty")
    }

    if (!email.includes("@")) {
        throw new ApiError(400, "Email is not valid");
    }
    
    // check if user already exists
    const existedUser = await User.findOne({ $or: [{ username }, { email }] })

    if (existedUser) {
        throw new ApiError(409, "Username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"Avatar upload failed")
    }

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser){
        throw new ApiError(500,"something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponce(200, createdUser,"user registered successfully")
    )

    
})
export { registerUser }