import {createAction} from 'redux-actions';
import Keycloak from "keycloak-js";

export interface UserAuthenticatedPayload {
    kc: Keycloak.KeycloakInstance
}

export const userAuthenticated = createAction<UserAuthenticatedPayload>('USER_AUTHENTICATED');
