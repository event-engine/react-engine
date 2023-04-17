import {createAction} from "redux-actions";
import {UserState} from "../reducer/userReducer";

export interface SignedInPayload extends UserState {}

export const signedIn = createAction<SignedInPayload>('USER_SIGN_IN');
