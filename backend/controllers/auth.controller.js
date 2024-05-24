import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";

export const signup = async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: "Username is already taken" });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "Email is already taken" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }
    /*
      Salt คืออะไร: Salt เป็นข้อมูลสุ่มที่ถูกเพิ่มเข้าไปในรหัสผ่านก่อนการเข้ารหัส เพื่อให้การเข้ารหัสมีความปลอดภัยมากขึ้น แม้ว่าผู้ใช้สองคนจะมีรหัสผ่านเหมือนกัน แต่ Salt ที่แตกต่างกันจะทำให้รหัสผ่านที่เข้ารหัสออกมาต่างกัน
      bcrypt.genSalt(10): ฟังก์ชันนี้สร้าง Salt ด้วยรอบการคำนวณ 10 รอบ (ค่า 10 เป็นความยากของการคำนวณ ยิ่งตัวเลขสูง การคำนวณก็ยิ่งใช้เวลามากขึ้น)หรือระดับความยากของรหัสคือ ระดับ 10
      Output: ค่า salt ที่ได้จะเป็น string แบบสุ่ม เช่น $2a$10$EixZaYVK1fsbw1ZfbX3OXe
    */
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    /*
      - สร้างผู้ใช้ใหม่ด้วยข้อมูลที่ได้รับและรหัสผ่านที่เข้ารหัสแล้ว
      - เรียกใช้ generateTokenAndSetCookie(newUser._id, res) เพื่อสร้างโทเค็นและตั้งค่า cookie
      - บันทึกผู้ใช้ใหม่ลงในฐานข้อมูลด้วย newUser.save()
      - ถ้าสำเร็จ ส่งสถานะ 201 พร้อมข้อมูลผู้ใช้ที่สร้างขึ้น
      - ถ้าเกิดข้อผิดพลาด ส่งสถานะ 400 พร้อมข้อความแสดงข้อผิดพลาด
    */
    const newUser = new User({
      fullName:fullName,
      username,
      email,
      password: hashedPassword,
    });

    if (newUser) {
        generateTokenAndSetCookie(newUser._id, res);
        await newUser.save();

        res.status(201).json({
            _id: newUser._id,
            fullName: newUser.fullName,
            username: newUser.username,
            email: newUser.email,
            followers: newUser.followers,
            following: newUser.following,
            profileImg: newUser.profileImg,
            coverImg: newUser.coverImg,
        });
    } else {
        res.status(400).json({ error: "Invalid user data" });
    }
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  try{
    const { username , password } = req.body;
    const user = await User.findOne({username});
    /*
      - ใช้ bcrypt.compare เพื่อเปรียบเทียบรหัสผ่านที่ผู้ใช้ส่งมากับรหัสผ่านที่เก็บในฐานข้อมูล
      - user?.password || " ": ถ้าไม่มีผู้ใช้ (user เป็น null หรือ undefined) จะใช้ string ว่างแทนรหัสผ่าน
    */
    const isPasswordCorrect = await bcrypt.compare(password,user?.password || " ")

    if (!user || !isPasswordCorrect) {
      return res.status(400).json({ error: "Internal username or password" });
    }
    //เรียกใช้ฟังก์ชัน generateTokenAndSetCookie เพื่อสร้างโทเค็นและตั้งค่า cookie สำหรับผู้ใช้
    generateTokenAndSetCookie(user._id,res)

    //ส่งสถานะ 200 พร้อมข้อมูลผู้ใช้กลับไปยัง client
    res.status(200).json({
      _id:user._id,
      fullName:user.fullName,
      username:user.username,
      email:user.email,
      followers:user.followers,
      following:user.following,
      profileImg:user.profileImg,
      coverImg:user.coverImg
    })

  }catch (error) {
    console.log("Error in Login controller", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const logout = async (req, res) => {
	try {
		// ตั้งค่าคุกกี้ "jwt" เป็นค่าว่าง และตั้งค่า maxAge ให้เป็น 0 เพื่อให้คุกกี้หมดอายุทันที
		res.cookie("jwt", "", { maxAge: 0 });
		
		// ส่งสถานะ 200 พร้อมกับข้อความบอกว่าออกจากระบบสำเร็จ
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		// ถ้ามีข้อผิดพลาดเกิดขึ้น จับข้อผิดพลาดและแสดงข้อความใน console
		console.log("Error in logout controller", error.message);
		
		// ส่งสถานะ 500 พร้อมกับข้อความแสดงข้อผิดพลาด
		res.status(500).json({ error: "Internal Server Error" });
	}
};


export const getMe = async (req,res) => {
  /*
    - User.findById(req.user._id): ค้นหาผู้ใช้ในฐานข้อมูลโดยใช้ user ID ที่อยู่ใน req.user._id
    - .select("-password"): การใช้ .select("-password") จะยกเว้น (exclude) ฟิลด์ password จากผลลัพธ์ที่ส่งกลับมา
    - res.status(200).json(user): ถ้าการค้นหาสำเร็จ ส่งผลลัพธ์เป็นสถานะ 200 (OK) พร้อมกับข้อมูลผู้ใช้ในรูปแบบ JSON
  */
  try{
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json(user)
  }catch(err){
    onsole.log("Error in Logout controller", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
