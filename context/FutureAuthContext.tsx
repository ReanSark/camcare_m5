// "use client";

// import { getUserRole } from "@/lib/roles";
// import { useRouter } from "next/navigation";
// import { createContext, useContext, useState, useEffect } from "react";
// import { account, databases } from "@/lib/appwrite.client";
// import { Query, Models } from "appwrite";

// // Type for the context
// interface AuthContextProps {
//   user: Models.User<Record<string, unknown>> | null;
//   role: string | null;
//   loading: boolean;
//   logout: () => void;
//   sessionChecked: boolean;
// }

// // Create context
// const AuthContext = createContext<AuthContextProps>({
//   user: null,
//   role: null,
//   loading: true,
//   logout: () => {},
//   sessionChecked: false,
// });

// // Context provider
// export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
//   const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
//   const [role, setRole] = useState<string | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [sessionChecked, setSessionChecked] = useState(false);

//   // 🔐 Check for existing session on first load
//   useEffect(() => {
//     const checkSession = async () => {
//       try {
//         const user = await account.get(); // Try to fetch current session
//         const role = await getUserRole(user.$id); // ✅ this is the key part

//         if (!role) {
//         console.error("❌ User role not found. Forcing logout.");
//         await account.deleteSession("current");

//         setUser(null);
//         setRole(null);
//         localStorage.removeItem("userRole");
//         localStorage.removeItem("userId");
        
//         window.location.href = "/auth/login";
//         return;
//         }

//         setUser(user);
//         setRole(role ?? null);
//         if (typeof window !== "undefined") {
//           localStorage.setItem("userRole", role);
//           localStorage.setItem("userId", user.$id);
//         }
        
//         // Fallback if role not yet cached
//       } catch (err) {
//         console.warn("🔐 No active session:", err);
//         setUser(null);
//         setRole(null); // No session found
//         localStorage.removeItem("userRole");// 🚿 clear stale cache
//         localStorage.removeItem("userId"); 
//       } finally {
//         setLoading(false); // ✅ Mark loading complete in all cases
//         setSessionChecked(true); // ✅ important
//       }
//     };

//     checkSession();
//   }, []);

//   // 🔓 Logout function — clears session and local state
//   const logout = async () => {
//     try {
//       await account.deleteSession("current");
//     } catch (err) {
//       console.warn("Logout failed (maybe already logged out)", err);
//     } finally {
//       setUser(null);
//       setRole(null);
//       localStorage.removeItem("userRole");
//       localStorage.removeItem("userId");
//       window.location.href = "/auth/login";
//     }
//   };

//   return (
//     <AuthContext.Provider value={{ user, role, loading, logout, sessionChecked }}>
//       {children}
//     </AuthContext.Provider>
//   );
// };

// // 🔁 Hook to access context
// export const useAuth = () => useContext(AuthContext);