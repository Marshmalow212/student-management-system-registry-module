import { configureStore } from '@reduxjs/toolkit'
import authReducer from './features/auth/authSlice'
import registryReducer from "./features/registry/registrySlice";
import registrationReducer from "./features/registration/registrationSlice";
import paymentReducer from "./features/payment/paymentSlice";
import assessmentReducer from "./features/assessment/assessmentSlice";
import adminUsersReducer from "./features/admin/usersSlice";
import studentDashboardReducer from "./features/student/studentDashboardSlice";
import enrollmentReducer from "./features/enrollment/enrollmentSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    registry: registryReducer,
    registration: registrationReducer,
    payment: paymentReducer,
    assessment: assessmentReducer,
    adminUsers: adminUsersReducer,
    studentDashboard: studentDashboardReducer,
    enrollment: enrollmentReducer,
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch

export interface ThunkApiConfig {
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: import("./features/api").ApiErrorPayload;
}