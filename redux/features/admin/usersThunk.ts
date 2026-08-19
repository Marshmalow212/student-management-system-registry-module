import { createAsyncThunk } from "@reduxjs/toolkit"
import { AxiosInstance } from "@/lib/axios-client"
import { errorPayload, type ApiEnvelope, type ApiErrorPayload } from "../api"

export type UserListItem = { id: number; name: string; email: string; role: number; isActive: boolean; isVerified: boolean; createdAt: string; updatedAt: string }
type UsersThunkConfig = { rejectValue: ApiErrorPayload }

export const fetchUsers = createAsyncThunk<UserListItem[], number | undefined, UsersThunkConfig>(
  "adminUsers/fetch",
  async (role, { rejectWithValue }) => {
    try {
      const response = await AxiosInstance.get<ApiEnvelope<UserListItem[]>>("/api/users", { params: role === undefined ? undefined : { role } })
      return response.data.data
    } catch (error) {
      return rejectWithValue(errorPayload(error, "Could not load users"))
    }
  },
)