import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import { v2 as cloudinary } from "cloudinary";
import Notification from "../models/notifiction.model.js";

export const createPost = async (req, res) => {
  try {
    const { text } = req.body; //ดึง text และ img จาก body ของ request
    let { img } = req.body;
    const userId = req.user._id.toString(); //แปลง _id ของผู้ใช้เป็น string userId จาก req.user._id (ซึ่งต้องถูกตั้งค่าจาก middleware ในขั้นตอนก่อนหน้า)

    //ตรวจสอบว่าผู้ใช้มีอยู่ในระบบหรือไม่ โดยใช้ User.findById(userId)
    const user = await User.findById(userId);
    if (!user) {
      //ถ้าผู้ใช้ไม่พบ ส่งสถานะ 404 พร้อมข้อความแสดงข้อผิดพลาด
      return res.status(404).json({ message: "User not found" });
    }
    if (!text && !img) {
      //ตรวจสอบว่ามีอย่างน้อย text หรือ img ในโพสต์
      return res.status(400).json({ error: "Post must have text or image" });
    }

    if (img) {
      const uploadedResponse = await cloudinary.uploader.upload(img); //ถ้ามีรูปภาพ (img), อัปโหลดรูปภาพไปยัง Cloudinary ด้วย cloudinary.uploader.upload(img)
      img = uploadedResponse.secure_url; //เก็บ URL ของรูปภาพที่อัปโหลดแล้วจาก Cloudinary
    }
    //สร้างโพสต์ใหม่ด้วยข้อมูลผู้ใช้ (userId), เนื้อหา (text), และรูปภาพ (img)
    const newPost = new Post({
      user: userId,
      text,
      img,
    });

    await newPost.save(); //บันทึกโพสต์ใหม่ลงในฐานข้อมูลด้วย newPost.save()
    res.status(201).json(newPost);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.log("Error in createPost controller: ", error);
  }
};

export const deletePost = async (req, res) => {
  try {
    //ค้นหาโพสต์จากฐานข้อมูลโดยใช้ ID ที่มาจากพารามิเตอร์ของ request (req.params.id)
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    //ตรวจสอบว่าโพสต์นั้นเป็นของผู้ใช้ที่ส่ง request มาหรือไม่ (post.user กับ req.user._id)
    if (post.user.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({ error: "You are not authorized to delete this post" });
    }
    //ตรวจสอบว่ามีรูปภาพที่เกี่ยวข้องกับโพสต์หรือไม่ (post.img)
    if (post.img) {
      /*ตัวอย่าง:
                 post.img = "https://example.com/images/photo12345.jpg";
                 const parts = post.img.split("/")
                 Output: ["https:", "", "example.com", "images", "photo12345.jpg"]

                 const lastPart = parts.pop();
                 Output: "photo12345.jpg"

                 const fileParts = lastPart.split(".");
                 Output: ["photo12345", "jpg"]

                 const imgId = fileParts[0];
                 Output: "photo12345"

            */
      const imgId = post.img.split("/").pop().split(".")[0]; //ถ้ามีรูปภาพ ดึง imgId จาก URL ของรูปภาพเพื่อใช้ในการลบ
      await cloudinary.uploader.destroy(imgId); //ใช้ Cloudinary API (cloudinary.uploader.destroy) เพื่อลบรูปภาพออกจาก Cloudinary
    }

    await Post.findByIdAndDelete(req.params.id); //ลบโพสต์จากฐานข้อมูลโดยใช้ ID ที่มาจากพารามิเตอร์ของ request (req.params.id)

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    console.log("Error in deletePost controller: ", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const commentOnPost = async (req, res) => {
  try {
    const { text } = req.body; //ดึง text จาก req.body ซึ่งเป็นข้อความของคอมเมนต์
    const postId = req.params.id; //ดึง postId จาก req.params.id ซึ่งเป็น ID ของโพสต์ที่ต้องการคอมเมนต์
    const userId = req.user._id; //ดึง userId จาก req.user._id ซึ่งเป็น ID ของผู้ใช้ที่คอมเมนต์

    if (!text) {
      //ถ้า text ไม่มีค่า ส่งสถานะ 400 พร้อมข้อความแสดงข้อผิดพลาด
      return res.status(400).json({ error: "Text field is require" });
    }
    //ค้นหาโพสต์ที่มี postId ในฐานข้อมูล
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    const comment = { user: userId, text }; //สร้างออบเจกต์คอมเมนต์ที่มีฟิลด์ user และ text

    post.comments.push(comment); //เพิ่มคอมเมนต์ลงใน array comments ของโพสต์
    await post.save(); //บันทึกการเปลี่ยนแปลงลงในฐานข้อมูล

    res.status(200).json(post);
  } catch (err) {
    console.log("Error in Comment controller: ", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const likeUnlikePost = async (req, res) => {
  try {
    const userId = req.user._id; //userId: ดึง _id ของผู้ใช้จาก req.user (สมมติว่า middleware ได้เพิ่ม req.user ให้กับ request object)
    const { id: postId } = req.params; //postId: ดึง id ของโพสต์จาก req.params

    const post = await Post.findById(postId); //ค้นหาโพสต์ด้วย postId

    if (!post) {
      //ถ้าไม่พบโพสต์ ส่งสถานะ 404 พร้อมข้อความ "Post not found"
      return res.status(404).json({ error: "Post not found" });
    }

    const userLikedPost = post.likes.includes(userId); //ตรวจสอบว่า userId อยู่ใน array ของ likes ของโพสต์หรือไม่ (post.likes)

    if (userLikedPost) {
      // Unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

      const updatedLikes = post.likes.filter(
        (id) => id.toString() !== userId.toString()
      );
      res.status(200).json(updatedLikes);
      /* ถ้าผู้ใช้ได้กดไลค์แล้ว:// Unlike post
          ลบ userId ออกจาก array ของ likes ของโพสต์ด้วย $pull
          ลบ postId ออกจาก array ของ likedPosts ของผู้ใช้ด้วย $pull
          กรอง array likes ของโพสต์เพื่ออัปเดตค่า updatedLikes
          ส่ง array updatedLikes เป็น JSON response */
    } else {
      // Like post
      post.likes.push(userId); //เพิ่ม userId เข้าไปใน array ของ likes ของโพสต์
      await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } }); //เพิ่ม postId เข้าไปใน array ของ likedPosts ของผู้ใช้
      await post.save();

      //สร้างการแจ้งเตือนใหม่ (notification) ที่ระบุว่าเป็นการกดไลค์ (type: "like")
      const notification = new Notification({
        from: userId,
        to: post.user,
        type: "like",
      });
      await notification.save();

      const updatedLikes = post.likes;

      //ส่ง array likes ของโพสต์เป็น JSON response
      res.status(200).json(updatedLikes);
    }
  } catch (error) {
    console.log("Error in likeUnlikePost controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find() //Post.find(): ดึงข้อมูลโพสต์ทั้งหมดจาก collection Post
      .sort({ createdAt: -1 }) //.sort({ createdAt: -1 }): เรียงลำดับโพสต์ตามวันที่สร้าง (createdAt) โดยเรียงจากใหม่ไปเก่า (-1 หมายถึงเรียงจากมากไปน้อย)
      .populate({
        path: "user",
        select: "-password", //.populate({ path: "user", select: "-password" }): ทำการ populate (ดึงข้อมูลที่เกี่ยวข้อง) ฟิลด์ user ของโพสต์ แต่ไม่ดึงรหัสผ่าน (-password)
      })
      .populate({
        path: "comments.user",
        select: "-password", //.populate({ path: "comments.user", select: "-password" }): ทำการ populate ฟิลด์ user ภายใน comments ของโพสต์ แต่ไม่ดึงรหัสผ่าน
      });
    if (posts.length === 0) {
      return res.status(200).json([]); //ถ้าไม่มีโพสต์ (posts.length === 0), ส่งสถานะ 200 พร้อมกับ array ว่าง ([])
    }
    res.status(200).json(posts); //ส่งข้อมูลโพสต์กลับไปยัง client
  } catch (err) {
    console.log("Error in getAllPost controller: ", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getLikedPosts = async (req, res) => {
  const userId =
    req.params.id; /*ดึงค่า userId จาก URL parameters เช่น /users/:id/likedPosts
                                  req.params.id จะได้ค่า id จาก URL ที่ผู้ใช้ส่งมา*/
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const likedPosts = await Post.find({ _id: { $in: user.likedPosts } }) //ใช้ Post.find เพื่อค้นหาโพสต์ที่มี _id อยู่ใน array likedPosts ของผู้ใช้
      .populate({
        //populate ใช้สำหรับการดึงข้อมูลที่เกี่ยวข้องจากโมเดลอื่น
        path: "user", //path: "user" จะดึงข้อมูลผู้ใช้ที่โพสต์แต่ละโพสต์และไม่รวมฟิลด์ password
        select: "-password",
      })
      .populate({
        path: "comments.user", //path: "comments.user" จะดึงข้อมูลผู้ใช้ที่แสดงความคิดเห็นแต่ละคอมเมนต์และไม่รวมฟิลด์ password
        select: "-password",
      });

    res.status(200).json(likedPosts); //ส่งสถานะ 200 และข้อมูลโพสต์ที่ผู้ใช้ชอบ (likedPosts) ในรูปแบบ JSON
  } catch (error) {
    console.log("Error in getLikedPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getFollowing = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const following = user.following;

    const feedPosts = await Post.find({ user: { $in: following } })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });
    res.status(200).json(feedPosts);
  } catch (err) {
    console.log("Error in getFollowing controller: ", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const posts = await Post.find({ user: user._id })
      .sort({ createAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in getUserProfile controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
