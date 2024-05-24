import User from "../models/user.model.js";
import jwt from 'jsonwebtoken';

export const protectRoute = async (req,res,next) => {
    try{
        //ดึงโทเค็นจากคุกกี้ (req.cookies.jwt)
        const token = req.cookies.jwt;
   
        if (!token) {
            return res.status(401).json({error:"Unuthorized: No Token Provided"})
        }
        //ใช้ฟังก์ชัน jwt.verify เพื่อตรวจสอบและถอดรหัสโทเค็นโดยใช้ process.env.JWT_SECRET
        const decoded = jwt.verify( token , process.env.JWT_SECRET )

        if (!decoded) {
            return res.status(401).json({error:"Unuthorized: Invaild Token"})
        }
        /*
            - ใช้ decoded.userId ที่ได้จากการถอดรหัสโทเค็นเพื่อค้นหาผู้ใช้ในฐานข้อมูล
            - ใช้ .select("-password") เพื่อเลือกข้อมูลผู้ใช้ทั้งหมด ยกเว้นรหัสผ่าน
        */
        const user = await User.findById(decoded.userId).select("-password");
        
        if (!user) {
            return res.status(404).json({error:"User not found"})
        }
        /*
            - เก็บข้อมูลผู้ใช้ที่พบใน req.user จาก User
            - เรียก next() เพื่อให้ middleware หรือ route handler ถัดไปทำงานต่อ
        */
        req.user = user
        next()
    }catch(err){
        console.log("Error in Logout controller", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}