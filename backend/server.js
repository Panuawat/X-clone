import express from 'express';
import authRoutes from './routes/auth.routes.js'
import dotenv from 'dotenv'
import connectMongoDB from './db/connectMongoDB.js';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = process.env.PORT || 5000

dotenv.config()

app.use(cookieParser())
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use('/api/auth',authRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    connectMongoDB();
});

/*
ตัวอย่างการใช้งาน

1.การตั้งค่าคุกกี้ใน response:

app.get('/set-cookie', (req, res) => {
    res.cookie('name', 'value', { maxAge: 900000, httpOnly: true });
    res.send('Cookie is set');
});
2.การอ่านคุกกี้จาก request:

app.get('/read-cookie', (req, res) => {
    const cookieValue = req.cookies.name;
    res.send(`Cookie value: ${cookieValue}`);
});
การทำงานเบื้องหลัง
เมื่อมี request มาที่ /set-cookie:

คุกกี้ชื่อ name จะถูกตั้งค่าใน response header ด้วยค่า value และมีอายุ 15 นาที (maxAge: 900000 milliseconds)
คุกกี้นี้มี httpOnly: true ซึ่งหมายความว่าจะไม่สามารถเข้าถึงคุกกี้นี้ผ่าน JavaScript ในฝั่ง client
เมื่อมี request มาที่ /read-cookie:

cookie-parser จะอ่านคุกกี้จาก request header และแปลงให้เป็น object
ค่า req.cookies.name จะมีค่าที่ตั้งไว้ (value) และส่งกลับไปใน response
*/