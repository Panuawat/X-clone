import toast from "react-hot-toast";
import { useMutation,useQueryClient } from '@tanstack/react-query'

toast

const useUpdateUserProfile = () => {
    const queryClient = useQueryClient()
    const { mutate: updateProfile, isPending: isUpdatingProfile } = useMutation({
        mutationFn: async (formData) => {
          try {
            const res = await fetch(`/api/users/update`, {
              method: "POST",
              headers: {
                "Content-Type": " application/json ",
              },
              body: JSON.stringify(formData),
            });
    
            const data = res.json();
            if (!res.ok) {
              throw new Error(data.error);
            }
            return data;
          } catch (error) {
            throw new Error(error.message);
          }
        },
        onSuccess: () => {
          toast.success("Profile updated successfully");
          Promise.all([
            queryClient.invalidateQueries({ queryKey: ["authUser"] }),
            queryClient.invalidateQueries({ queryKey: ["userProfile"] }),
          ]);
        },
        onError: (error) => {
          toast.error(error.message);
        },
      });
      return { updateProfile,isUpdatingProfile }
}

export default useUpdateUserProfile;