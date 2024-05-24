import {v2 as cloudinary} from 'cloudinary'
import bcrypt from 'bcryptjs'
//model
import User from "../models/user.model.js";
import Notification from "../models/notifiction.model.js";


export const getUserProfile = async (req,res) => {
    const { username } = req.params //รับค่า username จาก URL parameter
    try{
        /*  - ค้นหาผู้ใช้ที่มี username ตรงกับที่ได้รับมา
            - ใช้ .select("-password") เพื่อไม่ให้ส่งคืนฟิลด์ password ในผลลัพธ์ */
        const user = await User.findOne({username}).select("-password")
        if (!user) {
            return res.status(404).json({error:"User not found"})
        }

        res.status(200).json(user)
    }catch(err){
        console.log("Error in getUserProfile: ",err.message);
        res.status(500).json({error:err.message})
    }
}

export const followUnfollowUser = async (req,res) => {
    try{
        const {id} = req.params;//รับค่า id จาก URL parameter
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        //id === req.user._id.ถ้าเงื่อนไขเป็นแบบนี้จะ follow user
        if (id === req.user._id.toString()) {
            return res.status(400).json({error:"You can't follow/unfollow yourself"})
        }

        if (!userToModify || !currentUser) {
            return res.status(400).json({error:"User not found"})
        }
        const isFollowing = currentUser.following.includes(id)
        
        if (isFollowing) {
            /*
                ใช้ User.findByIdAndUpdate(id, {$pull: {followers: req.user._id}}) 
                เพื่อลบ req.user._id ออกจากฟิลด์ followers ของผู้ใช้ที่มี id เป็น ID
            */
            //unfollow the user
            await User.findByIdAndUpdate(id,{$pull:{followers:req.user._id}})
            await User.findByIdAndUpdate(req.user._id, {$pull:{following:id}})//ใช้ User.findByIdAndUpdate(req.user._id, {$pull: {following: id}}) เพื่อลบ id ออกจากฟิลด์ following ของผู้ใช้ที่กำลังเข้าสู่ระบบ (req.user._id)
            //TODO return the id of the user as a response
            res.status(200).json({message:"User unfollowed successfully"})
        }else{
            //follow the user
            await User.findByIdAndUpdate(id,{$push: {followers:req.user._id}});//ใช้ User.findByIdAndUpdate(id, {$push: {followers: req.user._id}}) เพื่อเพิ่ม req.user._id เข้าไปในฟิลด์ followers ของผู้ใช้ที่มี id เป็น ID
            await User.findByIdAndUpdate(req.user._id,{$push: {following:id}})//ใช้ User.findByIdAndUpdate(req.user._id, {$push: {following: id}}) เพื่อเพิ่ม id เข้าไปในฟิลด์ following ของผู้ใช้ที่กำลังเข้าสู่ระบบ (req.user._id)
            //send notification to the user
            const newNotification = new Notification({
                type:"follow",
                from:req.user._id,
                to:userToModify._id
            })
            await newNotification.save();
             //TODO return the id of the user as a response
            res.status(200).json({message:"User followed successfully"})
        }

    }catch(err){
        console.log("Error in getUserProfile: ",err.message);
        res.status(500).json({error:err.message})
    }
}

export const getSuggestedUsers = async (req,res) => {
    try{
        const userId = req.user._id;//ดึง _id ของผู้ใช้คนปัจจุบันจาก req.user ที่ได้มาจาก middleware ซึ่งควรจะทำการยืนยันตัวตน (authentication) มาแล้ว
        /*  ค้นหาผู้ใช้จากฐานข้อมูลโดยใช้ userId
            เลือกเฉพาะฟิลด์ following ที่เก็บข้อมูลผู้ใช้ที่ผู้ใช้คนปัจจุบันติดตามอยู่ */
        const usersFollowedByMe = await User.findById(userId).select("following");
        /*
            สุ่มเลือกผู้ใช้ 10 คนจากฐานข้อมูล (ยกเว้นผู้ใช้คนปัจจุบัน)
            ใช้การรวบรวม (aggregation) ใน MongoDB เพื่อสุ่มเลือกผู้ใช้ 10 คนที่ _id ไม่ตรงกับ userId
        */
        const users = await User.aggregate([
            {
                $match:{
                    _id:{$ne:userId}
                }
            },
            {$sample:{size:10}}
            
        ])
        /*  กรองผู้ใช้ที่สุ่มมา โดยตรวจสอบว่า _id ของผู้ใช้เหล่านั้นไม่อยู่ใน usersFollowedBybe.following (ผู้ใช้ที่ผู้ใช้คนปัจจุบันติดตาม)
            เลือกผู้ใช้ที่ผ่านการกรองมา 4 คนเพื่อเป็นผู้ใช้ที่แนะนำ */
        const filteredUsers = users.filter(user => !usersFollowedByMe.following.includes(user._id))
        const suggestedUsers = filteredUsers.slice(0,4)
        
        //ลบข้อมูลรหัสผ่านออกจากผลลัพธ์เพื่อความปลอดภัย
        suggestedUsers.forEach(user => user.password=null)

        //ส่งผลลัพธ์กลับไปยังผู้ใช้
        res.status(200).json(suggestedUsers)

    }catch(err){
        console.log("Error in getSuggestedUser: ",err.message);
        res.status(500).json({error:err.message})
    }
}

export const updateUser = async (req, res) => {
    const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
    let { profileImg, coverImg } = req.body;

    const userId = req.user._id;

    try {
        // ตรวจสอบว่ามี body มาจาก request หรือไม่
        if (!req.body) {
            return res.status(400).json({ message: "No data provided" });
        }

        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if ((newPassword && !currentPassword) || (currentPassword && !newPassword)) {
            return res.status(400).json({ error: "Please provide both current password and new password" });
        }

        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ error: "Current password is incorrect" });
            }
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // การอัปโหลดรูปโปรไฟล์
        if (profileImg) {
            if (user.profileImg) {
                await cloudinary.uploader.destroy(user.profileImg.split('/').pop().split('.')[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
        }

        // การอัปโหลดรูปหน้าปก
        if (coverImg) {
            if (user.coverImg) {
                await cloudinary.uploader.destroy(user.coverImg.split('/').pop().split('.')[0]);
            }
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
        }

        // อัปเดตข้อมูลผู้ใช้
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username;
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg;
        user.coverImg = coverImg || user.coverImg;

        user = await user.save();

        // ไม่ส่งรหัสผ่านใน response
        user.password = null;

        return res.status(200).json(user);
    } catch (error) {
        console.log("Error in updateUser: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

