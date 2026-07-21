import { createContext } from "react";
import { AuthUser } from "../config/authUser";

export const AuthContext = createContext<{ user: AuthUser | null }>({ user: null })