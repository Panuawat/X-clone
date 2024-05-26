import { Navigate, Route, Routes } from "react-router-dom";

import HomePage from "./pages/home/HomePage";
import SignUpPage from "./pages/auth/signup/SignUpPage";
import LoginPage from "./pages/auth/LoginPage";
import NotificationPage from "./pages/notification/NotificationPage";
import ProfilePage from "./pages/profile/ProfilePage";

import Sidebar from "./components/common/Sidebar";
import RightPanel from "./components/common/RightPanel";
import { Toaster } from "react-hot-toast";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "./components/common/LoadingSpinner";

function App() {
  const { data:authUser, isLoading } = useQuery({
    queryKey: ["authUser"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (data.error){
          return null
        }
        if (!res.ok) {
          throw new Error(data.error || "Something went wrong");
        }

        console.log("authUser is here : ", data);
        return data;
      } catch (error) {
        throw new Error(error);
      }
    },
	retry:false
  });
  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  return (
    <div className="flex max-w-6xl mx-auto">
      <Sidebar />
      <Routes>
        <Route path="/" element={authUser ? <HomePage /> : <Navigate to='/login' /> } />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to='/' /> } />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to='/'/> } />
        <Route path="/notifications" element={authUser ? <NotificationPage /> : <Navigate to='/login' /> } />
        <Route path="/profile/:username" element={authUser ? <ProfilePage /> : <Navigate to='/login' /> } />
      </Routes>
      <RightPanel />
      <Toaster />
    </div>
  );
}

/*
	ถ้าผู้ใช้ผ่านการยืนยันตัวตน (authUser เป็น true), แสดงหน้า HomePage, NotificationPage, และ ProfilePage
	ถ้าผู้ใช้ไม่ผ่านการยืนยันตัวตน (authUser เป็น false), เปลี่ยนเส้นทางไปยังหน้า LoginPage
	ถ้าผู้ใช้ยังไม่ได้ลงชื่อเข้าใช้, แสดงหน้า SignUpPage และ LoginPage
*/

export default App;
