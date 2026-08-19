import { createSlice } from "@reduxjs/toolkit"
import { clearRequestError, idleRequestState, setRequestError, type RequestState } from "../api"
import { fetchUsers, type UserListItem } from "./usersThunk"

type UsersState = RequestState & { items: UserListItem[] }
const initialState: UsersState = { ...idleRequestState, items: [] }

const usersSlice = createSlice({
  name: "adminUsers",
  initialState,
  reducers: { clearUsersError: clearRequestError },
  extraReducers: (builder) => builder
    .addCase(fetchUsers.pending, (state) => { state.isLoading = true; clearRequestError(state) })
    .addCase(fetchUsers.fulfilled, (state, action) => { state.items = action.payload; state.isLoading = false })
    .addCase(fetchUsers.rejected, (state, action) => { state.isLoading = false; setRequestError(state, action.payload) }),
})

export const { clearUsersError } = usersSlice.actions
export default usersSlice.reducer