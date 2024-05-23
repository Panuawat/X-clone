import mongoose from "mongoose";

const connectMongoDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log(`MongoDB connected: ${conn.connection.host}`);
    }catch(err){
        console.error(`Error connecting to mongoDB: ${err.message}`);
        /*
            process.exit(1): เมื่อเกิดข้อผิดพลาดแล้วและได้ทำการจัดการกับมันเรียบร้อยแล้ว 
            โค้ดจะออกจากโปรแกรมด้วยการเรียกใช้ process.exit() ซึ่งเป็นวิธีที่ใช้ในการจบการทำงานของโปรแกรม และเลือกใช้ค่า 1 เพื่อระบุว่ามีข้อผิดพลาดเกิดขึ้นแล้ว
        */
        process.exit(1)
    }
}

export default connectMongoDB;