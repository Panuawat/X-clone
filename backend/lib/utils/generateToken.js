import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15d",
  });
  // คุกกี้ชื่อ jwt ที่มีค่าเป็น JWT ที่สร้างขึ้น จะถูกตั้งค่าใน response header เพื่อส่งกลับไปยังผู้ใช้
  res.cookie("jwt", token, {
    maxAge: 15 * 24 * 60 * 60 * 1000, //MS
    httpOnly: true, //ตั้งค่า httpOnly: true เพื่อป้องกันการโจมตีแบบ XSS (Cross-Site Scripting)
    sameSite: "strict", //ตั้งค่า sameSite: "strict" เพื่อป้องกันการโจมตีแบบ CSRF (Cross-Site Request Forgery)
    secure: process.env.NODE_ENV !== "development", //ตั้งค่า secure เพื่อให้คุกกี้ถูกส่งผ่านเฉพาะเมื่อใช้ HTTPS ในสภาพแวดล้อมที่ไม่ใช่การพัฒนา (process.env.NODE_ENV !== "development")
  });
};
/*

ภาพรวมการทำงาน

1.เมื่อผู้ใช้ลงชื่อเข้าใช้หรือสมัครสมาชิกสำเร็จ ฟังก์ชัน generateTokenAndSetCookie จะถูกเรียก
2.JWT จะถูกสร้างขึ้นด้วยข้อมูล userId และ secret key ที่กำหนดในสภาพแวดล้อม
3.JWT จะถูกตั้งค่าในคุกกี้ชื่อ jwt พร้อมกับ option ต่าง ๆ เพื่อเพิ่มความปลอดภัย
4.คุกกี้จะถูกส่งกลับไปยังผู้ใช้ และสามารถใช้ในการตรวจสอบสิทธิ์ (authentication) ในการร้องขอครั้งต่อ ๆ ไป

*/
