import {v2 as cloudinary} from cloudinary
import fs from "fs"


cloudinary.config({
    cloud_name:process.env.CLOUDANIRY_CLOUD_NAME,
    api_key:process.env.CLOUDANIRY_API_KEY,
    api_secret:process.env.CLOUDANIRY_API_SECRET
})

const uploadOnCloudinary=async(LocalFilePath)=>{
    try {
        if(!LocalFilePath) return null
        // upoload file on cloudinary
        const response= await cloudinary.uploader.upload(LocalFilePath,{
            resource_type:"auto"
        })
        // file has been uploaded successfully
        console.log("file has been uploaded successfully on cloudinary ",response.url);

        return response
        
    } catch (error) {
        fs.unlinkSync(LocalFilePath) // remove the locally saved temp file as the upload operation failed
        return null
        
    }
}

export {uploadOnCloudinary}